import {compileSceneActors} from '../../engine/gameplay/actors';
import {prepareActor,type RiderFrameContext} from '../../engine/gameplay/actor-frame';
import {actorPoseSource} from '../../engine/gameplay/native-actor-bindings';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import type {Resolved,Value,Instance} from '../../art/core/composition';
import type {View} from '../../art/core/view';
import type {Character} from '../../runtime/characters';
export const transitActors=(source:SceneDocument,rows:readonly Resolved[])=>compileSceneActors(source,rows as Resolved[]);
/** The bench owns only a paint slot; source actor attachment decides whether it occupies it. */
export function transitActorBindings(source:SceneDocument,rows:readonly Resolved[],view:View,context:RiderFrameContext={},actors=transitActors(source,rows)):Record<string,Value>{
 const bindings:Record<string,Value>={};
 for(const actor of source.actors??[]){const row=rows.find(r=>r.instance.id===actor.instance)!,body=actors[actor.id],key=actorPoseSource(source.id,actor.id),pose=prepareActor(body,view,context),bench=row.instance.attach?rows.find(r=>r.instance.id===row.instance.attach!.instance):undefined,embedded=bench?.instance.type==='station.bench'&&bench.props.sourceRider===true&&bench.instance.bindings?.rider===key+'.embedded';
  bindings[key]=(embedded?{visible:false,character:{x:body.x}}:pose) as unknown as Value;bindings[key+'.embedded']=(embedded?pose:null) as unknown as Value;
 }
 return bindings;
}
export function transitBenchKind(source:SceneDocument,rows:readonly Resolved[],bench:Resolved){const actor=source.actors?.find(a=>{const row=rows.find(r=>r.instance.id===a.instance);return bench.props.sourceRider===true&&row?.instance.attach?.instance===bench.instance.id&&bench.instance.bindings?.rider===actorPoseSource(source.id,a.id)+'.embedded';});return actor?.presentation?.kind==='rider'?actor.presentation.rider:undefined;}
export function validateTransitActorNode(scene:string,node:Instance){if(node.type!=='actor.prepared')return false;if(typeof node.props.actor!=='string'||!/^[-a-zA-Z0-9_.]{1,96}$/.test(node.props.actor)||node.bindings?.pose!==actorPoseSource(scene,node.props.actor)||Object.keys(node.bindings).some(k=>k!=='pose'))throw new Error(node.id+': invalid transit actor binding');return true;}
export const transitPeople=(source:SceneDocument,actors:Readonly<Record<string,Character>>)=>(source.actors??[]).filter(a=>a.band==='world').map(a=>actors[a.id]);

export function validateTransitBenchNodes(nodes:readonly Instance[]){for(const node of nodes)if(node.type==='station.bench'){if(node.props.who)throw new Error(node.id+': seated rider belongs in actor source');const source=node.bindings?.rider;if(source){const actor=source.match(/^actor\.([-a-zA-Z0-9_.]+)\.pose\.embedded$/)?.[1];if(!actor||!nodes.some(n=>n.type==='actor.prepared'&&n.props.actor===actor))throw new Error(node.id+': missing embedded source actor');}}}
