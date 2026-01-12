import { ColorScaleEntry } from '@/types/radar';

/**
 * NWS Standard Radar Reflectivity Color Scale
 * Maps dBZ values to colors for radar display
 */
export const RADAR_COLOR_SCALE: ColorScaleEntry[] = [
  {
    minDbz: -999,
    maxDbz: 5,
    color: 'transparent',
    rgba: [0, 0, 0, 0],
    label: 'None',
  },
  {
    minDbz: 5,
    maxDbz: 10,
    color: '#04e9e7',
    rgba: [4, 233, 231, 180],
    label: 'Light Mist',
  },
  {
    minDbz: 10,
    maxDbz: 15,
    color: '#019ff4',
    rgba: [1, 159, 244, 180],
    label: 'Mist',
  },
  {
    minDbz: 15,
    maxDbz: 20,
    color: '#0300f4',
    rgba: [3, 0, 244, 180],
    label: 'Light Rain',
  },
  {
    minDbz: 20,
    maxDbz: 25,
    color: '#02fd02',
    rgba: [2, 253, 2, 180],
    label: 'Light Rain',
  },
  {
    minDbz: 25,
    maxDbz: 30,
    color: '#01c501',
    rgba: [1, 197, 1, 180],
    label: 'Moderate Rain',
  },
  {
    minDbz: 30,
    maxDbz: 35,
    color: '#008e00',
    rgba: [0, 142, 0, 180],
    label: 'Moderate Rain',
  },
  {
    minDbz: 35,
    maxDbz: 40,
    color: '#fdf802',
    rgba: [253, 248, 2, 180],
    label: 'Heavy Rain',
  },
  {
    minDbz: 40,
    maxDbz: 45,
    color: '#e5bc00',
    rgba: [229, 188, 0, 180],
    label: 'Heavy Rain',
  },
  {
    minDbz: 45,
    maxDbz: 50,
    color: '#fd9500',
    rgba: [253, 149, 0, 180],
    label: 'Very Heavy Rain',
  },
  {
    minDbz: 50,
    maxDbz: 55,
    color: '#fd0000',
    rgba: [253, 0, 0, 180],
    label: 'Intense',
  },
  {
    minDbz: 55,
    maxDbz: 60,
    color: '#d40000',
    rgba: [212, 0, 0, 180],
    label: 'Intense',
  },
  {
    minDbz: 60,
    maxDbz: 65,
    color: '#bc0000',
    rgba: [188, 0, 0, 180],
    label: 'Severe',
  },
  {
    minDbz: 65,
    maxDbz: 70,
    color: '#f800fd',
    rgba: [248, 0, 253, 180],
    label: 'Severe',
  },
  {
    minDbz: 70,
    maxDbz: 75,
    color: '#9854c6',
    rgba: [152, 84, 198, 180],
    label: 'Extreme',
  },
  {
    minDbz: 75,
    maxDbz: 999,
    color: '#ffffff',
    rgba: [255, 255, 255, 200],
    label: 'Extreme',
  },
];

/**
 * Get the color scale entry for a given dBZ value
 */
export function getColorForDbz(dbz: number): ColorScaleEntry {
  for (const entry of RADAR_COLOR_SCALE) {
    if (dbz >= entry.minDbz && dbz < entry.maxDbz) {
      return entry;
    }
  }
  return RADAR_COLOR_SCALE[0];
}

/**
 * Get the description for a given dBZ value
 */
export function getDescriptionForDbz(dbz: number | null): string {
  if (dbz === null || dbz < 5) {
    return 'No precipitation';
  }
  const entry = getColorForDbz(dbz);
  return entry.label;
}

/**
 * Estimate dBZ from RGBA color (approximate inverse of color scale)
 * This is used when clicking on the radar image
 */
export function estimateDbzFromColor(
  r: number,
  g: number,
  b: number,
  a: number
): number | null {
  // If mostly transparent, no precipitation
  if (a < 50) {
    return null;
  }

  // Find closest match in color scale
  let closestMatch: ColorScaleEntry | null = null;
  let minDistance = Infinity;

  for (const entry of RADAR_COLOR_SCALE) {
    if (entry.rgba[3] === 0) continue; // Skip transparent

    const [er, eg, eb] = entry.rgba;
    const distance = Math.sqrt(
      Math.pow(r - er, 2) + Math.pow(g - eg, 2) + Math.pow(b - eb, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = entry;
    }
  }

  if (closestMatch) {
    // Return middle of the dBZ range
    return (closestMatch.minDbz + closestMatch.maxDbz) / 2;
  }

  return null;
}

/**
 * Get the legend entries for display (filtered for UI)
 */
export function getLegendEntries(): ColorScaleEntry[] {
  return RADAR_COLOR_SCALE.filter(
    (entry) => entry.minDbz >= 5 && entry.minDbz <= 70
  );
}
