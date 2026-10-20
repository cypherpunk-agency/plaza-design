import type {SceneData} from '../../data/types';import type {SceneModel} from '../model';import type {GameplayDefinition} from '../gameplay/types';
import {numericScalarRead,stringScalarRead} from '../gameplay/queries';
export const washerRoles=['w1','w2','w3','w4']as const;
export const laundryStateTypes={breaker:'string',w1:'string',w2:'string',w3:'string',w4:'string'}as const;
export const laundryValueRoles=['tripped','running','done','open','empty']as const;
export interface LaundromatController {kind:'laundromat';version:1;state:Partial<Record<keyof typeof laundryStateTypes,string>>;reads:Partial<Record<'waiting'|'door3',string>>;clock?:{device:string;noun:string};deadlines:Partial<Record<typeof washerRoles[number],string>>;geometry:Record<'window'|'breaker'|typeof washerRoles[number],string>;values:Record<typeof laundryValueRoles[number],string>}
export const laundryController=(data:Pick<SceneData,'controller'>)=>data.controller?.kind==='laundromat'?data.controller:undefined;
export function laundryControllerProblems(data:SceneData):string[]{
 const c=laundryController(data),e:string[]=[],object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype,name=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=128&&!['constructor','prototype','__proto__'].includes(v);
 if(!c||data.id!=='laundromat'||c.version!==1||Object.keys(c).some(k=>!['kind','version','state','reads','clock','deadlines','geometry','values'].includes(k))||![c.state,c.reads,c.deadlines,c.geometry,c.values].every(object))return['Invalid Laundromat picture controller'];
 for(const[role,ref]of Object.entries(c.state))if(!Object.prototype.hasOwnProperty.call(laundryStateTypes,role)||typeof ref!=='string'||!Object.prototype.hasOwnProperty.call(data.state,ref)||typeof data.state[ref]!=='string')e.push('Laundromat state reference '+role);
 if(Object.keys(c.geometry).sort().join()!==['window','breaker',...washerRoles].sort().join()||Object.values(c.geometry).some(v=>!name(v)))e.push('Laundromat geometry references');
 if(Object.keys(c.values).sort().join()!==[...laundryValueRoles].sort().join()||Object.values(c.values).some(v=>typeof v!=='string'||v.length>2000))e.push('Laundromat display values');
 if(Object.keys(c.reads).some(k=>!['waiting','door3'].includes(k))||Object.values(c.reads).some(v=>!name(v))||Object.keys(c.deadlines).some(k=>!washerRoles.includes(k as typeof washerRoles[number]))||Object.values(c.deadlines).some(v=>!name(v)))e.push('Laundromat program references');
 if(c.clock!==undefined&&(!object(c.clock)||Object.keys(c.clock).sort().join()!=='device,noun'||![...data.devices,...data.nodes??[]].find(d=>d.id===c.clock!.device)?.nouns.find(n=>n.id===c.clock!.noun)?.clock))e.push('Laundromat clock reference');
 return e;
}
export function validateLaundryGameplayBindings(data:SceneData,g:GameplayDefinition){const c=laundryController(data);if(!c)return;for(const[role,ref]of Object.entries(c.reads))if(!Object.prototype.hasOwnProperty.call(g.queries??{},ref)||!(role==='waiting'?numericScalarRead({query:ref},g):stringScalarRead({query:ref},g)))throw Error('Laundromat picture requires typed current query '+ref);for(const ref of Object.values(c.deadlines))if(!g.native?.deadlines?.[ref]?.startedAt)throw Error('Laundromat picture requires deadline progress '+ref);}
/** Read the executing program's SceneTime progress; no separate schedule or saved state. */
export function laundryVisualSnapshot(m:SceneModel,g:GameplayDefinition){
 const c=laundryController(m.data),read=(role:keyof typeof laundryStateTypes)=>c?.state[role]===undefined?undefined:m.get(c.state[role]!),next=c?.clock?m.clocks.next(c.clock.device+'.'+c.clock.noun):null,door=c?.reads.door3===undefined?undefined:m.value(c.reads.door3);
 const values:Record<string,string|number|boolean>={tripped:!!c&&c.state.breaker!==undefined&&read('breaker')===c.values.tripped,clear:c?.reads.waiting!==undefined&&!Number(m.value(c.reads.waiting)),nextRunning:next!==null,nextMs:next?.ms??0,door3:c&&door===c.values.open?'open':c&&door===c.values.empty?'empty':'closed'};
 for(const role of washerRoles){const state=read(role),deadline=c?.deadlines[role]?g.native?.deadlines?.[c.deadlines[role]!]:undefined;values[role]=c&&state===c.values.running?'running':c&&state===c.values.done?'done':'idle';const start=deadline?.startedAt?m.scratch[deadline.startedAt]??m.now():m.now();values['p'+role.slice(1)]=deadline?Math.min(1,(m.now()-start)/(m.data.tuning[deadline.duration.tuning]+(deadline.duration.offsetMs??0))):0;}
 return values;
}
