/**
 * Mechanism `yardCrane` (scene.json `stage.mechanisms`): the fixer's back yard. Walled in, so the yard paints
 * its own backdrop over the street's floor and rain; CAM-1 (a camera panel over the crates); and the claw's
 * hook, which is a Circuit mover (`crane.hook` in devices.json: it follows the arm's state `armAt` and stops at
 * the places of the slots this file measures from the artwork). The crane, the chute and the parcel's slide are
 * source (devices.json controller, gameplay deadlines); the hook's travel is its mover's and the parcel's place
 * the picture's, read by the scene's `{shared}` values (scene-values.ts) through its shared state.
 * Needs the artwork role `tray` (the parcel tray an engine target anchors to).
 */
import type {Resolved} from '../../../art/core/composition';
import type {YardVisual} from '../../../art/assemblies/fixer-yard';
import {renderDowntownStreet} from './street-layers';
import {light} from '../../../world/light';
import {yardController,yardRead,type YardController} from '../../controllers/yard';
import type {EngineDraw} from '../../host';
import type {SceneModel} from '../../model';
import type {GameplayDefinition} from '../types';
import type {SceneMechanism} from '../scene-mechanisms';
import {YARD_RULES} from './yard-rules';
import {cameraPanel} from './yard-camera';

const find=(rows:readonly Resolved[],id:string)=>{const row=rows.find(r=>r.instance.id===id);if(!row)throw new Error('Unknown Yard instance '+id);return row.placement;};
function validateGeometry(c:YardController|undefined,rows:readonly Resolved[]){if(!c)return;for(const ref of Object.values(c.slots))if(!rows.some(r=>r.instance.id===ref))throw Error('Yard slot artwork reference '+ref);for(const[role,ref]of Object.entries(c.anchors))if(!rows.some(r=>r.instance.id===ref&&r.instance.type==='yard.'+role))throw Error('Yard '+role+' artwork reference '+ref);}

/** Where the mechanism keeps its picture state in the scene's shared state (its `visual` is what the scene's `{shared: {mechanism: "yardCrane"}}` values read). */
export const YARD_KEY='yardCrane';
/** What the picture reads of the yard: the claw's hook (its mover's place) and the parcel; the caller (the scene) owns one. Pure: painting never moves anything. */
export class YardPresentation{
 readonly hookVisible:boolean;
 constructor(private readonly rows:readonly Resolved[],private readonly gameplay:GameplayDefinition,c:YardController|undefined){this.hookVisible=!!c;}
 private slots(c:YardController|null){return c?Object.fromEntries(Object.entries(c.slots).map(([id,ref])=>[id,find(this.rows,ref).x])):{} as Record<string,number>;}
 /** Where the hook is now: its mover's place along the crane. */
 private hookX(model:SceneModel){const c=yardController(model.data);return c?model.movers.position(c.hook)??0:0;}
 private parcel(model:SceneModel):[number,number]|null{
  const c=yardController(model.data);if(!c)return null;
  const at=yardRead(model,'parcelAt'),slots=this.slots(c),chute=this.rows.find(r=>r.instance.id===c.anchors.chute)!,x0=chute.placement.x,h0=chute.placement.h+Number(chute.props.height),x1=x0+Number(chute.props.width),h1=chute.placement.h+Number(chute.props.endHeight);
  if(typeof at==='string'&&c.cargoSlots.includes(at))return[slots[at],find(this.rows,c.slots[at]).h+22];
  if(at===c.places.hook)return[this.hookX(model),find(this.rows,c.anchors.crane).h+51];if(at===c.places.chute)return[x0,h0];
  if(at===c.places.sliding){const deadline=c.slideDeadline?this.gameplay.native?.deadlines?.[c.slideDeadline]:undefined;if(!deadline?.startedAt)return null;const f=Math.min(1,(model.now()-(model.scratch[deadline.startedAt]??0))/(model.data.tuning[deadline.duration.tuning]+(deadline.duration.offsetMs??0)));return[x0+(x1-x0)*f,h0+(h1-h0)*f];}
  if(at===c.places.bounced)return[x1-4,h1];if(at===c.places.tray){const p=find(this.rows,c.anchors.tray);return[p.x,p.h+8];}return null;
 }
 /** What the frame paints, worked out from the model as it stands: bounds queries and repeated painting never advance anything. */
 visual(engine:EngineDraw):YardVisual{const l=light(),c=yardController(engine.m.data),held=c!==undefined&&yardRead(engine.m,'parcelAt')===c.places.hook;return{layer:engine.layer,highlight:engine.hover??'',pan:Number(yardRead(engine.m,'pan')??0),gateOpen:!!(c?.gateOpen&&engine.m.value(c.gateOpen)),gateAllowed:!!yardRead(engine.m,'gateAllowed'),held,hookVisible:this.hookVisible,hookX:this.hookX(engine.m),parcel:held&&!this.hookVisible?null:this.parcel(engine.m),night:l.night*(1-l.cover)};}
}

export const yardCrane:SceneMechanism={
 face:{function:'act',controller:'yard'},
 label:"The fixer's yard (CAM-1, the claw's hook)",requires:['tray'],world:false,ownsRoom:true,
 rulesShape:()=>YARD_RULES,
 apply:({rows,gameplay,content,shared})=>{
  const c=yardController(content.data!);validateGeometry(c,rows);
  shared.set(YARD_KEY,new YardPresentation(rows,gameplay,c));
  // where the hook's stops are: the places of the slots, measured from the artwork
  const places=c?Object.fromEntries(Object.entries(c.slots).map(([name,ref])=>{const p=find(rows,ref);return[name,{x:p.x,h:p.h}];})):{};
  return{rules:{...YARD_RULES,places},panels:{camera:cameraPanel},layers:true,artworkFrame:{street:renderDowntownStreet}};
 },
};
