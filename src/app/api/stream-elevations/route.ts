import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type ElevationRow = {
  vertex_id: number;
  elevation_normalized_m?: number;
  elevation?: number;
} & Record<string, string | number | undefined>;

function parseCsv(csv: string): ElevationRow[] {
  const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj: Record<string, string | number> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] !== undefined ? cols[i].trim() : '';
    });
    // Convert known numeric fields
    if (typeof obj['vertex_id'] === 'string') obj['vertex_id'] = parseInt(obj['vertex_id'] as string, 10);
    if (typeof obj['elevation_normalized_m'] === 'string') obj['elevation_normalized_m'] = parseFloat(obj['elevation_normalized_m'] as string);
    if (typeof obj['elevation'] === 'string') obj['elevation'] = parseFloat(obj['elevation'] as string);
    return obj as ElevationRow;
  });
  return rows;
}

export async function GET() {
  try {
    const filePath = path.resolve(process.cwd(), 'public', 'stream_elevations.csv');
    const content = await fs.readFile(filePath, 'utf-8');
    const data = parseCsv(content);
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to read stream elevations' }, { status: 500 });
  }
}


