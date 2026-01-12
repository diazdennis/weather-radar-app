'use client';

import { cn } from '@/lib/utils';
import { ClickInfo } from '@/types/radar';
import { getColorForDbz } from '@/lib/color-scale';

interface InfoPanelProps {
  info: ClickInfo | null;
  onClose: () => void;
  className?: string;
}

export function InfoPanel({ info, onClose, className }: InfoPanelProps) {
  if (!info) return null;

  const colorEntry = info.reflectivity !== null 
    ? getColorForDbz(info.reflectivity) 
    : null;

  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 z-[1000]',
        'bg-slate-900/95 backdrop-blur-sm',
        'rounded-lg border border-slate-700/50',
        'p-4 shadow-xl min-w-[200px]',
        'animate-in fade-in slide-in-from-right-2 duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <h3 className="text-sm font-semibold text-white">Location Info</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1"
          aria-label="Close info panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-slate-500">Latitude</span>
          <span className="text-slate-200 font-mono">
            {info.lat.toFixed(4)}°N
          </span>
          <span className="text-slate-500">Longitude</span>
          <span className="text-slate-200 font-mono">
            {Math.abs(info.lng).toFixed(4)}°W
          </span>
        </div>

        <div className="border-t border-slate-700/50 my-2" />

        <div className="flex items-center gap-3">
          {colorEntry && info.reflectivity !== null ? (
            <>
              <div
                className="w-8 h-8 rounded-md border border-slate-600/50"
                style={{ backgroundColor: colorEntry.color }}
              />
              <div>
                <p className="text-white font-semibold">
                  {info.reflectivity.toFixed(0)} dBZ
                </p>
                <p className="text-sm text-slate-400">{info.description}</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md border border-slate-600/50 bg-slate-800" />
              <div>
                <p className="text-slate-400">No precipitation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
