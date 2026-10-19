import {resolveArtworkRoles} from '../../engine/gameplay/artwork-roles';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import sceneSource from './scene.json';
import {beachVisualSnapshot} from '../../engine/controllers/visual';
import {actorPoseSource} from '../../engine/gameplay/native-actor-bindings';
import { frameView } from '../../art/core/view';
/** Beach source composition and explicit runtime/preview bindings. No preview writes game state. */
import { art } from '../../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import { onScreen } from '../../art/core/primitives';
import { beachVisualFields } from '../../art/assemblies/beach-elements';
import { prepareCharacter,type Character,type PreparedCharacter } from '../../runtime/characters';
import type { SceneModel } from '../../engine/index';
import type { SceneData } from '../../data/types';
import type { SceneDef } from '../kit';
import { light } from '../../world/light';
import source from './composition.json';
export const beachArt=art;
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,t:0,cam:0,viewW:960,viewH:360,flags:{}};
export type BeachRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export const beachMarkerPolicy={exitAxes:['x'] as const,description:'Exits are horizontal gameplay triggers; local device, use, person, light and shadow heights follow their source markers.'};
const sources=new Set(Object.keys(beachVisualFields).map(k=>'beach.'+k));
const flatten=(nodes:Composition['instances']):Composition['instances']=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
export function validateBeachComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='beach')throw new Error('Expected beach composition');const all=flatten(doc.instances);for(const row of all){if(row.type==='character.prepared'){if(typeof row.props.actor!=='string'||!/^[-a-zA-Z0-9_.]{1,96}$/.test(row.props.actor)||row.bindings?.pose!==actorPoseSource('beach',row.props.actor)||Object.keys(row.bindings).some(k=>k!=='pose'))throw new Error(row.id+': invalid Beach actor binding');}else for(const name of Object.values(row.bindings??{}))if(!sources.has(name))throw new Error(row.id+': unknown Beach binding '+name);}return doc;}
export const beachComposition=validateBeachComposition(source);
function defaults(doc:Composition):Record<string,Value>{const result:Record<string,Value>={};for(const row of flatten(doc.instances))for(const[field,name]of Object.entries(row.bindings??{}))result[name]=art.get(row.type).visualFields![field].default;return result;}
export function beachGeometry(doc:Composition=beachComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function beachDeviceData(data:SceneData,doc:Composition=beachComposition,scene?:Pick<import('../../engine/gameplay/scene-document').SceneDocument,'manifest'>):SceneData{const result=structuredClone(data),rows=beachGeometry(doc);for(const d of result.devices){if(scene?.manifest?.devices?.[d.id])continue;const r=rows.find(r=>r.instance.id==='device-'+d.id),spot=d.layout?.spot;if(!r||!spot)continue;spot.x=r.placement.x;if(spot.y!==undefined||r.placement.h!==0)spot.y=r.placement.h;const w=Number(r.props.width)*r.placement.scale,h=Number(r.props.height)*r.placement.scale;if(Number.isFinite(w)&&w>0)spot.w=w;if(Number.isFinite(h)&&h>0)spot.h=h;}return result;}
export function beachLights(doc:Composition=beachComposition):NonNullable<SceneDef['lights']>{return beachGeometry(doc).filter(r=>r.instance.type==='beach.light').map(r=>({x:r.placement.x,h:r.placement.h,kind:r.props.kind as 'window'|'neon'|'lamp',r:Number(r.props.radius)*r.placement.scale,...(r.props.width?{w:Number(r.props.width)*r.placement.scale,hh:Number(r.props.lightHeight)*r.placement.scale}:{}),...(r.props.color?{col:String(r.props.color)}:{}),...(Number(r.props.alpha)!==1?{a:Number(r.props.alpha)}:{})}));}
export function beachCasters(doc:Composition=beachComposition):NonNullable<SceneDef['casters']>{return beachGeometry(doc).filter(r=>r.props.role==='caster').map(r=>({x:r.placement.x,h:r.placement.h,w:Number(r.props.width)*r.placement.scale}));}
export function beachEnvironment(doc:Composition,d:View,m:SceneModel,hover:string|null,actors:Readonly<Record<string,Character>>,gull:{shooed:number},scene:SceneDocument=sceneSource as unknown as SceneDocument):Environment{
 const cam=-d.sx(0),view:View={...d,sx:(wx,par=1)=>Math.round(wx-cam*par),cam,gy:d.y(0),flags:{}},rows=beachGeometry(doc),roles=resolveArtworkRoles('beach',scene.manifest?.artwork,rows),x=(role:string)=>roles[role]?.placement.x??0;
 const bindings=defaults(doc),visual=beachVisualSnapshot(m),{danger}=visual,bar=roles.bar,pier=roles.pier,walk=roles.boardwalk;
 const lime=actors['lime-talk'];
 const values:Record<string,Value>={limeVisible:!!lime&&lime.look===undefined,limeX:lime?.x??0,limeH:(lime?.h??4)-4,palette:Math.min(1,light().night*.9+(1-light().daylight)*.1),horizon:roles.horizon?.placement.h??0,waterline:roles.waterline?.placement.h??0,...visual,gullShooed:gull.shooed,hover:hover??'',barVisible:!!bar&&!(view.sx(bar.placement.x+Number(bar.props.width)*bar.placement.scale)<-60||view.sx(bar.placement.x)>view.viewW+60),barWidth:bar?Number(bar.props.width)*bar.placement.scale:0,towerVisible:!!roles.tower&&onScreen(view,view.sx(x('tower'))-70,140),pierVisible:!!pier&&!(view.sx(pier.placement.x+Number(pier.props.width)*pier.placement.scale)<0||view.sx(pier.placement.x)>view.viewW),boardwalkVisible:!!walk&&!(view.sx(walk.placement.x+Number(walk.props.width)*walk.placement.scale)<-4||view.sx(walk.placement.x)>view.viewW+4),drinkX:x('drink'),drinkH:roles.drink?.placement.h??0,shore:x('shore'),lampPositions:rows.filter(r=>r.instance.type==='beach.pier-lamp').map(r=>r.placement.x)};
 for(const[k,v]of Object.entries(values))bindings['beach.'+k]=v;
 for(const row of rows.filter(r=>r.instance.type==='character.prepared')){const id=String(row.props.actor),actor=actors[id];if(!actor)throw new Error('Missing Beach actor '+id);let pose:PreparedCharacter=(id==='lime-talk'&&actor.look===undefined||id.startsWith('ashore-')&&!danger)?{visible:false,character:{x:actor.x}} as PreparedCharacter:prepareCharacter(actor,view.t);if(pose.visible){const dx=row.placement.x-actor.x,dh=row.placement.h-(actor.h??0);pose={...pose,character:{...pose.character,x:row.placement.x,h:row.placement.h},frame:{...pose.frame,x:pose.frame.x+dx},height:pose.height+dh};}bindings['actor.'+id+'.pose']=pose as unknown as Value;}
 return{view,state:{},bindings,reduced:false};
}
export function drawBeachComposition(ctx:CanvasRenderingContext2D,d:View,m:SceneModel,hover:string|null,actors:Readonly<Record<string,Character>>,gull:{shooed:number},doc=beachComposition,state:Environment['state']={},options:BeachRenderOptions={},scene:SceneDocument=sceneSource as unknown as SceneDocument){drawComposition(ctx,art,doc,{...beachEnvironment(doc,d,m,hover,actors,gull,scene),state,...options},'backdrop');}
