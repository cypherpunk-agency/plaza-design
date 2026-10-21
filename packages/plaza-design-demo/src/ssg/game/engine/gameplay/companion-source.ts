import source from './companion.json';
import {COMPANION_LOOKS} from '../../runtime/companion';
import type {CompanionPet} from './scene-companion';
/**
 * The companion document (engine/gameplay/companion.json): who follows the player around. The game loop
 * reads it for everything about the companion that is not a scene's business: the look that is drawn, the
 * speaker lines about it stand over, the saved flag that brings it along, which scene modes exist, whether
 * popups keep clear of it, the greeting page, how closely it trails, and the pet recipe a scene starts from.
 * Scenes keep their own policy (scene.json `companion`: mode, perches, warm places, pet conversations).
 */
export interface CompanionSource {
 version:1;
 /** Identity of the pet target the game offers (`[E]` prompt owner). */
 id:string;
 /** Display name, for editor labels and the default pet prompt. */
 name:string;
 /** A registered painter (runtime/companion.ts COMPANION_LOOKS). */
 look:string;
 /** `from` of the lines that stand over the companion (gameplay reactions name this speaker). */
 speaker:string;
 /** The saved flag that brings the companion along, unless the scene names its own (`companion.unlockFlag`). */
 unlockFlag:string;
 /** The scene modes this companion lives by: `home` (at home in a scene) and `along` (follows once unlocked). */
 modes:('home'|'along')[];
 /** Popups and captions keep clear of the companion while it is on screen. */
 avoidPopups:boolean;
 /** One page the arrival greeting adds, after its first, once the companion is with you. */
 greeting:string;
 /** Following: stay this far from the player before walking; trail this far behind; turn up beside the player when this far away. */
 follow:{distance:number;trail:number;lostAt:number};
 /** What a scene's pet interaction starts as when petting is switched on. */
 pet:CompanionPet;
}
const fail=(why:string):never=>{throw new Error('Invalid companion: '+why);};
const id=(v:unknown,what:string)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_.:]{1,128}$/.test(v)||['__proto__','constructor','prototype'].includes(v))fail(what+' needs a plain identifier');};
const text=(v:unknown,what:string)=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail(what+' needs bounded text');};
const num=(v:unknown,what:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(what+' needs a number from '+min+' to '+max);};
export function validateCompanionSource(value:unknown):CompanionSource{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('plain object required');
 const d=value as CompanionSource;
 if(d.version!==1||Object.keys(d).sort().join()!==['version','id','name','look','speaker','unlockFlag','modes','avoidPopups','greeting','follow','pet'].sort().join())fail('fields');
 id(d.id,'id');text(d.name,'name');id(d.speaker,'speaker');id(d.unlockFlag,'unlock flag');text(d.greeting,'greeting');
 if(typeof d.look!=='string'||!Object.prototype.hasOwnProperty.call(COMPANION_LOOKS,d.look))fail('look '+String(d.look)+' is not a registered companion painter');
 if(!Array.isArray(d.modes)||new Set(d.modes).size!==d.modes.length||d.modes.some(m=>m!=='home'&&m!=='along'))fail('modes are home and/or along');
 if(typeof d.avoidPopups!=='boolean')fail('avoidPopups is a boolean');
 const f=d.follow;if(!f||typeof f!=='object'||Object.keys(f).sort().join()!==['distance','trail','lostAt'].sort().join())fail('follow fields');
 num(f.distance,'follow.distance',0,2000);num(f.trail,'follow.trail',0,2000);num(f.lostAt,'follow.lostAt',1,100000);
 const p=d.pet as CompanionPet;if(!p||typeof p!=='object'||Object.keys(p).sort().join()!=='conversations,prompt')fail('pet fields');text(p.prompt,'pet prompt');
 const c=p.conversations;if(!c||typeof c!=='object'||Object.keys(c).sort().join()!==['sleep','sun','moving','idle'].sort().join())fail('pet conversations');
 for(const k of ['sun','moving'] as const)id(c[k],'pet '+k);
 for(const k of ['sleep','idle'] as const){if(!Array.isArray(c[k])||!c[k].length||c[k].length>32)fail('pet '+k+' recurrence');c[k].forEach(x=>id(x,'pet '+k));}
 return structuredClone(d);
}
export const COMPANION_SOURCE=validateCompanionSource(source);
/** The flag that brings the companion along for a scene: its own `companion.unlockFlag`, else the document's. */
export const companionFlag=(scene:{companion?:{unlockFlag?:string}},doc:CompanionSource=COMPANION_SOURCE)=>scene.companion?.unlockFlag??doc.unlockFlag;
/** Is the companion in this scene right now: at home, or along once its flag is set. Pure. */
/** (The scene's compiled mode is `SceneDef.pixel`, a field name the scene snapshots keep.) */
export function companionHere(scene:{pixel?:'home'|'along';companion?:{unlockFlag?:string}},flags:Readonly<Record<string,boolean>>,doc:CompanionSource=COMPANION_SOURCE):boolean{
 const mode=scene.pixel;if(!mode||!doc.modes.includes(mode))return false;
 return mode==='home'||!!flags[companionFlag(scene,doc)];
}
