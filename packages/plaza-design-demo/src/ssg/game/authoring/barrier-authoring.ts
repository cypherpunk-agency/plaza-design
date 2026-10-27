import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import {pendingNetworkContext} from './pending-network';
import {gameplayScene} from './gameplay-scenes';
import {barrierAccess,conditionNames} from '../world/access';
import {activeSharedState} from '../engine/gameplay/shared-state';
import {barrierRuleOpens,type ExitRule,type ScenePhase} from '../story/story-rules';
import type {LevelBarrier} from '../engine/level';
import type {Condition,GameplayDefinition,GameplayState} from '../engine/gameplay/types';
import type {ChunkDocument} from '../art';
import type {AssetInstance} from '../art/core/composition';
import {SCENES} from '../scenes';

/**
 * A level barrier's access rule in the composer's inspector (docs/design/SEAMLESS-WORLD.md §6.6): the rule as a sentence,
 * typed pickers for its key chip (the pending keyring), its flag (the flags the sources declare) and an optional `when`
 * condition (the shared gameplay condition picker), its refusal; a Test the rule fixture that runs world/access.ts `barrierAccess`
 * (or the phase rule that replaces it, story-rules.ts `barrierRuleOpens`) without Play; the phase rules that apply
 * (edited in Scene › Story phases); and warnings for a rule that can never pass (§6.8: listed, never blocking). Every
 * edit is one ComposerModel history step of the composition holding the barrier.
 */

/** What a barrier's rule reads from its instance's props (the same fields engine/level.ts `compileLevel` reads). */
export type BarrierRule=Pick<LevelBarrier,'key'|'flag'|'when'|'refuse'>;
export function barrierRule(props:Readonly<Record<string,unknown>>):BarrierRule{
 const key=String(props.key??'').trim(),flag=String(props.flag??'').trim(),when=props.when&&typeof props.when==='object'?props.when as Condition:undefined;
 return {...(key?{key}:{}),...(flag?{flag}:{}),...(when?{when}:{}),refuse:String(props.refuse??'').trim()||'ACCESS DENIED.'};
}
/** The words for a key chip: its label (upper case), or its id when the keyring does not know it. */
export const keyWord=(key:string,keyring?:ReadonlyMap<string,{label:string}>)=>(keyring?.get(key)?.label??key).toUpperCase();

/** A gameplay condition as words. */
export function conditionSentence(c:Condition|undefined,keyring?:ReadonlyMap<string,{label:string}>):string{
 if(!c)return 'always';
 if('flag'in c)return 'flag '+c.flag+(c.is===false?' is not set':' is set');
 if('item'in c)return 'you hold '+(c.atLeast===1?'a':c.atLeast+' ×')+' '+c.item;
 if('tokensAtLeast'in c)return 'you have '+c.tokensAtLeast+' tokens or more';
 if('player'in c){const p=c.player;if('field'in p)return p.field==='handle'?'your handle is “'+p.is+'”':p.is?'you can jump':'you cannot jump';
  const member=typeof p.contains==='string'?p.contains:undefined;return p.collection==='keyring'?member?'you carry '+keyWord(member,keyring):'you carry any key chip':member?'you control '+member:'you control any node';}
 if('time'in c)return 'it is between '+c.time.from+' and '+c.time.to+(c.time.days?.length?' on days '+c.time.days.join(','):'');
 if('weather'in c)return 'the weather is '+c.weather.join(' or ');
 if('compare'in c){const side=(r:unknown)=>JSON.stringify((r as {literal?:unknown}).literal??r);return side(c.compare.left)+' '+c.compare.op+' '+side(c.compare.right);}
 if('state'in c)return 'state '+c.state+' is '+JSON.stringify(c.is);
 if('objective'in c)return 'objective '+c.objective+' is current';
 if('not'in c)return 'not ('+conditionSentence(c.not,keyring)+')';
 const all='all'in c,rows=(all?c.all:c.any).map(x=>conditionSentence(x,keyring));
 return rows.length>1?'('+rows.join(all?' and ':' or ')+')':rows[0]??'always';
}
/** "Opens when you carry UPLINK · Refuses with: “…”" (one sentence, the clauses in the order barrierAccess asks them). */
export function barrierSentence(rule:BarrierRule,keyring?:ReadonlyMap<string,{label:string}>){
 const parts=[...(rule.key?['when you carry '+keyWord(rule.key,keyring)]:[]),...(rule.flag?['once flag '+rule.flag+' is set']:[]),...(rule.when?['while '+conditionSentence(rule.when,keyring)]:[])];
 if(!parts.length)return 'Opens for anyone: it has no rule.';
 const opens='Opens '+(parts.length===1?parts[0]:parts.slice(0,-1).join(', ')+' and '+parts.at(-1));
 return opens+' · Refuses with: “'+rule.refuse+'”';
}
/** A phase rule as words: "verify 150 frames, ok 50, milestone street, then it opens". */
export function phaseRuleSentence(rule:ExitRule){
 const milestones=(cues:readonly unknown[]=[])=>cues.flatMap(c=>c&&typeof c==='object'&&'milestone'in c?[String((c as {milestone:string}).milestone)]:[]);
 if('gate'in rule){const g=rule.gate,m=milestones(g.then);return 'verify '+g.verifyFrames+' frames, ok '+g.okFrames+(m.length?', milestone '+m.join(', '):'')+', then it opens';}
 if('acknowledge'in rule){const m=milestones(rule.acknowledge.then);return rule.acknowledge.speaker+' acknowledges'+(m.length?', milestone '+m.join(', '):'')+', then it opens';}
 if('say'in rule)return rule.say.name+' says “'+rule.say.pages[0]+'”; it stays shut';
 return rule.react+' answers “'+rule.line[1]+'”; it stays shut';
}

/** A Test the rule fixture: which chips are carried, which flags set, which items held; the rest of the state is a fixed sample. */
export interface BarrierFixture {keys:readonly string[];flags:Readonly<Record<string,boolean>>;items?:Readonly<Record<string,number>>}
export const FIXTURE_WORLD={day:1,minute:12*60,weather:'clear'} as const;
/** The state Test the rule evaluates against: the fixture's flags, items and chips; no tokens; noon on day 1, clear. */
export function fixtureState(f:BarrierFixture):GameplayState{
 return {flags:{...f.flags},items:{...f.items},tokens:0,player:{handle:'',jump:false,controlled:[],keyring:[...f.keys]},world:{...FIXTURE_WORLD}};
}
/**
 * What E at the barrier would do with this fixture: the phase rule when one applies (it replaces the barrier's rule), or
 * the barrier's own rule through world/access.ts `barrierAccess`. Pure: nothing is committed, nothing is played.
 */
export function tryBarrier(rule:BarrierRule,fixture:BarrierFixture,phase?:{id:string;rule:ExitRule}):{opens:boolean;text:string}{
 if(phase){const opens=barrierRuleOpens(phase.rule);return {opens,text:'In phase '+phase.id+': '+phaseRuleSentence(phase.rule)+'.'};}
 const result=barrierAccess(rule,fixture.flags,fixture.keys,fixtureState(fixture));
 return result.ok?{opens:true,text:'Opens'}:{opens:false,text:'Refuses: “'+result.reason+'”'};
}

/** What the sources declare and set, for the pickers and the warnings: the keyring, the declared flags and items, the flags something sets. */
export interface BarrierVocabulary {keyring:ReadonlyMap<string,{label:string}>;flags:ReadonlySet<string>;items:ReadonlySet<string>;setFlags:ReadonlySet<string>}
const isGameplay=(v:unknown):v is GameplayDefinition=>!!v&&typeof v==='object'&&(v as GameplayDefinition).version===1&&Array.isArray((v as GameplayDefinition).flags)&&Array.isArray((v as GameplayDefinition).items)&&!!(v as GameplayDefinition).commands;
/**
 * Declared flags and items: every gameplay definition in the pending documents (scene, story and catalogue ones, at any
 * depth) and the registered scenes' own. Set flags: a gameplay `{flag, value: true}` action, an exit's `sets`, an
 * an arrival row's `set`, an opening level's `flags`. Code may set others, so a flag missing here is a warning.
 */
export function barrierVocabulary(documents:ReadonlyMap<string,unknown>):BarrierVocabulary{
 const flags=new Set<string>(),items=new Set<string>(),setFlags=new Set<string>(),seen=new Set<unknown>();
 const walk=(v:unknown,key='',depth=0):void=>{
  if(!v||typeof v!=='object'||seen.has(v)||depth>40)return;seen.add(v);
  if(Array.isArray(v)){if((key==='set'||key==='flags')&&v.every(x=>typeof x==='string'))v.forEach(f=>setFlags.add(f));v.forEach(x=>walk(x,'',depth+1));return;}
  const r=v as Record<string,unknown>;
  if(isGameplay(r)){r.flags.forEach(f=>flags.add(f));r.items.forEach(i=>items.add(i));}
  if(typeof r.flag==='string'&&r.value===true)setFlags.add(r.flag);
  if(typeof r.sets==='string')setFlags.add(r.sets);
  for(const[k,c]of Object.entries(r))if(k!=='flags'||!isGameplay(r))walk(c,k,depth+1);
 };
 for(const v of documents.values())walk(v);
 for(const s of Object.values(SCENES))if(s.gameplay){s.gameplay.flags.forEach(f=>flags.add(f));s.gameplay.items.forEach(i=>items.add(i));walk(s.gameplay);}
 let keyring:ReadonlyMap<string,{label:string}>=new Map();try{keyring=pendingNetworkContext(documents).keyring;}catch{/* an invalid network is reported by its own document */}
 return {keyring,flags,items,setFlags};
}
/** The flags a condition needs set for it to hold (its own `flag`, and those of every `all` row; not under `any` or `not`). */
const requiredFlags=(c:Condition|undefined):string[]=>!c?[]:'flag'in c?(c.is===false?[]:[c.flag]):'all'in c?c.all.flatMap(requiredFlags):[];
/** §6.8 warnings: a barrier whose rule can never pass, as far as the sources tell. Listed, never blocking. */
export function barrierProblems(rule:BarrierRule,v:BarrierVocabulary):string[]{
 const out:string[]=[];
 if(rule.key&&!v.keyring.has(rule.key))out.push('Never opens: no keyring chip “'+rule.key+'” exists.');
 const flag=(f:string,where:string)=>{if(!v.flags.has(f))out.push('Never opens: no gameplay source declares flag “'+f+'”'+where+'.');else if(!v.setFlags.has(f))out.push('May never open: nothing in the sources sets flag “'+f+'”'+where+' (code may).');};
 if(rule.flag)flag(rule.flag,'');
 if(rule.when){
  const names=conditionNames(rule.when),required=requiredFlags(rule.when);
  for(const f of names.flags)if(required.includes(f))flag(f,' (its condition)');else if(!v.flags.has(f))out.push('Its condition names flag “'+f+'”, which no gameplay source declares.');
  for(const i of names.items)if(!v.items.has(i))out.push('Its condition names item “'+i+'”, which no gameplay source declares.');
 }
 return out;
}

/** Find an instance by id in a composition (at any depth). */
function findInstance(nodes:readonly AssetInstance[],id:string):AssetInstance|undefined{for(const n of nodes){if(n.id===id)return n;const c=n.children&&findInstance(n.children,id);if(c)return c;}return undefined;}
/** The scene's story phases from its pending scene document (none: the scene has no scene document). */
function scenePhases(documents:readonly {id:string;value:unknown}[],scene:string):Readonly<Record<string,ScenePhase>>{
 try{const id=gameplayScene(scene,documents).prefix+'-scene';return ((documents.find(d=>d.id===id)?.value as {phases?:Record<string,ScenePhase>}|undefined)?.phases)??{};}catch{return {};}
}

export interface BarrierAuthoringOptions {scene:string;document:string;instance:string}
export function mountBarrierAuthoring(host:HTMLElement,context:WorkbenchContext,options:BarrierAuthoringOptions):WorkbenchHandle{
 const api=context.authoring!;let disposed=false;
 const error=document.createElement('p');error.setAttribute('role','alert');const form=new TypedForm(e=>{error.textContent=e instanceof Error?e.message:String(e);});
 // Test the rule: a disposable fixture kept across refreshes (never a source edit)
 const fixture={keys:new Set<string>(),flags:new Set<string>(),items:new Set<string>(),phase:''};
 const live=()=>context.documents.map(d=>({id:d.id,value:api.get(d.id).value}));
 const read=()=>{const c=api.get(options.document).value as ChunkDocument;return findInstance(c.instances,options.instance);};
 function editProps(label:string,change:(props:Record<string,unknown>)=>void){
  const value=structuredClone(api.get(options.document).value) as ChunkDocument,node=findInstance(value.instances,options.instance);
  if(!node)throw new Error('The barrier '+options.instance+' is no longer in '+options.document);
  change(node.props as Record<string,unknown>);api.edit(options.document,label,value);error.textContent='';
 }
 const para=(text:string,name?:string,cls?:string)=>{const p=document.createElement('p');p.textContent=text;if(name)p.setAttribute('aria-label',name);if(cls)p.className=cls;host.append(p);return p;};
 const heading=(text:string)=>{const h=document.createElement('h3');h.textContent=text;host.append(h);};
 function picker(name:string,choices:readonly {value:string;label:string}[],value:string,edit:(v:string)=>void){
  const input=document.createElement('select');for(const c of choices){const o=document.createElement('option');o.value=c.value;o.textContent=c.label;input.append(o);}
  input.value=value;input.onchange=()=>form.run(()=>edit(input.value));form.field(host,name,input);
 }
 function render(){
  if(disposed)return;host.replaceChildren(error);
  const node=read();if(!node){para('This barrier is no longer in the scene.');return;}
  const docs=live(),values=new Map(docs.map(d=>[d.id,d.value])),vocab=barrierVocabulary(values),rule=barrierRule(node.props as Record<string,unknown>);
  // the rule first, in large type: this tab opens first when a barrier is selected
  const top=document.createElement('div');top.className='barrier-head';host.append(top);
  const title=document.createElement('h3');title.textContent='Access · when '+options.instance+' opens';top.append(title);
  const sentence=document.createElement('p');sentence.className='barrier-rule';sentence.textContent=barrierSentence(rule,vocab.keyring);sentence.setAttribute('aria-label','Barrier rule');top.append(sentence);
  heading('What it needs');
  para('Leave a picker empty when the barrier does not need it. Every rule that is set must pass.','','muted');
  const keys=[...vocab.keyring.entries()].sort(([a],[b])=>a.localeCompare(b));
  picker('Needs key chip',[{value:'',label:'No key chip'},...keys.map(([id,k])=>({value:id,label:k.label.toUpperCase()+' · '+id})),...(rule.key&&!vocab.keyring.has(rule.key)?[{value:rule.key,label:rule.key+' (unknown)'}]:[])],rule.key??'',key=>editProps(key?'Barrier key '+key:'Remove barrier key',p=>{p.key=key;}));
  const flags=[...vocab.flags].sort();
  picker('Needs flag',[{value:'',label:'No flag'},...flags.map(f=>({value:f,label:f})),...(rule.flag&&!vocab.flags.has(rule.flag)?[{value:rule.flag,label:rule.flag+' (undeclared)'}]:[])],rule.flag??'',flag=>editProps(flag?'Barrier flag '+flag:'Remove barrier flag',p=>{p.flag=flag;}));
  // the shared gameplay condition picker, over what a barrier may read (the world-level shared state, but no scene's own state, queries or objective)
  const names=conditionNames(rule.when),shared=((values.get('state-owners')??activeSharedState()) as Pick<GameplayDefinition,'state'>|undefined)?.state,doc:GameplayDefinition={version:1,flags:[...new Set([...flags,...names.flags])],items:[...new Set([...vocab.items,...names.items])].sort(),...(shared&&Object.keys(shared).length?{state:shared}:{}),events:[],commands:{},reactions:[],conversations:{}};
  form.allowObjectiveContext=false;form.prefix='Only while ';
  form.condition(host,'Only while',rule.when,when=>editProps(when?'Barrier condition':'Remove barrier condition',p=>{p.when=(when??null) as unknown;}),doc);
  form.prefix=undefined;
  form.text(host,'Refuses with',rule.refuse,refuse=>editProps('Barrier refusal',p=>{p.refuse=refuse;}));

  const phases=Object.entries(scenePhases(docs,options.scene)).flatMap(([id,p])=>p.barriers?.[options.instance]?[{id,rule:p.barriers[options.instance]}]:[]);

  heading('Test the rule');
  para('Switch on what the player has, then read what pressing E here would do. Nothing is played or saved (no tokens, noon on day 1, clear weather).','','muted');
  const toggles=document.createElement('div');toggles.className='barrier-toggles';toggles.setAttribute('role','group');toggles.setAttribute('aria-label','What the player has');host.append(toggles);
  const toggle=(name:string,on:boolean,set:(on:boolean)=>void)=>{const b=document.createElement('button');b.type='button';b.className='toggle';b.textContent=name;b.setAttribute('aria-pressed',String(on));b.title=(on?'Switch off: ':'Switch on: ')+name;b.onclick=()=>form.run(()=>{set(!on);render();});toggles.append(b);};
  if(rule.key)toggle('Carrying '+keyWord(rule.key,vocab.keyring),fixture.keys.has(rule.key),on=>{if(on)fixture.keys.add(rule.key!);else fixture.keys.delete(rule.key!);});
  for(const f of [...new Set([...(rule.flag?[rule.flag]:[]),...names.flags])])toggle('Flag '+f+' set',fixture.flags.has(f),on=>{if(on)fixture.flags.add(f);else fixture.flags.delete(f);});
  for(const i of names.items)toggle('Holding '+i,fixture.items.has(i),on=>{if(on)fixture.items.add(i);else fixture.items.delete(i);});
  if(!toggles.children.length)para('This rule needs nothing, so there is nothing to switch.','','muted');
  if(fixture.phase&&!phases.some(p=>p.id===fixture.phase))fixture.phase='';
  if(phases.length)picker('During story phase',[{value:'',label:'No phase rule (its own rule)'},...phases.map(p=>({value:p.id,label:p.id}))],fixture.phase,v=>{fixture.phase=v;render();});
  const tried=tryBarrier(rule,{keys:[...fixture.keys],flags:Object.fromEntries([...fixture.flags].map(f=>[f,true])),items:Object.fromEntries([...fixture.items].map(i=>[i,1]))},phases.find(p=>p.id===fixture.phase));
  para(tried.text,'Test result','barrier-result '+(tried.opens?'ok':'error'));

  heading('Story phases');
  if(phases.length)for(const p of phases)para('In phase '+p.id+': '+phaseRuleSentence(p.rule)+'.','Phase rule '+p.id);
  else para('No story phase changes this barrier. Add one under Scene › Story phases (Barriers that act differently).','Phase rules','muted');

  const problems=barrierProblems(rule,vocab);
  heading('Checks');
  const list=document.createElement('ul');list.setAttribute('role','status');list.setAttribute('aria-label','Barrier warnings');
  for(const p of problems.length?problems:['No warnings: the sources can open it.']){const li=document.createElement('li');li.textContent=p;list.append(li);}
  host.append(list);
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
