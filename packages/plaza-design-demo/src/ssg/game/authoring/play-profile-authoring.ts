import { TypedForm } from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import { ABILITIES, ABILITY_LABELS, AVATARS, CLOCK_RULES, GUIDANCE_STYLES, ROUTES, WORLDS, type PlayProfile, type PlayProfiles } from '../runtime/play-profiles';
import { PLAY_PROFILES_DOCUMENT, profileModuleIds, profileSceneIds } from './play-profile-source';

/** Typed controls for runtime/play-profiles.json: every way of playing the game is edited here and consumed by Play. */
export function mountPlayProfileAuthoring(host: HTMLElement, context: WorkbenchContext): WorkbenchHandle {
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
    if (!doc.profiles.some(p => p.id === current)) current = doc.profiles[0].id;
    const p = doc.profiles.find(p => p.id === current)!;
    form.select(host, 'Play profile', doc.profiles.map(p => p.id), current, id => { current = id; render(); });
    form.text(host, 'Profile name', p.label, label => edit('Rename play profile', p => { p.label = label; }));

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
    form.select(start, 'Home scene', scenes, p.home, home => edit('Edit profile home scene', p => { p.home = home; }));
    form.select(start, 'Start scene', ['', ...scenes], p.start.scene ?? '', scene => edit('Edit profile start scene', p => { if (scene) p.start.scene = scene; else { delete p.start.scene; delete p.start.entrance; } }));
    form.text(start, 'Start entrance (exit id; empty: the scene spawn)', p.start.entrance ?? '', entrance => edit('Edit profile start entrance', p => { if (entrance) p.start.entrance = entrance; else delete p.start.entrance; }));
    form.check(start, 'Title screen first', p.start.title, on => edit('Edit profile title screen', p => { p.start.title = on; }));
    form.check(start, 'The play URL may name the start scene', p.start.urlScene, on => edit('Edit profile URL scene', p => { p.start.urlScene = on; }));
    form.select(start, 'Routes', ROUTES, p.routes, routes => edit('Edit profile routes', p => { p.routes = routes as PlayProfile['routes']; }));
    form.select(start, 'World', WORLDS, p.world, world => edit('Edit profile world', p => { p.world = world as PlayProfile['world']; }));

    const abilities = form.section(host, 'Abilities');
    for (const a of ABILITIES) form.check(abilities, 'Ability ' + ABILITY_LABELS[a], p.abilities[a], on => edit('Edit profile ability', p => { p.abilities[a] = on; }));

    const player = form.section(host, 'Player');
    form.select(player, 'Player body', AVATARS, p.player.avatar, avatar => edit('Edit profile player body', p => { p.player.avatar = avatar as PlayProfile['player']['avatar']; if (avatar === 'person') p.player.character ??= { seed: 7303, look: { garb: 'hivis', hair: 'hardhat' } }; else delete p.player.character; }));
    form.text(player, 'Fixed player name (empty: story name, then handle)', p.player.name ?? '', name => edit('Edit profile player name', p => { if (name) p.player.name = name; else delete p.player.name; }));

    const feel = form.section(host, 'Guidance, clock and look');
    form.select(feel, 'Guidance style', GUIDANCE_STYLES, p.guidance.style, style => edit('Edit profile guidance', p => { p.guidance.style = style as PlayProfile['guidance']['style']; }));
    form.check(feel, 'Controls taught in the hint lane', p.guidance.controlHints, on => edit('Edit profile control hints', p => { p.guidance.controlHints = on; }));
    form.select(feel, 'Clock rule', CLOCK_RULES, p.clock.rule, rule => edit('Edit profile clock', p => { p.clock.rule = rule as PlayProfile['clock']['rule']; }));
    form.text(feel, 'Page class (empty: none)', p.chrome.pageClass ?? '', name => edit('Edit profile page class', p => { if (name) p.chrome.pageClass = name; else delete p.chrome.pageClass; }));
    form.check(feel, 'Minimal HUD (no city clock, player name or title line)', p.chrome.minimalHud, on => edit('Edit profile HUD', p => { p.chrome.minimalHud = on; }));

    const storage = form.section(host, 'Storage');
    form.text(storage, 'Save key', p.namespace.save, v => edit('Edit profile save key', p => { p.namespace.save = v; }));
    form.text(storage, 'Sudo save key (empty: same)', p.namespace.sudoSave ?? '', v => edit('Edit profile sudo save key', p => { if (v) p.namespace.sudoSave = v; else delete p.namespace.sudoSave; }));
    form.text(storage, 'Resume key', p.namespace.resume, v => edit('Edit profile resume key', p => { p.namespace.resume = v; }));
    form.text(storage, 'Slot prefix', p.namespace.slots, v => edit('Edit profile slot prefix', p => { p.namespace.slots = v; }));
    form.text(storage, 'Sudo slot prefix (empty: same)', p.namespace.sudoSlots ?? '', v => edit('Edit profile sudo slot prefix', p => { if (v) p.namespace.sudoSlots = v; else delete p.namespace.sudoSlots; }));

    const seed = form.section(host, 'New save');
    form.select(seed, 'New save scene', ['', ...scenes], p.seed.scene ?? '', scene => edit('Edit profile new save scene', p => { if (scene) p.seed.scene = scene; else delete p.seed.scene; }));
    form.text(seed, 'New save handle', p.seed.handle, v => edit('Edit profile new save handle', p => { p.seed.handle = v; }));
    form.number(seed, 'New save tokens', p.seed.tokens, v => edit('Edit profile new save tokens', p => { p.seed.tokens = v; }), 0, 9999);
    for (const m of profileModuleIds()) form.check(seed, 'New save module ' + m, p.seed.modules.includes(m), on => edit('Edit profile new save modules', p => { p.seed.modules = on ? [...p.seed.modules, m] : p.seed.modules.filter(x => x !== m); }));
    form.text(seed, 'New save flags (space separated)', p.seed.flags.join(' '), v => edit('Edit profile new save flags', p => { p.seed.flags = v.split(/\s+/).filter(Boolean); }));
  }
  render();
  const dispose = (() => { disposed = true; host.replaceChildren(); }) as WorkbenchHandle;
  dispose.refresh = render;
  return dispose;
}
