import type {SceneDef} from '../scenes/kit';
import type {Composition} from '../art/core/composition';
import {drawReviewRoom} from '../art/assemblies/review-room';
export function reviewVisibility(doc:Composition,ids:readonly string[]){return Object.fromEntries(doc.instances.map(i=>[i.id,ids.includes(i.id)]));}
export function plainReviewScene(base:SceneDef,people:string[]=[],uses:string[]=[]):SceneDef{
 return {...base,width:1040,intro:[],ambient:{},shade:undefined,lights:[],casters:[],platforms:[],rests:[],readables:[],exits:[],targets:undefined,use:undefined,
  people:base.people?.filter(p=>p.id&&people.includes(p.id)),uses:base.uses?.filter(u=>uses.includes(u.id)),drawFront:undefined,
  drawBackdrop:(ctx,v,e)=>{drawReviewRoom(ctx,v);base.drawBackdrop?.(ctx,v,e);}};
}
