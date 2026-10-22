import baseline from './opening.json';
import {matches,validateGameplay} from '../engine/gameplay/validation';
import {validateGameplayRewards} from '../engine/gameplay/rewards';
import type {Condition,GameplayDefinition} from '../engine/gameplay/types';
import type {Handoff} from '../art/core/timeline';
import {SUDO} from '../runtime/mode';
import {fail,object,fields,text,id,list,bool,num,hm,phaseId,validateCues,cueRefs} from './story-shapes';
import type {CardSpec,Cue,GoalHint,Persona,ScenePhase,StoryTarget,Trigger,WashRule} from './story-rules';
import {characterOf} from '../runtime/play-profiles';
export type {CardSpec,Cue,GoalHint,Persona,ScenePhase,StoryTarget,Trigger,WashRule,ExitRule,StoryChip,PingTarget,StoryIntro,ArrivalRow,ArrivalPage,GateRule,AckRule,Say,StoryLine}from './story-rules';
/** A milestone the story reaches: the name of an entry of `WORKFLOWS` (home, street, flat, slept, uplink, jacked; a second timeline adds its own). */
export type OpeningWorkflow=string;
/** A phase of the story: a key of `PHASES`. */
export type OpeningState=string;
export interface OpeningPhase {hackLocked:boolean;pinned:boolean;resume:{whenFlag?:string;destination:Handoff}[];persona?:Persona}
export interface OpeningPhaseRule {when?:Condition;phase:OpeningState}
/** A sudo LEVELS entry: the opening from one of its points. `reset` scenes start over (the flat as on the first night). */
export interface OpeningLevel {id:string;name:string;flags:string[];reset?:string[];/** A card whose `end` cues run on arrival (the morning's words). */end?:string}
export type OpeningRoles=Record<'home'|'street'|'flat'|'slept'|'uplink'|'jacked',string>;
/** Where the opening begins, where a save with no usable resume point lands, and the scene whose first visit means the opening is behind the save. */
export interface OpeningStart {start:Handoff;fallback:Handoff;settled:string}
export interface OpeningSource {
 version:1;OPENING:OpeningRoles;OPENING_LEVELS:OpeningLevel[];
 PHASES:Record<OpeningState,OpeningPhase>;PHASE_RULES:OpeningPhaseRule[];
 START:OpeningStart;
 /** How long standing still (clock frames) is before the next goal's target pings. */
 ATTENTION:{after:number};
 /** When the story lets go of the city clock, it runs on from the time this scene names in this phase. */
 CLOCK:{release:{phase:OpeningState;scene:string}};
 CARDS:Record<string,CardSpec>;TRIGGERS:Trigger[];GOAL_HINTS:GoalHint[];
 GAMEPLAY:GameplayDefinition;WORKFLOWS:Record<string,string>;
}
export interface OpeningTargetScene {exits:readonly {id:string;x?:number;h?:number}[];rests?:readonly {id:string;x?:number;h?:number}[];uses?:readonly {id:string;x?:number;h?:number}[]}
/** Resolve against the same compiled scene that owns physical interaction geometry. */
export function resolveOpeningTarget(target:StoryTarget,scene:OpeningTargetScene):{x:number;h:number;label:string;promptH:number}|null{if(target.x!==undefined)return{x:target.x,h:0,label:target.label,promptH:target.promptH};const binding=target.bind;if(!binding)return null;const rows=binding.kind==='rest'?scene.rests:binding.kind==='use'?scene.uses:scene.exits,at=rows?.find(r=>r.id===binding.id);if(!at||typeof at.x!=='number')return null;const h=at.h??0;return{x:at.x+(binding.offsetX??0),h,label:target.label,promptH:h+target.promptH};}
interface SceneNoun {id:string;verbs?:readonly string[];mover?:{paths?:Readonly<Record<string,unknown>>}}
interface SceneDevice {id:string;nouns:readonly SceneNoun[]}
/** Supplied only after prospective registry assembly; no registry import or live game dependency. */
export interface OpeningSourceContext {
 scenes:Readonly<Record<string,{exits:readonly {id:string;action?:string;x?:number;h?:number}[];level?:{barriers?:readonly {id:string}[]};rests?:readonly {id:string;x?:number;h?:number}[];people?:readonly {id?:string}[];uses?:readonly {id:string;x?:number;h?:number}[];readables?:readonly {id:string}[];phases?:Readonly<Record<string,ScenePhase>>;wash?:readonly WashRule[];data?:{state:Readonly<Record<string,unknown>>;goals?:readonly {id:string}[];devices:readonly SceneDevice[];nodes?:readonly SceneDevice[]}}>>;
 keyring?:readonly string[];controlled?:readonly string[];programs?:readonly string[];
}
const ROLE_FLAGS={home:'opening:home',street:'opening:street',flat:'opening:flat',slept:'opening:slept',uplink:'opening:uplink',jacked:'opening:jacked'} as const;
const ROOT_FIELDS=['version','OPENING','OPENING_LEVELS','PHASES','PHASE_RULES','START','ATTENTION','CLOCK','CARDS','TRIGGERS','GOAL_HINTS','GAMEPLAY','WORKFLOWS'];
export function validateOpeningSource(value:unknown,context?:OpeningSourceContext):OpeningSource{
 const seen=new Set<object>();const json=(v:unknown,at:string,depth=0):void=>{if(depth>32)fail(at,'depth limit');if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return;if(!v||typeof v!=='object'||seen.has(v))fail(at,'finite acyclic JSON required');if(!Array.isArray(v))object(v,at);const node=v as object;seen.add(node);for(const[k,c]of Object.entries(node)){if(['__proto__','constructor','prototype'].includes(k))fail(at,'reserved key');json(c,at+'/'+k,depth+1);}seen.delete(node);};json(value,'root');if(JSON.stringify(value).length>256000)fail('root','size limit');
 const d=fields(value,'root',ROOT_FIELDS);if(d.version!==1)fail('version','version 1 required');
 const roles=fields(d.OPENING,'OPENING',Object.keys(ROLE_FLAGS));for(const[k,v]of Object.entries(roles))id(v,'OPENING/'+k);
 const knownFlags=new Set<string>(Object.values(roles));if(knownFlags.size!==Object.keys(ROLE_FLAGS).length)fail('OPENING','distinct phase-role flags required');
 const gameplay=validateGameplay(d.GAMEPLAY),workflows=object(d.WORKFLOWS,'WORKFLOWS');
 for(const flag of knownFlags)if(!gameplay.flags.includes(flag))fail('GAMEPLAY/flags','opening phase role references missing flag '+flag);
 for(const flag of gameplay.flags)knownFlags.add(flag);
 if(gameplay.native||gameplay.checkpoint)fail('GAMEPLAY','story workflows do not own physical scene bindings or checkpoint policies');
 if(!('home'in workflows))fail('WORKFLOWS','the home milestone (a new game) is required');
 if(Object.keys(workflows).length>32)fail('WORKFLOWS','milestone limit');
 for(const[name,command]of Object.entries(workflows)){id(name,'WORKFLOWS/'+name);id(command,'WORKFLOWS/'+name);const c=gameplay.commands[command];if(!c||c.sources.length!==1||c.sources[0]!=='system')fail('WORKFLOWS/'+name,'system command required');}
 for(const[key,c]of Object.entries(gameplay.commands))for(const action of c.actions)if('wire'in action||'trace'in action)fail('GAMEPLAY/commands/'+key,'scene domain actions require a scene host');
 if(context?.keyring)validateGameplayRewards(gameplay,{keyring:new Set(context.keyring),controlled:new Set(context.controlled??[])});

 // the phases: data-defined ids, each with its story-wide metadata (hack, clock pin, resume, persona)
 const metadata=object(d.PHASES,'PHASES'),phaseKeys=Object.keys(metadata);if(!phaseKeys.length||phaseKeys.length>16)fail('PHASES','one to sixteen phases required');
 const phases=new Set(phaseKeys);
 const phaseRules=list(d.PHASE_RULES,'PHASE_RULES',32);if(!phaseRules.length)fail('PHASE_RULES','ordered rules and final fallback required');
 // Reuse the common condition validator/evaluator. This flags-only lifecycle context does not
 // expose inventory, time, player or scene scalars; the editor uses the same flags-only controls.
 const flagCondition=(value:Condition):boolean=>'flag'in value||'not'in value&&flagCondition(value.not)||'all'in value&&value.all.every(flagCondition)||'any'in value&&value.any.every(flagCondition);
 for(const[index,value]of phaseRules.entries()){
  const at='PHASE_RULES/'+index,row=fields(value,at,['when','phase'],['phase']);if(typeof row.phase!=='string'||!phases.has(row.phase))fail(at,'unknown phase');
  if(row.when===undefined){if(index!==phaseRules.length-1)fail(at,'fallback must be last');}
  else{if(index===phaseRules.length-1)fail(at,'final fallback required');validateGameplay({version:1,flags:[...knownFlags],items:[],events:[],commands:{phase:{sources:['system'],when:row.when,actions:[]}},reactions:[],conversations:{}});if(!flagCondition(row.when))fail(at,'opening flags only');}
 }
 const scene=(v:unknown,at:string)=>{id(v,at);if(context&&!Object.prototype.hasOwnProperty.call(context.scenes,String(v)))fail(at,'unknown scene');return String(v);};
 const destination=(v:unknown,at:string)=>{const r=fields(v,at,['scene','entrance'],['scene']);const s=scene(r.scene,at+'/scene');if(r.entrance!==undefined){id(r.entrance,at+'/entrance');if(context&&!context.scenes[s].exits.some(e=>e.id===r.entrance))fail(at,'unknown arrival');}};
 const devices=(s:string)=>context?[...context.scenes[s].data?.devices??[],...context.scenes[s].data?.nodes??[]]:[];
 const device=(s:string,name:unknown,at:string)=>{id(name,at);const found=devices(s).find(d=>d.id===name);if(context&&!found)fail(at,'unknown device or node');return found;};
 for(const[p,v]of Object.entries(metadata)){
  phaseId(p,'PHASES/'+p);
  const r=fields(v,'PHASES/'+p,['hackLocked','pinned','resume','persona'],['hackLocked','pinned','resume']);for(const k of ['hackLocked','pinned'])bool(r[k],'PHASES/'+p+'/'+k);
  const rules=list(r.resume,'PHASES/'+p+'/resume',8);let fallback=false;for(const[index,rule]of rules.entries()){const a='PHASES/'+p+'/resume/'+index,q=fields(rule,a,['whenFlag','destination'],['destination']);if(fallback)fail(a,'unreachable resume rule after fallback');if(q.whenFlag!==undefined){if(!knownFlags.has(q.whenFlag))fail(a,'unknown opening flag');}else fallback=true;destination(q.destination,a);}
  if(r.persona!==undefined){const a='PHASES/'+p+'/persona',q=fields(r.persona,a,['name','calmWeather','deck','character'],['name','calmWeather','deck']);if(q.character!==undefined)characterOf(q.character,a+'/character');text(q.name,a+'/name');bool(q.calmWeather,a+'/calmWeather');const deck=fields(q.deck,a+'/deck',['files','whoami']);text(deck.whoami,a+'/deck/whoami');const files=object(deck.files,a+'/deck/files');if(Object.keys(files).length>32)fail(a+'/deck/files','file limit');for(const[k,t]of Object.entries(files)){id(k,a+'/deck/file');text(t,a+'/deck/'+k);}}
 }
 // a phase with resume rules needs a fallback (the last phase, which may have none, is the story's end)
 for(const[p,v]of Object.entries(metadata)){const rules=(v as {resume:{whenFlag?:string}[]}).resume;if(rules.length&&!rules.some(r=>r.whenFlag===undefined))fail('PHASES/'+p,'resume fallback required');}
 const levels=list(d.OPENING_LEVELS,'OPENING_LEVELS',16),levelIds=new Set();for(const l of levels){const r=fields(l,'OPENING_LEVELS',['id','name','flags','reset','end'],['id','name','flags']);id(r.id,'level/id');text(r.name,'level/name');if(r.reset!==undefined)for(const s of list(r.reset,'level/reset',8))scene(s,'level/reset');if(levelIds.has(r.id))fail('levels','duplicate id');levelIds.add(r.id);for(const flag of list(r.flags,'level/flags',6))if(!knownFlags.has(flag))fail('level/flags','unknown opening flag');}

 const start=fields(d.START,'START',['start','fallback','settled']);for(const k of['start','fallback'])destination(start[k],'START/'+k);scene(start.settled,'START/settled');
 const attention=fields(d.ATTENTION,'ATTENTION',['after']);num(attention.after,'ATTENTION/after',1);
 const clock=fields(d.CLOCK,'CLOCK',['release']),release=fields(clock.release,'CLOCK/release',['phase','scene']);if(typeof release.phase!=='string'||!phases.has(release.phase))fail('CLOCK/release','unknown phase');scene(release.scene,'CLOCK/release/scene');

 // cues name milestones, scenes and counters; counters are the loop's own numbers, named here and nowhere else declared
 const checkCues=(cues:Cue[],at:string)=>{const refs=cueRefs(cues);for(const m of refs.milestones)if(!Object.prototype.hasOwnProperty.call(workflows,m))fail(at,'unknown milestone '+m);for(const s of refs.scenes)scene(s,at);};
 const cards=object(d.CARDS,'CARDS');if(Object.keys(cards).length>16)fail('CARDS','card limit');
 for(const[cardId,v]of Object.entries(cards)){
  id(cardId,'CARDS/'+cardId);const a='CARDS/'+cardId,c=fields(v,a,['out','card','in','from','to','label','mid','end'],['out','card','in','from','to','label']);
  for(const k of['out','card','in'])num(c[k],a+'/'+k,1,100000);hm(c.from,a+'/from');hm(c.to,a+'/to');text(c.label,a+'/label');
  for(const k of['mid','end'])if(c[k]!==undefined){validateCues(c[k],a+'/'+k);checkCues(c[k],a+'/'+k);}
 }
 for(const l of levels)if((l as {end?:string}).end!==undefined&&!Object.prototype.hasOwnProperty.call(cards,(l as {end:string}).end))fail('OPENING_LEVELS/'+(l as {id:string}).id,'unknown card');
 const triggers=list(d.TRIGGERS,'TRIGGERS',16),triggerIds=new Set<string>();
 for(const[index,v]of triggers.entries()){
  const a='TRIGGERS/'+index,t=fields(v,a,['id','phase','scene','viewing','start','once','quiet','when','do'],['id','phase','scene','do']);
  id(t.id,a+'/id');if(triggerIds.has(t.id))fail(a,'duplicate trigger id');triggerIds.add(t.id);
  if(typeof t.phase!=='string'||!phases.has(t.phase))fail(a+'/phase','unknown phase');const s=scene(t.scene,a+'/scene');
  if(t.viewing!==undefined)device(s,t.viewing,a+'/viewing');
  if(t.start!==undefined)id(t.start,a+'/start');if(t.once!==undefined)id(t.once,a+'/once');
  if(t.quiet!==undefined){const q=fields(t.quiet,a+'/quiet',['bubble','popup','since','frames']);if(q.bubble!==true||q.popup!==true)fail(a+'/quiet','bubble and popup must be true');id(q.since,a+'/quiet/since');num(q.frames,a+'/quiet/frames',0,1000000);}
  if(t.when!==undefined){const tests=list(t.when,a+'/when',8);if(!tests.length)fail(a+'/when','at least one test required');for(const[j,test]of tests.entries()){const b=a+'/when/'+j,o=object(test,b);if('counter'in o){fields(o,b,['counter','atLeast']);id(o.counter,b);num(o.atLeast,b+'/atLeast',1,1000000);}else{fields(o,b,['elapsed','frames']);id(o.elapsed,b);num(o.frames,b+'/frames',0,1000000);if(t.start===undefined&&o.elapsed!==t.start)fail(b,'an elapsed test needs a start counter that is stamped (set start, or stamp it in a cue)');}}}
  validateCues(t.do,a+'/do');checkCues(t.do,a+'/do');
 }
 const hints=list(d.GOAL_HINTS,'GOAL_HINTS',8);
 for(const[index,v]of hints.entries()){
  const a='GOAL_HINTS/'+index,h=fields(v,a,['program','exceptScene','afterScene','afterGoal','line']);id(h.program,a+'/program');if(context?.programs&&!context.programs.includes(h.program))fail(a+'/program','unknown program');
  scene(h.exceptScene,a+'/exceptScene');const after=scene(h.afterScene,a+'/afterScene');id(h.afterGoal,a+'/afterGoal');if(context&&!context.scenes[after].data?.goals?.some(g=>g.id===h.afterGoal))fail(a+'/afterGoal','unknown completed native goal');text(h.line,a+'/line');
 }

 // what each scene says and does in each phase (scene.json `phases`, `wash`): the scene document checked its shape; here the names are real
 if(context){
  const targetsOf=(phase?:ScenePhase)=>phase?.targets??{};
  for(const[sceneId,def]of Object.entries(context.scenes)){
   for(const[p,ph]of Object.entries(def.phases??{})){
    const at='scenes/'+sceneId+'/phases/'+p;if(!phases.has(p))fail(at,'unknown phase');
    const known=(name:string)=>[...def.people??[],...def.uses??[],...def.readables??[],...def.exits,...devices(sceneId)].some(e=>e.id===name);
    for(const key of Object.keys(ph.lines??{}))if(!known(key))fail(at+'/lines/'+key,'unknown person/readable/device/exit');
    for(const[key,rule]of Object.entries(ph.exits??{})){
     const a=at+'/exits/'+key;if(!def.exits.some(e=>e.id===key))fail(a,'unknown exit');
     if('react'in rule){device(sceneId,rule.react,a);checkCues(rule.cues??[],a);}
     else if('gate'in rule){checkCues([...rule.gate.begin??[],...rule.gate.then],a);}
     else if('acknowledge'in rule){checkCues([...rule.acknowledge.begin??[],...rule.acknowledge.then],a);}
    }
    for(const[key,rule]of Object.entries(ph.barriers??{})){
     const a=at+'/barriers/'+key;if(!def.level?.barriers?.some(b=>b.id===key))fail(a,'unknown barrier');
     if('react'in rule){device(sceneId,rule.react,a);checkCues(rule.cues??[],a);}
     else if('gate'in rule){checkCues([...rule.gate.begin??[],...rule.gate.then],a);}
     else if('acknowledge'in rule){checkCues([...rule.acknowledge.begin??[],...rule.acknowledge.then],a);}
    }
    for(const[key,chips]of Object.entries(ph.everyday??{})){
     const dev=device(sceneId,key,at+'/everyday/'+key);
     for(const[i,chip]of chips.entries()){
      const a=at+'/everyday/'+key+'/'+i;
      if(chip.act&&!dev?.nouns.some(n=>n.id===chip.act![0]&&n.verbs?.includes(chip.act![1])))fail(a,'unknown native noun verb');
      if(chip.set&&typeof def.data?.state[chip.set[0]]!=='boolean')fail(a,'unknown boolean state');
      checkCues(chip.cues??[],a);
     }
    }
    for(const[key,target]of Object.entries(targetsOf(ph))){
     const a=at+'/targets/'+key;
     if(!resolveOpeningTarget(target,def))fail(a,'missing scene binding');
     if(target.card!==undefined&&!Object.prototype.hasOwnProperty.call(cards,target.card))fail(a,'unknown card');
    }
    const ping=ph.ping;
    if(ping){
     const a=at+'/ping';
     if('door'in ping){if(!def.exits.some(e=>e.action==='out'))fail(a,'train door required');}
     else if('device'in ping)device(sceneId,ping.device,a);
     else if('exit'in ping){if(!def.exits.some(e=>e.id===ping.exit))fail(a,'unknown exit');}
     else if(!targetsOf(ph)[ping.target])fail(a,'unknown authored story target');
    }
    if(ph.ride!==undefined){const[dev,noun]=ph.ride.mover.split('.'),paths=devices(sceneId).find(dv=>dv.id===dev)?.nouns.find(n=>n.id===noun)?.mover?.paths;if(!paths||!Object.prototype.hasOwnProperty.call(paths,ph.ride.path))fail(at+'/ride','unknown mover path');}
   }
   for(const[i,rule]of (def.wash??[]).entries()){
    const a='scenes/'+sceneId+'/wash/'+i;if(rule.phase!==undefined&&!phases.has(rule.phase))fail(a,'unknown phase');
    if(rule.unlessState!==undefined&&!(def.data&&Object.prototype.hasOwnProperty.call(def.data.state,rule.unlessState)))fail(a,'unknown state');
   }
  }
 }
 return structuredClone(d) as OpeningSource;
}
type Flags=Readonly<Record<string,boolean>>;
export function createOpeningModel(value:unknown,context?:OpeningSourceContext){
 const source=validateOpeningSource(value,context);
 const openingState=(f:Flags):OpeningState=>source.PHASE_RULES.find(row=>matches(row.when,{flags:f,items:{},tokens:0}))!.phase;
 const openingResumeDestination=(f:Flags)=>{const rule=source.PHASES[openingState(f)].resume.find(r=>!r.whenFlag||f[r.whenFlag]);return rule?{...rule.destination}:null;};
 return{...source,source,resolveTarget:resolveOpeningTarget,OPENING_FLAGS:[...source.GAMEPLAY.flags],
 phaseIds:Object.keys(source.PHASES),openingState,openingResumeDestination,openingResume:(f:Flags)=>openingResumeDestination(f)?.scene??null,
 openingLevel:(id:string)=>source.OPENING_LEVELS.find(l=>l.id===id),hackLocked:(f:Flags)=>SUDO?false:source.PHASES[openingState(f)].hackLocked,
 /** Who you are while the phase has a persona (the courier before the deletion): its name, deck, and whether the weather is kept calm. */
 persona:(f:Flags):Persona|undefined=>source.PHASES[openingState(f)].persona,
 isPinned:(f:Flags)=>source.PHASES[openingState(f)].pinned};
}
export type OpeningStoryModel=ReturnType<typeof createOpeningModel>;
export const openingStoryModel=createOpeningModel(baseline);
