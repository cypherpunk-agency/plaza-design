/** Temporal editing UI only. The existing preview renders every requested time. */
import type {Sequence,Target} from '../art/core/timeline';
export type TimelineSelection={kind:'camera'}|{kind:'track';track:string}|{kind:'key';track:string;index:number}|{kind:'shot'|'text'|'fade'|'beat'|'command';id:string};
export interface TimelineViewState {zoom:number;collapsed:Set<string>;scrollX:number;scrollY:number}
export function frameTime(seconds:number,duration:number){return Math.max(0,Math.min(duration,Math.round(seconds*60)/60));}
export function moveKey(sequence:Sequence,trackId:string,index:number,seconds:number):number {
  const track=sequence.tracks.find(t=>t.id===trackId);if(!track?.keys[index])throw Error('Missing keyframe');
  const time=frameTime(seconds,sequence.duration);
  if(track.keys.some((key,i)=>i!==index&&Math.abs(key.time-time)<1/120000))throw Error('A keyframe already exists at that time.');
  const key=track.keys[index];key.time=time;track.keys.sort((a,b)=>a.time-b.time);return track.keys.indexOf(key);
}
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};
export function mountTimelineGrid(host:HTMLElement,options:{sequence:Sequence;state:TimelineViewState;time:number;selected?:TimelineSelection;instance?:string;label(instance:string):string;select(selection:TimelineSelection|undefined,target?:Target):void;seek(seconds:number):void;moveKey(track:string,index:number,time:number):void;onZoom?(zoom:number):void}){
  const {sequence:seq,state}=options,viewport=el('div','keyframe-viewport'),body=el('div','keyframe-body');
  viewport.setAttribute('aria-label','Keyframe time grid');body.style.setProperty('--tl-label','190px');viewport.append(body);host.append(viewport);
  const rulerRow=el('div','keyframe-row ruler-row'),rulerLabel=el('div','keyframe-label','Objects / properties'),ruler=el('div','keyframe-lane time-ruler');ruler.tabIndex=0;ruler.setAttribute('role','slider');ruler.setAttribute('aria-label','Sequence time');ruler.setAttribute('aria-valuemin','0');ruler.setAttribute('aria-valuemax',String(seq.duration));rulerRow.append(rulerLabel,ruler);body.append(rulerRow);
  const position=(seconds:number)=>Math.max(0,Math.min(100,seconds/seq.duration*100))+'%';
  const seekAt=(event:PointerEvent,lane:HTMLElement)=>{const rect=lane.getBoundingClientRect();return frameTime((event.clientX-rect.left)/rect.width*seq.duration,seq.duration);};
  function scrub(lane:HTMLElement){lane.onpointerdown=event=>{if(event.button!==0||event.target!==lane)return;event.preventDefault();lane.setPointerCapture(event.pointerId);options.seek(seekAt(event,lane));};lane.onpointermove=event=>{if(lane.hasPointerCapture(event.pointerId))options.seek(seekAt(event,lane));};lane.onpointerup=event=>{if(lane.hasPointerCapture(event.pointerId))lane.releasePointerCapture(event.pointerId);};}
  scrub(ruler);
  const groups=new Map<string,typeof seq.tracks>();
  for(const track of seq.tracks){const id=track.target.kind==='camera'?'Camera':track.target.instance;const rows=groups.get(id)??[];rows.push(track);groups.set(id,rows);}
  const addRow=(label:HTMLElement,cls='')=>{const row=el('div','keyframe-row '+cls),lane=el('div','keyframe-lane');label.classList.add('keyframe-label');row.append(label,lane);body.append(row);scrub(lane);return lane;};
  const keyButton=(time:number,label:string,selection:TimelineSelection,lane:HTMLElement,target?:Target)=>{
    const key=el('button','keyframe-diamond');key.type='button';key.style.left=position(time);key.title=label;key.setAttribute('aria-label',label);key.setAttribute('aria-pressed',String(JSON.stringify(selection)===JSON.stringify(options.selected)));key.dataset.time=String(time);
    key.onclick=()=>{options.select(selection,target);options.seek(time);};lane.append(key);return key;
  };
  for(const [id,tracks]of groups){
    const selected=id===options.instance||id==='Camera'&&(options.selected?.kind==='camera'||(options.selected?.kind==='key'||options.selected?.kind==='track')&&tracks.some(t=>t.id===(options.selected as Extract<TimelineSelection,{kind:'key'|'track'}>).track)),folded=state.collapsed.has(id);
    const group=el('button','keyframe-group',(folded?'▸ ':'▾ ')+(id==='Camera'?'Camera':options.label(id)));group.type='button';group.setAttribute('aria-expanded',String(!folded));group.title=id;
    group.onclick=()=>{if(state.collapsed.has(id))state.collapsed.delete(id);else state.collapsed.add(id);options.select(id==='Camera'?{kind:'camera'}:undefined,tracks[0].target);};
    const lane=addRow(group,'keyframe-group-row'+(selected?' selected':''));
    for(const time of new Set(tracks.flatMap(t=>t.keys.map(k=>k.time)))){const dot=el('span','keyframe-summary');dot.style.left=position(time);lane.append(dot);}
    if(folded)continue;
    for(const track of tracks){
      const label=el('button','keyframe-property',track.target.property+(track.motion?' · motion':''));label.type='button';label.title=track.id;label.onclick=()=>options.select({kind:'track',track:track.id},track.target);
      const lane=addRow(label,'keyframe-track'+((options.selected?.kind==='key'||options.selected?.kind==='track')&&options.selected.track===track.id?' selected':''));lane.dataset.track=track.id;
      if(track.motion)lane.append(el('span','keyframe-motion','Procedural motion'));
      track.keys.forEach((key,index)=>{
        const selection:TimelineSelection={kind:'key',track:track.id,index},button=keyButton(key.time,`${track.id}: ${key.time.toFixed(3)} s — ${String(key.value)}`,selection,lane,track.target);
        let drag:{x:number;time:number;pending:number;moved:boolean}|undefined;
        button.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();button.setPointerCapture(event.pointerId);drag={x:event.clientX,time:key.time,pending:key.time,moved:false};};
        button.onpointermove=event=>{if(!drag)return;const dx=event.clientX-drag.x;if(Math.abs(dx)>3)drag.moved=true;if(!drag.moved)return;drag.pending=frameTime(drag.time+dx/lane.getBoundingClientRect().width*seq.duration,seq.duration);button.style.left=position(drag.pending);button.title=drag.pending.toFixed(3)+' s';options.seek(drag.pending);};
        button.onpointerup=event=>{if(!drag)return;const done=drag;drag=undefined;if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);if(done.moved){button.onclick=event=>event.preventDefault();options.moveKey(track.id,index,done.pending);}};
        button.onpointercancel=()=>{drag=undefined;button.style.left=position(key.time);};
      });
    }
  }
  for(const [kind,title,items]of [['shot','Shots',seq.shots],['text','Text cards',seq.text],['fade','Fades',seq.fades]]as const){
    if(!items.length)addRow(el('span','',title),'keyframe-spans');
    for(const item of items){const lane=addRow(el('span','',title+' · '+item.id),'keyframe-spans');const bar=el('button','keyframe-span '+kind,item.id);bar.type='button';bar.style.left=position(item.from);bar.style.width=(item.to-item.from)/seq.duration*100+'%';bar.title=`${item.id}: ${item.from}–${item.to} s`;bar.setAttribute('aria-label',title+' '+bar.title);bar.setAttribute('aria-pressed',String(options.selected?.kind===kind&&options.selected.id===item.id));bar.onclick=()=>{options.select({kind,id:item.id});options.seek(item.from);};lane.append(bar);}
  }
  const beatLane=addRow(el('span','','Beats'),'keyframe-beats');for(const beat of seq.beats)keyButton(beat.time,beat.id+' at '+beat.time+' s',{kind:'beat',id:beat.id},beatLane);
  if(seq.commands?.length){const lane=addRow(el('span','','Commands'),'keyframe-commands');for(const command of seq.commands)keyButton(command.time,command.scene+' / '+command.command+' at '+command.time+' s',{kind:'command',id:command.id},lane);}
  const playhead=el('div','keyframe-playhead');playhead.setAttribute('aria-hidden','true');body.append(playhead);
  let time=options.time;
  const update=(seconds:number)=>{time=seconds;playhead.style.left=(190+(body.clientWidth-190)*Math.min(1,time/seq.duration))+'px';ruler.setAttribute('aria-valuenow',String(time));ruler.setAttribute('aria-valuetext',time.toFixed(3)+' seconds');};
  const layout=()=>{body.style.width=Math.max(viewport.clientWidth,190+Math.max(1,viewport.clientWidth-190)*state.zoom)+'px';ruler.replaceChildren();const secondsPerTick=seq.duration/(Math.max(1,body.clientWidth-190)/85),step=[1/60,.1,.25,.5,1,2,5,10,20,30,60,120,300,600].find(n=>n>=secondsPerTick)??seq.duration;
    for(let t=0;t<=seq.duration;t+=step){const tick=el('span','keyframe-tick',t<1?t.toFixed(2):String(Math.round(t*100)/100)+'s');tick.style.left=position(t);ruler.append(tick);}update(time);};
  viewport.title='Wheel: scroll rows · Shift+wheel: scroll time · Ctrl+wheel: zoom time';
  viewport.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();const before=body.clientWidth-190,rect=viewport.getBoundingClientRect(),at=event.clientX-rect.left,seconds=(viewport.scrollLeft+at-190)/before;state.zoom=Math.max(1,Math.min(16,state.zoom*Math.exp(-event.deltaY*.002)));layout();options.onZoom?.(state.zoom);viewport.scrollLeft=seconds*(body.clientWidth-190)+190-at;state.scrollX=viewport.scrollLeft;}else if(event.shiftKey){event.preventDefault();viewport.scrollLeft+=event.deltaY||event.deltaX;}},{passive:false});
  const resize=new ResizeObserver(layout);resize.observe(viewport);layout();viewport.scrollLeft=state.scrollX;viewport.scrollTop=state.scrollY;viewport.onscroll=()=>{state.scrollX=viewport.scrollLeft;state.scrollY=viewport.scrollTop;};
  return{update,dispose(){resize.disconnect();viewport.remove();}};
}
