import type{Light}from'../../world/light';
import {frameView} from '../core/view';
/** Meaningful cinematic pieces and the shared runtime/editor picture dispatcher. */
import { ArtRegistry, resolveComposition, drawComposition, compositionAppearance, type Composition, type Element, type Properties } from '../core/composition';
import { evaluateTimeline, type TimelineContext, type TimelineDocument, type TimelineFrame } from '../core/timeline';
import type { CutView } from '../core/view';
import { act2Frame } from './act2';
import { flightFrame } from './taxi-picture';
import { introFrame,type IntroOptions } from './skyline';
import { skylinePartIds } from '../environment/skyline';
import { cinematicGeometry } from './cinematic-metadata';

export const cinematicParts = { intro: [...skylinePartIds, 'screen-fade'], act2: ['sky', 'city', 'spire', 'water', 'ferry', 'titles', 'screen-fade'], taxi: ['sky', 'lights', 'towers', 'cab', 'destination', 'fade'] };
const number = (label: string, value = 0) => ({ kind: 'number' as const, label, default: value, animatable: true });
const visualFields = { time: number('Seconds'), ambient: number('Decorative frame clock'), reduced: { kind: 'boolean' as const, label: 'Reduced motion', default: false }, cameraX: number('Camera X'), amount: { ...number('Amount'), min: 0, max: 1 }, x: number('X'), y: number('Y'), one: number('Act I opacity'), found: number('Found opacity'), two: number('Act II opacity'), subtitle: number('Subtitle opacity') };
function fields(sequence: string, part: string): Element['fields'] {
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
function visual(sequence:string,part:string):Element['visualFields']{
  const env={time:{...visualFields.time,animatable:false},ambient:{...visualFields.ambient,animatable:false},reduced:visualFields.reduced,width:{kind:'number' as const,label:'Native viewport width',default:640,min:1},height:{kind:'number' as const,label:'Native viewport height',default:360,min:1}};
  return {...env,...(sequence==='intro'?{cameraX:{...visualFields.cameraX,animatable:false}}:{}),...(['screen-fade','fade','rain','ferry'].includes(part)?{amount:visualFields.amount}:{}),...(sequence==='act2'&&part==='titles'?{one:visualFields.one,found:visualFields.found,two:visualFields.two,subtitle:visualFields.subtitle}:{}),...(sequence==='taxi'&&part==='cab'?{x:visualFields.x,y:visualFields.y}:{})};
}
export const cinematicElements: Element[] = Object.entries(cinematicParts).flatMap(([sequence, parts]) => parts.map<Element>(part => ({
  type: `sequence.${sequence}.${part}`, version: 1 as const, label: `${sequence === 'act2' ? 'Act II' : sequence === 'taxi' ? 'Taxi' : 'Intro'} · ${part}`, category: 'Cinematic sequence', coordinates: 'world' as const, parts: ['backdrop' as const],
  fields: fields(sequence, part),
  visualFields:visual(sequence,part), bounds: (props,state) => cinematicGeometry(sequence,part,props,state).bounds, anchors: (props,state) => cinematicGeometry(sequence,part,props,state).anchors,
  draw(ctx, view, props, state, _pass, placement) {
    const cut = cutView(view.viewW, view.viewH, !!state.reduced,view.lighting), time = state.time as number;
    const jobs = sequence === 'act2' ? act2Frame(ctx, cut, time, 16, { ...(part==='titles'?{titles:props as unknown as { actOne: string; found: string; actTwo: string; subtitle: string }}:{}),...(part==='sky'?{sky:props as unknown as {top:string;horizon:string}}:{}),...(part==='water'?{water:props.fill as string}:{}),...(part==='ferry'?{ferryPaint:props.paint as string}:{}),...(part==='spire'?{spire:props as unknown as {windows:number;edge:number;glow:boolean}}:{}) }) : sequence === 'taxi' ? flightFrame(ctx, view.viewW, view.viewH, time / (200 / 60), state.ambient as number, String(props.destination ?? ''),{...(part==='sky'?{sky:props as unknown as {top:string;middle:string;bottom:string}}:{}),...(part==='lights'?{lightSpeeds:[props.far,props.middle,props.near] as number[]}:{}),...(part==='towers'?{towerFill:props.fill as string}:{})}) : (()=>{throw new Error('Intro piece requires a prepared skyline session through the cinematic controller');})();
    ctx.save(); ctx.translate(placement.x, -placement.h); if (part === 'screen-fade') paintBlack(ctx, view.viewW, view.viewH, state.amount as number); else jobs.find(job => job.id === part)!.draw(); ctx.restore();
  },
})));
export const cinematicRegistry = new ArtRegistry(); cinematicElements.forEach(element => cinematicRegistry.register(element));
function requireIntro(options:CinematicOptions):IntroOptions{if(!options.intro)throw new Error('Intro renderer requires a controller-prepared skyline session');return options.intro;}
export interface CinematicDocuments { timeline: TimelineDocument; compositions: Record<string, Composition> }
export interface CinematicOptions { composition?: Composition; timeline?: TimelineDocument; frame?: TimelineFrame; registry?: ArtRegistry; ambient?: number; progress?: number; destination?: string; intro?:IntroOptions; sequenceId?: string }
export function cutView(W: number, H: number, reduced:boolean,lighting:Light):CutView { const size = Math.max(10, Math.min(18, Math.round(H / 26))); return {lighting,viewW: W, viewH: H, barTop: Math.round(Math.max(16, H * 0.09)), barBottom: Math.round(Math.max(size * 3.6, H * 0.16)), reduced }; }
const noProps = (props: Properties) => { if (Object.keys(props).length) throw new Error('This exact motion formula takes no parameters'); };
const fade = (t: number, at: number, duration = 0.8) => Math.max(0, Math.min(1, (t - at) / duration));
function paintBlack(ctx: CanvasRenderingContext2D, W: number, H: number, opacity: number) { if (opacity > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, opacity) + ')'; ctx.fillRect(0, 0, W, H); } }
export function cinematicTimelineContext(view: CutView, documents: CinematicDocuments, options: CinematicOptions = {}): TimelineContext {
  const seqs = documents.timeline.sequences, selected = seqs.find(s => s.id === options.sequenceId);
  const introDuration = selected?.duration ?? seqs.find(s => s.id === 'intro')?.duration ?? 26, actDuration = selected?.duration ?? seqs.find(s => s.id === 'act2')?.duration ?? 16, taxiDuration = selected?.duration ?? seqs.find(s => s.id === 'taxi')?.duration ?? 200 / 60;
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
/** Draws just the picture. Letterbox/text-card UI remains in CutscenePlay. */
export function renderCinematicPicture(ctx: CanvasRenderingContext2D, view: CutView, documents: CinematicDocuments, id: 'intro' | 'act2' | 'taxi', time: number, options: CinematicOptions = {}) {
  const timeline = options.timeline ?? documents.timeline, sequenceId = options.sequenceId ?? id, sequence = timeline.sequences.find(s => s.id === sequenceId); if (!sequence) throw new Error(`Unknown cinematic: ${sequenceId}`);
  const composition = options.composition ?? documents.compositions[sequence.composition];
  const context = cinematicTimelineContext(view, { timeline, compositions: { ...documents.compositions, [sequence.composition]: composition } }, options);
  const frame = options.frame ?? evaluateTimeline(timeline, sequenceId, time, context, { reduced: view.reduced });
  const nodes: Composition['instances'] = []; const collect = (instances: Composition['instances']) => instances.forEach(n => { nodes.push(n); collect(n.children ?? []); }); collect(frame.composition.instances);
  const state = (part: string) => { const instance = nodes.find(n => n.type === `sequence.${id}.${part}`); return instance ? frame.state[instance.id] ?? {} : {}; };
  const titleInstance = nodes.find(n => n.type === 'sequence.act2.titles'); const titleProps = titleInstance ? (options.registry ?? cinematicRegistry).properties(titleInstance.type, titleInstance.props) : {};
  const prop=(part:string)=>{const instance=nodes.find(n=>n.type===`sequence.${id}.${part}`);return instance?(options.registry??cinematicRegistry).properties(instance.type,instance.props):{};};
  const skyProps=prop('sky'),waterProps=prop('water'),ferryProps=prop('ferry'),spireProps=prop('spire'),lightProps=prop('lights'),towerProps=prop('towers');
  const destInstance = nodes.find(n => n.type === 'sequence.taxi.destination'); const destination = destInstance?.props.destination ? String(destInstance.props.destination) : options.destination ?? '';
  const ambient = options.ambient ?? time * 60;
  const jobs = id === 'intro' ? (introFrame(ctx,view,time,sequence.duration,{...requireIntro(options),cameraX:frame.camera.x,rain:state('rain').amount as number}).parts)
    : id === 'act2' ? act2Frame(ctx, view, time, sequence.duration, { ferryProgress: state('ferry').amount as number, titles: titleProps as unknown as { actOne: string; found: string; actTwo: string; subtitle: string }, alpha: state('titles') as unknown as { one: number; found: number; two: number; subtitle: number },sky:skyProps as unknown as {top:string;horizon:string},water:waterProps.fill as string,ferryPaint:ferryProps.paint as string,spire:spireProps as unknown as {windows:number;edge:number;glow:boolean} })
    : flightFrame(ctx, view.viewW, view.viewH, options.progress ?? time / sequence.duration, ambient, destination, { cabX: state('cab').x as number, cabY: state('cab').y as number, fade: state('fade').amount as number,sky:skyProps as unknown as {top:string;middle:string;bottom:string},lightSpeeds:[lightProps.far??.6,lightProps.middle??1.8,lightProps.near??4.5] as number[],towerFill:towerProps.fill as string });
  const pieces = new Map(jobs.map(p => [p.id, p]));
  if (id !== 'taxi') pieces.set('screen-fade', { id: 'screen-fade', draw: () => paintBlack(ctx, view.viewW, view.viewH, state('screen-fade').amount as number) });
  const registry = options.registry ?? cinematicRegistry;
  const nativeView = { ...frameView(time*60,view.lighting), viewW: view.viewW, viewH: view.viewH, cam: frame.camera.x, gy: 0, t: ambient, flags: {}, sx: (x: number) => x, y: (h: number) => -h };
  const appearance = compositionAppearance(frame.composition, { visibility: frame.visibility, opacity: frame.opacity });
  const counts=new Map<string,number>();nodes.forEach(node=>counts.set(node.type,(counts.get(node.type)??0)+1));
  const cameraChanged = frame.camera.zoom !== 1 || id !== 'intro' && frame.camera.x !== 0 || frame.camera.h !== 0;
  const saved = id === 'taxi' || cameraChanged;
  if (saved) ctx.save();
  if (frame.camera.zoom !== 1) { ctx.translate(view.viewW / 2, view.viewH / 2); ctx.scale(frame.camera.zoom, frame.camera.zoom); ctx.translate(-view.viewW / 2, -view.viewH / 2); }
  if (id !== 'intro' && frame.camera.x !== 0 || frame.camera.h !== 0) ctx.translate(id === 'intro' ? 0 : -frame.camera.x, -frame.camera.h);
  try {
    for (const piece of resolveComposition(registry, frame.composition, { view: nativeView, state: frame.state, reduced: view.reduced })) {
      const look = appearance.get(piece.instance.id)!; if (!look.visible || look.opacity === 0) continue;
      if (id !== 'taxi' && piece.instance.type === `sequence.${id}.screen-fade`) continue;
      const partId=piece.instance.type.replace(`sequence.${id}.`, '');let part = pieces.get(partId);
      if(part&&counts.get(piece.instance.type)!>1){
        const p=piece.props,s=frame.state[piece.instance.id]??state(partId);
        if(id==='act2')part=act2Frame(ctx,view,time,sequence.duration,{ferryProgress:(partId==='ferry'?s:state('ferry')).amount as number,titles:(partId==='titles'?p:titleProps) as unknown as {actOne:string;found:string;actTwo:string;subtitle:string},alpha:(partId==='titles'?s:state('titles')) as unknown as {one:number;found:number;two:number;subtitle:number},sky:(partId==='sky'?p:skyProps) as unknown as {top:string;horizon:string},water:(partId==='water'?p:waterProps).fill as string,ferryPaint:(partId==='ferry'?p:ferryProps).paint as string,spire:(partId==='spire'?p:spireProps) as unknown as {windows:number;edge:number;glow:boolean}}).find(job=>job.id===partId);
        else if(id==='taxi'){const sky=partId==='sky'?p:skyProps,lights=partId==='lights'?p:lightProps,cab=partId==='cab'?s:state('cab');part=flightFrame(ctx,view.viewW,view.viewH,options.progress??time/sequence.duration,ambient,partId==='destination'?String(p.destination||options.destination||''):destination,{cabX:cab.x as number,cabY:cab.y as number,fade:(partId==='fade'?s:state('fade')).amount as number,sky:sky as unknown as {top:string;middle:string;bottom:string},lightSpeeds:[lights.far??.6,lights.middle??1.8,lights.near??4.5] as number[],towerFill:(partId==='towers'?p:towerProps).fill as string}).find(job=>job.id===partId);}
      }
      if (!part) {
        if (!piece.element.parts.length) continue;
        const standalone = { ...piece.instance, placement: piece.placement }; delete standalone.attach; delete standalone.children;
        drawComposition(ctx, registry, { version: 1, scene: frame.composition.scene, instances: [standalone] }, { view: nativeView, state: frame.state, reduced: view.reduced, visibility: { [piece.instance.id]: look.visible }, opacity: { [piece.instance.id]: look.opacity }, clips: frame.clips, sequenceTime: time }, piece.instance.pass);
        continue;
      }
      const p = piece.placement, opacity = look.opacity, changed = p.x !== 0 || p.h !== 0 || p.scale !== 1 || p.facing !== 1 || opacity !== 1;
      if (changed) { ctx.save(); ctx.translate(p.x, -p.h); ctx.scale(p.scale * p.facing, p.scale); ctx.globalAlpha *= opacity; }
      try { part.draw(); } finally { if (changed) ctx.restore(); }
    }
    if (id === 'taxi') for (const fade of frame.fades) if (fade.opacity > 0) { ctx.save(); ctx.globalAlpha = fade.opacity; ctx.fillStyle = fade.color; ctx.fillRect(0, 0, view.viewW, view.viewH); ctx.restore(); }
    if (id === 'taxi') for (const card of frame.text) { ctx.save(); ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.fillStyle = '#ffe9d0'; ctx.fillText(card.text, card.x, -card.h); ctx.restore(); }
  } finally { if (saved) ctx.restore(); }
  return frame;
}
/** Transitions follow the picture's native restore and precede letterbox/cards, exactly as before. */
export function renderCinematicTransition(ctx: CanvasRenderingContext2D, view: CutView, documents: CinematicDocuments, id: 'intro' | 'act2', time: number, options: CinematicOptions = {}) {
  const timeline = options.timeline ?? documents.timeline, sequenceId = options.sequenceId ?? id, sequence = timeline.sequences.find(s => s.id === sequenceId)!;
  const composition = options.composition ?? documents.compositions[sequence.composition];
  const frame = options.frame ?? evaluateTimeline(timeline, sequenceId, time, cinematicTimelineContext(view, { timeline, compositions: { ...documents.compositions, [sequence.composition]: composition } }, options), { reduced: view.reduced });
  const nativeView = { ...frameView(time*60,view.lighting), viewW: view.viewW, viewH: view.viewH, cam: 0, gy: 0, t: time * 60, flags: {}, sx: (x: number) => x, y: (h: number) => -h };
  const appearance = compositionAppearance(frame.composition, { visibility: frame.visibility, opacity: frame.opacity });
  for (const resolved of resolveComposition(options.registry ?? cinematicRegistry, frame.composition, { view: nativeView, state: frame.state, reduced: view.reduced })) {
    const look = appearance.get(resolved.instance.id)!;
    if (resolved.instance.type !== `sequence.${id}.screen-fade` || !look.visible || look.opacity === 0) continue;
    const p = resolved.placement, opacity = look.opacity, changed = p.x !== 0 || p.h !== 0 || p.scale !== 1 || p.facing !== 1 || opacity !== 1;
    if (changed) { ctx.save(); ctx.translate(p.x, -p.h); ctx.scale(p.scale * p.facing, p.scale); ctx.globalAlpha *= opacity; }
    try { paintBlack(ctx, view.viewW, view.viewH, resolved.state.amount as number); } finally { if (changed) ctx.restore(); }
  }
  for (const fade of frame.fades) if (fade.opacity > 0) { ctx.save(); ctx.globalAlpha = fade.opacity; ctx.fillStyle = fade.color; ctx.fillRect(0, 0, view.viewW, view.viewH); ctx.restore(); }
}
