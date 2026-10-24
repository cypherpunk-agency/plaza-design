import type {StreetSpritePresentation} from '../../art/characters/presentation';
import {actorPresentation,type RiderPresentation} from '../../art/characters/presentation';
import {prepareCharacter,isHere,type Character,type PreparedCharacter} from '../../runtime/characters';
import type {View} from '../../art/core/view';
export interface PreparedRider {kind:'rider';visible:boolean;character:{x:number;h?:number};rider:{kind:RiderPresentation['rider'];sit:boolean;flip:boolean;phase:number;offset:number;ps:number};dim?:number}
export interface PreparedStreetSprite {kind:'streetSprite';visible:boolean;character:{x:number;h?:number};sprite:StreetSpritePresentation;dim?:number}
export type PreparedActor=PreparedCharacter|PreparedRider|PreparedStreetSprite;
/** Fixed source actors use their authored appearance; live passengers belong to the shared people flow. */
export function prepareActor(actor:Character,view:View):PreparedActor{
 const p=actorPresentation(actor);if(!p)return prepareCharacter(actor,view.t);
 if(p.kind==='streetSprite')return{kind:'streetSprite',visible:isHere(actor),character:{x:actor.x,...(actor.h!==undefined?{h:actor.h}:{})},sprite:{...p,...(actor.facing!==undefined?{flip:actor.facing===-1}:{})},...(actor.dim!==undefined?{dim:actor.dim}:{})};
 let visible=isHere(actor),kind=p.rider,flip=p.flip??false,phase=p.phase??0,offset=0;
 if(actor.facing!==undefined)flip=actor.facing===-1;
 return{kind:'rider',visible,character:{x:actor.x,...(actor.h!==undefined?{h:actor.h}:{})},rider:{kind,sit:p.sit??false,flip,phase,offset,ps:actor.ps??3},...(actor.dim!==undefined?{dim:actor.dim}:{})};
}
