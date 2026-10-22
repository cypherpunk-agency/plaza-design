import type {StreetSpritePresentation} from '../../art/characters/street-sprite';
import {actorPresentation,type RiderPresentation,riderKinds} from './actor-presentation';
import {prepareCharacter,isHere,type Character,type PreparedCharacter} from '../../runtime/characters';
import {crowd} from '../../art/characters/riders';
import type {View} from '../../art/core/view';
import type {LineSystem} from '../../world/transport/line';
import * as defaultMetro from '../../world/transport/line';
import {viewTimeline} from '../../world/transport/line';
import type {CityModel,Station} from '../../world/city';
import {lockOpen as defaultLockOpen} from '../../world/city';
export interface PreparedRider {kind:'rider';visible:boolean;character:{x:number;h?:number};rider:{kind:RiderPresentation['rider'];sit:boolean;flip:boolean;phase:number;offset:number;ps:number};dim?:number}
export interface PreparedStreetSprite {kind:'streetSprite';visible:boolean;character:{x:number;h?:number};sprite:StreetSpritePresentation;dim?:number}
export type PreparedActor=PreparedCharacter|PreparedRider|PreparedStreetSprite;
export interface RiderFrameContext {metro?:LineSystem;city?:CityModel;trainAt?:number;regulars?:readonly {x:number;kind:string}[]}
/** The original crowd selection formulas, with authored count/slot and source-owned coordinates. */
export function prepareActor(actor:Character,view:View,context:RiderFrameContext={}):PreparedActor{
 const p=actorPresentation(actor);if(!p)return prepareCharacter(actor,view.t);
 if(p.kind==='streetSprite')return{kind:'streetSprite',visible:isHere(actor),character:{x:actor.x,...(actor.h!==undefined?{h:actor.h}:{})},sprite:{...p,...(actor.facing!==undefined?{flip:actor.facing===-1}:{})},...(actor.dim!==undefined?{dim:actor.dim}:{})};
 let visible=isHere(actor),kind=p.rider,flip=p.flip??false,phase=p.phase??0,offset=0;const metro=context.metro??defaultMetro,c=p.controller;
 if(c?.kind==='platformQueue'){const q=metro.platformQueue(c.station,viewTimeline(view)),f=crowd(300+q.train*11+c.count*3+c.station.length,c.count)[c.slot];visible&&=!!f.on&&!q.boarded&&(!metro.lockOf(c.station as Station)||(context.city?.lockOpen??defaultLockOpen)(metro.lockOf(c.station as Station)!,view.flags));kind=f.kind as typeof kind;flip=f.flip;phase=f.phase;}
 if(c?.kind==='trainCrowd'){const f=crowd(500+(context.trainAt??metro.trainVisualState().ride.at)*31,c.count)[c.slot],regulars=context.regulars??[];let index=riderKinds.indexOf(f.kind as typeof kind);for(let n=0;n<riderKinds.length&&regulars.some(p=>p.kind===riderKinds[index]);n++)index=(index+3)%riderKinds.length;kind=riderKinds[index];flip=f.flip;phase=f.phase;visible&&=f.on&&!regulars.some(p=>Math.abs(p.x-actor.x)<16);if(c.standing)offset=f.flip?-10:10;}
 if(actor.facing!==undefined)flip=actor.facing===-1;
 return{kind:'rider',visible,character:{x:actor.x,...(actor.h!==undefined?{h:actor.h}:{})},rider:{kind,sit:p.sit??false,flip,phase,offset,ps:actor.ps??3},...(actor.dim!==undefined?{dim:actor.dim}:{})};
}
