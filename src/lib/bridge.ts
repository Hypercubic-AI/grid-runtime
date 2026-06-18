import type { Directions, Scenario } from './types';

export interface BridgePayload {
  directions: Directions | null;
  scenario: Scenario | null;
}

// Accept either { instructions: [...] } or { directions: {...}, scenario: {...} }.
// Only return `directions` when it is a well-formed instruction list.
export function normalizeDirectionsFile(parsed: unknown): BridgePayload {
  const p = (parsed ?? null) as Record<string, unknown> | null;
  const inner =
    p && Array.isArray((p as { instructions?: unknown }).instructions)
      ? { instructions: (p as { instructions: unknown[] }).instructions }
      : ((p?.directions as { instructions?: unknown } | undefined) ?? null);
  const directions =
    inner && Array.isArray((inner as { instructions?: unknown }).instructions)
      ? (inner as unknown as Directions)
      : null;
  const scenario = (p?.scenario as Scenario | undefined) ?? null;
  return { directions, scenario };
}
