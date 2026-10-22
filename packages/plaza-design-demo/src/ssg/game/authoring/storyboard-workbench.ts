/**
 * Library › Storyboard: the acts as strips of beat cards, in order (authoring/storyboard.json). Each card
 * shows its scene or style-frame proposal as a live thumbnail, its place, district and status. Picking a
 * card shows the scene on the Scene stage beside the panel and opens the beat's fields below its act.
 * Every change is one undoable edit of the storyboard document and is written by Save to source.
 */
import type { EditorDocument, PreviewRequest, PreviewResult, WorkbenchContext, WorkbenchHandle } from './app';
import type { Composition } from '../art/core/composition';
import { PROPOSAL_SCENES } from './proposal-scenes';
import { STYLE_FRAMES } from './style-frames';
import { BEAT_STATUSES, STORYBOARD_DOCUMENT, freeId, validateStoryboard, type BeatStatus, type StoryAct, type StoryBeat, type Storyboard } from './storyboard';

export interface StoryboardSession { act?: string; beat?: string }
interface CitySource { DISTRICTS: { id: string; name: string }[]; PLACES: { name: string; district: string | null; scenes: string[] }[] }
const STATUS_LABEL: Record<BeatStatus, string> = { exists: 'Exists', rework: 'Rework', new: 'New' };
const STATUS_HINT: Record<BeatStatus, string> = { exists: 'The place exists as a scene', rework: 'The scene exists but needs a variant or rework', new: 'The place is still to be drawn' };

export function mountStoryboard(host: HTMLElement, context: WorkbenchContext, render: (canvas: HTMLCanvasElement, request: PreviewRequest) => PreviewResult, environment: Record<string, string | number | boolean>, session: StoryboardSession, sceneName: (scene: string) => string): WorkbenchHandle {
  const api = context.authoring!;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
  const button = (text: string, action: () => void, title?: string, className?: string) => { const b = el('button', text, className); b.type = 'button'; b.onclick = action; if (title) b.title = title; return b; };
  const docs = new Map<string, EditorDocument>(context.documents.map(d => [d.id, d]));
  const city = docs.get('city-source')?.value as CitySource | undefined;
  const districtName = (id: string) => id ? city?.DISTRICTS.find(d => d.id === id)?.name ?? id : 'Between districts';
  // Scene choices: the city's scenes by district, other registered scenes, then the style-frame proposals.
  const compositions = context.documents.filter(d => d.kind === 'composition' && !d.id.startsWith('sequence-') && !d.id.startsWith('authored.') && d.id !== 'demo-manifest').map(d => d.id);
  const proposals = PROPOSAL_SCENES.filter(p => docs.get(p.id)?.kind === 'composition');
  const inCity = new Set((city?.PLACES ?? []).flatMap(p => p.scenes));
  const sceneGroups: { label: string; scenes: string[] }[] = [
    ...(city?.DISTRICTS ?? []).map(d => ({ label: d.name, scenes: (city!.PLACES.filter(p => p.district === d.id).flatMap(p => p.scenes)).filter(s => compositions.includes(s)) })),
    { label: 'Outside the districts', scenes: (city?.PLACES ?? []).filter(p => p.district === null).flatMap(p => p.scenes).filter(s => compositions.includes(s)) },
    { label: 'Other scenes', scenes: compositions.filter(s => !inCity.has(s) && !proposals.some(p => p.id === s)) },
    { label: 'Style-frame proposals', scenes: proposals.map(p => p.id) },
  ].filter(g => g.scenes.length);
  const error = el('p', '', 'error'); error.setAttribute('role', 'alert');
  const status = el('p', '', 'muted'); status.setAttribute('role', 'status');
  host.classList.add('storyboard');
  let disposed = false;

  function read(): Storyboard { return validateStoryboard(api.get(STORYBOARD_DOCUMENT).value); }
  function edit(label: string, change: (d: Storyboard) => void) {
    const before = { ...session };
    try { const d = read(); change(d); const next = validateStoryboard(d, new Set(compositions)); error.textContent = ''; api.edit(STORYBOARD_DOCUMENT, label, next); }
    catch (e) { Object.assign(session, before); error.textContent = e instanceof Error ? e.message : String(e); }
  }
  const findBeat = (d: Storyboard, id: string) => { for (const act of d.acts) { const i = act.beats.findIndex(b => b.id === id); if (i >= 0) return { act, i, beat: act.beats[i] }; } return undefined; };
  const allBeatIds = (d: Storyboard) => d.acts.flatMap(a => a.beats.map(b => b.id));

  // Thumbnails: each scene is drawn once per look and copied onto its cards, so edits do not redraw scenes.
  const shots = new Map<string, HTMLCanvasElement>(), waiting = new Map<string, HTMLCanvasElement[]>();
  const look = (district: string) => { const f = STYLE_FRAMES.find(f => f.district === district); return { minute: f?.minute ?? 1200, weather: f?.weather ?? 'clear' }; };
  function thumbnail(canvas: HTMLCanvasElement, scene: string, district: string) {
    const key = scene + '|' + district, done = shots.get(key);
    if (done) { canvas.getContext('2d')?.drawImage(done, 0, 0, canvas.width, canvas.height); return; }
    const queue = waiting.get(key); if (queue) { queue.push(canvas); return; }
    waiting.set(key, [canvas]);
    requestAnimationFrame(() => {
      if (disposed) return;
      const composition = docs.get(scene)?.value as Composition | undefined, shot = el('canvas'); shot.width = 240; shot.height = 135;
      if (composition) try { const v = look(district); render(shot, { documents: new Map(context.documents.map(d => [d.id, d.value])), composition: structuredClone(composition), time: 0, reduced: true, overlays: false, environment: { ...environment, cameraX: 0, minute: v.minute, weather: v.weather, renderScale: shot.width / 640 } }); }
      catch (e) { status.textContent = `Preview of ${sceneName(scene)} unavailable: ${e instanceof Error ? e.message : String(e)}`; }
      shots.set(key, shot);
      for (const c of waiting.get(key) ?? []) if (c.isConnected) c.getContext('2d')?.drawImage(shot, 0, 0, c.width, c.height);
      waiting.delete(key);
    });
  }

  function card(act: StoryAct, beat: StoryBeat, index: number) {
    const pick = button('', () => { session.act = act.id; session.beat = beat.id; if (beat.scene) context.openScene(beat.scene); refresh(); }, beat.scene ? `Show ${sceneName(beat.scene)} on the stage and edit this beat` : 'Edit this beat (no scene yet)', 'asset-card beat-card');
    pick.setAttribute('aria-pressed', String(session.beat === beat.id));
    pick.dataset.status = beat.status;
    if (beat.scene) { const thumb = el('canvas'); thumb.width = 240; thumb.height = 135; pick.append(thumb); thumbnail(thumb, beat.scene, beat.district); }
    else pick.append(el('div', 'No scene yet', 'beat-empty'));
    const title = el('strong'); title.append(el('small', `${index + 1} · `), document.createTextNode(beat.title));
    const chips = el('div', undefined, 'beat-chips'); const st = el('span', STATUS_LABEL[beat.status], 'tag beat-status'); st.title = STATUS_HINT[beat.status]; chips.append(el('span', districtName(beat.district), 'tag'), st);
    pick.append(title, el('span', beat.place, 'beat-place'), chips);
    return pick;
  }

  function sceneSelect(name: string, value: string | undefined, change: (v: string | undefined) => void) {
    const label = el('label', 'Scene '), select = el('select'); select.setAttribute('aria-label', name);
    const none = el('option', '(none yet)'); none.value = ''; select.append(none);
    for (const g of sceneGroups) { const group = el('optgroup'); group.label = g.label; for (const s of g.scenes) { const o = el('option', sceneName(s)); o.value = s; group.append(o); } select.append(group); }
    if (value && !compositions.includes(value)) { const o = el('option', `${value} (missing)`); o.value = value; select.append(o); }
    select.value = value ?? ''; select.onchange = () => change(select.value || undefined); label.append(select); return label;
  }
  function field(parent: HTMLElement, name: string, label: string, value: string, change: (v: string) => void, multiline = false) {
    const box = el('label', label + ' '), input = el(multiline ? 'textarea' : 'input') as HTMLInputElement | HTMLTextAreaElement; input.value = value; input.setAttribute('aria-label', name);
    if (multiline) (input as HTMLTextAreaElement).rows = 2;
    input.onchange = () => change(input.value); box.append(input); parent.append(box);
  }
  function choice(parent: HTMLElement, name: string, label: string, options: [string, string][], value: string, change: (v: string) => void) {
    const box = el('label', label + ' '), select = el('select'); select.setAttribute('aria-label', name);
    for (const [v, text] of options) { const o = el('option', text); o.value = v; select.append(o); }
    if (!options.some(([v]) => v === value)) { const o = el('option', value); o.value = value; select.append(o); }
    select.value = value; select.onchange = () => change(select.value); box.append(select); parent.append(box);
  }

  function beatForm(d: Storyboard, act: StoryAct, beat: StoryBeat) {
    const form = el('div', undefined, 'beat-form'), id = beat.id, at = (fn: (b: StoryBeat, a: StoryAct, i: number) => void) => (s: Storyboard) => { const f = findBeat(s, id); if (f) fn(f.beat, f.act, f.i); };
    form.setAttribute('aria-label', `Beat ${beat.title}`);
    form.append(el('h4', `Beat · ${beat.title}`));
    const set = (label: string, fn: (b: StoryBeat) => void) => edit(label, at(b => fn(b)));
    field(form, 'Beat title', 'Title', beat.title, v => set('Edit beat title', b => { b.title = v; }));
    field(form, 'Beat place', 'Place', beat.place, v => set('Edit beat place', b => { b.place = v; }));
    choice(form, 'Beat district', 'District', [['', 'Between districts'], ...(city?.DISTRICTS ?? []).map(x => [x.id, x.name] as [string, string])], beat.district, v => set('Edit beat district', b => { b.district = v; }));
    form.append(sceneSelect('Beat scene', beat.scene, v => set('Edit beat scene', b => { if (v) b.scene = v; else delete b.scene; })));
    choice(form, 'Beat status', 'Status', BEAT_STATUSES.map(s => [s, `${STATUS_LABEL[s]} · ${STATUS_HINT[s].toLowerCase()}`] as [string, string]), beat.status, v => set('Edit beat status', b => { b.status = v as BeatStatus; }));
    field(form, 'Beat what happens', 'What happens', beat.happens, v => set('Edit what happens', b => { b.happens = v; }), true);
    field(form, 'Beat teaches', 'Teaches', beat.teaches ?? '', v => set('Edit what the beat teaches', b => { if (v.trim()) b.teaches = v; else delete b.teaches; }));
    field(form, 'Beat note', 'Note', beat.note, v => set('Edit beat note', b => { b.note = v; }), true);
    field(form, 'Beat id', 'ID', beat.id, v => edit('Rename beat', at(b => { b.id = v; session.beat = v; })));
    const row = el('div', undefined, 'row'), i = act.beats.indexOf(beat), ai = d.acts.indexOf(act);
    const move = button('◀', () => edit('Move beat earlier', at((_, a, i) => { a.beats.splice(i - 1, 0, ...a.beats.splice(i, 1)); })), 'Move earlier'); move.disabled = i === 0 && ai === 0;
    // At an act's edge a move carries the beat into the neighbouring act.
    if (i === 0 && ai > 0) move.onclick = () => edit('Move beat to the previous act', s => { const f = findBeat(s, id)!, prev = s.acts[s.acts.indexOf(f.act) - 1]; f.act.beats.splice(f.i, 1); prev.beats.push(f.beat); session.act = prev.id; });
    const later = button('▶', () => edit('Move beat later', at((_, a, i) => { a.beats.splice(i + 1, 0, ...a.beats.splice(i, 1)); })), 'Move later'); later.disabled = i === act.beats.length - 1 && ai === d.acts.length - 1;
    if (i === act.beats.length - 1 && ai < d.acts.length - 1) later.onclick = () => edit('Move beat to the next act', s => { const f = findBeat(s, id)!, next = s.acts[s.acts.indexOf(f.act) + 1]; f.act.beats.splice(f.i, 1); next.beats.unshift(f.beat); session.act = next.id; });
    row.append(move, later,
      button('Duplicate', () => edit('Duplicate beat', s => { const f = findBeat(s, id)!, copy = { ...structuredClone(f.beat), id: freeId(allBeatIds(s), f.beat.id.replace(/-\d+$/, '')) }; f.act.beats.splice(f.i + 1, 0, copy); session.beat = copy.id; }), 'Add a copy after this beat'),
      button('Remove beat', () => edit('Remove beat', s => { const f = findBeat(s, id)!; f.act.beats.splice(f.i, 1); session.beat = f.act.beats[Math.min(f.i, f.act.beats.length - 1)]?.id; }), 'Remove this beat (Undo brings it back)', 'danger'));
    form.append(row);
    return form;
  }
  function actForm(d: Storyboard, act: StoryAct) {
    const form = el('div', undefined, 'beat-form act-form'), id = act.id, at = (fn: (a: StoryAct, i: number) => void) => (s: Storyboard) => { const i = s.acts.findIndex(a => a.id === id); if (i >= 0) fn(s.acts[i], i); };
    form.append(el('h4', `Act · ${act.title}`));
    field(form, 'Act title', 'Title', act.title, v => edit('Edit act title', at(a => { a.title = v; })));
    field(form, 'Act arc', 'Arc', act.arc, v => edit('Edit act arc', at(a => { a.arc = v; })), true);
    field(form, 'Act id', 'ID', act.id, v => edit('Rename act', at(a => { a.id = v; session.act = v; })));
    const row = el('div', undefined, 'row'), i = d.acts.indexOf(act);
    const shift = (by: number) => (s: Storyboard) => { const i = s.acts.findIndex(a => a.id === id); s.acts.splice(i + by, 0, ...s.acts.splice(i, 1)); };
    const up = button('▲', () => edit('Move act earlier', shift(-1)), 'Move act earlier'); up.disabled = i === 0;
    const down = button('▼', () => edit('Move act later', shift(1)), 'Move act later'); down.disabled = i === d.acts.length - 1;
    const remove = button('Remove act', () => edit('Remove act', s => { s.acts = s.acts.filter(a => a.id !== id); session.act = undefined; }), act.beats.length ? 'Move or remove its beats first' : 'Remove this empty act', 'danger'); remove.disabled = act.beats.length > 0;
    row.append(up, down, remove); form.append(row);
    return form;
  }

  function refresh() {
    if (disposed) return;
    let d: Storyboard; try { d = read(); } catch (e) { host.replaceChildren(error); error.textContent = e instanceof Error ? e.message : String(e); return; }
    const beats = d.acts.flatMap(a => a.beats), count = (s: BeatStatus) => beats.filter(b => b.status === s).length;
    const head = el('header'); head.append(el('h3', 'Storyboard'), el('p', `${d.acts.length} acts · ${beats.length} beats · ${count('exists')} exist, ${count('rework')} rework, ${count('new')} new${api.dirty(STORYBOARD_DOCUMENT) ? ' · unsaved' : ''}`, 'muted'));
    host.replaceChildren(head, error);
    if (session.beat && !findBeat(d, session.beat)) session.beat = undefined;
    for (const act of d.acts) {
      const section = el('section', undefined, 'story-act'), title = button('', () => { session.act = act.id; session.beat = undefined; refresh(); }, 'Edit this act', 'act-head');
      title.setAttribute('aria-pressed', String(session.act === act.id && !session.beat));
      title.append(el('strong', act.title), el('small', `${act.beats.length} beats`)); if (act.arc) title.append(el('span', act.arc, 'muted'));
      const strip = el('div', undefined, 'story-strip');
      act.beats.forEach((beat, i) => strip.append(card(act, beat, i)));
      strip.append(button('＋ Beat', () => edit('Add beat', s => {
        const a = s.acts.find(a => a.id === act.id)!, last = a.beats[a.beats.length - 1], id = freeId(allBeatIds(s), act.id === 'prologue' ? 'p' : act.id.replace(/^act-?/, 'act') || 'beat');
        a.beats.push({ id, title: 'New beat', place: 'New place', district: last?.district ?? 'downtown', status: 'new', happens: '', note: '' }); session.act = act.id; session.beat = id;
      }), `Add a beat at the end of ${act.title}`, 'add-beat'));
      section.append(title, strip);
      const selected = session.beat ? act.beats.find(b => b.id === session.beat) : undefined;
      if (selected) section.append(beatForm(d, act, selected));
      else if (session.act === act.id && !session.beat) section.append(actForm(d, act));
      host.append(section);
      // Keep the selected card in view after a re-render.
      if (selected) requestAnimationFrame(() => strip.querySelector<HTMLElement>('[aria-pressed=true]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    }
    host.append(button('＋ Act', () => edit('Add act', s => { const id = freeId(s.acts.map(a => a.id), 'act'); s.acts.push({ id, title: 'New act', arc: '', beats: [] }); session.act = id; session.beat = undefined; }), 'Add an act at the end', 'add-act'), status);
  }
  refresh();
  // The selected beat's scene goes on the stage once mounting finishes (opening a scene refreshes the editor).
  queueMicrotask(() => { if (disposed || !session.beat) return; try { const f = findBeat(read(), session.beat); if (f?.beat.scene) context.openScene(f.beat.scene); } catch { /* shown by refresh */ } });
  const dispose = (() => { disposed = true; host.replaceChildren(); host.classList.remove('storyboard'); }) as WorkbenchHandle;
  dispose.refresh = refresh;
  return dispose;
}
