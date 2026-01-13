import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';

const CACHE_DIR = path.join(process.cwd(), 'public', 'radar');
const CACHE_FILE = path.join(CACHE_DIR, 'latest.png');
const METADATA_FILE = path.join(CACHE_DIR, 'metadata.json');

// Color scale to dBZ mapping (reverse lookup)
// Based on the Python color scale
const COLOR_TO_DBZ: Array<{ r: number; g: number; b: number; dbz: number; description: string }> = [
  { r: 4, g: 233, b: 231, dbz: 7, description: 'Light Mist' },
  { r: 1, g: 159, b: 244, dbz: 12, description: 'Mist' },
  { r: 3, g: 0, b: 244, dbz: 17, description: 'Light Rain' },
  { r: 2, g: 253, b: 2, dbz: 22, description: 'Light Rain' },
  { r: 1, g: 197, b: 1, dbz: 27, description: 'Moderate Rain' },
  { r: 0, g: 142, b: 0, dbz: 32, description: 'Moderate Rain' },
  { r: 253, g: 248, b: 2, dbz: 37, description: 'Heavy Rain' },
  { r: 229, g: 188, b: 0, dbz: 42, description: 'Heavy Rain' },
  { r: 253, g: 149, b: 0, dbz: 47, description: 'Very Heavy Rain' },
  { r: 253, g: 0, b: 0, dbz: 52, description: 'Intense' },
  { r: 212, g: 0, b: 0, dbz: 57, description: 'Intense' },
  { r: 188, g: 0, b: 0, dbz: 62, description: 'Severe' },
  { r: 248, g: 0, b: 253, dbz: 67, description: 'Severe' },
  { r: 152, g: 84, b: 198, dbz: 72, description: 'Extreme' },
  { r: 255, g: 255, b: 255, dbz: 77, description: 'Extreme' },
];

function findClosestColor(r: number, g: number, b: number): { dbz: number; description: string } | null {
  if (r === 0 && g === 0 && b === 0) {
    return null; // Transparent/no data
  }

  let minDistance = Infinity;
  let closest = null;

  for (const color of COLOR_TO_DBZ) {
    const distance = Math.sqrt(
      Math.pow(r - color.r, 2) +
      Math.pow(g - color.g, 2) +
      Math.pow(b - color.b, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }

  // If the color is too far from any known color, it's probably transparent
  if (minDistance > 100) {
    return null;
  }

  return closest ? { dbz: closest.dbz, description: closest.description } : null;
}

/**
 * GET /api/radar/value?lat=XX&lng=YY
 * 
 * Returns the radar reflectivity value at the given coordinates.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat') || '');
    const lng = parseFloat(url.searchParams.get('lng') || '');

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Provide lat and lng query parameters.' },
        { status: 400 }
      );
    }

    // Read metadata to get bounds
    let metadata;
    try {
      const metadataContent = await fs.readFile(METADATA_FILE, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch {
      return NextResponse.json(
        { error: 'Radar data not available. Please wait for data to load.' },
        { status: 404 }
      );
    }

    const [[latMin, lngMin], [latMax, lngMax]] = metadata.bounds;

    // Check if coordinates are within bounds
    if (lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) {
      return NextResponse.json({
        lat,
        lng,
        dbz: null,
        description: 'Outside radar coverage',
      });
    }

    // Read the PNG image
    let imageBuffer;
    try {
      imageBuffer = await fs.readFile(CACHE_FILE);
    } catch {
      return NextResponse.json(
        { error: 'Radar image not found.' },
        { status: 404 }
      );
    }

    // Parse PNG
    const png = PNG.sync.read(imageBuffer);
    const { width, height } = png;

    // Convert lat/lng to pixel coordinates
    // Note: Image is flipped vertically, so we need to invert Y
    const x = Math.floor(((lng - lngMin) / (lngMax - lngMin)) * width);
    const y = Math.floor(((latMax - lat) / (latMax - latMin)) * height); // Inverted

    // Clamp to valid range
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(height - 1, y));

    // Get pixel color (RGBA)
    const idx = (clampedY * width + clampedX) * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];

    // If transparent, no precipitation
    if (a < 50) {
      return NextResponse.json({
        lat,
        lng,
        dbz: null,
        description: 'No precipitation',
      });
    }

    // Find the dBZ value from color
    const result = findClosestColor(r, g, b);

    if (!result) {
      return NextResponse.json({
        lat,
        lng,
        dbz: null,
        description: 'No precipitation',
      });
    }

    return NextResponse.json({
      lat,
      lng,
      dbz: result.dbz,
      description: result.description,
    });

  } catch (error) {
    console.error('Error reading radar value:', error);
    return NextResponse.json(
      { error: 'Failed to read radar value' },
      { status: 500 }
    );
  }
}
