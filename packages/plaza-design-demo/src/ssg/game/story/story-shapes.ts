/**
 * Structural validation of the story's shapes (story-rules.ts): cues, gates, acknowledgments, chips, targets, pings, intros,
 * arrival rows, wash rules and a scene's `phases`. Shared by the opening source (opening.json) and the scene document (scene.json).
 * Whether the names they carry exist in a scene (exits, devices, nouns, readables, states) or in the story (milestones, presentation timestamps,
 * cards, phases) is checked where that is known: opening-source.ts, with the pending scene registry.
 */
import type {Cue,ExitRule,ScenePhase,WashRule} from './story-rules';

export const fail=(at:string,reason:string):never=>{throw new Error('Invalid story source '+at+': '+reason);};
export const object=(v:unknown,at:string):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail(at,'plain object required');return v as Record<string,any>;};
export function fields(v:unknown,at:string,allowed:readonly string[],required:readonly string[]=allowed){const row=object(v,at);if(Object.keys(row).some(k=>!allowed.includes(k))||required.some(k=>!Object.prototype.hasOwnProperty.call(row,k)))fail(at,'unknown or missing field');return row;}
export function text(v:unknown,at:string,empty=false){if(typeof v!=='string'||(!empty&&!v.trim())||v.length>4000)fail(at,'bounded text required');}
export function id(v:unknown,at:string){if(typeof v!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(v)||['constructor','prototype','__proto__'].includes(v))fail(at,'identifier required');}
export function list(v:unknown,at:string,max=64):any[]{if(!Array.isArray(v)||v.length>max)fail(at,'bounded array required');return v as any[];}
export function bool(v:unknown,at:string){if(typeof v!=='boolean')fail(at,'boolean required');}
export function num(v:unknown,at:string,min=0,max=1000000){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(at,'bounded finite number required');}
export function pages(v:unknown,at:string){const rows=list(v,at,32);if(!rows.length)fail(at,'at least one page required');rows.forEach((p,i)=>text(p,at+'/'+i));}
export function line(v:unknown,at:string){const rows=list(v,at,3);if(rows.length<2)fail(at,'line tuple required');text(rows[0],at+'/input',true);text(rows[1],at+'/output',true);if(rows.length===3&&!['ok','err','dim'].includes(rows[2]))fail(at,'line tone required');}
export const hm=(v:unknown,at:string)=>{if(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))fail(at,'HH:MM required');};
export const PHASE_ID=/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
export const phaseId=(v:unknown,at:string)=>{if(typeof v!=='string'||!PHASE_ID.test(v)||['constructor','prototype','__proto__'].includes(v))fail(at,'phase identifier required');};

export function validateSay(v:unknown,at:string){const r=fields(v,at,['speaker','pages','touchPages','height'],['speaker','pages','height']);text(r.speaker,at+'/speaker');pages(r.pages,at+'/pages');if(r.touchPages!==undefined)pages(r.touchPages,at+'/touchPages');num(r.height,at+'/height',0,10000);}

const SOUNDS=['granted','blip','denied','close','open'];
export function validateCue(v:unknown,at:string){
 const r=object(v,at),keys=Object.keys(r);if(keys.length!==1)fail(at,'exactly one cue kind required');const k=keys[0];
 if(k==='milestone')id(r.milestone,at);
 else if(k==='say')validateSay(r.say,at+'/say');
 else if(k==='print'){const p=fields(r.print,at+'/print',['lines','prefix','tone'],['lines']);list(p.lines,at+'/lines',32).forEach((l,i)=>text(l,at+'/lines/'+i));if(!p.lines.length)fail(at,'at least one line required');if(p.prefix!==undefined)text(p.prefix,at+'/prefix',true);if(p.tone!==undefined&&!['ok','out','err','dim'].includes(p.tone))fail(at,'tone required');}
 else if(k==='sound'){if(!SOUNDS.includes(r.sound))fail(at,'registered sound required');}
 else if(k==='stage'){const p=fields(r.stage,at+'/stage',['scene','reset','face'],['scene']);id(p.scene,at+'/scene');if(p.reset!==undefined&&p.reset!==true)fail(at,'reset must be true');if(p.face!==undefined&&p.face!==-1&&p.face!==1)fail(at,'face must be -1 or 1');}
 else if(k==='stamp'||k==='clearStamps')id(r[k],at+'/'+k);
 else if(k==='advance')num(r.advance,at+'/advance',0,1440);
 else fail(at,'unknown cue kind');
}
export function validateCues(v:unknown,at:string,max=24){for(const[i,c]of list(v,at,max).entries())validateCue(c,at+'/'+i);}
/** Every milestone and scene a cue names, for the opening source's reference checks. */
export function cueRefs(cues:readonly Cue[]){
 const milestones:string[]=[],scenes:string[]=[];
 for(const c of cues){if('milestone'in c)milestones.push(c.milestone);else if('stage'in c)scenes.push(c.stage.scene);}
 return{milestones,scenes};
}

const optionalCues=(r:Record<string,any>,key:string,at:string)=>{if(r[key]!==undefined)validateCues(r[key],at+'/'+key);};
export function validateGate(v:unknown,at:string){
 const g=fields(v,at,['verifying','ok','verifyFrames','okFrames','dotEvery','begin','then'],['verifying','ok','verifyFrames','okFrames','dotEvery','then']);
 text(g.verifying,at+'/verifying');text(g.ok,at+'/ok');for(const k of['verifyFrames','okFrames','dotEvery'])num(g[k],at+'/'+k,1,100000);optionalCues(g,'begin',at);validateCues(g.then,at+'/then');
}
export function validateAck(v:unknown,at:string){
 const g=fields(v,at,['speaker','pages','height','begin','then'],['speaker','pages','height','then']);
 text(g.speaker,at+'/speaker');pages(g.pages,at+'/pages');num(g.height,at+'/height',0,10000);optionalCues(g,'begin',at);validateCues(g.then,at+'/then');
}
export function validateExitRule(v:unknown,at:string){
 const r=object(v,at),variants=['say','react','gate','acknowledge'].filter(k=>k in r);if(variants.length!==1)fail(at,'one registered exit handler required');const k=variants[0];
 fields(r,at,k==='react'?['react','line','cues']:[k],k==='react'?['react','line']:[k]);
 if(k==='say'){const q=fields(r.say,at+'/say',['name','pages']);text(q.name,at+'/say/name');pages(q.pages,at+'/say/pages');}
 else if(k==='react'){id(r.react,at+'/react');line(r.line,at+'/line');optionalCues(r,'cues',at);}
 else if(k==='gate')validateGate(r.gate,at+'/gate');
 else validateAck(r.acknowledge,at+'/acknowledge');
}
export function validateChip(v:unknown,at:string){
 const c=fields(v,at,['label','say','act','set','cues'],['label']);text(c.label,at+'/label');
 if(c.say!==undefined)line(c.say,at+'/say');
 if(c.act!==undefined){const pair=list(c.act,at+'/act',2);if(pair.length!==2)fail(at,'noun/verb pair required');id(pair[0],at+'/act/0');text(pair[1],at+'/act/1');}
 if(c.set!==undefined){const pair=list(c.set,at+'/set',2);if(pair.length!==2)fail(at,'state/bool pair required');id(pair[0],at+'/set/0');bool(pair[1],at+'/set/1');}
 optionalCues(c,'cues',at);
}
export function validateTarget(v:unknown,at:string){
 const r=fields(v,at,['x','bind','label','promptH','card'],['label','promptH']);if(('x'in r)===('bind'in r))fail(at,'exactly one point or scene binding required');
 if(r.x!==undefined)num(r.x,at+'/x',-1000000);
 if(r.bind!==undefined){const b=fields(r.bind,at+'/bind',['kind','id','offsetX'],['kind','id']);if(!['rest','use','exit'].includes(b.kind))fail(at,'registered scene anchor kind required');id(b.id,at+'/bind/id');if(b.offsetX!==undefined)num(b.offsetX,at+'/bind/offsetX',-1000000);}
 text(r.label,at+'/label');num(r.promptH,at+'/promptH',0,10000);if(r.card!==undefined)id(r.card,at+'/card');
}
export function validatePing(v:unknown,at:string){
 const r=object(v,at),keys=Object.keys(r);if(keys.length!==1||!['door','exit','target','device'].includes(keys[0]))fail(at,'one registered ping target required');
 if(keys[0]==='door'){if(r.door!==true)fail(at,'door must be true');}else id(r[keys[0]],at);
}
export function validateIntro(v:unknown,at:string){
 const r=fields(v,at,['pages','touchPages','consume','speaker','height'],['pages','speaker','height']);pages(r.pages,at+'/pages');text(r.speaker,at+'/speaker');num(r.height,at+'/height',0,10000);if(r.touchPages!==undefined)pages(r.touchPages,at+'/touchPages');if(r.consume!==undefined)bool(r.consume,at+'/consume');
}
export function validateArrival(v:unknown,at:string){
 const rows=list(v,at,8);if(!rows.length)fail(at,'at least one arrival row required');
 for(const[i,row]of rows.entries()){
  const a=at+'/'+i,r=fields(row,a,['unless','set','rainThreshold','speaker','height','pages','touchPages'],['speaker','height','pages']);
  if(r.rainThreshold!==undefined)num(r.rainThreshold,a+'/rainThreshold',0,1);
  if(r.unless!==undefined)id(r.unless,a+'/unless');if(r.set!==undefined)list(r.set,a+'/set',8).forEach((f,j)=>id(f,a+'/set/'+j));
  text(r.speaker,a+'/speaker');num(r.height,a+'/height',0,10000);
  for(const key of['pages','touchPages']){if(r[key]===undefined)continue;const pagesAt=a+'/'+key,items=list(r[key],pagesAt,16);if(!items.length)fail(pagesAt,'at least one page required');
   for(const[j,p]of items.entries()){if(typeof p==='string')text(p,pagesAt+'/'+j);else{const o=object(p,pagesAt+'/'+j);if('companion'in o){fields(o,pagesAt+'/'+j,['companion']);if(o.companion!==true)fail(pagesAt,'companion must be true');}else{fields(o,pagesAt+'/'+j,['text','rain']);text(o.text,pagesAt+'/'+j);bool(o.rain,pagesAt+'/'+j);}}}}
  const last=i===rows.length-1;if(r.unless===undefined&&!last)fail(a,'a row without a flag test must be last');
 }
}
const PHASE_FIELDS=['time','goal','intro','ping','ride','arrival','lines','exits','everyday','targets','barriers'];
export function validatePhase(v:unknown,at:string){
 const p=fields(v,at,PHASE_FIELDS,[]);
 if(p.time!==undefined)hm(p.time,at+'/time');if(p.goal!==undefined)text(p.goal,at+'/goal');if(p.intro!==undefined)validateIntro(p.intro,at+'/intro');if(p.ping!==undefined)validatePing(p.ping,at+'/ping');if(p.ride!==undefined){const r=fields(p.ride,at+'/ride',['mover','path']);id(r.mover,at+'/ride/mover');id(r.path,at+'/ride/path');if(!/^[^.]+\.[^.]+$/.test(r.mover))fail(at+'/ride/mover','device.noun required');}if(p.arrival!==undefined)validateArrival(p.arrival,at+'/arrival');
 const table=(key:string,check:(row:unknown,a:string)=>void)=>{if(p[key]===undefined)return;const rows=Object.entries(object(p[key],at+'/'+key));if(rows.length>128)fail(at+'/'+key,'row limit');for(const[k,row]of rows){id(k,at+'/'+key+'/'+k);check(row,at+'/'+key+'/'+k);}};
 table('lines',(row,a)=>{const r=fields(row,a,['name','pages'],['pages']);if(r.name!==undefined)text(r.name,a+'/name');pages(r.pages,a+'/pages');});
 table('exits',validateExitRule);
 table('barriers',validateExitRule);
 table('everyday',(row,a)=>{for(const[i,chip]of list(row,a,16).entries())validateChip(chip,a+'/'+i);});
 table('targets',validateTarget);
}
/** scene.json `phases`: phase id (what the story's PHASES name) → what this scene does in it. */
export function validateScenePhases(v:unknown,at='phases'){
 const rows=Object.entries(object(v,at));if(!rows.length||rows.length>16)fail(at,'one to sixteen phases required');
 for(const[phase,row]of rows){phaseId(phase,at+'/'+phase);validatePhase(row,at+'/'+phase);}
}
/** scene.json `wash`: the first rule that holds sets the room's light. */
export function validateWash(v:unknown,at='wash'){
 const rows=list(v,at,8);if(!rows.length)fail(at,'at least one wash rule required');
 for(const[i,row]of rows.entries()){const a=at+'/'+i,r=fields(row,a,['phase','flag','unlessState','tone'],['tone']);if(r.phase!==undefined)phaseId(r.phase,a+'/phase');if(r.flag!==undefined)id(r.flag,a+'/flag');if(r.unlessState!==undefined)id(r.unlessState,a+'/unlessState');if(!['warm','cold'].includes(r.tone))fail(a,'registered tone required');}
}
export type {ScenePhase,WashRule,ExitRule};
