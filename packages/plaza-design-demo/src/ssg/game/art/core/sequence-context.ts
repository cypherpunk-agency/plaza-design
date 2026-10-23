import {cinematicTimelineContext,cutView} from '../sequences/cinematics';
import {lightAt} from '../../world/light';
import {cinematicDocuments} from '../../story/cutscenes/documents';
const finite=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
import type {ArtRegistry,Composition,Properties} from './composition';
import type {MotionTrack,TimelineContext} from './timeline';
import {SCENES} from '../../scenes';
const motionNames = ['intro.camera', 'intro.rain', 'intro.fade', 'act2.fade', 'act2.ferry', 'act2.title-one', 'act2.title-found', 'act2.title-two', 'act2.title-subtitle', 'taxi.cab-x', 'taxi.cab-y', 'taxi.fade'];
/** No DOM, fake canvas or evaluation during source validation. Runtime context supplies real view inputs. */
export function createSequenceValidationContext(registry: ArtRegistry, compositions: Record<string, Composition>, destinations: TimelineContext['destinations'] = {}): TimelineContext {
  const motionTracks: Record<string, MotionTrack> = {};
  for (const name of motionNames) motionTracks[name] = { validate(props: Properties) { if (Object.keys(props).length) throw new Error(`${name}: this exact motion formula takes no parameters`); }, evaluate() { throw new Error(`${name}: use the live sequence environment to evaluate motion`); } };
  const clips=Object.fromEntries(registry.catalog().filter(element=>Object.keys(element.animationClips??{}).length>0).map(element=>[element.type,Object.keys(element.animationClips!)]));
  return { registry,compositions,clips,destinations:Object.keys(destinations).length?destinations:Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])),motionTracks };
}

export const frameTimelineContext = (base:TimelineContext, preview:{time:number;reduced:boolean;sequenceId:string;environment:Record<string,string|number|boolean>;viewport:{width:number;height:number};timeline?:import('./timeline').TimelineProgram}):TimelineContext => {
    const scale = finite(preview.environment.renderScale, 1); if (scale <= 0) throw new Error('Render scale must be positive');
    const W = preview.viewport.width / scale, H = preview.viewport.height / scale;
    const sequence = preview.timeline?.sequences.find(s => s.id === preview.sequenceId);
    const time = preview.time;
    const cinematics = cinematicTimelineContext(cutView(W,H,preview.reduced,lightAt(Number(preview.environment.day??1),Number(preview.environment.minute??580),Number(preview.environment.facing??90),null)), { timeline: preview.timeline ?? cinematicDocuments.timeline, compositions: base.compositions }, { sequenceId: sequence?.id, ambient: finite(preview.environment.ambientClock, time * 60) });
    return { ...base, destinations: { ...cinematics.destinations, ...base.destinations }, motionTracks: { ...base.motionTracks, ...cinematics.motionTracks } };
  };
