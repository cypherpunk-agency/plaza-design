/**
 * Library › Storyboard: the acts as strips of beat cards, in order (authoring/storyboard.json). Each card
 * shows its scene or style-frame proposal as a live thumbnail, its place, district and status. Picking a
 * card shows the scene on the Scene stage beside the panel and opens the beat's fields below its act.
 * Every change is one undoable edit of the storyboard document and is written by Save to source.
 */
import type {EditorDocument,PreviewRequest,PreviewResult,WorkbenchContext,WorkbenchHandle} from './contracts';
import type { ChunkDocument } from '../art/core/composition';
import {storyboardLinks} from './storyboard-links';
import {transitionKey} from './storyboard';
import {validationSnapshot} from './validation-snapshot';
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
  const sourceChoices=()=>{
  const docs = new Map<string, EditorDocument>(context.documents.map(d => [d.id, d]));
  const city = docs.get('city-source')?.value as CitySource | undefined;
  const districtName = (id: string) => id ? city?.DISTRICTS.find(d => d.id === id)?.name ?? id : 'Between districts';
  // Scene choices: the city's scenes by district, other registered scenes, then the style-frame proposals.
  const compositionDocs = new Map(context.documents.filter(d => d.kind === 'composition' && d.id !== 'demo-manifest').map(d => [(d.value as ChunkDocument).scene, d]));
  const compositions = [...compositionDocs.keys()];
  const proposals = PROPOSAL_SCENES.filter(p => docs.get(p.id)?.kind === 'composition');
  const inCity = new Set((city?.PLACES ?? []).flatMap(p => p.scenes));
  const sceneGroups: { label: string; scenes: string[] }[] = [
    ...(city?.DISTRICTS ?? []).map(d => ({ label: d.name, scenes: (city!.PLACES.filter(p => p.district === d.id).flatMap(p => p.scenes)).filter(s => compositions.includes(s)) })),
    { label: 'Outside the districts', scenes: (city?.PLACES ?? []).filter(p => p.district === null).flatMap(p => p.scenes).filter(s => compositions.includes(s)) },
    { label: 'Other scenes', scenes: compositions.filter(s => !inCity.has(s) && !proposals.some(p => p.id === s)) },
    { label: 'Style-frame proposals', scenes: proposals.map(p => p.id) },
  ].filter(g => g.scenes.length);
    return{city,districtName,compositionDocs,compositions,sceneGroups};
  };
  let {city,districtName,compositionDocs,compositions,sceneGroups}=sourceChoices(),sourceDocuments=context.documents;
  const error = el('p', '', 'error'); error.setAttribute('role', 'alert');
  const status = el('p', '', 'muted'); status.setAttribute('role', 'status');
  host.classList.add('storyboard');
  let disposed = false;
  let linkedDocuments:readonly EditorDocument[]|undefined,linked:ReturnType<typeof storyboardLinks>|undefined;
  const references=()=>{const documents=context.documents;if(linkedDocuments!==documents){linkedDocuments=documents;linked=storyboardLinks(validationSnapshot(documents));}return linked!;};

  function read(): Storyboard { return validateStoryboard(api.get(STORYBOARD_DOCUMENT).value); }
  function edit(label: string, change: (d: Storyboard) => void) {
    const before = { ...session };
    try { const d = read(); change(d); const next = validateStoryboard(d, new Set(compositions),references().links); error.textContent = ''; api.edit(STORYBOARD_DOCUMENT, label, next); }
    catch (e) { Object.assign(session, before); error.textContent = e instanceof Error ? e.message : String(e); }
  }
  const findBeat = (d: Storyboard, id: string) => { for (const act of d.acts) { const i = act.beats.findIndex(b => b.id === id); if (i >= 0) return { act, i, beat: act.beats[i] }; } return undefined; };
  const allBeatIds = (d: Storyboard) => d.acts.flatMap(a => a.beats.map(b => b.id));
  function openBeat(beat:StoryBeat){
    if(beat.checkpoint&&context.openCheckpoint)context.openCheckpoint(beat.checkpoint);
    else{if(beat.composition&&context.openComposition)context.openComposition(beat.composition);else if(beat.scene)context.openScene(beat.scene);if(beat.sequence)context.openSequence?.(beat.sequence);}
  }

  // Thumbnails: each scene is drawn once per look and copied onto its cards, so edits do not redraw scenes.
  const shots = new Map<string, HTMLCanvasElement>(), waiting = new Map<string, HTMLCanvasElement[]>();
  const look = (district: string) => { const f = STYLE_FRAMES.find(f => f.district === district); return { minute: f?.minute ?? 1200, weather: f?.weather ?? 'clear' }; };
  function thumbnail(canvas: HTMLCanvasElement, scene: string, district: string) {
    const key = scene + '|' + district, done = shots.get(key);
    if (done) { canvas.getContext('2d')?.drawImage(done, 0, 0, canvas.width, canvas.height); return; }
    const queue = waiting.get(key); if (queue) { queue.push(canvas); return; }
    waiting.set(key, [canvas]);
    const source=sourceDocuments;requestAnimationFrame(() => {
      if (disposed||source!==sourceDocuments) return;
      const composition = compositionDocs.get(scene)?.value as ChunkDocument | undefined, shot = el('canvas'); shot.width = 240; shot.height = 135;
      if (composition) try { const v = look(district); render(shot, { documents: new Map(context.documents.map(d => [d.id, d.value])), composition: structuredClone(composition), time: 0, reduced: true, overlays: false, environment: { ...environment, cameraX: 0, minute: v.minute, weather: v.weather, renderScale: shot.width / 640 } }); }
      catch (e) { status.textContent = `Preview of ${sceneName(scene)} unavailable: ${e instanceof Error ? e.message : String(e)}`; }
      shots.set(key, shot);
      for (const c of waiting.get(key) ?? []) if (c.isConnected) c.getContext('2d')?.drawImage(shot, 0, 0, c.width, c.height);
      waiting.delete(key);
    });
  }

  function card(act: StoryAct, beat: StoryBeat, index: number) {
    const pick = button('', () => { session.act = act.id; session.beat = beat.id;openBeat(beat); refresh(); }, 'Open this beat’s linked starting situation and notes', 'asset-card beat-card');
    pick.setAttribute('aria-pressed', String(session.beat === beat.id));
    pick.dataset.status = beat.status;
    if (beat.scene) { const thumb = el('canvas'); thumb.width = 240; thumb.height = 135; pick.append(thumb); thumbnail(thumb, beat.scene, beat.district); }
    else pick.append(el('div', 'No scene yet', 'beat-empty'));
    const title = el('strong'); title.append(el('small', `${index + 1} · `), document.createTextNode(beat.title));
    const chips = el('div', undefined, 'beat-chips'); const st = el('span', STATUS_LABEL[beat.status], 'tag beat-status'); st.title = STATUS_HINT[beat.status]; chips.append(el('span', districtName(beat.district), 'tag'), st);
    chips.append(el('span',beat.checkpoint?'Playable checkpoint':beat.sequence?'Sequence preview':'Planning / editing','tag'));
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
    const links=references();
    choice(form,'Beat composition','Composition',[['','Use chunk / standalone sequence'],...Object.entries(links.compositions.compositions).map(([id,c])=>[id,c.name]as[string,string])],beat.composition??'',value=>set('Link beat composition',b=>{if(value)b.composition=value;else delete b.composition;}));
    choice(form,'Beat checkpoint','Checkpoint',[['','Planning / editing only'],...links.fixtures.map(f=>[f.id,f.name]as[string,string])],beat.checkpoint??'',value=>set('Link beat checkpoint',b=>{if(value){const f=links.fixtures.find(f=>f.id===value)!;b.checkpoint=value;if(f.composition)b.composition=f.composition;if(f.sequence)b.sequence=f.sequence.id;else delete b.sequence;}else delete b.checkpoint;}));
    choice(form,'Beat sequence','Sequence',[['','No sequence'],...links.sequences.map(s=>[s.id,s.id]as[string,string])],beat.sequence??'',value=>set('Link beat sequence',b=>{if(value)b.sequence=value;else delete b.sequence;}));
    form.append(el('p',beat.checkpoint?'Play starts from the linked checkpoint. Edit its state and sequence position in the existing Play starting-state form.':'Planning and editor navigation. A playable start requires an authored checkpoint.','muted'));
    const navigation=el('section');navigation.append(el('h4','Navigation branches'));
    for(const target of beat.branches??[]){const destination=findBeat(d,target)!,row=el('div',undefined,'row');row.append(button(destination.beat.title,()=>{session.act=destination.act.id;session.beat=target;openBeat(destination.beat);refresh();},'Navigate to this beat; executes no gameplay command'),button('Remove branch',()=>set('Unlink storyboard branch',b=>{b.branches=b.branches!.filter(id=>id!==target);})));navigation.append(row);}
    choice(navigation,'Add beat branch','Add branch',[['','Choose a beat'],...d.acts.flatMap(a=>a.beats).filter(b=>b.id!==beat.id&&!beat.branches?.includes(b.id)).map(b=>[b.id,b.title]as[string,string])],'',value=>{if(value)set('Link storyboard branch',b=>{(b.branches??=[]).push(value);});});form.append(navigation);
    const transitions=el('section');transitions.append(el('h4','Existing gameplay transitions'),el('p','References to the engine’s rules. These links do not execute or duplicate their conditions.','muted'));
    for(const reference of beat.transitions??[]){const source=links.transitions.find(t=>transitionKey(t.reference)===transitionKey(reference))!,row=el('div',undefined,'row');row.append(el('span',reference.scene+' / '+reference.kind+' '+reference.id+' → '+source.command+' · '+source.detail),button('Inspect source',()=>context.openScene(reference.scene),'Open this chunk; Logic edits the actual rule'),button('Unlink transition',()=>set('Unlink gameplay transition',b=>{b.transitions=b.transitions!.filter(t=>transitionKey(t)!==transitionKey(reference));})));transitions.append(row);}
    const picker=el('div'),chunks=[...new Set(links.transitions.map(t=>t.reference.scene))];let ruleChunk=chunks.includes(beat.scene??'')?beat.scene!:chunks[0],ruleKind='command';
    const renderRulePicker=()=>{picker.replaceChildren();choice(picker,'Transition chunk','Chunk',chunks.map(id=>[id,sceneName(id)]as[string,string]),ruleChunk,value=>{ruleChunk=value;renderRulePicker();});choice(picker,'Transition kind','Kind',[['command','Command'],['trigger','Trigger']],ruleKind,value=>{ruleKind=value;renderRulePicker();});choice(picker,'Add gameplay transition','Link rule',[['','Choose a rule'],...links.transitions.filter(t=>t.reference.scene===ruleChunk&&t.reference.kind===ruleKind&&!beat.transitions?.some(r=>transitionKey(r)===transitionKey(t.reference))).map(t=>[transitionKey(t.reference),t.reference.id]as[string,string])],'',value=>{if(value)set('Link gameplay transition',b=>{(b.transitions??=[]).push(JSON.parse(value));});});};renderRulePicker();transitions.append(picker);form.append(transitions);
    choice(form, 'Beat status', 'Status', BEAT_STATUSES.map(s => [s, `${STATUS_LABEL[s]} · ${STATUS_HINT[s].toLowerCase()}`] as [string, string]), beat.status, v => set('Edit beat status', b => { b.status = v as BeatStatus; }));
    field(form, 'Beat what happens', 'What happens', beat.happens, v => set('Edit what happens', b => { b.happens = v; }), true);
    field(form, 'Beat teaches', 'Teaches', beat.teaches ?? '', v => set('Edit what the beat teaches', b => { if (v.trim()) b.teaches = v; else delete b.teaches; }));
    field(form, 'Beat note', 'Note', beat.note, v => set('Edit beat note', b => { b.note = v; }), true);
    field(form, 'Beat id', 'ID', beat.id, v => edit('Rename beat', s => {const found=findBeat(s,id)!;found.beat.id=v;for(const a of s.acts)for(const b of a.beats)if(b.branches)b.branches=b.branches.map(target=>target===id?v:target);session.beat=v;}));
    const row = el('div', undefined, 'row'), i = act.beats.indexOf(beat), ai = d.acts.indexOf(act);
    const move = button('◀', () => edit('Move beat earlier', at((_, a, i) => { a.beats.splice(i - 1, 0, ...a.beats.splice(i, 1)); })), 'Move earlier'); move.disabled = i === 0 && ai === 0;
    // At an act's edge a move carries the beat into the neighbouring act.
    if (i === 0 && ai > 0) move.onclick = () => edit('Move beat to the previous act', s => { const f = findBeat(s, id)!, prev = s.acts[s.acts.indexOf(f.act) - 1]; f.act.beats.splice(f.i, 1); prev.beats.push(f.beat); session.act = prev.id; });
    const later = button('▶', () => edit('Move beat later', at((_, a, i) => { a.beats.splice(i + 1, 0, ...a.beats.splice(i, 1)); })), 'Move later'); later.disabled = i === act.beats.length - 1 && ai === d.acts.length - 1;
    if (i === act.beats.length - 1 && ai < d.acts.length - 1) later.onclick = () => edit('Move beat to the next act', s => { const f = findBeat(s, id)!, next = s.acts[s.acts.indexOf(f.act) + 1]; f.act.beats.splice(f.i, 1); next.beats.unshift(f.beat); session.act = next.id; });
    row.append(move, later,
      button('Duplicate', () => edit('Duplicate beat', s => { const f = findBeat(s, id)!, copy = { ...structuredClone(f.beat), id: freeId(allBeatIds(s), f.beat.id.replace(/-\d+$/, '')) }; f.act.beats.splice(f.i + 1, 0, copy); session.beat = copy.id; }), 'Add a copy after this beat'),
      button('Remove beat', () => edit('Remove beat', s => { const f = findBeat(s, id)!; f.act.beats.splice(f.i, 1);for(const a of s.acts)for(const b of a.beats)if(b.branches)b.branches=b.branches.filter(target=>target!==id); session.beat = f.act.beats[Math.min(f.i, f.act.beats.length - 1)]?.id; }), 'Remove this beat (Undo brings it back)', 'danger'));
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
    if(sourceDocuments!==context.documents){sourceDocuments=context.documents;({city,districtName,compositionDocs,compositions,sceneGroups}=sourceChoices());shots.clear();waiting.clear();}
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
  queueMicrotask(() => { if (disposed || !session.beat) return; try { const f = findBeat(read(), session.beat); if(f)openBeat(f.beat); } catch { /* shown by refresh */ } });
  const dispose = (() => { disposed = true; host.replaceChildren(); host.classList.remove('storyboard'); }) as WorkbenchHandle;
  dispose.refresh = refresh;
  return dispose;
}
