import { NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const FILE = process.env.DIRECTIONS_PATH || path.join(process.cwd(), 'directions.json');

export const dynamic = 'force-dynamic';

// Accept either { instructions: [...] } or { directions: {...}, scenario: {...} }.
// Only return `directions` when it is a well-formed instruction list.
function normalize(parsed: unknown): { directions: unknown | null; scenario: unknown | null } {
  const p = parsed as Record<string, unknown> | null;
  const candidate =
    p && Array.isArray((p as { instructions?: unknown }).instructions)
      ? { instructions: (p as { instructions: unknown[] }).instructions }
      : (p?.directions as { instructions?: unknown } | undefined) ?? null;
  const directions =
    candidate && Array.isArray((candidate as { instructions?: unknown }).instructions) ? candidate : null;
  const scenario = (p?.scenario as unknown) ?? null;
  return { directions, scenario };
}

export async function GET() {
  try {
    const [buf, st] = await Promise.all([readFile(FILE, 'utf8'), stat(FILE)]);
    const { directions, scenario } = normalize(JSON.parse(buf));
    return NextResponse.json({ directions, scenario, mtimeMs: st.mtimeMs });
  } catch {
    return NextResponse.json({ directions: null, scenario: null, mtimeMs: 0 });
  }
}
