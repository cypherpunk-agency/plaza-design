import type {Case, DeviceData, Value} from '../data/types';
import type {TypedForm} from './typed-form';
/**
 * The state view (docs/design/CIRCUIT-VOCABULARY.md): a device's cases read as a state machine.
 * For every state key its verbs `set`, the values it takes and each transition: which part's
 * verb, under which condition, sets which value. It only reads; the cases are edited where they
 * are, in the device's parts. No runtime of its own: the engine runs the cases as always.
 */
export interface Transition {noun: string; verb: string; when?: string; to: Value}
export function deviceTransitions(device: DeviceData): Map<string, Transition[]> {
  const out = new Map<string, Transition[]>();
  for (const n of device.nouns) for (const [verb, raw] of Object.entries(n.on ?? {})) for (const c of ([] as Case[]).concat(raw)) for (const step of c.do ?? []) {
    if (!step || typeof step !== 'object' || !('set' in step)) continue;
    const key = String(step.set), list = out.get(key) ?? [];
    list.push({noun: n.id, verb, ...(c.if ? {when: c.if} : {}), to: (step as {to: Value}).to});
    out.set(key, list);
  }
  return out;
}
export function renderStateView(host: HTMLElement, form: TypedForm, device: DeviceData, state: Record<string, Value>) {
  const machines = deviceTransitions(device);
  if (!machines.size) return;
  const box = form.section(host, 'States of ' + device.id);
  for (const [key, list] of machines) {
    const values = [...new Set([state[key], ...list.map(t => t.to)].filter(v => v !== undefined).map(String))];
    const head = document.createElement('p');
    head.textContent = `${key}: ${values.join(' · ')} (starts ${state[key] === undefined ? 'unset' : String(state[key])})`;
    const rows = document.createElement('ul');
    for (const t of list) { const li = document.createElement('li'); li.textContent = `${t.noun} --${t.verb}${t.when ? ` if ${t.when}` : ''} → ${String(t.to)}`; rows.append(li); }
    box.append(head, rows);
  }
}
