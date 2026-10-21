/**
 * Mechanism `yardCrane` (scene.json `stage.mechanisms`): the fixer's back yard. Walled in, so the yard paints
 * its own backdrop over the street's floor and rain; CAM-1 (a camera panel over the crates); and the claw's
 * hook, a presentation controller that eases toward the arm's slot each frame. The crane, the chute and the
 * parcel's slide are source (devices.json controller, gameplay deadlines); the hook's travel and the parcel's
 * place are the picture's, read by the `yard` binding provider through `presentation.yardCrane`.
 * Needs the artwork role `tray` (the parcel tray an engine target anchors to).
 */
import type {Resolved} from '../../../art/core/composition';
import type {Value} from '../../../art/core/composition';
import type {YardVisual} from '../../../art/assemblies/fixer-yard';
import {renderDowntownStreet} from './street-layers';
import {light} from '../../../world/light';
import {yardController,yardRead,type YardController} from '../../controllers/yard';
import type {EngineDraw} from '../../host';
import type {SceneModel} from '../../model';
import type {GameplayDefinition} from '../types';
import type {SceneMechanism,MechanismPresentation} from '../scene-mechanisms';
import {YARD_RULES} from './yard-rules';
import {cameraPanel} from './yard-camera';

const find=(rows:readonly Resolved[],id:string)=>{const row=rows.find(r=>r.instance.id===id);if(!row)throw new Error('Unknown Yard instance '+id);return row.placement;};
function validateGeometry(c:YardController|undefined,rows:readonly Resolved[]){if(!c)return;for(const ref of Object.values(c.slots))if(!rows.some(r=>r.instance.id===ref))throw Error('Yard slot artwork reference '+ref);for(const[role,ref]of Object.entries(c.anchors))if(!rows.some(r=>r.instance.id===ref&&r.instance.type==='yard.'+role))throw Error('Yard '+role+' artwork reference '+ref);}

/** The hook's travel and what the frame was last prepared with; the caller (the scene) owns one. */
export class YardPresentation{
 hookX:number;hookVisible:boolean;private prepared:YardVisual|undefined;
 constructor(private readonly rows:readonly Resolved[],private readonly gameplay:GameplayDefinition,c:YardController|undefined){
  this.hookX=c?find(rows,c.slots[c.places.home]).x:0;this.hookVisible=!!c;
 }
 private slots(c:YardController|null){return c?Object.fromEntries(Object.entries(c.slots).map(([id,ref])=>[id,find(this.rows,ref).x])):{} as Record<string,number>;}
 private parcel(model:SceneModel):[number,number]|null{
  const c=yardController(model.data);if(!c)return null;
  const at=yardRead(model,'parcelAt'),slots=this.slots(c),chute=this.rows.find(r=>r.instance.id===c.anchors.chute)!,x0=chute.placement.x,h0=chute.placement.h+Number(chute.props.height),x1=x0+Number(chute.props.width),h1=chute.placement.h+Number(chute.props.endHeight);
  if(typeof at==='string'&&c.cargoSlots.includes(at))return[slots[at],find(this.rows,c.slots[at]).h+22];
  if(at===c.places.hook)return[this.hookX,find(this.rows,c.anchors.crane).h+51];if(at===c.places.chute)return[x0,h0];
  if(at===c.places.sliding){const deadline=c.slideDeadline?this.gameplay.native?.deadlines?.[c.slideDeadline]:undefined;if(!deadline?.startedAt)return null;const f=Math.min(1,(model.now()-(model.scratch[deadline.startedAt]??0))/(model.data.tuning[deadline.duration.tuning]+(deadline.duration.offsetMs??0)));return[x0+(x1-x0)*f,h0+(h1-h0)*f];}
  if(at===c.places.bounced)return[x1-4,h1];if(at===c.places.tray){const p=find(this.rows,c.anchors.tray);return[p.x,p.h+8];}return null;
 }
 /** Pure: bounds queries and repeated painting never advance the hook. */
 snapshot(engine:EngineDraw):YardVisual{const l=light(),c=yardController(engine.m.data),held=c!==undefined&&yardRead(engine.m,'parcelAt')===c.places.hook;return{layer:engine.layer,highlight:engine.hover??'',pan:Number(yardRead(engine.m,'pan')??0),gateOpen:!!(c?.gateOpen&&engine.m.value(c.gateOpen)),gateAllowed:!!yardRead(engine.m,'gateAllowed'),held,hookVisible:this.hookVisible,hookX:this.hookX,parcel:held&&!this.hookVisible?null:this.parcel(engine.m),night:l.night*(1-l.cover)};}
 /** What the frame paints: the prepared snapshot until the next prepare, else a fresh one. */
 visual(engine:EngineDraw):YardVisual{return{...(this.prepared??this.snapshot(engine)),layer:engine.layer};}
 /** Once per all/devices pass: ease the hook toward the arm's slot. */
 prepare(engine:EngineDraw){const c=yardController(engine.m.data);if(engine.layer!=='world'){const target=this.slots(c??null)[String(yardRead(engine.m,'armAt'))];
  // an unsupported arm label would poison the hook with NaN for good: keep it a finite, nonpainting state
  if(!Number.isFinite(target))this.hookVisible=false;
  if(this.hookVisible)this.hookX+=(target-this.hookX)*(c?.hookEase??0);}
  this.prepared=this.snapshot(engine);}
 capture(){return{hookX:this.hookX,hookVisible:this.hookVisible};}
 restore(value:Value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['hookX','hookVisible'].includes(k))||typeof value.hookX!=='number'||!Number.isFinite(value.hookX)||typeof value.hookVisible!=='boolean')throw new Error('Invalid Yard presentation state');
  this.hookX=value.hookX;this.hookVisible=value.hookVisible;this.prepared=undefined;
 }
}

export const yardCrane:SceneMechanism={
 face:{function:'act',controller:'yard'},
 label:"The fixer's yard (CAM-1, the claw's hook)",requires:['tray'],world:false,ownsRoom:true,
 rulesShape:()=>YARD_RULES,
 apply:()=>({rules:YARD_RULES,panels:{camera:cameraPanel},layers:true,artworkFrame:{street:renderDowntownStreet}}),
 presentation:({rows,gameplay,data}):MechanismPresentation<YardPresentation>=>{
  const c=yardController(data);validateGeometry(c,rows);
  const state=new YardPresentation(rows,gameplay,c);
  return{state,prepare:(_view,engine)=>state.prepare(engine),capture:()=>state.capture(),restore:v=>state.restore(v)};
 },
};
