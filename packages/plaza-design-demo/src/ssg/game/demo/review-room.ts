import type {SceneDef} from '../scenes/kit';
import type {ChunkDocument} from '../art/core/composition';
import {drawReviewRoom} from '../art/assemblies/review-room';
import {actorBindingController} from '../engine/gameplay/native-actor-bindings';
import {manifestCompositionRows} from '../engine/gameplay/manifest-geometry';
import type {SceneDocument} from '../engine/gameplay/scene-document';
/** Test rooms reuse campaign fixtures, but their actor membership is their own source.
 * An actor added to the campaign must not become a hidden dependency of a review room. */
export function reviewActorArtwork(composition:ChunkDocument,scene:SceneDocument):ChunkDocument{
 const copy=structuredClone(composition),type=actorBindingController(scene.id)?.element;
 if(!type)return copy;
 const allowed=new Set((scene.actors??[]).map(a=>a.instance)),removed=new Set<string>();
 const collect=(nodes:typeof copy.instances)=>{for(const node of nodes){if(node.type===type&&!allowed.has(node.id))removed.add(node.id);collect(node.children??[]);}};collect(copy.instances);
 if(!removed.size)return copy;
 const rows=manifestCompositionRows(copy);
 const filter=(nodes:typeof copy.instances):typeof copy.instances=>nodes.filter(n=>!removed.has(n.id)).map(n=>{if(n.attach&&removed.has(n.attach.instance)){const position=rows.find(r=>r.instance.id===n.id)!.placement;delete n.attach;n.placement={...position};}if(n.children)n.children=filter(n.children);return n;});
 copy.instances=filter(copy.instances);return copy;
}
export function reviewVisibility(doc:ChunkDocument,ids:readonly string[]){return Object.fromEntries(doc.instances.map(i=>[i.id,ids.includes(i.id)]));}
export function plainReviewScene(base:SceneDef,people:string[]=[],uses:string[]=[]):SceneDef{
 return {...base,width:1040,intro:[],ambient:{},shade:undefined,lights:[],casters:[],platforms:[],rests:[],readables:[],exits:[],targets:undefined,use:undefined,
  people:base.people?.filter(p=>p.id&&people.includes(p.id)),uses:base.uses?.filter(u=>uses.includes(u.id)),drawFront:undefined,
  drawBackdrop:(ctx,v,e)=>{drawReviewRoom(ctx,v);base.drawBackdrop?.(ctx,v,e);}};
}
