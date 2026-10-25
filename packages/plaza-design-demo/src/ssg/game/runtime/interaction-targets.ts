/** Pure prompt projections over committed scene state. No command execution or retained state. */
import type {SceneDef,SceneUse,SceneExit} from '../scenes/kit';
import type {SceneId} from '../scenes';

import {priceTag} from '../scenes/kit';
import type {SceneModel} from '../engine/model';
import type {GameplaySession} from '../engine/gameplay/session';
import {movingInteractions} from '../engine/gameplay/moving-interactions';
import {exitVisibility,exitPermission} from '../world/access';
import {characterX,characterHeight,isHere,isBot} from './characters';
import {critterReaction} from '../engine/gameplay/critter-reactions';
import {botVoice} from '../engine/gameplay/bot-conversations';
export type InteractionTarget = {kind:'exit'|'life'|'device'|'companion'|'level';id:string;x:number;h:number;label:string;promptH?:number;owner?:SceneId};

interface PromptContext {model:SceneModel;flags:Readonly<Record<string,boolean>>;tokens:number;session?:GameplaySession;floor(x:number,h:number|undefined):number;rests:boolean;time:number;critters:Parameters<typeof critterReaction>[1];bots:Parameters<typeof botVoice>[1]}
export function promptFloor(scene:SceneDef,x:number,h:number|undefined,floors=scene.level?.floors):number {
 if(!scene.level||h===undefined)return 0;
 const under=(floors??[]).filter(f=>x>=f.x-.5&&x<=f.x+f.w+.5&&f.h<=h+2).map(f=>f.h);
 return under.length?Math.max(...under):0;
}
export function usePrice(use:SceneUse,flags:Readonly<Record<string,boolean>>,session?:GameplaySession){return typeof use.price==='function'?use.price(flags,session):use.price??0;}
/** Shared access read; execution does not need to format prices or build menu presentation. */
export function useAccess(use:SceneUse,flags:Readonly<Record<string,boolean>>,session?:GameplaySession){
 const available=!use.available||use.available(flags,session?.state()),permission=available?use.eligibility?.(flags,session):undefined;
 return{permission,available,visible:available&&!(permission&&!permission.ok&&permission.hidden)};
}
export const useBox=(use:SceneUse)=>({x:use.x,y:use.floorH??0,w:40,h:Math.max(16,(use.promptH??70)-(use.floorH??0)-24)});
/** One live presentation projection feeds E prompts and item menus. No retained authorization. */
export function resolveUse(use:SceneUse,flags:Readonly<Record<string,boolean>>,tokens:number,session?:GameplaySession){
 const access=useAccess(use,flags,session),price=access.visible?usePrice(use,flags,session):0,base=use.act??use.label.replace(/^\[E\]\s*/, '').toLowerCase();
 return{use,price,...access,
  label:price?(use.pricedLabel!==undefined?use.pricedLabel+' ':use.label+' · ')+priceTag(price,tokens):use.label,
  actionLabel:base+(price?' · '+priceTag(price,tokens).toLowerCase():''),box:useBox(use)};
}
/** Exit presentation and execution share access reads; absence of keys is a presentation-only query. */
export function resolveExit(exit:SceneExit,context:{flags:Readonly<Record<string,boolean>>;tokens:number;fare?:number;keys?:readonly string[]}){
 return{exit,visibility:exitVisibility(exit,context.flags),permission:context.keys?exitPermission(exit,context.keys):undefined,
  label:exit.action==='taxi'?exit.label+' · '+priceTag(context.fare??0,context.tokens):exit.label};
}
export function exitTargets(s:SceneDef,ctx:Pick<PromptContext,'model'|'flags'|'tokens'>&{fare:number}):InteractionTarget[]{
    const list: InteractionTarget[] = [];
    for (const e of movingInteractions(s,ctx.model).exits) {
      const resolved=resolveExit(e,ctx);if(e.edge||e.engine||!resolved.visibility.ok)continue;
      // a taxi stand shows its fare and what you have (tokens show only where you pay)
      const label=resolved.label;
      list.push({ kind: 'exit', id: 'exit:' + e.id, x: e.x, h: (e as typeof e&{floorH?:number}).floorH??0, label, promptH: e.promptH ?? 70 });
    }
    return list;
  }
export function lifeTargets(s:SceneDef,ctx:PromptContext):InteractionTarget[]{
    s=movingInteractions(s,ctx.model);
    const list: InteractionTarget[] = [];
    for (const r of s.readables ?? []) list.push({ kind: 'life', id: 'read:' + r.id, x: r.x, h: r.floorH??ctx.floor( r.x, r.h), label: r.label ?? '[E] READ', promptH: r.promptH ?? 70 });
    for (const u of s.uses ?? []) {const resolved=resolveUse(u,ctx.flags,ctx.tokens,ctx.session);if(!resolved.visible)continue;list.push({kind:'life',id:'use:'+u.id,x:u.x,h:u.floorH??ctx.floor(u.x,u.h),label:resolved.label,promptH:u.promptH??70});}
    // benches, stools and the bed: wait until… (not while a story beat holds the clock: the opening's own bed is its sleep)
    if (ctx.rests) for (const r of s.rests ?? []) list.push({ kind: 'life', id: 'rest:' + r.id, x: r.x, h: r.floorH ?? r.h ?? 0, label: r.kind === 'bed' ? '[E] SLEEP · WAIT' : '[E] SIT · WAIT', promptH: r.promptH ?? 60 });
    // the scene's people with something to say (characters.ts): the target follows a walker (nobody outside their time window)
    for (const p of s.people ?? []) if (p.id && p.talk && isHere(p)) list.push({ kind: 'life', id: 'talk:' + p.id, x: characterX(p, ctx.time), h: 0, label: '[E] TALK', promptH: p.promptH ?? characterHeight(p) + 16 });
    // animals: people always want to pet the cat (and the pigeon gets shooed)
    (s.people ?? []).forEach((p, i) => {
      if (!isHere(p)) return;
      const critter = critterReaction(p, ctx.critters);
      if (!p.talk && critter) list.push({ kind: 'life', id: 'pet:' + i, x: characterX(p, ctx.time), h: 0, label: critter.prompt, promptH: characterHeight(p) + 14 });
      // robots without talk still answer: a beep, a status, a polite refusal
      else if (!p.talk && isBot(p)) list.push({ kind: 'life', id: 'bot:' + i, x: characterX(p, ctx.time), h: 0, label: botVoice(p,ctx.bots).label, promptH: characterHeight(p) + 14 });
    });
    return list;
  }
