import type { PlayFixture, PlayFixtureVocabulary } from '../world/checkpoints';
import type { StateDeclaration, StateValue } from '../engine/gameplay/types';
/**
 * Review · live state. Pure comparisons of the detached snapshots that private Play already
 * posts (`game.inspect()`), so the editor can show what a run changed and log what happened
 * without reaching into the isolated realm.
 */
export interface LiveSnapshot {
  scene?: string;
  objective?: unknown;
  save?: {
    handle?: string;
    tokens?: number;
    jump?: boolean;
    flags?: Record<string, boolean>;
    items?: Record<string, number>;
    keyring?: string[];
    controlled?: string[];
    programs?: string[];
    modules?: string[];
    gameplay?: Record<string, Record<string, unknown>>;
    clock?: { day?: number; min?: number; minute?: number };
  };
  dialogue?: { speaker?: string } | null;
  conversation?: { speaker?: string } | null;
}
export interface LiveChange {
  key: string;
  label: string;
  before: string;
  after: string;
}
const show = (v: unknown) =>
  v === undefined ? '—' : typeof v === 'string' ? (v === '' ? '“”' : v) : JSON.stringify(v);
/** Flatten a snapshot into comparable `group.key` values. */
export function liveValues(s: LiveSnapshot): Map<string, { label: string; value: unknown }> {
  const out = new Map<string, { label: string; value: unknown }>();
  const save = s.save ?? {};
  if (s.scene !== undefined) out.set('scene', { label: 'Scene', value: s.scene });
  if (save.handle !== undefined) out.set('handle', { label: 'Player name', value: save.handle });
  if (save.tokens !== undefined) out.set('tokens', { label: 'Tokens', value: save.tokens });
  if (save.jump !== undefined) out.set('jump', { label: 'Jump', value: save.jump });
  for (const [k, v] of Object.entries(save.flags ?? {}))
    out.set('flag.' + k, { label: k, value: v });
  for (const [k, v] of Object.entries(save.items ?? {}))
    out.set('item.' + k, { label: k, value: v });
  for (const group of ['keyring', 'controlled', 'programs', 'modules'] as const)
    for (const id of save[group] ?? [])
      out.set(group + '.' + id, { label: group + ' ' + id, value: true });
  for (const [owner, values] of Object.entries(save.gameplay ?? {}))
    for (const [k, v] of Object.entries(values ?? {}))
      out.set('state.' + owner + '.' + k, { label: owner + '.' + k, value: v });
  return out;
}
/** Values that differ between the run's first snapshot and now, in a stable order. */
export function runChanges(start: LiveSnapshot, now: LiveSnapshot): LiveChange[] {
  const a = liveValues(start),
    b = liveValues(now),
    keys = [...new Set([...a.keys(), ...b.keys()])];
  const changes: LiveChange[] = [];
  for (const key of keys) {
    const before = a.get(key),
      after = b.get(key);
    // An absent flag and `false`, or an absent item and 0, mean the same thing.
    const norm = (v: unknown) => (v === false || v === 0 || v === undefined ? undefined : v);
    if (JSON.stringify(norm(before?.value)) === JSON.stringify(norm(after?.value))) continue;
    changes.push({
      key,
      label: (after ?? before)!.label,
      before: show(before?.value),
      after: show(after?.value),
    });
  }
  return changes;
}
/** Readable clock text from a save clock (minutes since midnight). */
export function clockText(clock?: { day?: number; min?: number; minute?: number }) {
  const c = clock;
  const minute = c?.min ?? c?.minute;
  if (minute === undefined) return '—';
  const h = Math.floor(minute / 60) % 24,
    m = Math.floor(minute % 60);
  return (
    'day ' + (c?.day ?? 1) + ' · ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
  );
}
export interface LiveEvent {
  type: 'scene' | 'objective' | 'state' | 'conversation';
  message: string;
}
const objectiveText = (o: unknown) =>
  o && typeof o === 'object' && 'text' in (o as object)
    ? String((o as { text: unknown }).text)
    : o
      ? String(o)
      : '';
/** What happened between two consecutive snapshots, as log lines. */
export function snapshotEvents(prev: LiveSnapshot, next: LiveSnapshot): LiveEvent[] {
  const events: LiveEvent[] = [];
  if (prev.scene !== next.scene && next.scene)
    events.push({ type: 'scene', message: 'entered ' + next.scene });
  const po = objectiveText(prev.objective),
    no = objectiveText(next.objective);
  if (po !== no) events.push({ type: 'objective', message: no ? 'goal: ' + no : 'goal cleared' });
  const speaking = (s: LiveSnapshot) => s.conversation?.speaker ?? s.dialogue?.speaker;
  if (speaking(next) && speaking(prev) !== speaking(next))
    events.push({ type: 'conversation', message: speaking(next) + ' speaks' });
  for (const change of runChanges(prev, next))
    if (change.key !== 'scene')
      events.push({
        type: 'state',
        message: change.label + ' ' + change.before + ' → ' + change.after,
      });
  return events;
}

/**
 * "Save this moment as a checkpoint": a starting state from a running snapshot. Only values the
 * checkpoint vocabulary declares are kept (others are listed in `dropped`); scalar state keeps
 * values that differ from their declared defaults, under the checkpoint's own key names.
 */
export function momentFixture(
  base: PlayFixture,
  now: LiveSnapshot & { player?: { x?: number } },
  vocabulary: Pick<PlayFixtureVocabulary, 'flags' | 'programs' | 'keyring'>,
  declarations: Readonly<Record<string, StateDeclaration>>,
): { fixture: PlayFixture; dropped: string[] } {
  const save = now.save ?? {},
    dropped: string[] = [],
    keep = (kind: string, ids: readonly string[], known: ReadonlySet<string>) =>
      ids.filter((id) => known.has(id) || (dropped.push(kind + ' ' + id), false));
  const fixture = structuredClone(base);
  fixture.flags = Object.fromEntries(
    keep(
      'flag',
      Object.keys(save.flags ?? {}).filter((k) => save.flags![k]),
      vocabulary.flags,
    ).map((k) => [k, true]),
  );
  fixture.items = Object.fromEntries(Object.entries(save.items ?? {}).filter(([, n]) => n > 0));
  fixture.tokens = save.tokens ?? fixture.tokens;
  fixture.programs = keep('program', save.programs ?? [], vocabulary.programs);
  fixture.keyring = keep('key', save.keyring ?? [], vocabulary.keyring);
  fixture.modules = [...(save.modules ?? fixture.modules)];
  if (save.handle) fixture.handle = save.handle;
  else delete fixture.handle;
  const state: Record<string, StateValue> = {};
  for (const [owner, values] of Object.entries(save.gameplay ?? {}))
    for (const [local, value] of Object.entries(values ?? {})) {
      const key = owner === base.scene ? local : owner + '.' + local,
        d = declarations[key];
      if (!d) continue;
      if (JSON.stringify(value) !== JSON.stringify(d.default)) state[key] = value as StateValue;
    }
  fixture.state = state;
  const minute = save.clock?.min ?? save.clock?.minute;
  if (save.clock?.day !== undefined) fixture.day = save.clock.day;
  if (minute !== undefined) fixture.minute = Math.floor(minute);
  if (now.player?.x !== undefined && Number.isFinite(now.player.x))
    fixture.spawn = Math.round(now.player.x);
  delete fixture.entrance;
  delete fixture.sequence;
  return { fixture, dropped };
}
