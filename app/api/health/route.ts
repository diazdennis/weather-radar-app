import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * 
 * Simple health check endpoint for Render.
 * This returns immediately without any radar processing.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
