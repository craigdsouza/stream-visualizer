"use client";

import StreamMap from '@/components/StreamMap';
import LongitudinalProfile from '@/components/LongitudinalProfile';
import LateralProfile from '@/components/LateralProfile';
import { useState } from 'react';

export default function Home() {
  const [activeVertexId, setActiveVertexId] = useState<number | null>(null);
  const [showTransects, setShowTransects] = useState<boolean>(true);
  const [baseMap, setBaseMap] = useState<'street' | 'satellite'>('street');
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Stream Transects Visualizer
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Hover over the map to highlight perpendicular transects • Toggle layers: OpenStreetMap/Satellite views, show/hide transects
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8">
            <StreamMap onActiveVertexChange={setActiveVertexId} showTransects={showTransects} baseMap={baseMap} />
          </div>
          {/* Layers control preview (inactive) */}
          <div className="bg-white rounded-lg shadow-sm border p-2 flex flex-col gap-3 lg:col-span-1 h-auto lg:h-[50vh]">
            <div className="text-sm font-semibold text-gray-900">Layers</div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setBaseMap(prev => prev === 'street' ? 'satellite' : 'street')}
                className={`px-2 py-1 rounded border text-sm ${baseMap === 'street' ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-gray-200 text-gray-900 border-gray-400'}`}
              >
                {baseMap === 'street' ? 'Street' : 'Satellite'}
              </button>
              <button
                onClick={() => setShowTransects(v => !v)}
                className={`inline-flex rounded border overflow-hidden text-sm ${showTransects ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-600'}`}
              >
                <span className="px-2 py-1">Transects</span>
              </button>
            </div>
            <div className="mt-auto text-xs text-gray-500">Inactive preview</div>
          </div>
          <div className="lg:col-span-3">
            <LateralProfile vertexId={activeVertexId} />
          </div>
        </div>
        <LongitudinalProfile vertexId={activeVertexId} />
      </main>
    </div>
  );
}
