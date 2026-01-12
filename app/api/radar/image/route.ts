import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'public', 'radar');
const CACHE_FILE = path.join(CACHE_DIR, 'latest.png');

/**
 * GET /api/radar/image
 * 
 * Serves the cached radar PNG image.
 * This is needed because Next.js standalone mode doesn't serve static files.
 */
export async function GET() {
  try {
    // Check if file exists
    try {
      await fs.access(CACHE_FILE);
    } catch {
      return NextResponse.json(
        { error: 'Radar image not found. Try refreshing the data first.' },
        { status: 404 }
      );
    }

    // Read the image file
    const imageBuffer = await fs.readFile(CACHE_FILE);

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
        'Content-Length': imageBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving radar image:', error);
    return NextResponse.json(
      { error: 'Failed to serve radar image' },
      { status: 500 }
    );
  }
}
