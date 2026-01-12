'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, ImageOverlay, useMapEvents } from 'react-leaflet';
import { LatLngBounds as LeafletBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { RadarData, ClickInfo, LatLngBounds } from '@/types/radar';
import { isWithinBounds } from '@/lib/utils';
import { getDescriptionForDbz } from '@/lib/color-scale';

interface RadarMapProps {
  data: RadarData | null;
  onClickInfo: (info: ClickInfo | null) => void;
}

// Component to handle map click events
function ClickHandler({
  bounds,
  imageUrl,
  onClickInfo,
}: {
  bounds: LatLngBounds | null;
  imageUrl: string | null;
  onClickInfo: (info: ClickInfo | null) => void;
}) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;

      // Check if click is within radar bounds
      if (!bounds || !isWithinBounds(lat, lng, bounds)) {
        onClickInfo({
          lat,
          lng,
          reflectivity: null,
          description: 'Outside radar coverage',
        });
        return;
      }

      // For now, we can't read pixel color from the overlay directly in the browser
      // We'll show the location with a note
      // In a production app, you'd send the coordinates to the backend to get the value
      onClickInfo({
        lat,
        lng,
        reflectivity: null,
        description: 'Click on colored area to see precipitation',
      });
    },
  });

  return null;
}

export function RadarMap({ data, onClickInfo }: RadarMapProps) {
  const [mapReady, setMapReady] = useState(false);

  // CONUS center and default bounds
  const defaultCenter: [number, number] = [39.0, -98.0];
  const defaultZoom = 4;

  // Convert bounds to Leaflet format
  const leafletBounds = data?.bounds
    ? new LeafletBounds(
        [data.bounds[0][0], data.bounds[0][1]], // Southwest
        [data.bounds[1][0], data.bounds[1][1]]  // Northeast
      )
    : null;

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full h-full"
      zoomControl={true}
      minZoom={3}
      maxZoom={10}
    >
      {/* Dark themed base map */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Radar overlay */}
      {data && leafletBounds && (
        <ImageOverlay
          url={data.imageUrl}
          bounds={leafletBounds}
          opacity={0.7}
          zIndex={100}
        />
      )}

      {/* Click handler */}
      <ClickHandler
        bounds={data?.bounds || null}
        imageUrl={data?.imageUrl || null}
        onClickInfo={onClickInfo}
      />
    </MapContainer>
  );
}
