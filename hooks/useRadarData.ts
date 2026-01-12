'use client';

import { useState, useEffect, useCallback } from 'react';
import { RadarData, RadarResponse } from '@/types/radar';

// Auto-refresh interval (2 minutes)
const REFRESH_INTERVAL = 2 * 60 * 1000;

interface UseRadarDataResult {
  data: RadarData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRadarData(): UseRadarDataResult {
  const [data, setData] = useState<RadarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRadarData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const url = forceRefresh ? '/api/radar?refresh=true' : '/api/radar';
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch radar data');
      }

      const radarResponse: RadarResponse = await response.json();

      setData({
        imageUrl: radarResponse.imageUrl,
        timestamp: new Date(radarResponse.timestamp),
        bounds: radarResponse.bounds,
        gridInfo: radarResponse.gridInfo,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching radar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchRadarData(true);
  }, [fetchRadarData]);

  // Initial fetch
  useEffect(() => {
    fetchRadarData();
  }, [fetchRadarData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRadarData(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchRadarData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
