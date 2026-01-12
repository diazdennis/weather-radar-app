'use client';

import dynamic from 'next/dynamic';
import { RadarData, ClickInfo } from '@/types/radar';
import { LoadingSpinner } from './LoadingSpinner';

// Dynamically import the map component with SSR disabled
// This is necessary because Leaflet requires window object
const RadarMap = dynamic(
  () => import('./RadarMap').then((mod) => mod.RadarMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-slate-400 text-sm">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface RadarMapWrapperProps {
  data: RadarData | null;
  onClickInfo: (info: ClickInfo | null) => void;
}

export function RadarMapWrapper({ data, onClickInfo }: RadarMapWrapperProps) {
  return <RadarMap data={data} onClickInfo={onClickInfo} />;
}
