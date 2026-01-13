'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Legend } from '@/components/Legend';
import { InfoPanel } from '@/components/InfoPanel';
import { RadarMapWrapper } from '@/components/RadarMapWrapper';
import { LoadingOverlay } from '@/components/LoadingSpinner';
import { useRadarData } from '@/hooks/useRadarData';
import { ClickInfo } from '@/types/radar';

export default function Home() {
  const { data, isLoading, error } = useRadarData();
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);

  const handleClickInfo = (info: ClickInfo | null) => {
    setClickInfo(info);
  };

  const handleCloseInfo = () => {
    setClickInfo(null);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-900">
      {/* Header */}
      <Header
        lastUpdated={data?.timestamp || null}
        isLoading={isLoading}
      />

      {/* Map Container */}
      <div className="absolute inset-0 pt-[72px]">
        <RadarMapWrapper
          data={data}
          onClickInfo={handleClickInfo}
        />
      </div>

      {/* Legend */}
      <Legend className="bottom-4 left-4" />

      {/* Click Info Panel */}
      <InfoPanel
        info={clickInfo}
        onClose={handleCloseInfo}
      />

      {/* Footer */}
      <footer className="absolute bottom-3 right-4 z-[1000]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-700/50 shadow-lg">
          <span className="text-xs text-slate-400">Created by</span>
          <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Dennis Diaz
          </span>
          <span className="text-cyan-400 text-sm">⚡</span>
        </div>
      </footer>

      {/* Loading Overlay (only on initial load) */}
      {isLoading && !data && (
        <LoadingOverlay message="Fetching radar data from MRMS..." />
      )}

      {/* Error State */}
      {error && !data && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-slate-900/90">
          <div className="text-center p-6 max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Failed to Load Radar Data
            </h2>
            <p className="text-slate-400 mb-4">{error}</p>
            <p className="text-sm text-slate-500">
              The radar data will automatically retry. If the problem persists,
              please try refreshing the page.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
