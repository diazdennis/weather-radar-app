'use client';

import { cn } from '@/lib/utils';
import { getLegendEntries } from '@/lib/color-scale';

interface LegendProps {
  className?: string;
}

export function Legend({ className }: LegendProps) {
  const entries = getLegendEntries();

  // Group entries by label to reduce visual clutter
  const groupedEntries = entries.reduce(
    (acc, entry) => {
      const key = `${entry.minDbz}-${entry.color}`;
      if (!acc.some((e) => e.color === entry.color)) {
        acc.push(entry);
      }
      return acc;
    },
    [] as typeof entries
  );

  return (
    <div
      className={cn(
        'absolute bottom-4 left-4 z-[1000]',
        'bg-slate-900/90 backdrop-blur-sm',
        'rounded-lg border border-slate-700/50',
        'p-3 shadow-xl',
        className
      )}
    >
      <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
        Reflectivity (dBZ)
      </h3>
      <div className="flex flex-col gap-1">
        {groupedEntries.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-6 h-3 rounded-sm border border-slate-600/50"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-slate-400 font-mono">
              {entry.minDbz}+
            </span>
            <span className="text-xs text-slate-500">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
