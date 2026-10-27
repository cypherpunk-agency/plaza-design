/** Inline animation controls over the existing sequence and history. */
import type {Sequence,Target,TimelineProgram} from '../art/core/timeline';
import type {Value} from '../art/core/composition';
import {element,button} from './controls';
export const KEY_EPSILON=1/120000;
export function keyframeState(sequence:Pick<Sequence,'tracks'>,target:Target,time:number){
 const track=sequence.tracks.find(t=>JSON.stringify(t.target)===JSON.stringify(target));
 const index=track?.keys.findIndex(k=>Math.abs(k.time-time)<KEY_EPSILON)??-1;
 return {track,index,previous:track?.keys.filter(k=>k.time<time-KEY_EPSILON).at(-1),next:track?.keys.find(k=>k.time>time+KEY_EPSILON)};
}
export function removeKeyAtPlayhead(sequence:Pick<Sequence,'tracks'>,target:Target,time:number){
 const {track,index}=keyframeState(sequence,target,time);if(!track||index<0||track.motion)return;
 track.keys.splice(index,1);if(!track.keys.length)sequence.tracks=sequence.tracks.filter(t=>t!==track);
}
/** The inspector and dragging commit keys through this same source operation. */
export function setKeyAtPlayhead(sequence:Pick<Sequence,'tracks'>,target:Target,time:number,value:Value,discrete:boolean){
 const key={time:Math.round(time*60000)/60000,value,ease:discrete?'hold' as const:'linear' as const};let track=keyframeState(sequence,target,time).track;
 if(track?.motion)throw Error('This property is controlled by procedural motion.');
 if(!track){let i=1;while(sequence.tracks.some(t=>t.id===`track-${i}`))i++;track={id:`track-${i}`,target,keys:[]};sequence.tracks.push(track);}
 const existing=track.keys.findIndex(k=>Math.abs(k.time-key.time)<KEY_EPSILON);if(existing>=0)track.keys[existing]={...key,ease:track.keys[existing].ease??key.ease};else track.keys.push(key);track.keys.sort((a,b)=>a.time-b.time);
}
export interface KeyframeControlPort {
 sequence():Sequence;time():number;playing():boolean;value():Value;
 addKey(target:Target,value?:Value):void;seekTime(time:number):void;
 editTimeline(label:string,edit:(program:TimelineProgram)=>void):void;
 update(callback:()=>void):void;
}
export function keyframeControl(control:HTMLElement,target:Target,name:string,port:KeyframeControlPort){
 const row=element('div','animated-property'),keys=element('span','property-keys');
 const previous=button('‹',()=>{const key=keyframeState(port.sequence(),target,port.time()).previous;if(key)port.seekTime(key.time);});
 const diamond=button('◇',()=>{const state=keyframeState(port.sequence(),target,port.time());if(state.index>=0)port.editTimeline('Delete keyframe',d=>removeKeyAtPlayhead(d.sequences[0],target,port.time()));else port.addKey(target,port.value());});
 const next=button('›',()=>{const key=keyframeState(port.sequence(),target,port.time()).next;if(key)port.seekTime(key.time);});
 previous.setAttribute('aria-label','Previous '+name+' keyframe');next.setAttribute('aria-label','Next '+name+' keyframe');
 keys.append(previous,diamond,next);row.append(control,keys);
 const update=()=>{
  const state=keyframeState(port.sequence(),target,port.time()),procedural=!!state.track?.motion;
  diamond.textContent=state.index>=0?'◆':'◇';diamond.className='property-key'+(state.track?' animated':'')+(state.index>=0?' current':'');
  diamond.title=procedural?'Controlled by procedural motion':(state.index>=0?'Remove':'Add')+' '+name+' keyframe at playhead';diamond.setAttribute('aria-label',diamond.title);diamond.setAttribute('aria-pressed',String(state.index>=0));diamond.disabled=procedural||port.playing();
  previous.disabled=!state.previous;next.disabled=!state.next;
  const input=control.matches('input,select')?control:undefined;
  if(input&&document.activeElement!==input){const value=port.value();if(input instanceof HTMLInputElement&&input.type==='checkbox')input.checked=Boolean(value);else(input as HTMLInputElement|HTMLSelectElement).value=String(value);}
  if(input)(input as HTMLInputElement).disabled=procedural||port.playing();
 };
 update();port.update(update);return row;
}
