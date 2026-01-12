'use client';

import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';

interface HeaderProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  className?: string;
}

export function Header({ lastUpdated, isLoading, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'absolute top-0 left-0 right-0 z-[1000]',
        'bg-gradient-to-b from-slate-900/95 to-slate-900/80',
        'backdrop-blur-sm border-b border-slate-700/50',
        'px-4 py-3',
        className
      )}
    >
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🌩️</div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Weather Radar
            </h1>
            <p className="text-xs text-slate-400">
              MRMS Reflectivity at Lowest Altitude
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm">Updating...</span>
            </div>
          ) : lastUpdated ? (
            <div className="text-right">
              <p className="text-xs text-slate-500">Last updated</p>
              <p className="text-sm text-slate-300 font-medium">
                {formatDateTime(lastUpdated)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
