import {bindActorPresentation,type ActorPresentation} from '../../art/characters/presentation';
import {validateActorPresentation} from './actor-presentation';
import {validateActorArtwork} from './native-actor-bindings';
import {bindActorReactionIdentity,bindActorAppearanceSeed} from './actor-identity';
import type {SceneDocument} from './scene-document';
import {actorConversationId} from './scene-conversations';
/** Serializable actor bodies. Composition owns placement; scene people own dialogue. */
import type {Character,Act} from '../../runtime/characters';
import type {TimeWindow} from '../../data/types';
import {windowProblem} from '../../world/clock';
import type {resolveComposition} from '../../art/core/composition';
import {DEPTH_BANDS,isDepthBand,type DepthBand} from '../../art/core/depth';
import {BODY_KINDS,HAIR_KINDS,GARB_KINDS,EXTRA_KINDS,FACIAL_KINDS} from '../../art/characters/parts';
import {ARCHETYPE_IDS} from '../../art/characters/archetypes';
import {DISTRICT_PALETTES,type SitPose} from '../../art/characters/people-style';
export const actorAxes={
 body:BODY_KINDS,hair:HAIR_KINDS,garb:GARB_KINDS,extras:EXTRA_KINDS,facial:FACIAL_KINDS,archetype:ARCHETYPE_IDS as readonly string[],
 critter:['cat','pigeon','gull','cleaner','drone','courier','crab','robogull'],
 bot:['android','valet','marshal','servbot','sweeper','busker','waiter','loader','porter','mech','litterbot','deliverybot','adbot','crawler','wreck','minidrone','cargodrone','flyerdrone','scandrone','djbot'],
 act:['stand','walk','run','talk','sit','lean','smoke','phone','haggle','argue','sweep','queue','sleep','dance','vend','steal','scan','carry','roll','patrol','serve','crawl','hover','direct','play','weld','scrub','charge','glitch','blink','slump','read','doze','wait','dig','fly'],
 face:['eyes','happy','blink','sad','dots','off','crack'],
 style:['vivid','muted'],sitView:['front','threeQuarter','side'],
} as const;
export interface ActorDefinition {
 id:string;instance:string;target?:string;reaction?:string;band:'world'|'background';
 seed?:number;bakeSeed?:number;look?:Character['look'];act?:Act;range?:number|[number,number];
 facing?:1|-1;speed?:number;when?:TimeWindow;key?:boolean;
 /** Depth band (art/core/depth.ts): its pixel size, parallax and dimming, unless ps/parallax/dim are set. */
 depth?:DepthBand;ps?:number;dim?:number;parallax?:number;
 height?:'artwork'|'automatic';follow?:string;gap?:number;presentation?:ActorPresentation;
 /** Does the act sitting down; `sitView` fixes the pose, otherwise the people-style switch (mixed: it changes now and then). */
 seated?:boolean;sitView?:SitPose;
}
const fail=(s:string):never=>{throw new Error('Invalid actor source: '+s);};
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain object required');return v as Record<string,unknown>;}
function fields(v:unknown,keys:readonly string[]){const o=object(v);if(Object.keys(o).some(k=>!keys.includes(k)))fail('unknown field');return o;}
const number=(v:unknown,min:number,max:number,integer=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||integer&&!Number.isInteger(v))fail('number outside range');};
const id=(v:unknown)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_.]{1,96}$/.test(v)||['__proto__','prototype','constructor'].includes(v))fail('identity');};
const choice=(v:unknown,values:readonly unknown[])=>{if(!values.includes(v))fail('unknown appearance or action');};
export function validateActorLook(value:unknown):void {
 if(typeof value==='string'){choice(value,[...actorAxes.critter,...actorAxes.bot]);return;}
 const robot=!!object(value).bot,look=fields(value,robot?['bot','paint','trim','screen','wear','face','v']:['archetype','district','kitted','style','body','hair','garb','extras','facial','skin','hairCol','top','bottom','acc']);
 if(robot){choice(look.bot,actorAxes.bot);if(look.v!==undefined)choice(look.v,[0,1,2]);if(look.face!==undefined)choice(look.face,actorAxes.face);if(look.wear!==undefined)number(look.wear,0,1);}
 else{for(const k of ['archetype','body','hair','garb','facial'] as const)if(look[k]!==undefined)choice(look[k],actorAxes[k]);if(look.district!==undefined)choice(look.district,Object.keys(DISTRICT_PALETTES));if(look.kitted!==undefined&&typeof look.kitted!=='boolean')fail('kitted boolean');if(look.style!==undefined)choice(look.style,actorAxes.style);if(look.extras!==undefined){if(!Array.isArray(look.extras)||look.extras.length>10||new Set(look.extras).size!==look.extras.length)fail('extras');(look.extras as unknown[]).forEach(v=>choice(v,actorAxes.extras));}}
 for(const k of robot?['paint','trim','screen']:['skin','hairCol','top','bottom','acc'])if(look[k]!==undefined&&(typeof look[k]!=='string'||!/^#[0-9a-f]{6}$/i.test(look[k] as string)))fail('hex color');
}
export function validateActors(value:unknown):ActorDefinition[]{
 if(!Array.isArray(value)||value.length>128)fail('bounded actor array');const rows=value as unknown[],ids=new Set<string>(),instances=new Set<string>(),targets=new Set<string>(),reactions=new Set<string>();
 for(const raw of rows){const a=fields(raw,['id','instance','target','reaction','band','seed','bakeSeed','look','act','range','facing','speed','when','key','depth','ps','dim','parallax','height','follow','gap','presentation','seated','sitView']);id(a.id);id(a.instance);if(ids.has(String(a.id))||instances.has(String(a.instance)))fail('duplicate actor or placement');ids.add(String(a.id));instances.add(String(a.instance));choice(a.band,['world','background']);
 if(a.reaction!==undefined&&(typeof a.reaction!=='string'||!/^[-a-zA-Z0-9_.]{1,128}$/.test(a.reaction)||['__proto__','constructor','prototype'].includes(a.reaction)))fail('reaction identity');const reaction=a.reaction??'actor.'+String(a.id);if(reactions.has(String(reaction)))fail('duplicate reaction identity');reactions.add(String(reaction));
 if(a.target!==undefined){id(a.target);if(targets.has(String(a.target)))fail('duplicate interaction target');targets.add(String(a.target));}if(a.follow!==undefined)id(a.follow);
 if(a.presentation!==undefined){validateActorPresentation(a.presentation);if(['look','seed','act','range','speed','follow','gap','parallax','key','depth'].some(k=>a[k]!==undefined))fail('rider recipes cannot also declare Character appearance or motion');}
 if(a.depth!==undefined&&!isDepthBand(a.depth))fail('unknown depth band');if(a.look!==undefined)validateActorLook(a.look);if(a.act!==undefined)choice(a.act,actorAxes.act);if(a.facing!==undefined)choice(a.facing,[1,-1]);if(a.seated!==undefined&&typeof a.seated!=='boolean')fail('seated boolean');if(a.sitView!==undefined)choice(a.sitView,actorAxes.sitView);if(a.height!==undefined)choice(a.height,['artwork','automatic']);if(a.key!==undefined&&typeof a.key!=='boolean')fail('key boolean');
 for(const[k,min,max,integer]of [['seed',0,1000000,true],['bakeSeed',0,1000000,true],['speed',0,100,false],['ps',1,5,true],['dim',0,1,false],['parallax',0,4,false],['gap',0,10000,false]] as const)if(a[k]!==undefined)number(a[k],min,max,integer);
 if(a.range!==undefined){if(Array.isArray(a.range)){if(a.range.length!==2)fail('range pair');a.range.forEach(v=>number(v,-10000,10000));}else number(a.range,-10000,10000);}
 if(a.when!==undefined){fields(a.when,['from','to','days']);if(windowProblem(a.when))fail('time window');}
 }
 const definitions=value as ActorDefinition[];for(const a of definitions){const chain=new Set<string>();let n:ActorDefinition|undefined=a;while(n?.follow){if(chain.has(n.id))fail('follow cycle');chain.add(n.id);n=definitions.find(r=>r.id===n!.follow);if(!n)fail('unknown follow target');}}
 return structuredClone(definitions);
}
/** Native Character remains the only behavior/animation implementation. Tuple ranges are placement-relative. */
export function compileActors(value:readonly ActorDefinition[],placements:ReturnType<typeof resolveComposition>):Record<string,Character>{
 const definitions=validateActors(value),actors:Record<string,Character>={};for(const a of definitions){const row=placements.find(r=>r.instance.id===a.instance)??fail('missing artwork '+a.instance);const p=row.placement;if(p.scale!==1||p.parallax!==1||p.facing!==1)fail('actor artwork requires unit scale, normal depth and right-facing placement');
 const {id:actorId,instance:_instance,target,reaction,bakeSeed,band:_band,height,follow:_follow,range,presentation,depth,...rest}=a,band=depth?DEPTH_BANDS[depth]:undefined;
 const body=band?{...rest,ps:rest.ps??band.ps,parallax:rest.parallax??band.parallax,dim:rest.dim??band.dim}:rest;
 actors[actorId]={...body,...(target?{id:target}:{}),x:p.x,...(height==='artwork'||p.h!==0?{h:p.h}:{}),...(range!==undefined?{range:Array.isArray(range)?[p.x+range[0],p.x+range[1]] as [number,number]:range}:{})};bindActorReactionIdentity(actors[actorId],reaction??'actor.'+actorId);if(presentation)bindActorPresentation(actors[actorId],presentation);if(bakeSeed!==undefined)bindActorAppearanceSeed(actors[actorId],bakeSeed);}
 for(const a of definitions)if(a.follow)actors[a.id].follow=actors[a.follow];return actors;
}

/** Preserve native entity identities independently of their editable interaction order. */
export function protectActorIdentity(actual:readonly ActorDefinition[],expected:readonly {id:string;instance:string;target?:string;reaction?:string;bakeSeed?:number;band:string}[],options:{reorder?:boolean;entities?:boolean}={}):void{
 if(!Array.isArray(actual))fail('registered actors require source definitions');
 const identity=(a:{id:string;instance:string;target?:string;reaction?:string;bakeSeed?:number;band:string})=>[a.id,a.instance,a.target,a.band,a.reaction,a.bakeSeed];
 if(options.entities){for(const a of actual){const previous=expected.find(e=>e.id===a.id);if(previous&&(previous.target!==undefined&&a.target!==previous.target||previous.target===undefined&&a.target!==undefined&&a.target!==a.id))fail('native actor interaction identity is protected');}return;}
 const ordered=options.reorder?expected.map(e=>actual.find(a=>a.id===e.id)):actual;
 if(actual.length!==expected.length||ordered.some(a=>!a)||JSON.stringify((ordered as ActorDefinition[]).map(identity))!==JSON.stringify(expected.map(identity)))fail('native actor identities are protected');
}

/** Keep one actor object for native pose, following and shared conversation targeting. */
export function compileSceneActors(source:Pick<SceneDocument,'id'|'actors'|'people'>,placements:ReturnType<typeof resolveComposition>):Record<string,Character>{
 const definitions=source.actors??fail('scene requires actor definitions');validateActorArtwork(source.id,definitions,placements);const actors=compileActors(definitions,placements);
 for(const person of source.people??[]){const body=definitions.find(a=>a.target===person.id)??fail('missing dialogue actor '+person.id);Object.assign(actors[body.id],structuredClone(person),{...(person.conversation!==undefined?{talk:[]}:{}),conversation:person.conversation??actorConversationId(source.id,person.id)});}
 return actors;
}

/** Actor interaction priority is editable; saved reactions remain bound to authored identities. */
export function moveSceneActor(source:Pick<SceneDocument,'actors'>,id:string,direction:1|-1):void{
 const rows=source.actors??fail('scene requires actors'),index=rows.findIndex(a=>a.id===id),to=index+direction;
 if(![1,-1].includes(direction)||index<0||to<0||to>=rows.length)fail('actor move outside list');
 rows.splice(to,0,rows.splice(index,1)[0]);
}
