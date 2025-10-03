import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Row {
  transect_id: number;
  vertex_index: number;
  elevation: number;
  dam?: number;
}

function parseCsv(csv: string): Row[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = cols[i] !== undefined ? cols[i].trim() : ''; });
    obj.transect_id = parseInt(obj.transect_id, 10);
    obj.vertex_index = parseInt(obj.vertex_index, 10);
    obj.elevation = parseFloat(obj.elevation);
    if (Object.prototype.hasOwnProperty.call(obj, 'dam')) {
      const v = parseFloat(obj.dam);
      obj.dam = Number.isNaN(v) ? undefined : v;
    }
    return obj as Row;
  });
}

export async function GET(req: NextRequest) {
  try {
    const filePath = path.resolve(process.cwd(), 'public', 'transect_elevations_with_dam.csv');
    const content = await fs.readFile(filePath, 'utf-8');
    const data = parseCsv(content);

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('transect_id');
    const transectId = idParam ? parseInt(idParam, 10) : null;
    const filtered = transectId !== null ? data.filter(d => d.transect_id === transectId) : data;

    return NextResponse.json({ data: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to read transect elevations' }, { status: 500 });
  }
}


