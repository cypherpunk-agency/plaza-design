import {streetSpriteKinds,type StreetSpritePresentation} from '../../art/characters/street-sprite';
import type {Character} from '../../runtime/characters';
import {prepareCharacter} from '../../runtime/characters';
import {actorBindingController,actorPoseSource} from './native-actor-bindings';
import type {Composition,Instance,Value} from '../../art/core/composition';
/** Existing Character presenters retained for the migrated interior scenes. */
export function validateActorPresentationNode(scene:string,node:Instance){const c=actorBindingController(scene);if(!c||node.type!==c.element)return false;if(typeof node.props.actor!=='string'||!/^[-a-zA-Z0-9_.]{1,96}$/.test(node.props.actor)||node.bindings?.pose!==actorPoseSource(scene,node.props.actor)||Object.keys(node.bindings).some(k=>k!=='pose'))throw new Error(node.id+': invalid actor presentation binding');return true;}
export function actorPresentationDefaults(scene:string,doc:Composition):Record<string,Value>{const c=actorBindingController(scene),flatten=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);return Object.fromEntries(flatten(doc.instances).filter(n=>n.type===c?.element).map(n=>{validateActorPresentationNode(scene,n);return[actorPoseSource(scene,String(n.props.actor)),{visible:false,character:{x:0}}];}));}
export function actorPresentationBindings(scene:string,actors:Readonly<Record<string,Character>>,time:number,visible=true):Record<string,Value>{return Object.fromEntries(Object.entries(actors).map(([id,body])=>[actorPoseSource(scene,id),(visible?prepareCharacter(body,time):{visible:false,character:{x:body.x}}) as unknown as Value]));}
/** Serializable native sprite recipes. Passenger flows keep their appearance across boarding; named actors keep source-owned placement. */
export const riderKinds=['phone','paper','suit','courier','elder','punk','inspector','sleeper'] as const;
export interface RiderPresentation {
 kind:'rider';rider:typeof riderKinds[number];sit?:boolean;flip?:boolean;phase?:number;regular?:boolean;
}
export type ActorPresentation=RiderPresentation|StreetSpritePresentation;
const recipes=new WeakMap<Character,ActorPresentation>();
export function bindActorPresentation(actor:Character,presentation:ActorPresentation){recipes.set(actor,structuredClone(presentation));}
export const actorPresentation=(actor:Character)=>recipes.get(actor);
export function validateActorPresentation(value:unknown):asserts value is ActorPresentation{
 const fail=():never=>{throw new Error('Invalid rider presentation');},object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail();return v as Record<string,unknown>;},p=object(value);
 if(p.kind==='streetSprite'){if(Object.keys(p).some(k=>!['kind','sprite','flip'].includes(k))||!streetSpriteKinds.includes(p.sprite as StreetSpritePresentation['sprite'])||p.flip!==undefined&&typeof p.flip!=='boolean')fail();return;}
 if(Object.keys(p).some(k=>!['kind','rider','sit','flip','phase','regular'].includes(k))||p.kind!=='rider'||!riderKinds.includes(p.rider as RiderPresentation['rider']))fail();
 for(const key of ['sit','flip','regular'])if(p[key]!==undefined&&typeof p[key]!=='boolean')fail();
 if(p.phase!==undefined&&(typeof p.phase!=='number'||!Number.isFinite(p.phase)||p.phase<0||p.phase>1000000))fail();
}
