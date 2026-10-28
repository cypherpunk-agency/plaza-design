import {animationShortcut} from './animation-shortcuts';
/** UI transport clock only: artwork and controllers continue to evaluate their native time. */
export class WorkbenchPlayback {
 time=0;speed=1;playing=false;loop=true;reduced=false;
 private last:number|null=null;
 constructor(public duration=12,private onChange:()=>void=()=>{}){if(!Number.isFinite(duration)||duration<=0)throw new Error('Invalid playback duration');}
 seek(seconds:number){if(!Number.isFinite(seconds))throw new Error('Invalid playback time');this.time=Math.max(0,Math.min(this.duration,seconds));this.last=null;this.onChange();}
 step(frames=1){this.pause();this.seek(this.time+frames/60);}
 play(){this.playing=true;this.last=null;this.onChange();}
 pause(){this.playing=false;this.last=null;this.onChange();}
 tick(now:number){if(!Number.isFinite(now))throw new Error('Invalid playback timestamp');if(!this.playing){this.last=null;return;}if(this.last===null){this.last=now;return;}const dt=Math.max(0,(now-this.last)/1000);this.last=now;this.time+=dt*this.speed;if(this.time>=this.duration){if(this.loop)this.time%=this.duration;else{this.time=this.duration;this.playing=false;this.last=null;}}this.onChange();}
 setReduced(value:boolean){this.reduced=value;this.onChange();}
 effectiveTime(){return this.reduced?0:this.time;}
 dispose(){this.playing=false;this.last=null;this.onChange=()=>{};}
}
export function mountWorkbenchPlayback(host:HTMLElement,clock:WorkbenchPlayback){
 const play=document.createElement('button'),back=document.createElement('button'),next=document.createElement('button'),seek=document.createElement('input'),loop=document.createElement('input'),reduced=document.createElement('input'),time=document.createElement('output');
 play.textContent='Play / Pause';back.textContent='−1 frame';next.textContent='+1 frame';seek.type='range';seek.min='0';seek.max=String(clock.duration);seek.step=String(1/60);seek.setAttribute('aria-label','Preview time');loop.type='checkbox';loop.checked=clock.loop;reduced.type='checkbox';
 const wrap=(text:string,input:HTMLElement)=>{const label=document.createElement('label');label.append(input,' '+text);return label;};
 play.onclick=()=>clock.playing?clock.pause():clock.play();back.onclick=()=>clock.step(-1);next.onclick=()=>clock.step(1);seek.oninput=()=>clock.seek(Number(seek.value));loop.onchange=()=>clock.loop=loop.checked;reduced.onchange=()=>clock.setReduced(reduced.checked);
 const speed=document.createElement('select');speed.setAttribute('aria-label','Playback speed');for(const value of [.25,.5,1,1.5,2,4]){const option=document.createElement('option');option.value=String(value);option.textContent=value+'×';speed.append(option);}speed.value=String(clock.speed);speed.onchange=()=>clock.speed=Number(speed.value);
 host.append(play,back,next,seek,time,speed,wrap('Loop',loop),wrap('Reduced motion: hold time',reduced));
 const keyboard=(event:KeyboardEvent)=>{if(!host.isConnected||!host.getClientRects().length)return;const action=animationShortcut(event);if(!action)return;event.preventDefault();if(action==='toggle')clock.playing?clock.pause():clock.play();else if('frames'in action)clock.step(action.frames);else{clock.pause();clock.seek('boundary'in action?(action.boundary==='start'?0:clock.duration):clock.time+action.seconds);}};document.addEventListener('keydown',keyboard);

 return{refresh(){seek.value=String(clock.time);time.value=clock.time.toFixed(3)+' s';play.setAttribute('aria-pressed',String(clock.playing));},dispose(){document.removeEventListener('keydown',keyboard);host.replaceChildren();}};
}
