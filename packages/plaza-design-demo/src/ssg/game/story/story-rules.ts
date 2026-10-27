import type {Condition} from '../engine/gameplay/types';
/**
 * The story's generic primitives. There is no story runtime: these are source types and PURE functions that the one game loop
 * (runtime/game.ts `stepLoop`) and the scene model call. Nothing here keeps state, schedules, listens or advances time; the loop
 * owns the few numbers they read (its frame clock, presentation timestamps and the player's stillness) and applies what they return.
 *
 *  - a timed checkpoint gate (`GateRule`, `gateFrame`): an exit that says "verifying" for a beat, then "ok", then lets you through;
 *  - an acknowledgment exit (`AckRule`): a device speaks, the player continues, then the milestone runs;
 *  - a card transition (`CardSpec`, `cardFrame`): fade out, a card with two clock readings, fade in; shared by the sleep and
 *    "wait until ...";
 *  - cues (`Cue`): the finite list of things a gate, an acknowledgment, a card or a trigger makes happen (a milestone command, speech,
 *    deck lines, a sound, a restaged scene, a timestamp, the clock jumping ahead);
 *  - conditions and triggers (`Trigger`): a workflow that fires when shared gameplay predicates over state and live presentation observations hold (the morning's message, jacking in);
 *  - the clock pin rule (`clockPin`): what the story holds the city clock at, and what it lets go to;
 *  - the attention rule (`attentionDue`, `attentionAim`): standing still a while points at the next goal;
 *  - the stage light cue (`washTone`): the flat's warm and cold wash;
 *  - goal hints (`goalHint`): a sentence for the HUD's goal line when a program is still missing;
 *  - a barrier's phase rule (`barrierPhaseRule`, `barrierRuleOpens`): an exit rule standing in for a level barrier's own.
 *
 * The scene-side data (`ScenePhase`, scene.json `phases`) and the story-side data (opening.json) are validated in
 * opening-source.ts and engine/gameplay/scene-phases.ts; this file holds the shapes and the pure rules only.
 */

/** A line the player or a device says: [input, output, tone?] (engine Line). */
export type StoryLine=[input:string,output:string,tone?:'ok'|'err'|'dim'];
export interface Say {speaker:string;pages:string[];touchPages?:string[];height:number}
export type Tone='ok'|'out'|'err'|'dim';
export type Sound='granted'|'blip'|'denied'|'close'|'open';
/** What a gate, an acknowledgment, a card or a trigger makes happen. Run in order; a `milestone` that is refused ends the list. Says are spoken, in order, once the other cues have run. */
export type Cue=
 |{milestone:string}
 |{say:Say}
 |{print:{lines:string[];prefix?:string;tone?:Tone}}
 |{sound:Sound}
 |{stage:{scene:string;reset?:true;face?:-1|1}}
 |{stamp:string}|{clearStamps:string}
 |{advance:number};
export interface GateRule {verifying:string;ok:string;verifyFrames:number;okFrames:number;dotEvery:number;begin?:Cue[];then:Cue[]}
export interface AckRule {speaker:string;pages:string[];height:number;begin?:Cue[];then:Cue[]}
export type ExitRule={say:{name:string;pages:string[]}}|{react:string;line:StoryLine;cues?:Cue[]}|{gate:GateRule}|{acknowledge:AckRule};
export interface StoryChip {label:string;say?:StoryLine;act?:[noun:string,verb:string];set?:[key:string,value:boolean];cues?:Cue[]}
export interface StoryTarget {label:string;promptH:number;x?:number;bind?:{kind:'rest'|'use'|'exit';id:string;offsetX?:number};card?:string}
export type PingTarget={door:true}|{exit:string}|{target:string}|{device:string};
export interface StoryIntro {pages:string[];touchPages?:string[];consume?:boolean;speaker:string;height:number}
export type ArrivalPage=string|{text:string;rain:boolean}|{companion:true};
/** The first row whose flag `unless` is not set speaks (once: it sets the flags in `set`). */
export interface ArrivalRow {unless?:string;set?:string[];rainThreshold?:number;speaker:string;height:number;pages:ArrivalPage[];touchPages?:ArrivalPage[]}
/** What one scene says and does in one phase of the story (scene.json `phases`); a field here replaces the scene's usual behaviour. */
export interface ScenePhase {
 time?:string;goal?:string;intro?:StoryIntro;ping?:PingTarget;ride?:{mover:string;path:string};arrival?:ArrivalRow[];
 lines?:Record<string,{name?:string;pages:string[]}>;exits?:Record<string,ExitRule>;everyday?:Record<string,StoryChip[]>;targets?:Record<string,StoryTarget>;
 /** Level barriers (engine/level.ts `LevelBarrier`, by the scene's own barrier id) that act differently: an exit's rule shape (`barrierPhaseRule`). */
 barriers?:Record<string,ExitRule>;
}
export interface WashRule {phase?:string;flag?:string;unlessState?:string;tone:'warm'|'cold'}
export interface CardSpec {out:number;card:number;in:number;from:string;to:string;label:string;mid?:Cue[];end?:Cue[]}
/** The existing story tick evaluates ordinary gameplay predicates; cues retain presentation work. */
export interface Trigger {
 id:string;when:Condition;do:Cue[];
 /** Optional presentation timestamp, first stamped while its ordinary watch condition holds. */
 start?:string;watch?:Condition;
}
export interface GoalHint {program:string;exceptScene:string;afterScene:string;afterGoal:string;line:string}
export interface Persona {name:string;calmWeather:boolean;character?:import('../runtime/play-profiles').PlayerCharacter;deck:{files:Record<string,string>;whoami:string}}

// ---------- the gate and the card: how far along are they ----------

/** The gate at `elapsed` frames: which line shows (the dots cycle), whether it says ok, whether it is over. */
export function gateFrame(gate:Pick<GateRule,'verifying'|'ok'|'verifyFrames'|'okFrames'|'dotEvery'>,elapsed:number){
 const ok=elapsed>=gate.verifyFrames,dots='.'.repeat(1+(Math.floor(elapsed/gate.dotEvery)%3)).padEnd(3,' ');
 return{ok,done:elapsed>=gate.verifyFrames+gate.okFrames,text:ok?gate.ok:gate.verifying+dots,bare:ok?gate.ok:gate.verifying};
}
/** The card at `elapsed` frames: how dark the screen is, which clock reading shows and how strongly, which stage, and whether the middle (the dark) has been reached or the whole is over. */
export function cardFrame(card:Pick<CardSpec,'out'|'card'|'in'>,elapsed:number){
 const dark=elapsed<card.out?elapsed/card.out:elapsed<card.out+card.card?1:Math.max(0,1-(elapsed-card.out-card.card)/card.in);
 const showing=elapsed>=card.out&&elapsed<=card.out+card.card,f=(elapsed-card.out)/card.card,fade=showing?Math.min(1,Math.min(f,1-f)*6):0;
 return{dark,showing,fade,reading:(f<0.5?'from':'to')as'from'|'to',stage:(elapsed<card.out?'out':elapsed<card.out+card.card?'card':'in')as'out'|'card'|'in',mid:elapsed>=card.out+card.card/2,done:elapsed>=card.out+card.card+card.in};
}

// ---------- arrival ----------

/** The words a scene says the first time you arrive in a phase: the first row whose `unless` flag is not set; its pages for this input (rain: `rain` pages are the wet or the dry one; `companion`: the companion's greeting, if it has joined). */
export function arrivalFor(rows:readonly ArrivalRow[]|undefined,at:{flags:Readonly<Record<string,boolean>>;touch:boolean;rain:number;companion:string|null}):{set:string[];speaker:string;height:number;pages:string[]}|null{
 const row=rows?.find(r=>r.unless===undefined||!at.flags[r.unless]);
 if(!row)return null;
 const wet=at.rain>(row.rainThreshold??0),pages:string[]=[];
 for(const p of (at.touch?row.touchPages??row.pages:row.pages)){
  if(typeof p==='string')pages.push(p);
  else if('companion'in p){if(at.companion!==null)pages.push(at.companion);}
  else if(p.rain===wet)pages.push(p.text);
 }
 return{set:row.set??[],speaker:row.speaker,height:row.height,pages};
}

/** Clear presentation timestamps in one named group without touching gameplay state. */
export function clearStoryStamps(stamps:Record<string,number>,prefix:string){
 for(const key of Object.keys(stamps))if(key===prefix||key.startsWith(prefix+'.'))delete stamps[key];
}

// ---------- the clock pin ----------

/**
 * What the story does to the city clock this frame, from the phase's own data: `hold` a minute (the scene's time in this phase), keep
 * the minute it is at (pinned, but this scene names no time), or, having held it, `release` it to the minute the release scene names.
 */
export function clockPin(now:{pinned:boolean;minute:number|null;wasPinned:boolean;releaseMinute:number|null}):{kind:'hold';minute:number|null}|{kind:'release';minute:number|null}|{kind:'free'}{
 if(now.pinned)return{kind:'hold',minute:now.minute};
 if(now.wasPinned)return{kind:'release',minute:now.releaseMinute};
 return{kind:'free'};
}

// ---------- attention ----------

/** Standing still long enough (frames of the loop's clock since the player last did anything) points at the next goal. */
export const attentionDue=(clock:number,still:number,after:number)=>clock-still>after;

/**
 * Where the attention ping points: a device (the ping goes to it), or a world x (a train door, an exit, a story target of the scene).
 * `targetX` resolves a story target's id against the scene's own geometry.
 */
export function attentionAim(t:PingTarget,def:{exits:readonly{id:string;action?:string;x:number}[]},playerX:number,targetX:(id:string)=>number|undefined,doors:readonly number[]=[]):{device:string}|{x:number}|null{
 if('device'in t)return{device:t.device};
 let x:number|undefined;
 if('door'in t)x=[...doors].sort((a,b)=>Math.abs(a-playerX)-Math.abs(b-playerX))[0];
 else if('exit'in t)x=def.exits.find(e=>e.id===t.exit)?.x;
 else x=targetX(t.target);
 return x===undefined?null:{x};
}

// ---------- the stage light cue ----------

/** The first wash rule that holds: by phase and a flag, unless the named model state is on. */
export function washTone(rules:readonly WashRule[]|undefined,at:{phase:string;flags:Readonly<Record<string,boolean>>;state:(key:string)=>unknown}):'warm'|'cold'|null{
 for(const r of rules??[]){
  if(r.phase!==undefined&&r.phase!==at.phase)continue;
  if(r.flag!==undefined&&!at.flags[r.flag])continue;
  if(r.unlessState!==undefined&&at.state(r.unlessState))continue;
  return r.tone;
 }
 return null;
}

// ---------- goal hints ----------

/** The HUD's goal line from the hint rules: a program still missing, the earlier goal done, not in the scene it points to. */
export function goalHint(rules:readonly GoalHint[],at:{hackLocked:boolean;scene:string;programs:readonly string[];goalsDone:(scene:string)=>ReadonlySet<string>;goalsLeft:(scene:string)=>boolean}):string|null{
 for(const r of rules){
  if(at.programs.includes(r.program)||at.scene===r.exceptScene||at.hackLocked)continue;
  if(!at.goalsDone(r.afterScene).has(r.afterGoal))continue;
  if(at.scene===r.afterScene&&at.goalsLeft(r.afterScene))continue;
  return r.line;
 }
 return null;
}

// ---------- a level barrier in a phase ----------

/**
 * E at a shut level barrier (prompt `barrier:<id>`) in a phase whose scene has `phases.<p>.barriers.<id>`: that rule replaces
 * the barrier's own access rule for the phase, run by the loop's `storyExit` like an exit's. A joined level's barrier is
 * `zone/id`; its rule is its own zone's (`phaseOf(zone)`). Undefined: not a barrier, already open, or no rule in this phase.
 */
export function barrierPhaseRule(prompt:string,barriers:readonly {id:string;x:number;h:number;zone?:string}[]|undefined,opened:readonly string[],phaseOf:(zone:string|undefined)=>ScenePhase|undefined):{rule:ExitRule;x:number;h:number}|undefined{
 if(!prompt.startsWith('barrier:'))return undefined;
 const id=prompt.slice('barrier:'.length),b=barriers?.find(g=>g.id===id);if(!b||opened.includes(id))return undefined;
 const own=b.zone&&id.startsWith(b.zone+'/')?id.slice(b.zone.length+1):id,rule=phaseOf(b.zone)?.barriers?.[own];
 return rule?{rule,x:b.x,h:b.h}:undefined;
}
/** Whether a barrier's phase rule lets the player through: a gate or an acknowledgment opens it once its beat is over and its `then` cues ran (a refused milestone keeps it shut); a say or a react only speaks, and it stays shut. */
export const barrierRuleOpens=(rule:ExitRule)=>'gate'in rule||'acknowledge'in rule;
