/** One mouse/pen gesture for every numeric editor input, including dynamically mounted forms. */
export interface NumericRange {step:string;min:string;max:string;scrubStep?:string}
const bound=(value:string)=>value.trim()&&Number.isFinite(Number(value))?Number(value):undefined;
export function numericScrubStep(range:NumericRange){
 const declared=bound(range.scrubStep??'')??bound(range.step);if(declared!==undefined&&declared>0)return declared;
 const min=bound(range.min),max=bound(range.max);
 return min!==undefined&&max!==undefined&&max-min<=2||min!==undefined&&min>0&&min<1?.01:1;
}
export function numericScrubValue(initial:number,delta:number,range:NumericRange){
 const step=bound(range.step),quantum=step!==undefined&&step>=1&&Number.isInteger(step)?step:undefined;
 let value=quantum?initial+Math.round(delta/quantum)*quantum:Number((initial+delta).toPrecision(15));
 const min=bound(range.min),max=bound(range.max);if(min!==undefined)value=Math.max(min,value);if(max!==undefined)value=Math.min(max,value);return value;
}
interface NumericScrubPort {
 begin(label:string):{commit():void;cancel():void};
 changed():void;
 error(error:unknown):void;
}
export function mountNumericScrubbing(root:HTMLElement,port:NumericScrubPort){
 const previousTabIndex=root.getAttribute('tabindex');if(previousTabIndex===null)root.tabIndex=-1;
 let active:{input:HTMLInputElement;pointer:number;initial:string;initialNumber:number;startX:number;lastX:number;delta:number;armed:boolean;value:number;pending?:number;frame?:number;edit?:ReturnType<NumericScrubPort['begin']>}|undefined;
 const apply=()=>{const drag=active;if(!drag||drag.pending===undefined)return;drag.frame=undefined;const value=drag.pending;drag.pending=undefined;if(value===drag.value)return;drag.value=value;drag.input.value=String(value);try{drag.input.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){port.error(e);}};
 const finish=(cancel:boolean)=>{const drag=active;if(!drag)return;if(drag.frame!==undefined)cancelAnimationFrame(drag.frame);
  if(drag.armed){if(!cancel)apply();if(cancel){drag.input.value=drag.initial;try{drag.input.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){port.error(e);}}try{cancel?drag.edit?.cancel():drag.edit?.commit();}catch(e){port.error(e);}}
  active=undefined;delete document.documentElement.dataset.numericScrubbing;
  document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancelDrag,true);document.removeEventListener('keydown',key,true);window.removeEventListener('blur',cancelDrag);
  if(drag.armed){port.changed();if(root.isConnected)root.focus({preventScroll:true});}else if(!cancel){drag.input.dataset.numericEditing='';drag.input.focus({preventScroll:true});drag.input.select();}
 };
 const cancelDrag=()=>finish(true);
 const move=(event:PointerEvent)=>{const drag=active;if(!drag||event.pointerId!==drag.pointer)return;
  if(!drag.armed){if(Math.abs(event.clientX-drag.startX)<3)return;try{drag.edit=port.begin('Change '+(drag.input.getAttribute('aria-label')||drag.input.closest('label')?.textContent?.trim()||drag.input.name||'value'));}catch(e){port.error(e);finish(true);return;}drag.armed=true;document.documentElement.dataset.numericScrubbing='';}
  event.preventDefault();const factor=(event.shiftKey?10:1)*(event.altKey?.1:1);drag.delta+=(event.clientX-drag.lastX)*numericScrubStep({step:drag.input.step,min:drag.input.min,max:drag.input.max,scrubStep:drag.input.dataset.scrubStep})*factor;drag.lastX=event.clientX;
  drag.pending=numericScrubValue(drag.initialNumber,drag.delta,drag.input);if(drag.frame===undefined)drag.frame=requestAnimationFrame(apply);
 };
 const up=(event:PointerEvent)=>{if(active?.pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();finish(false);};
 const key=(event:KeyboardEvent)=>{if(!active)return;if(['Shift','Alt','Control','Meta'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();if(event.key==='Escape'||(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z')finish(true);};
 const down=(event:PointerEvent)=>{const input=event.target;if(!(input instanceof HTMLInputElement)||input.type!=='number'||input.disabled||input.readOnly||event.button!==0||event.pointerType==='touch'||!input.value.trim()||!Number.isFinite(Number(input.value)))return;
  if(document.activeElement===input&&input.dataset.numericEditing!==undefined)return;
  finish(true);event.preventDefault();event.stopPropagation();active={input,pointer:event.pointerId,initial:input.value,initialNumber:Number(input.value),startX:event.clientX,lastX:event.clientX,delta:0,armed:false,value:Number(input.value)};
  document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',cancelDrag,true);document.addEventListener('keydown',key,true);window.addEventListener('blur',cancelDrag);
 };
 const blur=(event:FocusEvent)=>{if(event.target instanceof HTMLInputElement)delete event.target.dataset.numericEditing;};
 const editingKey=(event:KeyboardEvent)=>{if(active||!(event.target instanceof HTMLInputElement)||event.target.dataset.numericEditing===undefined)return;if(event.key==='Enter'){event.preventDefault();event.target.dispatchEvent(new Event('change',{bubbles:true}));event.target.blur();}else if(event.key==='Escape'){event.preventDefault();event.target.blur();}};
 const hint=(event:PointerEvent)=>{const input=event.target;if(input instanceof HTMLInputElement&&input.type==='number'&&input.dataset.numericScrubHint===undefined){input.dataset.numericScrubHint='';input.title=(input.title?input.title+'\n':'')+'Drag left/right to change · Shift: coarse · Alt: fine · Click: type · Escape: cancel drag';}};
 root.addEventListener('pointerover',hint,true);root.addEventListener('pointerdown',down,true);root.addEventListener('blur',blur,true);root.addEventListener('keydown',editingKey,true);
 const dispose=()=>{finish(true);root.removeEventListener('pointerover',hint,true);root.removeEventListener('pointerdown',down,true);root.removeEventListener('blur',blur,true);root.removeEventListener('keydown',editingKey,true);if(previousTabIndex===null)root.removeAttribute('tabindex');};
 return Object.assign(dispose,{cancel:cancelDrag});
}
