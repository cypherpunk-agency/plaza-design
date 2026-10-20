/**
 * Kit presets (art/presets/kit-presets.json): named, saved settings of a kit element, e.g. "Night ferry" is
 * a Boat with the ferry's paint, nav lights and loop lane. Add artwork lists them under their kit; the
 * inspector saves, updates, renames and deletes them. A preset is only settings: placing one adds an
 * ordinary kit instance, so later kit improvements reach every piece made from it.
 */
import type { ArtRegistry, Properties } from '../art/core/composition';

export interface KitPreset { id: string; label: string; kit: string; note?: string; props: Properties }
export interface KitPresets { version: 1; presets: KitPreset[] }
export const PRESETS_DOCUMENT = 'kit-presets';

const fail = (s: string): never => { throw new Error('Kit presets: ' + s); };
const plain = (v: unknown, what: string) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(what + ' must be an object'); return v as Record<string, unknown>; };

/** Every preset names a reusable kit element, and its settings are valid for that element. */
export function validatePresets(value: unknown, registry: ArtRegistry): KitPresets {
  const d = plain(value, 'document');
  if (Object.keys(d).some(k => k !== 'version' && k !== 'presets')) fail('unknown field');
  if (d.version !== 1) fail('version must be 1');
  if (!Array.isArray(d.presets) || d.presets.length > 500) fail('presets must be a list (500 at most)');
  const ids = new Set<string>();
  for (const raw of d.presets as unknown[]) {
    const p = plain(raw, 'preset');
    if (Object.keys(p).some(k => !['id', 'label', 'kit', 'note', 'props'].includes(k))) fail('unknown preset field');
    if (typeof p.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(p.id)) fail(`preset id "${String(p.id)}" must be lower-case letters, digits and dashes`);
    const id = p.id as string; if (ids.has(id)) fail(`two presets are called ${id}`); ids.add(id);
    if (typeof p.label !== 'string' || !p.label.trim() || p.label.length > 80) fail(`${p.id}: name must be 1 to 80 characters`);
    if (p.note !== undefined && (typeof p.note !== 'string' || p.note.length > 240)) fail(`${p.id}: note must be text (240 characters at most)`);
    if (typeof p.kit !== 'string' || !registry.catalog().some(e => e.type === p.kit && e.libraryUse === 'reusable')) fail(`${p.id}: "${String(p.kit)}" is not a kit element`);
    try { registry.properties(p.kit as string, plain(p.props, `${p.id} settings`) as Properties); } catch (e) { fail(`${p.id}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  return structuredClone(value) as KitPresets;
}

export const presetsFor = (doc: KitPresets | undefined, kit: string) => (doc?.presets ?? []).filter(p => p.kit === kit);

/** A free preset id from a name ("Night ferry" → night-ferry, night-ferry-2, …). */
export function presetId(doc: KitPresets, label: string) {
  const base = label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56) || 'preset';
  let id = base, n = 2; while (doc.presets.some(p => p.id === id)) id = `${base}-${n++}`; return id;
}

/** Only the settings that differ from the kit's defaults are kept, so presets stay readable and follow new defaults. */
export function presetProps(registry: ArtRegistry, kit: string, props: Properties): Properties {
  const fields = registry.get(kit).fields, out: Properties = {};
  for (const [key, field] of Object.entries(fields)) if (props[key] !== undefined && JSON.stringify(props[key]) !== JSON.stringify(field.default)) out[key] = structuredClone(props[key]);
  return out;
}
