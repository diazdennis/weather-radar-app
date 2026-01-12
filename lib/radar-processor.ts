import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { RadarResponse, LatLngBounds, GridInfo } from '@/types/radar';

const MRMS_URL =
  'https://mrms.ncep.noaa.gov/2D/ReflectivityAtLowestAltitude/MRMS_ReflectivityAtLowestAltitude.latest.grib2.gz';

const CACHE_DIR = path.join(process.cwd(), 'public', 'radar');
const CACHE_FILE = path.join(CACHE_DIR, 'latest.png');
const METADATA_FILE = path.join(CACHE_DIR, 'metadata.json');
const GRIB_FILE = path.join(CACHE_DIR, 'latest.grib2.gz');

// Cache duration in milliseconds (2 minutes)
const CACHE_DURATION = 2 * 60 * 1000;

// Timeout for MRMS download (60 seconds - increased for Render free tier)
const DOWNLOAD_TIMEOUT = 60 * 1000;

// Timeout for Python processing (120 seconds - GRIB2 processing can be slow)
const PYTHON_TIMEOUT = 120 * 1000;

/**
 * Default CONUS bounds
 */
const DEFAULT_BOUNDS: LatLngBounds = [
  [21.0, -130.0],
  [55.0, -60.0],
];

interface CachedMetadata {
  timestamp: string;
  bounds: LatLngBounds;
  gridInfo: GridInfo;
  fetchedAt: number;
}

interface PythonResult {
  success: boolean;
  timestamp?: string;
  bounds?: LatLngBounds;
  gridInfo?: GridInfo;
  error?: string;
}

/**
 * Check if the cache is still valid
 */
async function isCacheValid(): Promise<boolean> {
  try {
    const metadataContent = await fs.readFile(METADATA_FILE, 'utf-8');
    const metadata: CachedMetadata = JSON.parse(metadataContent);

    const age = Date.now() - metadata.fetchedAt;
    return age < CACHE_DURATION;
  } catch {
    return false;
  }
}

/**
 * Get cached metadata
 */
async function getCachedMetadata(): Promise<CachedMetadata | null> {
  try {
    const metadataContent = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(metadataContent);
  } catch {
    return null;
  }
}

/**
 * Check if cached image file exists
 */
async function cacheImageExists(): Promise<boolean> {
  try {
    await fs.access(CACHE_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download the latest GRIB2 file from MRMS with timeout and retry
 */
async function downloadGrib2(retries = 3): Promise<void> {
  // Ensure cache directory exists
  await fs.mkdir(CACHE_DIR, { recursive: true });

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

    try {
      console.log(`Radar: Downloading MRMS data (attempt ${attempt}/${retries})...`);
      
      const response = await fetch(MRMS_URL, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(GRIB_FILE, buffer);
      
      console.log(`Radar: Downloaded ${buffer.length} bytes`);
      return; // Success
    } catch (error) {
      lastError = error as Error;
      console.error(`Radar: Download attempt ${attempt} failed:`, error);
      
      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Failed to download GRIB2 after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Run the Python GRIB2 processor with timeout
 */
async function runPythonProcessor(): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'process_grib2.py');

    // Set a timeout for the entire Python process
    const timeoutId = setTimeout(() => {
      reject(new Error(`Python processing timed out after ${PYTHON_TIMEOUT / 1000}s`));
    }, PYTHON_TIMEOUT);

    // Try different Python paths - venv first (Docker), then system python
    const pythonCommands = ['/opt/venv/bin/python3', 'python3', 'python'];
    let currentIndex = 0;

    function tryPython(pythonCmd: string): void {
      console.log(`Radar: Running Python processor with ${pythonCmd}...`);
      
      const proc = spawn(pythonCmd, [scriptPath, GRIB_FILE, CACHE_FILE], {
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('Python stderr:', data.toString());
      });

      proc.on('error', (error) => {
        // If python command not found, try the next one
        currentIndex++;
        if (currentIndex < pythonCommands.length) {
          tryPython(pythonCommands[currentIndex]);
        } else {
          clearTimeout(timeoutId);
          reject(new Error(`Python not found: ${error.message}`));
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            console.log('Radar: Python processing complete');
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${stdout}`));
          }
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr || stdout}`));
        }
      });
    }

    tryPython(pythonCommands[currentIndex]);
  });
}

/**
 * Save metadata to cache
 */
async function saveMetadata(result: PythonResult): Promise<void> {
  const metadata: CachedMetadata = {
    timestamp: result.timestamp || new Date().toISOString(),
    bounds: result.bounds || DEFAULT_BOUNDS,
    gridInfo: result.gridInfo || {
      width: 7000,
      height: 3500,
      resolution: 1,
    },
    fetchedAt: Date.now(),
  };

  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

/**
 * Fetch and process the latest radar data from MRMS
 */
export async function fetchLatestRadar(): Promise<RadarResponse> {
  // Check if cache is valid
  if (await isCacheValid()) {
    const cached = await getCachedMetadata();
    if (cached && await cacheImageExists()) {
      console.log('Radar: Serving from cache');
      return {
        imageUrl: '/radar/latest.png?' + cached.fetchedAt,
        timestamp: cached.timestamp,
        bounds: cached.bounds,
        gridInfo: cached.gridInfo,
      };
    }
  }

  // Download fresh data from MRMS
  await downloadGrib2();

  // Process with Python
  const result = await runPythonProcessor();

  if (!result.success) {
    throw new Error(result.error || 'Failed to process GRIB2 file');
  }

  // Save metadata
  await saveMetadata(result);

  const fetchedAt = Date.now();
  console.log('Radar: Fresh data processed successfully');

  return {
    imageUrl: '/radar/latest.png?' + fetchedAt,
    timestamp: result.timestamp || new Date().toISOString(),
    bounds: result.bounds || DEFAULT_BOUNDS,
    gridInfo: result.gridInfo || {
      width: 7000,
      height: 3500,
      resolution: 1,
    },
  };
}

/**
 * Get radar data, using cache if available (even if stale)
 * This is useful for initial page load to avoid waiting
 */
export async function getRadarData(): Promise<RadarResponse | null> {
  const cached = await getCachedMetadata();
  if (cached && await cacheImageExists()) {
    return {
      imageUrl: '/radar/latest.png?' + cached.fetchedAt,
      timestamp: cached.timestamp,
      bounds: cached.bounds,
      gridInfo: cached.gridInfo,
    };
  }
  return null;
}
