import {resolveArtworkRoles} from '../../engine/gameplay/artwork-roles';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {presentationFlag,type ScenePresentation} from '../../engine/gameplay/scene-presentation';
import {SHIFT_SCENE} from './scene-document';
import {actorPoseSource} from '../../engine/gameplay/native-actor-bindings';
import { frameView } from '../../art/core/view';
/** Authored night-shift layout and snapshots shared by shipping and the composer. */
import { art } from '../../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import { prepareCharacter,type Character } from '../../runtime/characters';
import type { SceneDef,SceneUse } from '../kit';
import { PAPER } from '../../art/core/primitives';
import source from './composition.json';
export type HarborShiftRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:960,viewH:360,flags:{}};
const flatten=(nodes:Composition['instances']):Composition['instances']=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
const allowed=new Set(['shift.parcelPresent','shift.returned','shift.delivered','shift.casePresent','shift.trolleyX','shift.trolleyRestX','shift.released','shift.checked','shift.done']);
export function validateHarborShiftComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='harborShift')throw new Error('Expected harborShift composition');const all=flatten(doc.instances);for(const n of all){if(n.type==='character.prepared'){if(typeof n.props.actor!=='string'||!/^[-a-zA-Z0-9_.]{1,96}$/.test(n.props.actor)||n.bindings?.pose!==actorPoseSource('harborShift',n.props.actor)||Object.keys(n.bindings).some(k=>k!=='pose'))throw new Error(n.id+': invalid shift actor binding');}else for(const value of Object.values(n.bindings??{}))if(!allowed.has(value)&&!/^cue\.[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value))throw new Error(n.id+': unknown shift binding '+value);}return doc;}
export const harborShiftComposition=validateHarborShiftComposition(source);
function defaults(doc:Composition){const out:Record<string,Value>={};for(const n of flatten(doc.instances))for(const[k,binding]of Object.entries(n.bindings??{}))out[binding]=art.get(n.type).visualFields![k].default;return out;}
export function harborShiftGeometry(doc:Composition=harborShiftComposition){return resolveComposition(art,doc,{view:geometryView,bindings:defaults(doc),state:{},reduced:false});}
export function harborShiftEnvironment(doc:Composition,view:View,actors:Readonly<Record<string,Character>>,uses:SceneUse[],presentation:ScenePresentation|null=SHIFT_SCENE.presentation??null,source:SceneDocument=SHIFT_SCENE):Environment{
 const rows=harborShiftGeometry(doc),roles=resolveArtworkRoles('harborShift',source.manifest?.artwork,rows),f=view.flags,bindings=defaults(doc),flag=(id:import('../../engine/gameplay/scene-presentation').ShiftPresentationRole)=>presentationFlag(presentation,f,id);
 const values:Record<string,Value>={parcelPresent:!flag('parcel'),returned:flag('returned'),delivered:flag('delivered'),casePresent:flag('delivered')&&!flag('case'),trolleyX:(flag('parked')?roles.bay:roles.trolley)?.placement.x??0,trolleyRestX:roles.trolley?.placement.x??0,released:flag('released'),checked:flag('checked'),done:flag('done')};
 for(const[k,value]of Object.entries(values))bindings['shift.'+k]=value;
 for(const name of Object.keys(bindings).filter(k=>k.startsWith('cue.')))bindings[name]=false;
 for(const use of uses)bindings['cue.'+use.id]=!use.available||use.available(f);
 for(const row of rows.filter(r=>r.instance.type==='character.prepared')){const id=String(row.props.actor),actor=actors[id],at=row.placement,pose=prepareCharacter(actor,view.t);if(pose.visible){const dx=at.x-actor.x,dh=at.h-(actor.h??0);bindings['actor.'+id+'.pose']={...pose,character:{...pose.character,x:at.x,h:at.h},frame:{...pose.frame,x:pose.frame.x+dx},height:pose.height+dh} as unknown as Value;}else bindings['actor.'+id+'.pose']=pose as unknown as Value;}
 return{view,state:{},bindings,reduced:false};
}
export function drawHarborShiftComposition(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,uses:SceneUse[],doc=harborShiftComposition,state:Environment['state']={},options:HarborShiftRenderOptions={},presentation:ScenePresentation|null=SHIFT_SCENE.presentation??null,source:SceneDocument=SHIFT_SCENE){drawComposition(ctx,art,doc,{...harborShiftEnvironment(doc,view,actors,uses,presentation,source),state,...options},'backdrop');}
export function harborShiftLights(doc:Composition=harborShiftComposition):NonNullable<SceneDef['lights']>{return harborShiftGeometry(doc).filter(r=>r.props.role==='light').map(r=>({x:r.placement.x,h:r.placement.h,kind:'lamp',r:Number(r.props.width),col:PAPER}));}
