/**
 * The story's generic primitives. There is no story runtime: these are source types and PURE functions that the one game loop
 * (runtime/game.ts `stepLoop`) and the scene model call. Nothing here keeps state, schedules, listens or advances time; the loop
 * owns the few numbers they read (its frame clock, the counters it keeps, the player's stillness) and applies what they return.
 *
 *  - a timed checkpoint gate (`GateRule`, `gateFrame`): an exit that says "verifying" for a beat, then "ok", then lets you through;
 *  - an acknowledgment exit (`AckRule`): a device speaks, the player continues, then the milestone runs;
 *  - a card transition (`CardSpec`, `cardFrame`): fade out, a card with two clock readings, fade in; shared by the sleep and
 *    "wait until ...";
 *  - cues (`Cue`): the finite list of things a gate, an acknowledgment, a card or a trigger makes happen (a milestone command, speech,
 *    deck lines, a sound, a restaged scene, a counter, the clock jumping ahead);
 *  - counters and triggers (`Trigger`, `triggerFires`): a workflow that fires when named counters, elapsed frames and the scene's
 *    quiet say so (the morning's message, jacking in);
 *  - the clock pin rule (`clockPin`): what the story holds the city clock at, and what it lets go to;
 *  - the attention rule (`attentionDue`, `attentionAim`): standing still a while points at the next goal;
 *  - the stage light cue (`washTone`): the flat's warm and cold wash;
 *  - goal hints (`goalHint`): a sentence for the HUD's goal line when a program is still missing.
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
 |{counter:{id:string;add?:number;stamp?:true}|{prefix:string;reset:true}}
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
}
export interface WashRule {phase?:string;flag?:string;unlessState?:string;tone:'warm'|'cold'}
export interface CardSpec {out:number;card:number;in:number;from:string;to:string;label:string;mid?:Cue[];end?:Cue[]}
export type CounterTest={counter:string;atLeast:number}|{elapsed:string;frames:number};
export interface Trigger {
 id:string;phase:string;scene:string;
 /** A device whose schematic must be open (jacking in). */
 viewing?:string;
 /** Stamped with the frame clock the first frame the trigger is watching, so `elapsed` has a start. */
 start?:string;
 /** A counter at 1 or more: it has fired. */
 once?:string;
 quiet?:{bubble:true;popup:true;since:string;frames:number};
 /** Any one of these fires it; none: it fires whenever the rest holds. */
 when?:CounterTest[];
 do:Cue[];
}
export interface GoalHint {program:string;exceptScene:string;afterScene:string;afterGoal:string;line:string}
export interface Persona {name:string;calmWeather:boolean;deck:{files:Record<string,string>;whoami:string}}

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

// ---------- counters and triggers ----------

export interface TriggerContext {phase:string;scene:string;clock:number;counters:Readonly<Record<string,number>>;bubble:boolean;popup:boolean;viewing:string|null}
/** Does this trigger fire now? Pure: the loop stamps `start` and runs `do`. */
export function triggerFires(t:Trigger,c:TriggerContext):boolean{
 if(c.phase!==t.phase||c.scene!==t.scene)return false;
 if(t.viewing!==undefined&&c.viewing!==t.viewing)return false;
 if(t.once!==undefined&&(c.counters[t.once]??0)>=1)return false;
 if(t.quiet){if(c.bubble||c.popup)return false;const last=c.counters[t.quiet.since];if(last!==undefined&&!(c.clock-last>t.quiet.frames))return false;}
 if(!t.when)return true;
 return t.when.some(test=>'counter'in test?(c.counters[test.counter]??0)>=test.atLeast:c.counters[test.elapsed]!==undefined&&c.clock-c.counters[test.elapsed]>test.frames);
}
/** The triggers that need a start stamp this frame: watching (phase and scene hold), start counter not yet set. */
export function triggerStarts(triggers:readonly Trigger[],phase:string,scene:string,counters:Readonly<Record<string,number>>):string[]{
 return triggers.filter(t=>t.start!==undefined&&t.phase===phase&&t.scene===scene&&counters[t.start]===undefined).map(t=>t.start!);
}
/** Apply a counter cue to a counter record (the loop's own); returns the new record's change. `now` is the frame clock. */
export function applyCounter(counters:Record<string,number>,op:Extract<Cue,{counter:unknown}>['counter'],now:number){
 if('prefix'in op){for(const k of Object.keys(counters))if(k===op.prefix||k.startsWith(op.prefix+'.'))delete counters[k];return;}
 counters[op.id]=op.stamp?now:(counters[op.id]??0)+(op.add??1);
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
export function attentionAim(t:PingTarget,def:{exits:readonly{id:string;action?:string;x:number}[]},playerX:number,targetX:(id:string)=>number|undefined):{device:string}|{x:number}|null{
 if('device'in t)return{device:t.device};
 let x:number|undefined;
 if('door'in t)x=def.exits.filter(e=>e.action==='out').map(e=>e.x).sort((a,b)=>Math.abs(a-playerX)-Math.abs(b-playerX))[0];
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
