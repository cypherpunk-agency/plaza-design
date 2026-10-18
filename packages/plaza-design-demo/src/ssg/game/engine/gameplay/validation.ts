import {validateNativeShape} from './native-bindings';
import {validValue} from './state';
import type { Condition, GameplayDefinition,GameplayState,StateDeclaration } from './types';
const reserved = new Set(['__proto__', 'constructor', 'prototype']);
function fail(message: string): never { throw new Error('Invalid gameplay document: ' + message); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('expected plain object');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], required: string[] = []) {
  for (const k of Object.keys(value)) if (!allowed.includes(k)) fail('unsupported field ' + k);
  for (const k of required) if (!Object.prototype.hasOwnProperty.call(value, k)) fail('missing field ' + k);
}
function array(value: unknown, max = 128): unknown[] { if (!Array.isArray(value) || value.length > max) fail('expected bounded array'); return value; }
function text(value: unknown) { if (typeof value !== 'string' || !value.trim() || value.length > 2000) fail('expected nonempty text'); }
function id(value: unknown): string { if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value) || reserved.has(value)) fail('invalid id'); return value; }
function number(value: unknown) { if (!Number.isSafeInteger(value) || Math.abs(Number(value)) > 1_000_000) fail('quantity must be a bounded safe integer'); }
function names(value: unknown) { const values = array(value).map(id); if (new Set(values).size !== values.length) fail('duplicate id'); return new Set(values); }
function has(set: Set<string>, value: unknown) { if (!set.has(id(value))) fail('unknown reference ' + value); }
/** Validate once at document/session creation, never in a render loop. */
export function validateGameplay(value: unknown): GameplayDefinition {
  const seen = new Set<object>();
  function plain(v: unknown, depth = 0): void {
    if (depth > 24) fail('nesting limit');
    if (v === null || typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v)) return;
    if (!v || typeof v !== 'object' || seen.has(v)) fail('finite JSON only');
    if (!Array.isArray(v)) object(v);
    seen.add(v);
    if (Object.keys(v).length > 256) fail('object/array limit');
    for (const [k, child] of Object.entries(v)) { if (reserved.has(k)) fail('reserved key'); plain(child, depth + 1); }
    seen.delete(v);
  }
  plain(value);
  if (JSON.stringify(value).length > 128_000) fail('document size limit');
  const doc = object(value); keys(doc, ['version','flags','items','events','commands','reactions','conversations','state','purchases','native'], ['version','flags','items','events','commands','reactions','conversations']);
  if (doc.version !== 1) fail('unsupported version');
  const flags = names(doc.flags), items = names(doc.items), events = names(doc.events), commands = object(doc.commands), conversations = object(doc.conversations);
  const declarations=doc.state===undefined?{}:object(doc.state),purchases=doc.purchases===undefined?{}:object(doc.purchases);
  const stateIds=new Set(Object.keys(declarations).map(id)),purchaseIds=new Set(Object.keys(purchases).map(id));
  for(const[key,raw]of Object.entries(declarations)){const d=object(raw);keys(d,['owner','lifetime','type','default','min','max','options'],['owner','lifetime','type','default']);id(d.owner);if(!key.startsWith(String(d.owner)+'.'))fail('state key must be qualified by owner');if(!['save','session','interaction'].includes(String(d.lifetime)))fail('state lifetime');if(!['number','boolean','enum'].includes(String(d.type)))fail('state type');if(d.type==='number'){if(d.min!==undefined)number(d.min);if(d.max!==undefined)number(d.max);if(Number(d.min??-1000000)>Number(d.max??1000000)||d.options!==undefined)fail('numeric bounds');}else if(d.type==='enum'){const opts=names(d.options);if(!opts.size||d.min!==undefined||d.max!==undefined)fail('enum options');}else if(d.options!==undefined||d.min!==undefined||d.max!==undefined)fail('boolean declaration');if(!validValue(d as unknown as StateDeclaration,d.default))fail('state default');}
  const commandIds = new Set(Object.keys(commands).map(id));
  function condition(v: unknown, depth = 0): void {
    if (depth > 12) fail('condition depth');
    const c = object(v);
    if('state'in c){keys(c,['state','is'],['state','is']);has(stateIds,c.state);if(!validValue(declarations[String(c.state)] as unknown as StateDeclaration,c.is))fail('state condition type');}
    else if ('flag' in c) { keys(c,['flag','is'],['flag']); has(flags,c.flag); if (c.is !== undefined && typeof c.is !== 'boolean') fail('flag condition value'); }
    else if ('item' in c) { keys(c,['item','atLeast'],['item','atLeast']); has(items,c.item); number(c.atLeast); if (Number(c.atLeast)<0) fail('negative item condition'); }
    else if ('tokensAtLeast' in c) { keys(c,['tokensAtLeast']); number(c.tokensAtLeast); if (Number(c.tokensAtLeast)<0) fail('negative token condition'); }
    else if ('not' in c) { keys(c,['not']); condition(c.not,depth+1); }
    else { const k = 'all' in c ? 'all' : 'any'; keys(c,[k],[k]); const children=array(c[k],32); if(!children.length) fail('empty condition'); children.forEach(child=>condition(child,depth+1)); }
  }
  for (const raw of Object.values(commands)) {
    const c=object(raw); keys(c,['sources','when','actions'],['sources','actions']);
    const sources=array(c.sources,4); if(!sources.length || new Set(sources).size!==sources.length || sources.some(s=>!['interaction','conversation','signal','system'].includes(String(s)))) fail('command sources');
    if(c.when!==undefined)condition(c.when);
    for(const rawAction of array(c.actions,32)) {
      const a=object(rawAction);
      if('state'in a){has(stateIds,a.state);const d=declarations[String(a.state)] as unknown as StateDeclaration;if('set'in a){keys(a,['state','set'],['state','set']);if(!validValue(d,a.set))fail('state action type');}else{keys(a,['state','add'],['state','add']);number(a.add);if(d.type!=='number')fail('numeric state action');}}
      else if('purchase'in a){keys(a,['purchase'],['purchase']);has(purchaseIds,a.purchase);}
      else if('flag'in a){keys(a,['flag','value'],['flag','value']);has(flags,a.flag);if(typeof a.value!=='boolean')fail('flag action value');}
      else if('item'in a){keys(a,['item','add'],['item','add']);has(items,a.item);number(a.add);}
      else if('tokens'in a){keys(a,['tokens']);number(a.tokens);}
      else{keys(a,['emit'],['emit']);has(events,a.emit);}
    }
  }
  for(const raw of Object.values(purchases)){
    const p=object(raw);keys(p,['basePrice','when','goods','rotation','stock','modifiers'],['basePrice']);number(p.basePrice);if(Number(p.basePrice)<0)fail('negative price');if(p.when!==undefined)condition(p.when);
    for(const raw of p.goods===undefined?[]:array(p.goods,16)){const g=object(raw);keys(g,['item','quantity'],['item','quantity']);has(items,g.item);number(g.quantity);if(Number(g.quantity)<1)fail('positive purchase quantity');}
    if(p.rotation!==undefined){const r=object(p.rotation);keys(r,['state','items'],['state','items']);has(stateIds,r.state);const d=declarations[String(r.state)] as unknown as StateDeclaration,goods=array(r.items,32);if(!goods.length||d.type!=='number'||Number(d.min??-1000000)!==0||Number(d.max??1000000)!==goods.length-1)fail('rotation requires bounded cursor');goods.forEach(g=>has(items,g));}
    if(p.stock!==undefined){if(p.rotation&&object(p.rotation).state===p.stock)fail('stock and rotation require distinct state');has(stateIds,p.stock);const d=declarations[String(p.stock)] as unknown as StateDeclaration;if(d.type!=='number'||Number(d.min??-1000000)!==0)fail('stock requires nonnegative numeric state');}
    if(p.goods===undefined&&p.rotation===undefined)fail('purchase needs goods');
    const ids=new Set<string>();for(const raw of p.modifiers===undefined?[]:array(p.modifiers,32)){const m=object(raw);keys(m,['id','when','amount','scope'],['id','amount','scope']);const key=id(m.id);if(ids.has(key))fail('duplicate price modifier');ids.add(key);number(m.amount);if(!['both','quote','charge'].includes(String(m.scope)))fail('price modifier scope');if(m.when!==undefined)condition(m.when);}
  }
  for(const raw of array(doc.reactions)) {
    const r=object(raw);keys(r,['event','command'],['event','command']);has(events,r.event);has(commandIds,r.command);
    if(!(commands[String(r.command)] as {sources:string[]}).sources.includes('system'))fail('reaction requires a system command');
  }
  for(const [name,raw]of Object.entries(conversations)) {
    id(name);const conversation=object(raw);keys(conversation,['entry','nodes'],['entry','nodes']);
    const nodes=object(conversation.nodes),nodeIds=new Set(Object.keys(nodes).map(id)),entry=array(conversation.entry,32);
    if(!entry.length || object(entry[entry.length-1]).when!==undefined||entry.slice(0,-1).some(r=>object(r).when===undefined))fail('conversation needs a final fallback entry');
    for(const rawRoute of entry){const r=object(rawRoute);keys(r,['when','node'],['node']);has(nodeIds,r.node);if(r.when!==undefined)condition(r.when);}
    const visiting=new Set<string>(),visited=new Set<string>();const redirects=(name:string):void=>{if(visiting.has(name))fail('redirect cycle');if(visited.has(name))return;visiting.add(name);const n=object(nodes[name]);for(const raw of n.redirect===undefined?[]:array(n.redirect,32)){const r=object(raw);has(nodeIds,r.node);redirects(String(r.node));}visiting.delete(name);visited.add(name);};for(const name of nodeIds)redirects(name);
    for(const rawNode of Object.values(nodes)) {
      const n=object(rawNode);keys(n,['speaker','pages','choices','onEnter','redirect'],['speaker','pages']);text(n.speaker);const pages=array(n.pages,16);if(!pages.length)fail('node needs pages');pages.forEach(text);
      if(n.onEnter!==undefined){has(commandIds,n.onEnter);if(!(commands[String(n.onEnter)] as {sources:string[]}).sources.includes('conversation'))fail('entry command permission');}
      for(const raw of n.redirect===undefined?[]:array(n.redirect,32)){const r=object(raw);keys(r,['when','node'],['when','node']);condition(r.when);has(nodeIds,r.node);}
      const choices=new Set<string>();
      for(const rawChoice of n.choices===undefined?[]:array(n.choices,8)) {
        const c=object(rawChoice);keys(c,['id','label','when','command','next'],['id','label','next']);const name=id(c.id);if(choices.has(name))fail('duplicate choice');choices.add(name);text(c.label);has(nodeIds,c.next);if(c.when!==undefined)condition(c.when);
        if(c.command!==undefined){has(commandIds,c.command);if(!(commands[String(c.command)] as {sources:string[]}).sources.includes('conversation'))fail('choice command cannot be invoked by conversation');}
      }
    }
  }
  validateNativeShape(value as GameplayDefinition,condition);
  return JSON.parse(JSON.stringify(value)) as GameplayDefinition;
}
export function matches(condition: Condition | undefined, state: Readonly<GameplayState>): boolean {
  if(!condition)return true;
  if('state'in condition)return state.values?.[condition.state]===condition.is;
  if('flag'in condition)return !!state.flags[condition.flag]===(condition.is??true);
  if('item'in condition)return (state.items[condition.item]??0)>=condition.atLeast;
  if('tokensAtLeast'in condition)return state.tokens>=condition.tokensAtLeast;
  if('all'in condition)return condition.all.every(c=>matches(c,state));
  if('any'in condition)return condition.any.some(c=>matches(c,state));
  return !matches(condition.not,state);
}
