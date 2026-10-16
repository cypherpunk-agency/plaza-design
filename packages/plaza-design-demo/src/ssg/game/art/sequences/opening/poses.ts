/** Pure prepared-pose paint helper; controllers resolve schedules and appearances. */
import type{PreparedCharacter}from'../../../runtime/characters';
import{drawCharacterFrame}from'../../characters/appearance';
import type{View}from'../../core/view';
export type OpeningActors=Readonly<Record<string,PreparedCharacter>>;
export function paintOpeningActor(x:CanvasRenderingContext2D,v:View,pose:PreparedCharacter|undefined,id:string){if(!pose)throw new Error('Missing prepared opening actor '+id);if(pose.visible)drawCharacterFrame(x,v,pose.character,pose.ready,pose.pixelSize,pose.frame,pose.height);}
