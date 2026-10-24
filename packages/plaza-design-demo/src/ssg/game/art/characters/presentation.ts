/** Serializable character recipes and metadata, independent of character painting. */
import type {Character} from '../../runtime/characters';
export const streetSpriteKinds=['fixer','hood','umbrella','hat'] as const;
export interface StreetSpritePresentation {kind:'streetSprite';sprite:typeof streetSpriteKinds[number];flip?:boolean}
/** Caption avoidance intentionally preserves the original street actor head markers. */
export const streetSpriteHeadHeight=(recipe:StreetSpritePresentation)=>recipe.sprite==='fixer'?74:46;
/** Serializable native sprite recipes. Passenger flows keep their appearance across boarding; named actors keep source-owned placement. */
export const riderKinds=['phone','paper','suit','courier','elder','punk','inspector','sleeper'] as const;
export interface RiderPresentation {
 kind:'rider';rider:typeof riderKinds[number];sit?:boolean;flip?:boolean;phase?:number;regular?:boolean;
}
export type ActorPresentation=RiderPresentation|StreetSpritePresentation;
const recipes=new WeakMap<Character,ActorPresentation>();
export function bindActorPresentation(actor:Character,presentation:ActorPresentation){recipes.set(actor,structuredClone(presentation));}
export const actorPresentation=(actor:Character)=>recipes.get(actor);
