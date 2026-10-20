/** Closed, immutable terminal drawing state. Rule formulas are evaluated before rendering. */
import type {Value} from '../core/composition';
import type {Light} from '../../world/light';
import type {TerminalLayout} from './container-terminal';
export interface TerminalGeometry {X:{rest:number;slot:number;chassis:number;gate:number;hatch:number;deck:number};H:{carry:number;chassis:number;slot:number;deck:number;hold:number}}
export interface TerminalVisual {width:number;horizon:number;layer:'all'|'world'|'devices';hover:string;now:number;departed:boolean;boxAt:string;loaded:number;scratch:Partial<Record<'liftT0'|'retT0'|'liftKind'|'alarm'|'cold'|'warm',number>>;portFrozen:boolean;watchdogs:{at:string|null;from:string;to:string;progress:number}[];trolley:{x:number;h:number;carry:number};geometry:TerminalGeometry;layout:TerminalLayout;light:Light;deckReefer:boolean;loadVisible:boolean;ferryVisible:boolean}
const fail=(path:string):never=>{throw new Error('Invalid terminal visual '+path);};
function obj(value:unknown,path:string):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))fail(path);return value as Record<string,unknown>;}
function exact(value:unknown,keys:string[],path:string){const v=obj(value,path);if(Object.keys(v).length!==keys.length||keys.some(k=>!(k in v)))fail(path+' keys');return v;}
function numbers(value:unknown,keys:string[],path:string){const v=exact(value,keys,path);for(const k of keys)if(typeof v[k]!=='number'||!Number.isFinite(v[k]))fail(path+'.'+k);}
export function validateTerminalVisual(value:Value):void{
 const s=exact(value,['width','horizon','layer','hover','now','departed','boxAt','loaded','scratch','portFrozen','watchdogs','trolley','geometry','layout','light','deckReefer','loadVisible','ferryVisible'],'snapshot');
 if(!['all','world','devices'].includes(String(s.layer))||typeof s.hover!=='string'||typeof s.boxAt!=='string')fail('strings');
 for(const k of ['departed','portFrozen','deckReefer','loadVisible','ferryVisible'])if(typeof s[k]!=='boolean')fail(k);
 for(const k of ['width','horizon','now','loaded'])if(typeof s[k]!=='number'||!Number.isFinite(s[k]))fail(k);
 const scratch=obj(s.scratch,'scratch');for(const [k,v] of Object.entries(scratch))if(!['liftT0','retT0','liftKind','alarm','cold','warm'].includes(k)||typeof v!=='number'||!Number.isFinite(v))fail('scratch.'+k);
 if(!Array.isArray(s.watchdogs))fail('watchdogs');for(const d of s.watchdogs as unknown[]){const q=exact(d,['at','from','to','progress'],'watchdog');if(q.at!==null&&typeof q.at!=='string'||typeof q.from!=='string'||typeof q.to!=='string'||typeof q.progress!=='number'||!Number.isFinite(q.progress))fail('watchdog fields');}
 numbers(s.trolley,['x','h','carry'],'trolley');const g=exact(s.geometry,['X','H'],'geometry');numbers(g.X,['rest','slot','chassis','gate','hatch','deck'],'geometry.X');numbers(g.H,['carry','chassis','slot','deck','hold'],'geometry.H');
 const l=exact(s.layout,['blocks','ladder','quay','kiosk','bridge','boom'],'layout');for(const k of ['ladder','quay','kiosk','boom'])if(typeof l[k]!=='number'||!Number.isFinite(l[k]))fail('layout.'+k);numbers(l.bridge,['x0'],'bridge');if(!Array.isArray(l.blocks))fail('layout arrays');for(const block of l.blocks as unknown[])numbers(block,['x'],'block');
 const light=exact(s.light,['day','min','facing','outdoor','sun','moon','sunRel','moonRel','daylight','night','low','morning','cover','direct','lamps','sunCol','shadow','w'],'light');for(const k of ['day','min','facing','sunRel','moonRel','daylight','night','low','cover','direct','lamps'])if(typeof light[k]!=='number'||!Number.isFinite(light[k]))fail('light.'+k);if(typeof light.outdoor!=='boolean'||typeof light.morning!=='boolean'||typeof light.sunCol!=='string')fail('light scalars');
 for(const k of ['sun','moon']){const body=exact(light[k],k==='sun'?['el','az','up']:['el','az','up','phase','lit'],k);for(const [f,v]of Object.entries(body))if(f==='up'?typeof v!=='boolean':typeof v!=='number'||!Number.isFinite(v))fail(k+'.'+f);}numbers(light.shadow,['len','dx','dy'],'shadow');
 if(light.w!==null){const w=exact(light.w,['kind','from','mix','cloud','rain','storm','fog','smog','heat','wet','wind'],'weather');for(const [k,v]of Object.entries(w))if(k==='kind'||k==='from'?typeof v!=='string':typeof v!=='number'||!Number.isFinite(v))fail('weather.'+k);}
}
/** Read-only compatibility queries for the extracted kernels; no engine or mutable model. */
export class TerminalViewState {constructor(private readonly state:TerminalVisual){}get(key:string){return this.state[key as 'departed'|'boxAt'|'loaded'];}get scratch(){return this.state.scratch;}now(){return this.state.now;}frozen(_id:string){return this.state.portFrozen;}watchdogs(){return this.state.watchdogs;}}
