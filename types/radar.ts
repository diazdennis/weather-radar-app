/**
 * Radar data types for the weather radar application
 */

/**
 * Grid bounds in lat/lng format
 * [[south, west], [north, east]]
 */
export type LatLngBounds = [[number, number], [number, number]];

/**
 * Grid information for the radar data
 */
export interface GridInfo {
  width: number;
  height: number;
  resolution: number; // km per pixel
}

/**
 * Response from the /api/radar endpoint
 */
export interface RadarResponse {
  imageUrl: string;
  timestamp: string;
  bounds: LatLngBounds;
  gridInfo: GridInfo;
}

/**
 * Radar data state for the frontend
 */
export interface RadarData {
  imageUrl: string;
  timestamp: Date;
  bounds: LatLngBounds;
  gridInfo: GridInfo;
}

/**
 * Click info displayed when user clicks on the map
 */
export interface ClickInfo {
  lat: number;
  lng: number;
  reflectivity: number | null;
  description: string;
}

/**
 * Reflectivity color scale entry
 */
export interface ColorScaleEntry {
  minDbz: number;
  maxDbz: number;
  color: string;
  rgba: [number, number, number, number];
  label: string;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  details?: string;
}
