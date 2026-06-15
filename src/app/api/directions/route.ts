import { NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { normalizeDirectionsFile } from '@/lib/bridge';

const FILE = process.env.DIRECTIONS_PATH || path.join(process.cwd(), 'directions.json');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Read + parse first, then stat: a successful parse is always paired with a
    // mtime taken at or after the body we actually parsed (avoids a torn-read race).
    const buf = await readFile(FILE, 'utf8');
    const { directions, scenario } = normalizeDirectionsFile(JSON.parse(buf));
    const st = await stat(FILE);
    return NextResponse.json({ directions, scenario, mtimeMs: st.mtimeMs });
  } catch {
    return NextResponse.json({ directions: null, scenario: null, mtimeMs: 0 });
  }
}
