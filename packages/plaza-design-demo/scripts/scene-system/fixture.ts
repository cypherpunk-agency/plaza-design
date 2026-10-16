/** Development-only adapter: accesses runtime internals without shipping a testing API. */
// @ts-nocheck -- the snapshot and candidate have deliberately private runtime fields.
import { Game } from '@fixture/game';
import { SCENES } from '@fixture/scenes';
import { newSave } from '@fixture/level';
import { city } from '@fixture/clock';
import { CUTSCENES, CutscenePlay } from '@fixture/cutscenes';
import { Opening, GLIDE, RISE } from '@fixture/title';
import { drawCityMap, openMap } from '@fixture/citymap';
import { drawCityMap as referenceMap } from '@reference/citymap';
import { art, drawComposition } from '@candidate/art';
import { stool } from '@reference/scenes/build';
import { drawFlight as referenceFlight } from '@reference/city';
import { drawFlight as candidateFlight } from '@candidate/art/sequences/taxi-flight';
import { drawGlide as candidateNativeGlide } from '@candidate/art/sequences/opening/glide';
import { drawGlide as referenceNativeGlide } from '@reference/title/glide';
import { createNativePreview } from '@candidate/authoring/native-preview';
import { nativeSceneAdapters } from '@candidate/authoring/scene-adapters';
import { renderDowntownPeople } from '@candidate/scenes/downtown/composition';
import libraryDocument from '../../src/ssg/game/scenes/library/composition.json';
import capsuleDocument from '../../src/ssg/game/scenes/capsule/composition.json';
import mothDocument from '../../src/ssg/game/scenes/moth/composition.json';
import laundromatDocument from '../../src/ssg/game/scenes/laundromat/composition.json';
import downtownDocument from '../../src/ssg/game/scenes/downtown/composition.json';
import galleriaStationDocument from '../../src/ssg/game/scenes/galleriaStation/composition.json';
import harborStationDocument from '../../src/ssg/game/scenes/harborStation/composition.json';
import beachDocument from '../../src/ssg/game/scenes/beach/composition.json';
import sandboxDocument from '../../src/ssg/game/scenes/sandbox/composition.json';
import warehouseDocument from '../../src/ssg/game/scenes/warehouse/composition.json';
import yardDocument from '../../src/ssg/game/scenes/yard/composition.json';
import stacksDocument from '../../src/ssg/game/scenes/stacks/composition.json';
import harborDocument from '../../src/ssg/game/scenes/harbor/composition.json';
import harborShiftDocument from '../../src/ssg/game/scenes/harbor-shift/composition.json';
import marketDocument from '../../src/ssg/game/scenes/market/composition.json';
import shopDocument from '../../src/ssg/game/scenes/shop/composition.json';
import mallDocument from '../../src/ssg/game/scenes/mall/composition.json';
import metroDocument from '../../src/ssg/game/scenes/metro/composition.json';
import trainDocument from '../../src/ssg/game/scenes/train/composition.json';
const previewDocuments = { library: libraryDocument, capsule: capsuleDocument, moth: mothDocument, laundromat: laundromatDocument, downtown: downtownDocument, galleriaStation: galleriaStationDocument, harborStation: harborStationDocument, beach: beachDocument, sandbox: sandboxDocument, warehouse: warehouseDocument, yard: yardDocument, stacks: stacksDocument, harbor: harborDocument, harborShift: harborShiftDocument, market: marketDocument, shop: shopDocument, mall: mallDocument, metro: metroDocument, train: trainDocument };
const nativePreview = createNativePreview(nativeSceneAdapters);

const host = document.querySelector('.demo-window');
const g = new Game({ windowEl: host, header: document.querySelector('.plaza-window-header'),
  footer: document.querySelector('.plaza-window-footer'), inputHost: document.querySelector('.footer-input-area'),
  onExit() {}, setNodes() {}, setScene() {} });
g.canvas.hidden = false;
g.started = true;
g.keyBar.sync = () => {};
const baseSave = newSave();
const weatherOf = g.weatherOf.bind(g);
let weatherOverride = null;
g.weatherOf = scene => weatherOverride ?? weatherOf(scene);
const cases = [];
for (const [id, def] of Object.entries(SCENES)) {
  for (const [w, h] of [[640, 360], [420, 240]]) {
    const max = Math.max(0, def.width - w);
    const count = Math.max(1, Math.ceil(max / (w * .8)) + 1);
    const cameras = Array.from({ length: count }, (_, i) => max * i / Math.max(1, count - 1));
    for (const cam of cameras) {
      for (const phase of [0, 137]) cases.push({ id: `${id}-${w}-${Math.round(cam)}-${phase}`, scene: id, w, h, cam, phase, min: phase ? 1200 : 580 });
    }
    if (def.data?.devices.length) cases.push({ id: `${id}-${w}-hack`, scene: id, w, h, cam: 0, phase: 137, min: 1200, hack: true });
  }
}
for (const scene of ['downtown', 'harbor', 'beach', 'metro', 'capsule']) {
  for (const weather of ['clear', 'cloudy', 'rain', 'storm', 'fog', 'smog', 'heat']) {
    for (const min of [720, 1200]) cases.push({ id: `environment-${scene}-${weather}-${min}`, scene, w: 640, h: 360, cam: scene === 'downtown' ? 700 : 0, phase: 137, min, weather });
  }
  cases.push({ id: `environment-${scene}-reduced`, scene, w: 420, h: 240, cam: 0, phase: 137, min: 1200, weather: 'storm', reduced: true });
}
const variants = {
  capsule: [{ plugOn: true, sun: true, doorOpen: true, pixelAt: 'router', rent: 'paid' }],
  downtown: [{ lock: 'open', scanned: true, dlvAt: 'target', feed: 'off' }],
  yard: [{ found: true, armAt: 'pickup', held: 'C-7', parcelAt: 'hook', gateAllowed: true }, { parcelAt: 'tray' }, { parcelAt: 'taken' }],
  moth: [{ fern: 'watered', fed: true, tape: 1 }],
  library: [{ renewed: true }],
  laundromat: [{ w1: 'run', w2: 'run', w3: 'done', w4: 'run', breaker: 'off', jacket: true }],
  stacks: [{ found: true, boxAt: 'hook', loaded: 1 }, { boxAt: 'ferry', departed: true }],
  beach: [{ song: 1, flag: 'storm', lamps: 'off', rented: true }],
  sandbox: [{ lampOn: true, hatchOpen: true, fanOn: true, mains: true, beaconOn: true, ventOpen: true }],
};
for (const c of [...cases]) if (!c.hack && c.w === 640 && c.phase === 137) {
  for (const [i, state] of (variants[c.scene] ?? []).entries()) cases.push({ ...c, id: c.id + `-state${i}`, state });
  if (c.scene === 'harborShift') for (const [i, keys] of [[], ['assigned'], ['assigned','parcel'], ['assigned','parcel','delivered'], ['assigned','parcel','delivered','case','returned','trolley','inspected'], ['assigned','parcel','delivered','case','returned','trolley','inspected','released','parked','checked','done']].entries()) cases.push({ ...c, id: c.id + `-stage${i}`, flags: Object.fromEntries(keys.map(k => ['shift:' + k, true])) });
}
function size(w, h) {
  g.canvas.width = w * 2; g.canvas.height = h * 2; g.k = 2;
  g.viewW = w; g.viewH = h; g.gy = h - 54;
  host.style.width = `${w * 2}px`; host.style.height = `${h * 2}px`;
}
async function hash() {
  const pixels = g.x.getImageData(0, 0, g.canvas.width, g.canvas.height).data;
  const digest = await crypto.subtle.digest('SHA-256', pixels);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
async function render(c) {
  __resetSeed();
  size(c.w, c.h);
  g.save = structuredClone(baseSave);
  g.save.flags = { arrived: true, end: true, pixel: true, ...(c.flags ?? {}) };
  g.save.clock.min = c.min ?? 580;
  g.reduced = !!c.reduced;
  weatherOverride = c.weather ? { kind: c.weather, from: c.weather, mix: 1,
    cloud: ['cloudy','rain','storm'].includes(c.weather) ? .85 : .2,
    rain: ['rain','storm'].includes(c.weather) ? 1 : 0, storm: c.weather === 'storm' ? 1 : 0,
    fog: c.weather === 'fog' ? 1 : 0, smog: c.weather === 'smog' ? 1 : 0,
    heat: c.weather === 'heat' ? 1 : 0, wet: ['rain','storm'].includes(c.weather) ? 1 : 0,
    wind: c.weather === 'storm' ? 1 : .2 } : null;
  city.bind(g.save.clock);
  g.here = c.scene;
  g.bubble = null; g.gain = null; g.nudge = null; g.beat = null; g.opening = null;
  g.hosts.forEach(h => h.closeAll());
  const zh = g.hostOf(c.scene);
  for (const [k, v] of Object.entries(SCENES[c.scene].data?.state ?? {})) zh.model.set(k, v);
  zh.hackLock = () => false;
  if (c.state) for (const [k, v] of Object.entries(c.state)) zh.model.set(k, v);
  if (c.hack) zh.toggleVision();
  g.cam = c.cam; g.t = c.phase; g.clock = c.phase;
  g.p.x = c.cam + Math.min(c.w * .45, SCENES[c.scene].width * .5);
  g.p.y = 0; g.p.moving = false;
  g.pixel.place(g.p.x - 20, 0, 'sit', 1);
  g.shiftGuidance?.update(g.save.flags, 3, false, false, g.p.x);
  // Original HUD measures its own height while drawing: one recorded layout pass precedes capture.
  g.draw(); g.draw();
  return { id: c.id, hash: await hash(), width: g.canvas.width, height: g.canvas.height };
}
window.fixture = {
  cases, scenes: Object.keys(SCENES), sequences: Object.keys(CUTSCENES), GLIDE, RISE,
  environment: () => ({ userAgent: navigator.userAgent, dpr: devicePixelRatio, fonts: document.fonts.status }),
  sequenceCases: [ { id: 'title', seconds: RISE }, { id: 'glide', seconds: GLIDE }, ...Object.values(CUTSCENES).map(s => ({ id: s.id, seconds: s.duration })) ],
  render, png: () => g.canvas.toDataURL('image/png'),
  async composer(c) {
    if (c.weather) throw new Error('Composer differential uses native forecast; explicit weather is tested separately');
    await render(c);
    const actors = g.drawCharacters, prompts = g.drawPrompt, bubbles = g.drawBubble;
    g.drawCharacters = () => { if (c.scene === 'downtown') renderDowntownPeople(g.x, g.view()); };
    g.drawPrompt = () => {}; g.drawBubble = () => {};
    try {
      // Align both paths on the same readback backend before comparing native world frames.
      for (let i = 0; i < 4; i++) g.x.getImageData(0, 0, g.canvas.width, g.canvas.height);
      const presentation = SCENES[c.scene].presentationState?.capture();
      g.drawWorld(); const game = await hash();
      const bounds = nativePreview.render(g.canvas, { composition: previewDocuments[c.scene], time: c.phase / 60, reduced: !!c.reduced, overlays: false,
        environment: { renderScale: 2, cameraX: c.cam, day: g.save.clock.day, minute: c.min ?? 580, seed: g.save.clock.seed, flags: JSON.stringify(g.save.flags), state: JSON.stringify(c.state ?? {}), ...(presentation ? { presentation: JSON.stringify(presentation) } : {}), hack: !!c.hack } });
      return { id: c.id, game, composer: await hash(), instances: bounds.bounds.length };
    } finally { g.drawCharacters = actors; g.drawPrompt = prompts; g.drawBubble = bubbles; }
  },
  async harborCraneCall(elapsed = 0) {
    const use = SCENES.harbor.uses.find(u => u.id === 'crane').items.find(u => u.item === 'tea');
    const dialogue = use.use({ take: () => true, t: 137, give() {}, set() {} });
    const result = await render({ id: `harbor-crane-tea-${elapsed}`, scene: 'harbor', w: 640, h: 360,
      cam: 520, phase: 137 + elapsed, min: 1200 });
    return { ...result, dialogue };
  },
  async flight(frame, start = 0, w = 640, h = 360) {
    const a = document.createElement('canvas'), b = document.createElement('canvas');
    a.width=b.width=w*2; a.height=b.height=h*2;
    const ax=a.getContext('2d'), bx=b.getContext('2d');
    ax.setTransform(2,0,0,2,0,0); bx.setTransform(2,0,0,2,0,0);
    referenceFlight(ax,w,h,frame/200,start+frame,'HARBOR');
    candidateFlight(bx,w,h,frame/200,start+frame,'HARBOR');
    const pixels = [ax,bx].map(ctx => ctx.getImageData(0,0,w*2,h*2).data);
    const hashes = await Promise.all(pixels.map(async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')));
    let differentPixels=0;for(let i=0;i<pixels[0].length;i+=4)if(pixels[0][i]!==pixels[1][i]||pixels[0][i+1]!==pixels[1][i+1]||pixels[0][i+2]!==pixels[1][i+2]||pixels[0][i+3]!==pixels[1][i+3])differentPixels++;
    return { id:`flight-${w}-${start}-${frame}`, original:hashes[0], candidate:hashes[1], differentPixels,
      ...(frame%60===0||frame===200?{before:a.toDataURL(),after:b.toDataURL()}:{} ) };
  },
  compareMap() {
    const a = document.createElement('canvas'), b = document.createElement('canvas');a.width=b.width=1280;a.height=b.height=720;
    const ax=a.getContext('2d'),bx=b.getContext('2d');ax.setTransform(2,0,0,2,0,0);bx.setTransform(2,0,0,2,0,0);
    g.here='downtown';g.save.flags=Object.fromEntries(Object.keys(SCENES).flatMap(id=>[['seen:'+id,true],['scene:'+id,true]]));g.mapView=openMap('view','downtown',null);g.clock=240;
    const state=g.mapState();referenceMap(ax,640,360,state);drawCityMap(bx,640,360,state);
    const aa=ax.getImageData(0,0,1280,720).data,bb=bx.getImageData(0,0,1280,720).data;let count=0;for(let i=0;i<aa.length;i+=4)if(aa[i]!==bb[i]||aa[i+1]!==bb[i+1]||aa[i+2]!==bb[i+2]||aa[i+3]!==bb[i+3])count++;
    return {differentPixels:count,baseline:a.toDataURL(),candidate:b.toDataURL()};
  },
  contractPixels() {
    const a = document.createElement('canvas'), b = document.createElement('canvas');
    a.width = b.width = 640; a.height = b.height = 360;
    const x = a.getContext('2d'), y = b.getContext('2d');
    const v = { sx: (wx, p = 1) => wx - 17 * p, y: h => 306 - h, cam: 17, gy: 306, viewW: 640, viewH: 360, t: 137, flags: {} };
    for (const px of [100, 130]) stool(x, v, { x: px, seed: 3 });
    const composition = art.validate({ version: 1, scene: 'contract-fixture', instances: [
      { id: 'pair', type: 'assembly.group', props: {}, placement: { x: 80, h: 0 }, pass: 'backdrop', order: 0, children:
        [20, 50].map((px, i) => ({ id: 'stool' + i, type: 'furniture.stool', props: { seed: 3 }, placement: { x: px, h: 0 }, pass: 'backdrop', order: i + 1 })) },
    ] });
    drawComposition(y, art, composition, { view: v, state: {}, reduced: false }, 'backdrop');
    const aa = x.getImageData(0,0,640,360).data, bb = y.getImageData(0,0,640,360).data;
    let differentPixels = 0;for(let i=0;i<aa.length;i+=4) if(aa[i]!==bb[i] || aa[i+1]!==bb[i+1] || aa[i+2]!==bb[i+2] || aa[i+3]!==bb[i+3]) differentPixels++;
    return { differentPixels, baseline: a.toDataURL(), candidate: b.toDataURL() };
  },
  async map(layer = 'street', known = false) {
    size(640, 360); g.here = 'downtown'; g.save.flags = known ? Object.fromEntries(Object.keys(SCENES).flatMap(id => [['seen:' + id, true], ['scene:' + id, true]])) : {};
    g.mapView = openMap('view', 'downtown', null); g.mapView.layer = layer; g.clock = 240;
    g.x.setTransform(2, 0, 0, 2, 0, 0);
    drawCityMap(g.x, 640, 360, g.mapState());
    const result = { id: `map-${layer}-${known}`, hash: await hash() }; g.mapView = null; return result;
  },
  async composedMap(layer = 'street', known = false) {
    // The native map overlays a rendered world, never an empty transparent canvas.
    // Also pin its CSS-sized hit targets instead of reading the browser pane's width.
    g.mapView = null;
    const flags = Object.fromEntries(known ? Object.keys(SCENES).flatMap(id => [['seen:' + id, true], ['scene:' + id, true]]) : []);
    await render({ id: 'map-world', scene: 'downtown', w: 640, h: 360, cam: 0, phase: 240, min: 580, flags: { ...flags, end: false, pixel: false } });
    g.mapView = openMap('view', 'downtown', null); g.mapView.layer = layer;
    const state = { ...g.mapState(), tapMin: 22, touch: false, avoid: null };
    drawCityMap(g.x, 640, 360, state);
    const result = { id: `composed-map-${layer}-${known}`, hash: await hash() }; g.mapView = null; return result;
  },
  async nativeOpening(id, frame, reduced = false, original = false) {
    size(640, 360); __resetSeed();
    g.x.setTransform(2, 0, 0, 2, 0, 0);
    g.x.fillStyle = '#000'; g.x.fillRect(0, 0, 640, 360);
    const tau = id === 'glide' ? frame / 60 : null;
    const t = tau === null ? frame / 60 : RISE + tau;
    (original ? referenceNativeGlide : candidateNativeGlide)(g.x, { W: 640, H: 360, reduced }, t, tau);
    return { id: `${id}-${frame}-${reduced}`, hash: await hash() };
  },
  async sequence(id, frame, reduced = false) {
    size(640, 360); __resetSeed();
    g.x.setTransform(2, 0, 0, 2, 0, 0);
    g.x.fillStyle = '#000'; g.x.fillRect(0, 0, 640, 360);
    if (id === 'title' || id === 'glide') {
      const o = new Opening(reduced);
      if (id === 'glide') o.go();
      o.timeline.seek(frame / 60);
      o.draw(g.x, 640, 360);
    } else {
      const play = new CutscenePlay(CUTSCENES[id], { reduced, touch: false });
      play.t = frame / 60; play.draw(g.x, 640, 360);
    }
    return { id: `${id}-${frame}-${reduced}`, hash: await hash() };
  },
};
// fonts.ready alone does not request weights first used later by cinematic cards.
await Promise.all([400, 500, 600, 700].map(weight => document.fonts.load(`${weight} 16px "IBM Plex Mono"`)));
await document.fonts.ready;
window.fixtureReady = true;
