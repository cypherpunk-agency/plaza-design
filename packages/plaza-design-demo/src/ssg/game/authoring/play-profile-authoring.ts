import { TypedForm } from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import { ABILITIES, ABILITY_LABELS, AVATARS, CLOCK_RULES, GUIDANCE_STYLES, ROUTES, WORLDS, LOOK_PARTS,LOOK_COLOURS,type PlayProfile, type PlayProfiles } from '../runtime/play-profiles';
import {EXTRA_KINDS} from '../art/characters/parts';
import { PLAY_PROFILES_DOCUMENT, profileSceneIds } from './play-profile-source';

/** Same source controls for the default game's settings and isolated test overrides. */
export type ProfileSettingsSection='Launch'|'Player'|'Guidance & time';
export function mountPlayProfileAuthoring(host: HTMLElement, context: WorkbenchContext,settings?:ProfileSettingsSection): WorkbenchHandle {
  const api = context.authoring!;
  let disposed = false, current = '';
  const error = document.createElement('p'); error.setAttribute('role', 'alert');
  const form = new TypedForm(e => { error.textContent = e instanceof Error ? e.message : String(e); });
  const raw = () => api.get(PLAY_PROFILES_DOCUMENT).value as PlayProfiles;
  function edit(label: string, change: (profile: PlayProfile) => void) {
    const doc = structuredClone(raw()), profile = doc.profiles.find(p => p.id === current)!;
    change(profile); error.textContent = ''; api.edit(PLAY_PROFILES_DOCUMENT, label, doc);
  }
  function render() {
    if (disposed) return;
    host.replaceChildren(error);
    const doc = raw(), scenes = profileSceneIds(new Map(context.documents.map(d => [d.id, d.value])));
    const choices=doc.profiles.filter(p=>settings?!p.select:!!p.select);
    if(!choices.length){host.append(Object.assign(document.createElement('p'),{textContent:'No run configurations.'}));return;}
    if (!choices.some(p => p.id === current)) current = choices[0].id;
    const p = doc.profiles.find(p => p.id === current)!;
    if(!settings)form.select(host, 'Play profile', choices.map(p => p.id), current, id => { current = id; render(); });
    if(!settings||settings==='Launch'){
    form.text(host, settings?'Game configuration name':'Profile name', p.label, label => edit('Rename play profile', p => { p.label = label; }));

    const choose = form.section(host, 'How it is chosen');
    if (!p.select) choose.append(Object.assign(document.createElement('p'), { textContent: 'The default way of playing: used when no other profile is asked for.' }));
    else {
      form.text(choose, 'URL parameter (empty: not chosen by URL)', p.select.url?.param ?? '', param => edit('Edit profile URL', p => {
        const s = p.select!; if (param) s.url = { param, ...(s.url?.value ? { value: s.url.value } : {}) }; else delete s.url;
      }));
      if (p.select.url) form.text(choose, 'URL parameter value (empty: any)', p.select.url.value ?? '', value => edit('Edit profile URL value', p => { const u = p.select!.url!; if (value) u.value = value; else delete u.value; }));
      form.text(choose, 'Editor Play frame name (empty: none)', p.select.editorFrame ?? '', name => edit('Edit profile editor frame', p => { if (name) p.select!.editorFrame = name; else delete p.select!.editorFrame; }));
      form.check(choose, 'Runs the editor Test District lab', !!p.select.editorRestricted, on => edit('Edit profile editor lab', p => { if (on) p.select!.editorRestricted = true; else delete p.select!.editorRestricted; }));
    }

    const start = form.section(host, 'Start');
    const checkpoints=(api.get('play-fixtures').value as import('../world/checkpoints').PlayFixtures).fixtures;
    form.select(start,'Starting checkpoint',checkpoints.map(f=>f.id),p.checkpoint,value=>edit('Bind run starting checkpoint',p=>{p.checkpoint=value;}));
    if(context.editCheckpoint)form.button(start,'Edit starting checkpoint',()=>context.editCheckpoint!(p.checkpoint));
    form.select(start, 'Home scene', scenes, p.home, home => edit('Edit profile home scene', p => { p.home = home; }));
    form.check(start, 'Title screen first', p.start.title, on => edit('Edit profile title screen', p => { p.start.title = on; }));
    form.check(start, 'The play URL may name the start scene', p.start.urlScene, on => edit('Edit profile URL scene', p => { p.start.urlScene = on; }));
    form.select(start, 'Routes', ROUTES, p.routes, routes => edit('Edit profile routes', p => { p.routes = routes as PlayProfile['routes']; }));
    form.select(start, 'World', WORLDS, p.world, world => edit('Edit profile world', p => { p.world = world as PlayProfile['world']; }));
    }

    if(!settings||settings==='Player'){
    const starting=(api.get('play-fixtures').value as import('../world/checkpoints').PlayFixtures).fixtures.find(f=>f.id===p.checkpoint),values=form.section(host,'Starting values');
    values.append(Object.assign(document.createElement('p'),{textContent:'Inventory, flags, tokens, handle and time come from '+(starting?.name??p.checkpoint)+'. They are edited on that checkpoint.'}));
    if(context.editCheckpoint)form.button(values,'Edit starting values',()=>context.editCheckpoint!(p.checkpoint));
    const abilities = form.section(host, 'Abilities');
    for (const a of ABILITIES) form.check(abilities, 'Ability ' + ABILITY_LABELS[a], p.abilities[a], on => edit('Edit profile ability', p => { p.abilities[a] = on; }));

    const player = form.section(host, 'Player');
    form.select(player, 'Player body', AVATARS, p.player.avatar, avatar => edit('Edit profile player body', p => { p.player.avatar = avatar as PlayProfile['player']['avatar']; if (avatar === 'person') p.player.character ??= { seed: 7303, look: { garb: 'hivis', hair: 'hardhat' } }; else delete p.player.character; }));
    form.text(player, 'Fixed player name (empty: story name, then handle)', p.player.name ?? '', name => edit('Edit profile player name', p => { if (name) p.player.name = name; else delete p.player.name; }));
    if(p.player.character){
      form.number(player,'Player character seed',p.player.character.seed,value=>edit('Edit player appearance seed',p=>{p.player.character!.seed=value;}),0,1000000);
      for(const[key,choices]of Object.entries(LOOK_PARTS))form.select(player,'Player '+key,['',...choices],String((p.player.character.look as Record<string,unknown>)[key]??''),value=>edit('Edit player '+key,p=>{const look=p.player.character!.look as Record<string,unknown>;if(value)look[key]=value;else delete look[key];}));
      for(const key of LOOK_COLOURS)form.text(player,'Player '+key+' colour (empty: automatic)',p.player.character.look[key]??'',value=>edit('Edit player '+key+' colour',p=>{if(value)p.player.character!.look[key]=value;else delete p.player.character!.look[key];}));
      for(const extra of EXTRA_KINDS)form.check(player,'Player extra '+extra,p.player.character.look.extras?.includes(extra)??false,on=>edit('Edit player extras',p=>{const extras=new Set(p.player.character!.look.extras??[]);if(on)extras.add(extra);else extras.delete(extra);p.player.character!.look.extras=[...extras];}));
    }
    }

    if(!settings||settings==='Guidance & time'){
    const feel = form.section(host, 'Guidance, clock and look');
    form.select(feel, 'Guidance style', GUIDANCE_STYLES, p.guidance.style, style => edit('Edit profile guidance', p => { p.guidance.style = style as PlayProfile['guidance']['style']; }));
    form.check(feel, 'Controls taught in the hint lane', p.guidance.controlHints, on => edit('Edit profile control hints', p => { p.guidance.controlHints = on; }));
    form.select(feel, 'Clock rule', CLOCK_RULES, p.clock.rule, rule => edit('Edit profile clock', p => { p.clock.rule = rule as PlayProfile['clock']['rule']; }));
    form.text(feel, 'Page class (empty: none)', p.chrome.pageClass ?? '', name => edit('Edit profile page class', p => { if (name) p.chrome.pageClass = name; else delete p.chrome.pageClass; }));
    form.check(feel, 'Minimal HUD (no city clock, player name or title line)', p.chrome.minimalHud, on => edit('Edit profile HUD', p => { p.chrome.minimalHud = on; }));
    }

    if(!settings||settings==='Launch'){
    const storage = form.section(host, 'Storage');
    form.text(storage, 'Save key', p.namespace.save, v => edit('Edit profile save key', p => { p.namespace.save = v; }));
    form.text(storage, 'Sudo save key (empty: same)', p.namespace.sudoSave ?? '', v => edit('Edit profile sudo save key', p => { if (v) p.namespace.sudoSave = v; else delete p.namespace.sudoSave; }));
    form.text(storage, 'Resume key', p.namespace.resume, v => edit('Edit profile resume key', p => { p.namespace.resume = v; }));
    form.text(storage, 'Slot prefix', p.namespace.slots, v => edit('Edit profile slot prefix', p => { p.namespace.slots = v; }));
    form.text(storage, 'Sudo slot prefix (empty: same)', p.namespace.sudoSlots ?? '', v => edit('Edit profile sudo slot prefix', p => { if (v) p.namespace.sudoSlots = v; else delete p.namespace.sudoSlots; }));
    }


  }
  render();
  const dispose = (() => { disposed = true; host.replaceChildren(); }) as WorkbenchHandle;
  dispose.refresh = render;
  return dispose;
}
