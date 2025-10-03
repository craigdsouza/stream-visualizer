"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMapEvents } from 'react-leaflet';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

interface TransectFeature {
  type: 'Feature';
  properties: {
    transect_id: number;
    vertex_id: number;
    stream_vertex_lat: number;
    stream_vertex_lon: number;
    transect_length_m: number;
    spacing_m: number;
    num_vertices: number;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

interface TransectData {
  type: 'FeatureCollection';
  features: TransectFeature[];
}

type BaseMapType = 'street' | 'satellite';

interface StreamMapProps {
  onActiveVertexChange?: (vertexId: number | null) => void;
  showTransects?: boolean;
  baseMap?: BaseMapType;
}

const StreamMap = ({ onActiveVertexChange, showTransects = true, baseMap = 'street' }: StreamMapProps) => {
  const [transectData, setTransectData] = useState<TransectData | null>(null);
  const [hoveredTransect, setHoveredTransect] = useState<TransectFeature | null>(null);
  const [mapCenter] = useState<[number, number]>([20.94, 71.19]);
  const [mapZoom] = useState(13);

  // Load GeoJSON data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/stream-transects-40m.geojson');
        const data: TransectData = await response.json();
        setTransectData(data);
      } catch (error) {
        console.error('Error loading transect data:', error);
      }
    };

    loadData();
  }, []);

  // Haversine distance in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Closest transect by min distance to any vertex of the LineString
  const findClosestTransect = (mouseLat: number, mouseLng: number): TransectFeature | null => {
    if (!transectData) return null;
    let closest: TransectFeature | null = null;
    let best = Infinity;
    for (const feature of transectData.features) {
      let localMin = Infinity;
      for (const coord of feature.geometry.coordinates) {
        const [lon, lat] = coord; // GeoJSON: [lon, lat]
        const d = calculateDistance(mouseLat, mouseLng, lat, lon);
        if (d < localMin) localMin = d;
      }
      if (localMin < best) {
        best = localMin;
        closest = feature;
      }
    }
    return closest;
  };

  const handleMapMouseMove = (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng;
    const closest = findClosestTransect(lat, lng);
    const currentHoveredId = hoveredTransect?.properties.transect_id;
    const newHoveredId = closest?.properties.transect_id;
    if (currentHoveredId !== newHoveredId) {
      setHoveredTransect(closest);
      onActiveVertexChange?.(closest ? closest.properties.vertex_id : null);
    }
  };

  // Component to bind map mousemove without DOM output
  const MapMouseBinder = () => {
    useMapEvents({ mousemove: handleMapMouseMove });
    return null;
  };

  // Base style for all transects (blue)
  const getBaseTransectStyle = () => ({
    color: '#3b82f6',
    weight: 2,
    opacity: 0.7,
  });

  // Client-only guard for first paint
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) {
    return (
      <div className="w-full h-[600px] bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-gray-600">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-sm border h-[50vh] overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          maxZoom={22 as any}
          style={{ height: '100%', width: '100%' }}
        >
          <MapMouseBinder />
          {baseMap === 'street' ? (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19 as any}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          ) : (
            (() => {
              const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
              if (token && token.length > 0) {
                return (
                  <TileLayer
                    url={`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=${token}`}
                    maxZoom={22 as any}
                    attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                  />
                );
              }
              if (typeof window !== 'undefined') {
                console.warn('NEXT_PUBLIC_MAPBOX_TOKEN not set - falling back to Esri World Imagery');
              }
              return (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={20 as any}
                  attribution='&copy; <a href="https://www.arcgis.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                />
              );
            })()
          )}

          {/* Base transects layer (blue) */}
          {transectData && showTransects && (
            <GeoJSON
              key={`transects-base`}
              data={transectData}
              style={getBaseTransectStyle}
            />
          )}
          {/* Hovered transect overlay (red, on top) */}
          {hoveredTransect && showTransects && (
            <GeoJSON
              key={`hovered-${hoveredTransect.properties.transect_id}`}
              data={{ type: 'FeatureCollection', features: [hoveredTransect] } as any}
              style={() => ({ color: '#ef4444', weight: 4, opacity: 1 })}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default StreamMap;


