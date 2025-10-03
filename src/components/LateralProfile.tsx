"use client";

import { useEffect, useMemo, useState } from 'react';

interface LateralProfileProps {
  vertexId: number | null;
}

type TransectPoint = {
  transect_id: number;
  vertex_index: number;
  elevation: number;
  dam?: number;
};

const LateralProfile = ({ vertexId }: LateralProfileProps) => {
  const [data, setData] = useState<TransectPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (vertexId === null) { setData([]); return; }
      try {
        const res = await fetch(`/api/transect-elevations?transect_id=${vertexId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch');
        if (isMounted) setData((json.data as TransectPoint[]).sort((a,b) => a.vertex_index - b.vertex_index));
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch';
        if (isMounted) setError(message);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [vertexId]);

  const width = 600; // base viewBox
  const height = 300;
  const margin = { top: 12, right: 12, bottom: 28, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const minX = 0;
  const maxX = 40; // 0..20 indices at 2 m spacing
  // Fixed Y range [-20, 20]
  const minY = -20;
  const maxY = 20;

  const xScale = (xMeters: number) => margin.left + ((xMeters - minX) / (maxX - minX)) * innerW;
  const yScale = (y: number) => margin.top + innerH - ((y - minY) / (maxY - minY)) * innerH;

  // Elevation line (not rendered, area used instead) - removed to avoid unused var

  // Area under elevation line down to minY baseline
  const areaPathD = useMemo(() => {
    if (data.length === 0) return '';
    const parts: string[] = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const xMeters = d.vertex_index * 2;
      const x = xScale(xMeters);
      const y = yScale(d.elevation);
      parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    const firstX = xScale(data[0].vertex_index * 2);
    const lastX = xScale(data[data.length - 1].vertex_index * 2);
    const baseY = yScale(minY);
    parts.push(`L ${lastX} ${baseY}`);
    parts.push(`L ${firstX} ${baseY}`);
    parts.push('Z');
    return parts.join(' ');
  }, [data, minY, maxY, xScale, yScale]);

  const damPathD = useMemo(() => {
    if (data.length === 0) return '';
    return data.map((d, i) => {
      const xMeters = d.vertex_index * 2;
      const y = typeof d.dam === 'number' ? d.dam : d.elevation;
      return `${i === 0 ? 'M' : 'L'} ${xScale(xMeters)} ${yScale(y)}`;
    }).join(' ');
  }, [data, minY, maxY, xScale, yScale]);

  const gridX = 8; // 0,5,10,...,40
  const xTickValues = useMemo(() => Array.from({ length: gridX + 1 }, (_, i) => (maxX / gridX) * i), [gridX, maxX]);
  // Horizontal grid every 2.5 m from -20 to 20
  const yTickValues = useMemo(() => {
    const vals: number[] = [];
    for (let v = minY; v <= maxY + 1e-9; v += 2.5) vals.push(parseFloat(v.toFixed(2)));
    return vals;
  }, [minY, maxY]);

  return (
    <div className="bg-white rounded-lg shadow-sm border h-[50vh]">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
        {/* title (top-right, overlapping chart) */}
        <text x={margin.left + innerW - 6} y={margin.top + 16} textAnchor="end" fontSize="16" fontWeight="700" fill="#111827">Lateral Profile</text>
        {/* grid */}
        <g stroke="#e5e7eb" strokeWidth="1">
          {xTickValues.map((v, i) => (
            <line key={`gx-${i}`} x1={xScale(v)} y1={margin.top} x2={xScale(v)} y2={margin.top + innerH} />
          ))}
          {yTickValues.map((v, i) => (
            <line key={`gy-${i}`} x1={margin.left} y1={yScale(v)} x2={margin.left + innerW} y2={yScale(v)} />
          ))}
        </g>

        {/* axes and ticks */}
        <g stroke="#9ca3af" strokeWidth="1">
          <line x1={margin.left} y1={margin.top + innerH} x2={margin.left + innerW} y2={margin.top + innerH} />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerH} />
          {xTickValues.map((v, i) => (
            <line key={`xt-${i}`} x1={xScale(v)} y1={margin.top + innerH} x2={xScale(v)} y2={margin.top + innerH + 4} />
          ))}
          {yTickValues.map((v, i) => (
            <line key={`yt-${i}`} x1={margin.left - 4} y1={yScale(v)} x2={margin.left} y2={yScale(v)} />
          ))}
        </g>

        {/* tick labels */}
        <g fill="#374151" fontSize="10">
          {xTickValues.map((v, i) => (
            <text key={`xtl-${i}`} x={xScale(v)} y={margin.top + innerH + 14} textAnchor="middle">{v}</text>
          ))}
          {yTickValues.map((v, i) => (
            <text key={`ytl-${i}`} x={margin.left - 6} y={yScale(v) + 3} textAnchor="end">{v.toFixed(1)}</text>
          ))}
        </g>

        {/* draw dam first (under), then area (over) */}
        {damPathD && (
          <path d={damPathD} fill="none" stroke="#ef4444" strokeWidth="2" />
        )}
        {areaPathD && (
          <path d={areaPathD} fill="#8b5e34" stroke="#8b5e34" strokeWidth="1.5" />
        )}

        {/* axis labels */}
        <text x={margin.left + innerW / 2} y={height - 4} textAnchor="middle" fontSize="10" fill="#374151">width_m</text>
        <text x={12} y={margin.top + innerH / 2} textAnchor="middle" fontSize="10" fill="#374151" transform={`rotate(-90 12 ${margin.top + innerH / 2})`}>elevation</text>
      </svg>
      {error && (
        <div className="absolute text-xs text-red-600 p-2">{error}</div>
      )}
    </div>
  );
};

export default LateralProfile;


