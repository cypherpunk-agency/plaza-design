/** Source-shape validation. Does not install native behavior or import a session. */
import type {GameplayDefinition} from './types';
import {validateResponseConversations} from './response-validation';
import {validateNativeSayShape} from './native-text-source';
import {validateGameplayText} from './text-template';
import {validateNativeWorkflowShape} from './native-workflows';
import {validateNativeInputsShape} from './native-inputs';
const fail=(s:string):never=>{throw new Error('Invalid native gameplay bindings: '+s);};
const record=(v:unknown):Record<string,any>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain object');return v as Record<string,any>;};
const fields=(v:unknown,allowed:string[])=>{const r=record(v);if(Object.keys(r).some(k=>!allowed.includes(k)))fail('unsupported field');return r;};
const name=(s:unknown)=>{if(typeof s!=='string'||!s.trim()||s.length>128||['__proto__','constructor','prototype'].includes(s))fail('name');};
export function validateNativeShape(d:GameplayDefinition,condition:(v:unknown)=>void){
 if(d.native===undefined)return;const b=fields(d.native,['verbs','events','goals','wires','reads','presentation','intervals','replies','triggers','deadlines','inputs','responseConversations']);
 validateResponseConversations(d);
 for(const[flag,key]of Object.entries(b.reads===undefined?{}:record(b.reads))){if(!d.flags.includes(flag))fail('read flag reference');name(key);if(Object.values(d.commands).some(c=>c.actions.some(a=>'flag'in a&&a.flag===flag)))fail('read-only native flag');}
 const routes=new Set<string>();if(!Array.isArray(b.verbs)||b.verbs.length>128)fail('verb list');
 for(const raw of b.verbs){const r=fields(raw,['device','noun','verb','cases','denied']);[r.device,r.noun,r.verb].forEach(name);const key=r.device+'.'+r.noun+':'+r.verb;if(routes.has(key))fail('duplicate verb');routes.add(key);if(!Array.isArray(r.cases)||!r.cases.length||r.cases.length>32)fail('cases');
  if(r.denied!==undefined&&(!Array.isArray(r.denied)||r.denied.length<2||r.denied.length>3||r.denied.slice(0,2).some((s:unknown)=>typeof s!=='string'||!s||s.length>2000)||r.denied[2]!==undefined&&!['ok','err','dim'].includes(r.denied[2])))fail('denied line');
  for(const[i,raw]of r.cases.entries()){const c=fields(raw,['when','sources','command','say','template']);if(c.template!==undefined&&(c.template!==true||!Array.isArray(c.say)))fail('case template');if(c.sources!==undefined&&(!Array.isArray(c.sources)||!c.sources.length||c.sources.length>2||new Set(c.sources).size!==c.sources.length||c.sources.some((s:unknown)=>s!=='interaction'&&s!=='signal')))fail('case sources');if(c.when!==undefined)condition(c.when);else if(c.sources===undefined&&i!==r.cases.length-1)fail('fallback must be last');if(i===r.cases.length-1&&(c.when!==undefined||c.sources!==undefined))fail('final fallback required');if(!Object.prototype.hasOwnProperty.call(d.commands,c.command))fail('command reference');validateNativeSayShape(c.say,d);if(c.template)validateGameplayText(c.say.slice(0,2).map((s:string)=>s.split('{via}').join('')),d);}
 }
 for(const[event,raw]of Object.entries(b.presentation===undefined?{}:record(b.presentation))){if(!d.events.includes(event))fail('presentation event reference');const p=fields(raw,['kind','target']);if(p.kind!=='pulse')fail('presentation kind');name(p.target);}
 for(const[event,key]of Object.entries(record(b.events))){if(!d.events.includes(event))fail('event reference');name(key);}
 for(const[flag,key]of Object.entries(record(b.goals))){if(!d.events.includes(flag))fail('goal event');name(key);}
 validateNativeWorkflowShape(d,condition);validateNativeInputsShape(d,condition);
 if(b.wires!==undefined&&(!Array.isArray(b.wires)||b.wires.length>128))fail('wire list');const ids=new Set<string>(),pairs=new Set<string>();for(const raw of b.wires??[]){const w=fields(raw,['id','from','to','verb','fixed']);[w.from,w.to,w.verb].forEach(name);if(w.id!==undefined)name(w.id);const identity=w.id??w.from+'>'+w.to;if(ids.has(identity)||pairs.has(w.from+'>'+w.to))fail('duplicate wire');ids.add(identity);pairs.add(w.from+'>'+w.to);if(w.fixed!==undefined&&typeof w.fixed!=='boolean')fail('fixed');}
}
