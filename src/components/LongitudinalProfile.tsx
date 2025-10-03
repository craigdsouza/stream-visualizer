"use client";

interface LongitudinalProfileProps {
  vertexId: number | null;
}

import { useEffect, useMemo, useState } from 'react';

type ElevationRow = {
  vertex_id: number;
  elevation_normalized_m?: number;
  elevation?: number;
};

const LongitudinalProfile = ({ vertexId }: LongitudinalProfileProps) => {
  const [data, setData] = useState<ElevationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/stream-elevations');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch');
        if (isMounted) setData(json.data as ElevationRow[]);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch';
        if (isMounted) setError(message);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const { minX, maxX, usingNormalized } = useMemo(() => {
    if (data.length === 0) return { minX: 0, maxX: 1, usingNormalized: false } as any;
    const hasNormalized = data.some(d => typeof d.elevation_normalized_m === 'number' && !Number.isNaN(d.elevation_normalized_m));
    let minXv = Infinity, maxXv = -Infinity, minYv = Infinity, maxYv = -Infinity;
    for (const row of data) {
      if (row.vertex_id < minXv) minXv = row.vertex_id;
      if (row.vertex_id > maxXv) maxXv = row.vertex_id;
      const yVal = hasNormalized ? (row.elevation_normalized_m as number) : (row.elevation as number);
      if (yVal < minYv) minYv = yVal;
      if (yVal > maxYv) maxYv = yVal;
    }
    return { minX: minXv, maxX: maxXv, usingNormalized: hasNormalized } as any;
  }, [data]);

  const width = 1000; // base viewBox width (stretches to container)
  const height = 200; // base viewBox height
  const margin = { top: 24, right: 12, bottom: 26, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Fixed Y range and grid for longitudinal profile
  const minY: number = -15;
  const maxY: number = 7.5;

  const xScale = (x: number) => {
    if (maxX === minX) return margin.left + innerW / 2;
    return margin.left + ((x - minX) / (maxX - minX)) * innerW;
  };
  const yScale = (y: number) => {
    if (maxY === minY) return margin.top + innerH / 2;
    return margin.top + innerH - ((y - minY) / (maxY - minY)) * innerH;
  };

  const pathD = useMemo(() => {
    if (data.length === 0) return '';
    const sorted = [...data].sort((a, b) => a.vertex_id - b.vertex_id);
    return sorted.map((d, i) => {
      const yVal = usingNormalized ? (d.elevation_normalized_m as number) : (d.elevation as number);
      return `${i === 0 ? 'M' : 'L'} ${xScale(d.vertex_id)} ${yScale(yVal)}`;
    }).join(' ');
  }, [data, minX, maxX, minY, maxY, usingNormalized]);

  // Area under longitudinal profile down to fixed baseline minY
  const areaPathD = useMemo(() => {
    if (data.length === 0) return '';
    const sorted = [...data].sort((a, b) => a.vertex_id - b.vertex_id);
    const commands: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const d = sorted[i];
      const yVal = usingNormalized ? (d.elevation_normalized_m as number) : (d.elevation as number);
      const x = xScale(d.vertex_id);
      const y = yScale(yVal);
      commands.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    const firstX = xScale(sorted[0].vertex_id);
    const lastX = xScale(sorted[sorted.length - 1].vertex_id);
    const baseY = yScale(minY);
    commands.push(`L ${lastX} ${baseY}`);
    commands.push(`L ${firstX} ${baseY}`);
    commands.push('Z');
    return commands.join(' ');
  }, [data, minY, maxY, usingNormalized]);

  // gridlines and ticks
  const gridX = 6;
  const gridLinesX = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i <= gridX; i++) {
      const x = margin.left + (innerW * i) / gridX;
      lines.push({ x1: x, y1: margin.top, x2: x, y2: margin.top + innerH });
    }
    return lines;
  }, [innerW, innerH]);

  const xTickValues = useMemo(() => {
    const vals: number[] = [];
    for (let i = 0; i <= gridX; i++) {
      const v = minX + ((maxX - minX) * i) / gridX;
      vals.push(Math.round(v));
    }
    return vals;
  }, [minX, maxX]);

  const yTickValues = useMemo(() => {
    const vals: number[] = [];
    for (let v = minY; v <= maxY + 1e-9; v += 2.5) vals.push(parseFloat(v.toFixed(2)));
    return vals;
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border h-[25vh]">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
        {/* title (top-right, overlapping chart) */}
        <text x={margin.left + innerW - 6} y={margin.top + 16} textAnchor="end" fontSize="16" fontWeight="700" fill="#111827">Longitudinal Profile</text>
        {/* grid */}
        <g stroke="#e5e7eb" strokeWidth="1">
          {gridLinesX.map((l, idx) => (
            <line key={idx} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
          {yTickValues.map((v, i) => (
            <line key={`gyl-${i}`} x1={margin.left} y1={yScale(v)} x2={margin.left + innerW} y2={yScale(v)} />
          ))}
        </g>

        {/* axes and tick marks */}
        <g stroke="#9ca3af" strokeWidth="1">
          {/* axes */}
          <line x1={margin.left} y1={margin.top + innerH} x2={margin.left + innerW} y2={margin.top + innerH} />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + innerH} />
          {/* x ticks */}
          {xTickValues.map((v, i) => (
            <line key={`xt-${i}`} x1={xScale(v)} y1={margin.top + innerH} x2={xScale(v)} y2={margin.top + innerH + 4} />
          ))}
          {/* y ticks */}
          {yTickValues.map((v, i) => (
            <line key={`yt-${i}`} x1={margin.left - 4} y1={yScale(v)} x2={margin.left} y2={yScale(v)} />
          ))}
        </g>

        {/* tick labels */}
        <g fill="#374151" fontSize="10">
          {xTickValues.map((v, i) => (
            <text key={`xtl-${i}`} x={xScale(v)} y={margin.top + innerH + 14} textAnchor="middle">{Math.round(v * 10)}</text>
          ))}
          {yTickValues.map((v, i) => (
            <text key={`ytl-${i}`} x={margin.left - 6} y={yScale(v) + 3} textAnchor="end">{v.toFixed(1)}</text>
          ))}
        </g>

        {/* area path for longitudinal profile (brown) */}
        {areaPathD && (
          <path d={areaPathD} fill="#8b5e34" stroke="#8b5e34" strokeWidth="1.5" />
        )}

        {/* vertices */}
        <g>
          {data.map((d) => {
            const yVal = usingNormalized ? (d.elevation_normalized_m as number) : (d.elevation as number);
            return (
            <circle
              key={d.vertex_id}
              cx={xScale(d.vertex_id)}
              cy={yScale(yVal)}
              r={0.5}
              fill="#ffffff"
              stroke="#000000"
              strokeWidth={0.5}
            />
          );})}
        </g>

        {/* active vertex highlight */}
        {vertexId !== null && (
          (() => {
            const found = data.find((d) => d.vertex_id === vertexId);
            if (!found) return null as any;
            const yVal = usingNormalized ? (found.elevation_normalized_m as number) : (found.elevation as number);
            return (
              <circle
                cx={xScale(found.vertex_id)}
                cy={yScale(yVal)}
                r={3}
                fill="#f59e0b"
                stroke="#000000"
                strokeWidth={0.5}
              />
            );
          })()
        )}
        {/* axis labels */}
        <text x={margin.left + innerW / 2} y={height - 2} textAnchor="middle" fontSize="10" fill="#374151">
          length_m
        </text>
        <text x={12} y={margin.top + innerH / 2} textAnchor="middle" fontSize="10" fill="#374151" transform={`rotate(-90 12 ${margin.top + innerH / 2})`}>
          {usingNormalized ? 'elevation_normalized_m' : 'elevation'}
        </text>
      </svg>
      {error && (
        <div className="absolute text-xs text-red-600 p-2">{error}</div>
      )}
    </div>
  );
};

export default LongitudinalProfile;


