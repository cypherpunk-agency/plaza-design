/** The frame director: a sequence's configuration of the one frame (runtime/render-scene.ts). Absent, play is unchanged. */
import assert from 'node:assert/strict';
import {renderWorldFrame} from '../../src/ssg/game/runtime/render-scene';
import {directorFromTimeline,type FrameDirector,type WorldFrame} from '../../src/ssg/game/runtime/frame';
import { lightAt } from '../../src/ssg/game/world/light';
import type { View } from '../../src/ssg/game/art/core/view';
import type {BackdropDocument} from '../../src/ssg/game/world/backdrops';

function recorder(){const commands:unknown[][]=[];const values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(text:string)=>({width:String(text).length*6})};
 const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return(...args:unknown[])=>{commands.push([k,...args]);return{addColorStop:(...a:unknown[])=>commands.push(['stop',...a])};};return(...args:unknown[])=>{commands.push([k,...args]);};},set(t,k:string,value){t[k]=value;commands.push(['set',k,value]);return true;}});
 return{ctx:ctx as unknown as CanvasRenderingContext2D,commands};}
const L = lightAt(1, 580, 90, null);
function view(): View { return { lighting: L, illumination: undefined as never, sx: (wx, p = 1) => Math.round(wx - 100 * p), y: h => 200 - h, t: 60, viewW: 400, viewH: 240, cam: 100, gy: 200, flags: {} }; }
const seen: { sx: number; y: number; minute: number }[] = [], calls: string[] = [];
function frame(director?: FrameDirector,backdrop?:BackdropDocument,joinedVision?:boolean) {
  const r = recorder(); seen.length = 0; calls.length = 0;
  const f: WorldFrame = { context: r.ctx, scale: 2, view: view(), sceneId: 'fixture', reduced: false, clock: 60,
    scene: { id: 'fixture', name: 'Fixture', width: 800, ambient: { sky: true },layers:joinedVision!==undefined,drawSkyArtwork:()=>calls.push('sky'),...(backdrop?{backdrop:{id:'fixture',x:0,h:0}}:{}) } as unknown as WorldFrame['scene'],
    host: { visionOn: false, model: { spots: () => [] } as never, draw: (x, v, layer) => { if(joinedVision!==undefined)calls.push('main:'+(layer??'all'));seen.push({ sx: v.sx(300), y: v.y(10), minute: v.lighting.min }); x.fillRect(v.sx(300), v.y(10), 4, 4); } },
    weather: () => { throw new Error('no weather in this scene'); }, lighting: () => L,
    actors: () => calls.push('actors'), prompts: () => calls.push('prompts'), bubbles: () => calls.push('bubbles'),
    ...(director ? { director } : {}),...(backdrop?{backdrops:new Map([['fixture',backdrop]])}:{}),
    ...(joinedVision===undefined?{}:{joined:[{sceneId:'source',scene:{id:'source',name:'Source',width:800,layers:true} as WorldFrame['scene'],view:view(),lighting:()=>L,
      host:{visionOn:joinedVision,model:{spots:()=>[]} as never,draw:(_x,_v,layer)=>calls.push('joined:'+(layer??'all'))}}]}) };
  renderWorldFrame(f);
  return r.commands;
}
const play = JSON.stringify(frame());
assert.deepEqual(calls, ['sky', 'actors', 'prompts', 'bubbles'], 'play runs every pass');
assert.equal(JSON.stringify(frame({})), play, 'an empty director is play');
assert.equal(JSON.stringify(frame({ passes: {} })), play, 'no passes switched off is play');
frame(undefined,undefined,true);
assert.deepEqual(calls.filter(c=>c.startsWith('main:')||c.startsWith('joined:')),['main:all','joined:world','joined:devices'],'a joined vehicle owner receives the existing hack-vision passes');
frame({passes:{vision:false}},undefined,true);
assert.deepEqual(calls.filter(c=>c.startsWith('main:')||c.startsWith('joined:')),['main:all','joined:all'],'the frame director can suppress joined-owner hack vision');
frame(undefined,undefined,false);
assert.deepEqual(calls.filter(c=>c.startsWith('main:')||c.startsWith('joined:')),['main:all','joined:all'],'ordinary joined rendering remains unchanged');

frame({ passes: { sky: false, actors: false, prompts: false, bubbles: false } });
assert.deepEqual(calls, [], 'switched-off passes do not run');

const directed = frame({ camera: { x: 250, h: 6 } });
assert.deepEqual(seen[0], { sx: 50, y: 184, minute: 580 }, 'the camera replaces the follow: its left edge at x, the picture up by h');
assert.ok(!directed.some(c => c[0] === 'scale'), 'no zoom, no zoom transform');
const zoomed = frame({ camera: { x: 100, h: 0, zoom: 2 } });
assert.deepEqual(zoomed.filter(c => ['translate', 'scale'].includes(c[0] as string)).slice(0, 3), [['translate', 200, 120], ['scale', 2, 2], ['translate', -200, -120]], 'zoom about the middle of the viewport');
assert.deepEqual(seen[0].sx, 200, 'a camera at the view\'s own edge keeps its projection');

frame({ clock: { minute: 1200 } });
assert.equal(seen[0].minute, 1200, 'the director sets the time of day for the light');

const over = frame({ scale: 3, overlays: { fades: [{ color: '#000000', opacity: 0.5 }], letterbox: { top: 20, bottom: 30 }, cards: [{ text: 'DOWNTOWN', opacity: 1 }, { text: 'A\nB', opacity: 0.4, x: 10, y: 50 }] } });
assert.deepEqual(over[0], ['setTransform', 3, 0, 0, 3, 0, 0], 'the director\'s own pixel scale');
const tail = over.slice(over.findLastIndex(c => c[0] === 'save'));
assert.deepEqual(tail.filter(c => c[0] === 'fillRect'), [['fillRect', 0, 0, 400, 240], ['fillRect', 0, 0, 400, 20], ['fillRect', 0, 210, 400, 30], ['fillRect', 0, 19, 400, 1], ['fillRect', 0, 210, 400, 1]], 'fade, then letterbox bars with their edges');
assert.deepEqual(tail.filter(c => c[0] === 'fillText'), [['fillText', 'DOWNTOWN', 200, 120], ['fillText', 'A', 10, 50], ['fillText', 'B', 10, 68]], 'cards last: centred by default, else at x/y, one line per row');

const fromTimeline = directorFromTimeline({ camera: { x: 12, h: 3, zoom: 1.5 }, fades: [{ id: 'f', color: '#102030', opacity: 0.25 }], text: [{ id: 't', from: 0, to: 2, text: 'HARBOR', x: 40, h: -100 }], state: { sky: { clock: 1100 }, rain: { amount: 0.5 } } }, { passes: { prompts: false }, overlays: { letterbox: { top: 1, bottom: 2 } } });
assert.deepEqual(fromTimeline, { camera: { x: 12, h: 3, zoom: 1.5 }, clock: { minute: 1100 }, passes: { prompts: false }, overlays: { fades: [{ color: '#102030', opacity: 0.25 }], cards: [{ text: 'HARBOR', opacity: 1, x: 40, y: 100 }], letterbox: { top: 1, bottom: 2 } } }, 'a timeline frame becomes the director');
assert.equal(directorFromTimeline({ camera: { x: 0, h: 0, zoom: 1 }, fades: [], text: [], state: { sky: { clock: -1 } } }).clock, undefined, 'clock -1: the view\'s own light');
const backdrop:BackdropDocument={version:1,scene:'backdrop-fixture',instances:[{id:'sky',type:'environment.sky-traffic',props:{ships:[{kind:'freighter',ps:1,y:60,speed:.1,offset:800,flip:false,depth:.4}]},placement:{x:70,h:0},layer:'distance',order:0}]};
assert.equal(frame({},backdrop).filter(c=>JSON.stringify(c)==='["translate",70,0]').length,1,'an authored backdrop fleet paints once in the shared sky pass');
assert.equal(frame({passes:{sky:false}},backdrop).filter(c=>JSON.stringify(c)==='["translate",70,0]').length,0,'a disabled sky pass cannot paint the fleet through the world backdrop pass');
console.log('Frame director PASS: absent or empty is play; passes, camera, zoom, clock, scale and overlays configure the one frame; timelines map onto it.');
