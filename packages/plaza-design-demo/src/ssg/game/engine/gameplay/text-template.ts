import {readQuery,type GameplayReadContext} from './queries';
import {stateValue} from './state';
import type {GameplayDefinition,GameplayState} from './types';
/** Read-only presentation context, never a condition or saved state owner. */
export interface GameplayTextContext {objective?:string}
const fields=/\{([^{}]+)\}/g;
export function validateGameplayText(pages:string[],definition:GameplayDefinition){for(const page of pages)for(const match of page.matchAll(fields)){
 const key=match[1];if(key==='world:weather'||key==='world:day'||key==='world:minute'||key==='tokens'||key==='objective'||key==='player:handle'||key==='player:name')continue;const colon=key.indexOf(':'),kind=key.slice(0,colon),id=key.slice(colon+1);
 const valid=colon>=0&&(kind==='query'&&Object.prototype.hasOwnProperty.call(definition.queries??{},id)||kind==='item'&&definition.items.includes(id)||kind==='state'&&Object.prototype.hasOwnProperty.call(definition.state??{},id));
 if(!valid)throw new Error('Unknown gameplay text field '+key);
}}
export function renderGameplayText(pages:readonly string[],state:GameplayState,context:Readonly<GameplayTextContext>={},reads?:GameplayReadContext){return pages.map(page=>page.replace(fields,(_match,key:string)=>key==='world:weather'?(state.world?.weather??''):key==='world:day'?String(state.world?.day??''):key==='world:minute'?String(state.world?.minute??''):key==='objective'?(context.objective??''):key==='player:handle'?(state.player?.handle??''):key==='player:name'?(state.player?.handle||'ghost'):key==='tokens'?String(state.tokens):key.startsWith('query:')?String(readQuery(key.slice(6),state,reads)??''):key.startsWith('item:')?String(state.items[key.slice(5)]??0):String(stateValue(state.values,key.slice(6))??'')));}
