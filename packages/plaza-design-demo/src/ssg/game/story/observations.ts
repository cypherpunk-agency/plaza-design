import type {StateValue} from '../engine/gameplay/types';
import type {NativeReadType} from '../engine/gameplay/queries';

/** Read-only facts from existing presentation owners. No stored copies or clock of its own. */
export interface StoryObservations {
 phase:string;scene:string;viewing:string|null;bubble:boolean;popup:boolean;
 clock:number;stamps:Readonly<Record<string,number>>;
}
const fixed:Readonly<Record<string,NativeReadType>>={
 'story.phase':'string','story.scene':'string','story.viewing':'string',
 'story.bubble':'boolean','story.popup':'boolean',
};
export function readStoryObservation(key:string,context:StoryObservations):StateValue|undefined{
 if(key==='story.phase')return context.phase;
 if(key==='story.scene')return context.scene;
 if(key==='story.viewing')return context.viewing??'';
 if(key==='story.bubble')return context.bubble;
 if(key==='story.popup')return context.popup;
 if(key.startsWith('story.elapsed.')){
  const id=key.slice('story.elapsed.'.length),stamp=Object.prototype.hasOwnProperty.call(context.stamps,id)?context.stamps[id]:undefined;
  return stamp===undefined?-1:context.clock-stamp;
 }
}
/** Elapsed reads name actual authored timestamps, including chunk-local presentation cues. */
export function storyObservationTypes(source:unknown,chunkPhases?:readonly unknown[]):Readonly<Record<string,NativeReadType>>{
 const types:Record<string,NativeReadType>={...fixed};
 function walk(value:unknown){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){value.forEach(walk);return;}
  const row=value as Record<string,unknown>;
  for(const key of ['stamp','start'])if(typeof row[key]==='string')types['story.elapsed.'+row[key]]='number';
  for(const child of Object.values(row))walk(child);
 }
 walk(source);chunkPhases?.forEach(walk);
 // Shape-only validation precedes assembly. The assembled source must resolve every timestamp.
 if(!chunkPhases){
  const queries=(source as {GAMEPLAY?:{queries?:Record<string,{kind:string;read?:string}>}})?.GAMEPLAY?.queries;
  for(const q of Object.values(queries??{}))if(q.kind==='native'&&q.read?.startsWith('story.elapsed.'))types[q.read]='number';
 }
 return types;
}
