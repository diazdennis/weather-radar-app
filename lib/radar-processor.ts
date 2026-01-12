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
 * Download the latest GRIB2 file from MRMS
 */
async function downloadGrib2(): Promise<void> {
  // Ensure cache directory exists
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const response = await fetch(MRMS_URL);

  if (!response.ok) {
    throw new Error(`Failed to download GRIB2: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(GRIB_FILE, buffer);
}

/**
 * Run the Python GRIB2 processor
 */
async function runPythonProcessor(): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'process_grib2.py');

    // Try python3 first, then python
    const pythonCommands = ['python3', 'python'];
    let currentIndex = 0;

    function tryPython(pythonCmd: string): void {
      const proc = spawn(pythonCmd, [scriptPath, GRIB_FILE, CACHE_FILE]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        // If python command not found, try the next one
        currentIndex++;
        if (currentIndex < pythonCommands.length) {
          tryPython(pythonCommands[currentIndex]);
        } else {
          reject(new Error(`Python not found: ${error.message}`));
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch {
            reject(new Error(`Failed to parse Python output: ${stdout}`));
          }
        } else {
          reject(new Error(`Python script failed: ${stderr || stdout}`));
        }
      });
    }

    tryPython(pythonCommands[currentIndex]);
  });
}

/**
 * Save metadata to cache
 */
async function saveMetadata(
  result: PythonResult
): Promise<void> {
  const metadata: CachedMetadata = {
    timestamp: result.timestamp || new Date().toISOString(),
    bounds: result.bounds || [
      [21.0, -130.0],
      [55.0, -60.0],
    ],
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
 * Fetch and process the latest radar data
 */
export async function fetchLatestRadar(): Promise<RadarResponse> {
  // Check if cache is valid
  if (await isCacheValid()) {
    const cached = await getCachedMetadata();
    if (cached) {
      return {
        imageUrl: '/radar/latest.png?' + cached.fetchedAt,
        timestamp: cached.timestamp,
        bounds: cached.bounds,
        gridInfo: cached.gridInfo,
      };
    }
  }

  // Download fresh data
  await downloadGrib2();

  // Process with Python
  const result = await runPythonProcessor();

  if (!result.success) {
    throw new Error(result.error || 'Failed to process GRIB2 file');
  }

  // Save metadata
  await saveMetadata(result);

  const fetchedAt = Date.now();

  return {
    imageUrl: '/radar/latest.png?' + fetchedAt,
    timestamp: result.timestamp || new Date().toISOString(),
    bounds: result.bounds || [
      [21.0, -130.0],
      [55.0, -60.0],
    ],
    gridInfo: result.gridInfo || {
      width: 7000,
      height: 3500,
      resolution: 1,
    },
  };
}

/**
 * Get radar data, using cache if available (even if stale)
 * This is useful for initial page load
 */
export async function getRadarData(): Promise<RadarResponse | null> {
  const cached = await getCachedMetadata();
  if (cached) {
    return {
      imageUrl: '/radar/latest.png?' + cached.fetchedAt,
      timestamp: cached.timestamp,
      bounds: cached.bounds,
      gridInfo: cached.gridInfo,
    };
  }
  return null;
}
