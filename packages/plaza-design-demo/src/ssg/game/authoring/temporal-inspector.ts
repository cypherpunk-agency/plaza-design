/** Typed temporal controls over the existing editor command/history port. No frame loop or document owner. */
import type {Field,Value} from '../art/core/composition';
import type {TimelineFrame,TimelineProgram,Sequence,Target,Keyframe} from '../art/core/timeline';
import type {TimelineSelection} from './timeline-view';
import {element,button,label,select,type createFieldControls} from './controls';
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
interface TemporalInspectorPort {
 selection?:TimelineSelection;sequence?:Sequence;time:number;playing:boolean;
 fieldInput:ReturnType<typeof createFieldControls>['fieldInput'];numberInput:ReturnType<typeof createFieldControls>['numberInput'];
 keyField(target:Target):Field;keyValue(frame:TimelineFrame,target:Target):{value:Value;discrete:boolean};
 getFrame():TimelineFrame;editTimeline(label:string,edit:(program:TimelineProgram)=>void):void;
 addKey(target:Target,value?:Value):void;selectTimeline(selection:TimelineSelection|undefined,target?:Target):void;
 seekTime(time:number):void;notice(message:string,error?:boolean):void;setSelection(selection:TimelineSelection|undefined):void;close():void;
}
export function renderTimelineInspector(host:HTMLElement,port:TemporalInspectorPort):boolean{
    const {selection,sequence:seq,time,playing,fieldInput,numberInput,keyField,keyValue,editTimeline,addKey,selectTimeline,seekTime,notice,setSelection,close,getFrame}=port;
    if(!selection||!seq)return false;
    if(selection.kind==='camera'){
      const frame=getFrame();
      host.append(element('h2','','Camera'),element('p','muted','Game camera at '+time.toFixed(3)+' s. Changing a value adds or updates its keyframe at the playhead. Workspace pan and zoom are separate editor controls.'));
      for(const property of ['x','h','zoom']as const){
        const target:Target={kind:'camera',property},field=keyField(target),input=fieldInput(field,frame.camera[property],value=>addKey(target,value));
        input.setAttribute('aria-label',field.label);host.append(label(field.label,input));
        const track=seq.tracks.find(t=>equal(t.target,target));
        if(track)host.append(button('Edit '+property+' keyframes',()=>selectTimeline({kind:'track',track:track.id},target)));
      }
      const shot=seq.shots.find(s=>time>=s.from&&time<s.to);
      if(shot)host.append(button('Edit shot · '+shot.id,()=>selectTimeline({kind:'shot',id:shot.id})));
      host.append(button('Deselect camera',close));return true;
    }
    if(selection.kind==='track'){
      const track=seq.tracks.find(t=>t.id===selection.track);if(!track){setSelection(undefined);return false;}
      host.append(element('h2','','Animation track'),element('p','muted',track.id+' · '+track.target.property));
      if(track.motion){
        host.append(element('p','muted','Procedural motion: '+track.motion.type+'. This registered formula controls the value; its keys do not override it.'));
        if(!Object.keys(track.motion.props).length)host.append(element('p','muted','This formula has no editable parameters.'));
        for(const [property,value] of Object.entries(track.motion.props)){
          const field:Field=typeof value==='number'?{kind:'number',label:property,default:value}:typeof value==='boolean'?{kind:'boolean',label:property,default:value}:{kind:'string',label:property,default:String(value)};
          if(typeof value==='number'||typeof value==='boolean'||typeof value==='string')host.append(label(property,fieldInput(field,value,v=>editTimeline('Edit motion parameter',d=>{d.sequences[0].tracks.find(t=>t.id===track.id)!.motion!.props[property]=v;}))));
        }
      }else{
        const frame=getFrame();
        let draft=keyValue(frame,track.target).value;
        const field=keyField(track.target),input=fieldInput(field,draft,value=>{draft=value;});
        input.setAttribute('aria-label','Value at playhead');
        host.append(element('p','muted','Playhead: '+time.toFixed(3)+' s. Set a value, then add or update its keyframe.'),label(field.label,input),button('Add / update keyframe',()=>{if(playing){notice('Pause playback before setting a keyframe value.');return;}addKey(track.target,draft);}));
      }
      host.append(label('Reduced motion',select([{value:'normal',label:'Keep motion'},{value:'freeze',label:'Freeze at start'}],track.reduced??'normal',value=>editTimeline('Change reduced motion',d=>{d.sequences[0].tracks.find(t=>t.id===track.id)!.reduced=value as 'normal'|'freeze';}))));
      const keys=element('div');keys.append(element('h3','','Keyframes'));
      track.keys.forEach((key,index)=>{
        const row=element('div');
        row.append(button(key.time.toFixed(3)+' s · '+String(key.value),()=>{seekTime(key.time);selectTimeline({kind:'key',track:track.id,index},track.target);},'Edit keyframe time, value and easing'));
        keys.append(row);
      });
      host.append(keys,button('Remove track',()=>{setSelection(undefined);editTimeline('Delete track',d=>{d.sequences[0].tracks=d.sequences[0].tracks.filter(t=>t.id!==track.id);});}),button('Object properties',close));
      return true;
    }
    if(selection.kind==='key'){
      const track=seq.tracks.find(t=>t.id===selection.track),key=track?.keys[selection.index];if(!track||!key){setSelection(undefined);return false;}
      const change=(apply:(key:Keyframe)=>void)=>editTimeline('Edit keyframe',doc=>{const track=doc.sequences[0].tracks.find(t=>t.id===selection.track)!,key=track.keys[selection.index];apply(key);track.keys.sort((a,b)=>a.time-b.time);setSelection({...selection,index:track.keys.indexOf(key)});});
      host.append(element('h2','','Keyframe'),element('p','muted',track.id+' · '+(track.target.kind==='camera'?'Camera':track.target.instance)+' / '+track.target.property));
      host.append(label('Key time',numberInput(key.time,value=>change(k=>k.time=value),0,String(1/60))));
      const field=keyField(track.target);host.append(label(field.label,fieldInput(field,key.value,value=>change(k=>k.value=value))));
      host.append(label('Easing',select(['linear','hold','smooth','in','out'].map(value=>({value,label:value})),key.ease??'linear',value=>change(k=>k.ease=value as Keyframe['ease']))));
      host.append(label('Reduced motion',select([{value:'normal',label:'Keep motion'},{value:'freeze',label:'Freeze at start'}],track.reduced??'normal',value=>editTimeline('Change reduced motion',d=>{d.sequences[0].tracks.find(t=>t.id===track.id)!.reduced=value as 'normal'|'freeze';}))));
      if(track.motion)host.append(element('p','muted','This track uses procedural motion. Its registered formula supplies the animated value.'));
      host.append(button('Key at playhead',()=>addKey(track.target)),button('Delete keyframe',()=>{setSelection(undefined);editTimeline('Delete keyframe',d=>{const seq=d.sequences[0],item=seq.tracks.find(t=>t.id===track.id)!;if(item.keys.length===1)seq.tracks=seq.tracks.filter(t=>t.id!==track.id);else item.keys.splice(selection.index,1);});}),button('Object properties',close));
      return true;
    }
    const kind=selection.kind,items=kind==='shot'?seq.shots:kind==='text'?seq.text:kind==='fade'?seq.fades:seq.beats,item=items.find(n=>n.id===selection.id);if(!item){setSelection(undefined);return false;}
    const change=(apply:(item:any)=>void)=>editTimeline('Edit '+kind,d=>{const seq=d.sequences[0],items=kind==='shot'?seq.shots:kind==='text'?seq.text:kind==='fade'?seq.fades:seq.beats;apply(items.find(n=>n.id===selection.id)!);});
    host.append(element('h2','',kind==='text'?'Text card':kind==='shot'?'Shot':kind==='fade'?'Fade':'Beat'),element('p','muted',item.id));
    for(const property of kind==='beat'?['time']:['from','to'])host.append(label(property==='time'?'Time':property==='from'?'Start':'End',numberInput((item as any)[property],v=>change(n=>n[property]=v),0,String(1/60))));
    if(kind==='text'){const card=item as Sequence['text'][number];for(const property of ['text','x','h']as const){const field:Field=property==='text'?{kind:'string',label:'Text',default:''}:{kind:'number',label:property==='x'?'X position':'Height',default:0};host.append(label(field.label,fieldInput(field,card[property],value=>change(n=>n[property]=value))));}}
    if(kind==='shot')for(const property of ['x','h','zoom']as const)host.append(label('Camera '+property,numberInput((item as Sequence['shots'][number]).camera[property],value=>change(n=>n.camera[property]=value),property==='zoom'?.0001:undefined)));
    if(kind==='fade'){const fade=item as Sequence['fades'][number];host.append(label('Color',fieldInput({kind:'color',label:'Color',default:'#000000'},fade.color,value=>change(n=>n.color=value))));for(const property of ['start','end']as const)host.append(label(property==='start'?'Start opacity':'End opacity',numberInput(fade[property],value=>change(n=>n[property]=value),0)));}
    host.append(button('Delete '+kind,()=>{setSelection(undefined);editTimeline('Delete '+kind,d=>{const seq=d.sequences[0];if(kind==='shot')seq.shots=seq.shots.filter(n=>n.id!==item.id);else if(kind==='text')seq.text=seq.text.filter(n=>n.id!==item.id);else if(kind==='fade')seq.fades=seq.fades.filter(n=>n.id!==item.id);else seq.beats=seq.beats.filter(n=>n.id!==item.id);});}),button('Object properties',close));return true;
  }
