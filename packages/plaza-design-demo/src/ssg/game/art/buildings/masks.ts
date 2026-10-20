/**
 * Signs hide the windows behind them. Any piece with a `mask` property ([left, right, bottom, top] in
 * its own units, the convention Downtown's signs and devices already use) that is attached to a
 * `building.front` (directly, or through whatever it is attached to) hides that front's windows in
 * that rectangle. The result is per-front visual state (`masks`) a scene adapter merges into the
 * environment state; the geometry is static, so it is computed once per document.
 */
import { resolveComposition, type ArtRegistry, type Composition, type Instance, type Properties, type Value } from '../core/composition';
import { frameView } from '../core/view';

const FRONT = 'building.front';
const cache = new WeakMap<Composition, Record<string, Properties>>();
const isMask = (v: unknown): v is number[] => Array.isArray(v) && v.length === 4 && v.every(n => typeof n === 'number' && Number.isFinite(n));

export function frontMasks(registry: ArtRegistry, doc: Composition): Record<string, Properties> {
  const had = cache.get(doc); if (had) return had;
  const nodes = new Map<string, Instance>(), parents = new Map<string, string>(), bindings: Record<string, Value> = {};
  const visit = (list: Instance[], parent?: string) => list.forEach(n => { nodes.set(n.id, n); if (parent) parents.set(n.id, parent); visit(n.children ?? [], n.id); });
  visit(doc.instances);
  const out: Record<string, Properties> = {};
  if ([...nodes.values()].some(n => n.type === FRONT)) {
    // bound fields take their registered defaults: only placements matter here
    for (const n of nodes.values()) for (const [field, source] of Object.entries(n.bindings ?? {})) bindings[source] = registry.get(n.type).visualFields?.[field]?.default ?? null;
    const rows = new Map(resolveComposition(registry, doc, { view: frameView(0), state: {}, bindings, reduced: false }).map(r => [r.instance.id, r]));
    const frontOf = (id: string): string | undefined => { for (let at = nodes.get(id)?.attach?.instance ?? parents.get(id), seen = 0; at && seen < 64; at = nodes.get(at)?.attach?.instance ?? parents.get(at), seen++) if (nodes.get(at)?.type === FRONT) return at; return undefined; };
    for (const row of rows.values()) {
      const m = row.props.mask; if (!isMask(m) || row.instance.type === FRONT) continue;
      const front = frontOf(row.instance.id); if (!front) continue;
      const p = row.placement, F = rows.get(front)!.placement, lx = (wx: number) => (wx - F.x) / (F.scale * F.facing), lh = (h: number) => (h - F.h) / F.scale;
      const a = lx(p.x + m[0] * p.scale * p.facing), b = lx(p.x + m[1] * p.scale * p.facing), c = lh(p.h + m[2] * p.scale), d = lh(p.h + m[3] * p.scale);
      ((out[front] ??= { masks: [] }).masks as Value[]).push([Math.min(a, b), Math.max(a, b), Math.min(c, d), Math.max(c, d)]);
    }
  }
  cache.set(doc, out); return out;
}

/** Merge front masks under any state a caller already supplies for the same instances. */
export function withFrontMasks(registry: ArtRegistry, doc: Composition, state: Readonly<Record<string, Properties>> = {}): Record<string, Properties> {
  const masks = frontMasks(registry, doc), merged: Record<string, Properties> = { ...state };
  for (const [id, s] of Object.entries(masks)) merged[id] = { ...s, ...(state[id] ?? {}) };
  return merged;
}
