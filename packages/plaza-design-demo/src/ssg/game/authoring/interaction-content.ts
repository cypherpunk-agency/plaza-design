import type {InteractionRoute,UseDocument} from '../engine/gameplay/scene-document';

/** Structural edits keep ordered routes' final fallback and rotating routes' unconditional shape. */
export function addInteractionOutcome(rows:InteractionRoute[],rotating=false){
 if(rows.length>=32)throw Error('At most 32 outcomes');
 const row:InteractionRoute={pages:['Nothing happens.']};
 if(rotating)rows.push(row);else{row.when={tokensAtLeast:0};rows.splice(Math.max(0,rows.length-1),0,row);}
}
export function removeInteractionOutcome(rows:InteractionRoute[],index:number,rotating=false){
 if(rows.length<=1)throw Error('Keep one fallback outcome');
 if(index<0||index>=rows.length)throw Error('Unknown outcome');
 rows.splice(index,1);if(!rotating)delete rows[rows.length-1].when;
}
export function moveInteractionOutcome(rows:InteractionRoute[],index:number,direction:-1|1,rotating=false){
 const next=index+direction,limit=rows.length-(rotating?0:1);
 if(index<0||index>=limit||next<0||next>=limit)throw Error('The final fallback stays last');
 [rows[index],rows[next]]=[rows[next],rows[index]];
}
export function setInteractionRotation(use:UseDocument,on:boolean,state?:string){
 if(on){const cursor=state??use.cycleState;if(!cursor)throw Error('Choose a shared rotation state first');if(use.routes.some(r=>r.when!==undefined||r.conversation!==undefined))throw Error('Remove conditional and conversation outcomes before enabling rotation');use.cycle=true;use.cycleState=cursor;}
 else{delete use.cycle;delete use.cycleState;for(const r of use.routes.slice(0,-1))r.when={tokensAtLeast:0};delete use.routes[use.routes.length-1].when;}
}
export function addCarriedInteraction(use:UseDocument,item:string){
 if(!item||(use.items?.length??0)>=2||use.items?.some(r=>r.item===item))throw Error('Choose an unused declared item (at most two)');
 (use.items??=[]).push({item,label:'[E] USE ITEM',routes:[{pages:['Nothing happens.']}]});
}
