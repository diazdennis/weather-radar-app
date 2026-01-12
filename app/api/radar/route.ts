import { NextResponse } from 'next/server';
import { fetchLatestRadar, getRadarData } from '@/lib/radar-processor';
import { RadarResponse, ApiError } from '@/types/radar';

/**
 * GET /api/radar
 * 
 * Fetches the latest radar data from MRMS and returns processed image URL and metadata.
 * Uses caching to avoid refetching data within 2 minutes.
 */
export async function GET(
  request: Request
): Promise<NextResponse<RadarResponse | ApiError>> {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    let radarData: RadarResponse | null = null;

    if (!forceRefresh) {
      // Try to get cached data first for faster response
      radarData = await getRadarData();
    }

    if (!radarData || forceRefresh) {
      // Fetch fresh data
      radarData = await fetchLatestRadar();
    }

    return NextResponse.json(radarData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching radar data:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to fetch radar data',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
