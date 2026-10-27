import type{Light}from'../../world/light';
/**
 * The cinematic pieces (the intro skyline, the ACT II card, the taxi flight) as registered art elements, and their timeline
 * motion formulas. They are drawn like any other artwork, by drawComposition inside the one frame
 * (runtime/prepare-frame.ts → runtime/render-scene.ts renderWorldFrame); there is no cinematic frame renderer.
 */
import { ArtRegistry, type ChunkDocument, type AssetDefinition, type Properties } from '../core/composition';
import type { TimelineContext, TimelineProgram } from '../core/timeline';
import type { CutView, View } from '../core/view';
import { drawAct2Part, type Act2Part } from './act2';
import { drawFlightPart, type FlightPart } from './taxi-picture';
import { drawIntroPart } from './skyline';
import { skylinePartIds } from '../environment/skyline';
import { cinematicGeometry } from './cinematic-metadata';

export const cinematicParts = { intro: [...skylinePartIds, 'screen-fade'], act2: ['sky', 'city', 'spire', 'water', 'ferry', 'titles', 'screen-fade'], taxi: ['sky', 'lights', 'towers', 'cab', 'destination', 'fade'] };
/** The taxi sequence's native length when a document does not say (200 frames of the game clock). */
export const TAXI_SECONDS = 200 / 60;
const number = (label: string, value = 0) => ({ kind: 'number' as const, label, default: value, animatable: true });
const visualFields = { time: number('Seconds'), ambient: number('Decorative frame clock'), reduced: { kind: 'boolean' as const, label: 'Reduced motion', default: false }, cameraX: number('Camera X'), amount: { ...number('Amount'), min: 0, max: 1 }, x: number('X'), y: number('Y'), one: number('Act I opacity'), found: number('Found opacity'), two: number('Act II opacity'), subtitle: number('Subtitle opacity') };
function fields(sequence: string, part: string): AssetDefinition['fields'] {
  const color=(label:string,value:string)=>({kind:'color' as const,label,default:value});
  if(sequence==='act2'&&part==='sky')return{top:color('Top sky','#02030a'),horizon:color('Horizon sky','#170803')};
  if(sequence==='act2'&&part==='water')return{fill:color('Water','#01040a')};
  if(sequence==='act2'&&part==='ferry')return{paint:color('Hull and bridge','#0a0504')};
  if(sequence==='act2'&&part==='spire')return{windows:{...number('Window light',1.6),min:0,max:4},edge:{...number('Edge light',.18),min:0,max:1},glow:{kind:'boolean',label:'Glow',default:true}};
  if(sequence==='taxi'&&part==='sky')return{top:color('Top sky','#02030a'),middle:color('Middle sky','#0a0403'),bottom:color('Bottom sky','#170803')};
  if(sequence==='taxi'&&part==='lights')return{far:{...number('Far light speed',.6),min:0,max:100},middle:{...number('Middle light speed',1.8),min:0,max:100},near:{...number('Near light speed',4.5),min:0,max:100}};
  if(sequence==='taxi'&&part==='towers')return{fill:color('Tower silhouette','#030100')};
  if (sequence === 'act2' && part === 'titles') return { actOne: { kind: 'string', label: 'Act I', default: 'ACT I · WHERE IS MOTH?' }, found: { kind: 'string', label: 'Found', default: 'FOUND.' }, actTwo: { kind: 'string', label: 'Act II', default: 'ACT II' }, subtitle: { kind: 'string', label: 'Subtitle', default: 'SEVEN FRAGMENTS' } };
  if (sequence === 'taxi' && part === 'destination') return { destination: { kind: 'string', label: 'Destination label override', default: '' } };
  return {};
}
function visual(sequence:string,part:string):AssetDefinition['visualFields']{
  const env={time:{...visualFields.time,animatable:false},ambient:{...visualFields.ambient,animatable:false},reduced:visualFields.reduced,width:{kind:'number' as const,label:'Native viewport width',default:640,min:1},height:{kind:'number' as const,label:'Native viewport height',default:360,min:1}};
  return {...env,...(sequence==='intro'?{cameraX:{...visualFields.cameraX,animatable:false}}:{}),...(['screen-fade','fade','rain','ferry'].includes(part)?{amount:visualFields.amount}:{}),...(sequence==='act2'&&part==='titles'?{one:visualFields.one,found:visualFields.found,two:visualFields.two,subtitle:visualFields.subtitle}:{}),...(sequence==='taxi'&&part==='cab'?{x:visualFields.x,y:visualFields.y}:{}),...(sequence==='taxi'&&part==='destination'?{place:{kind:'string' as const,label:'Destination (the flight\'s stand)',default:''}}:{})};
}
/** A piece that fills the screen with black by its `amount`; the one frame draws it as a fade overlay (runtime/prepare-frame.ts). */
export const isScreenFade = (type: string) => /^sequence\.(intro|act2)\.screen-fade$/.test(type);
export function paintBlack(ctx: CanvasRenderingContext2D, W: number, H: number, opacity: number) { if (opacity > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, opacity) + ')'; ctx.fillRect(0, 0, W, H); } }
const num = (v: unknown, fallback = 0) => typeof v === 'number' ? v : fallback;
/** One cinematic part, in its picture's own frame (the viewport, its letterbox bars): the drawing kernels, unchanged. */
function drawPart(ctx: CanvasRenderingContext2D, view: View, sequence: string, part: string, props: Properties, state: Properties) {
  const cut = cutView(view.viewW, view.viewH, !!state.reduced, view.lighting), time = num(state.time);
  if (part === 'screen-fade') { paintBlack(ctx, view.viewW, view.viewH, num(state.amount)); return; }
  if (sequence === 'intro') {
    if (!view.skyline) throw new Error('Intro piece requires a prepared skyline session (View.skyline) from its controller');
    drawIntroPart(ctx, cut, part, time, { ...view.skyline, cameraX: view.cam, rain: num(state.amount) });
  } else if (sequence === 'act2') {
    drawAct2Part(ctx, cut, part as Act2Part, time, 16, { ferryProgress: num(state.amount), alpha: { one: num(state.one), found: num(state.found), two: num(state.two), subtitle: num(state.subtitle) },
      ...(part === 'titles' ? { titles: props as unknown as { actOne: string; found: string; actTwo: string; subtitle: string } } : {}), ...(part === 'sky' ? { sky: props as unknown as { top: string; horizon: string } } : {}),
      ...(part === 'water' ? { water: props.fill as string } : {}), ...(part === 'ferry' ? { ferryPaint: props.paint as string } : {}), ...(part === 'spire' ? { spire: props as unknown as { windows: number; edge: number; glow: boolean } } : {}) });
  } else {
    drawFlightPart(ctx, view.viewW, view.viewH, part as FlightPart, time / TAXI_SECONDS, num(state.ambient), String(props.destination || state.place || ''), { cabX: num(state.x), cabY: num(state.y), fade: num(state.amount),
      ...(part === 'sky' ? { sky: props as unknown as { top: string; middle: string; bottom: string } } : {}), ...(part === 'lights' ? { lightSpeeds: [props.far, props.middle, props.near] as number[] } : {}), ...(part === 'towers' ? { towerFill: props.fill as string } : {}) });
  }
}
export const cinematicElements: AssetDefinition[] = Object.entries(cinematicParts).flatMap(([sequence, parts]) => parts.map<AssetDefinition>(part => ({
  type: `sequence.${sequence}.${part}`, version: 1 as const, label: `${sequence === 'act2' ? 'Act II' : sequence === 'taxi' ? 'Taxi' : 'Intro'} · ${part}`, category: 'Cinematic sequence', coordinates: 'world' as const, parts: ['backdrop' as const],
  fields: fields(sequence, part),
  visualFields:visual(sequence,part), bounds: (props,state) => cinematicGeometry(sequence,part,props,state).bounds, anchors: (props,state) => cinematicGeometry(sequence,part,props,state).anchors,
  // placed at its row; the camera moves a flat picture (act2, taxi), while the intro is a panorama the camera pans inside (view.cam)
  draw(ctx, view, props, state, _pass, placement) {
    ctx.save(); ctx.translate(sequence === 'intro' ? placement.x : view.sx(placement.x), view.y(placement.h));
    try { drawPart(ctx, view, sequence, part, props, state); } finally { ctx.restore(); }
  },
})));
export const cinematicRegistry = new ArtRegistry(); cinematicElements.forEach(element => cinematicRegistry.register(element));
export interface CinematicDocuments { timeline: TimelineProgram; compositions: Record<string, ChunkDocument> }
/** Motion-formula inputs: the flight's own progress (0 → 1) and the decorative clock, when the controller has them. */
export interface CinematicMotion { ambient?: number; progress?: number; sequenceId?: string; registry?: ArtRegistry }
export function cutView(W: number, H: number, reduced:boolean,lighting:Light):CutView { const size = Math.max(10, Math.min(18, Math.round(H / 26))); return {lighting,viewW: W, viewH: H, barTop: Math.round(Math.max(16, H * 0.09)), barBottom: Math.round(Math.max(size * 3.6, H * 0.16)), reduced }; }
const noProps = (props: Properties) => { if (Object.keys(props).length) throw new Error('This exact motion formula takes no parameters'); };
const fade = (t: number, at: number, duration = 0.8) => Math.max(0, Math.min(1, (t - at) / duration));
export function cinematicTimelineContext(view: CutView, documents: CinematicDocuments, options: CinematicMotion = {}): TimelineContext {
  const seqs = documents.timeline.sequences, selected = seqs.find(s => s.id === options.sequenceId);
  const introDuration = selected?.duration ?? seqs.find(s => s.id === 'intro')?.duration ?? 26, actDuration = selected?.duration ?? seqs.find(s => s.id === 'act2')?.duration ?? 16, taxiDuration = selected?.duration ?? seqs.find(s => s.id === 'taxi')?.duration ?? TAXI_SECONDS;
  const motion = (evaluate: (time: number) => number) => ({ validate: noProps, evaluate });
  return { registry: options.registry ?? cinematicRegistry, compositions: documents.compositions, destinations: { capsule: [], stacks: [] }, motionTracks: {
    'intro.camera': motion(time => { const u = view.reduced ? 0.5 : Math.min(1, Math.max(0, time / introDuration)); return Math.round(Math.round(Math.ceil(view.viewW) * 1.1) * (0.5 - 0.5 * Math.cos(Math.PI * u))); }),
    'intro.rain': motion(time => (view.reduced ? 0.35 : Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (time - 3) / (introDuration - 5))))) ** 1.4) * 0.85),
    'intro.fade': motion(time => Math.max(0, 1 - time / 1.4, 1 - (introDuration - time) / 0.9)),
    'act2.fade': motion(time => Math.max(0, 1 - time / 1.4, 1 - (actDuration - time) / 0.9)),
    'act2.ferry': motion(time => Math.min(1, (view.reduced ? 6 : time) / actDuration)),
    'act2.title-one': motion(time => fade(time, 0.8) * (1 - fade(time, 5.4, 0.7))),
    'act2.title-found': motion(time => fade(time, 2.6, 0.4)),
    'act2.title-two': motion(time => fade(time, 6, 1.2)),
    'act2.title-subtitle': motion(time => fade(time, 7.6, 1)),
    'taxi.cab-x': motion(() => view.viewW / 2),
    'taxi.cab-y': motion(time => view.viewH * 0.45 + Math.sin((options.ambient ?? time * 60) * 0.08) * 3),
    'taxi.fade': motion(time => { const f = options.progress ?? time / taxiDuration; return Math.min(1, f < 0.15 ? 1 - f / 0.15 : f > 0.85 ? (f - 0.85) / 0.15 : 0); }),
  } };
}
