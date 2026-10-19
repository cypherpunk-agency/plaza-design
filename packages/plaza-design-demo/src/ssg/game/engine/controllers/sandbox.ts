import type {SceneData,DeviceData} from '../../data/types';
import type {SceneModel} from '../model';
import type {SandboxSnapshot} from '../../art/assemblies/sandbox-state';
/** Inputs to the registered QA artwork. Role names identify picture fields, never a second saved state. */
export const sandboxValueTypes={"lampOn": "boolean", "memo": "number", "phase": "string", "recOn": "boolean", "beaconOn": "boolean", "count": "number", "hatchOpen": "boolean", "fanOn": "boolean", "loginOk": "boolean", "ringsOpen": "boolean", "cipherOpen": "boolean", "cryptexOpen": "boolean", "morseOpen": "boolean", "mains": "boolean", "auditOn": "boolean", "stamped": "number", "belt": "boolean", "cups": "number", "paid": "number", "nightLight": "boolean", "ventOpen": "boolean"} as const;
export const sandboxPulseRoles=["sensor", "button", "horn", "counter", "plate", "cutter", "bell", "printer", "stamp", "siren", "coffee.cup", "reader", "till", "rgb.red", "rgb.green", "rgb.blue"] as const;
export const sandboxDeviceRoles=["audit", "beacon", "bell", "button", "cabinet", "cipher", "coffee", "conveyor", "counter", "cryptex", "cutter", "fan", "hatch", "horn", "lamp", "login", "mains", "memo", "metronome", "morse", "netjack", "nightlight", "plate", "port", "printer", "rain", "reader", "recorder", "rgb", "rings", "sensor", "siren", "spool", "stamp", "till", "unit7", "vent"] as const;
export const sandboxOpenRoles=['cabinet/keyed','cabinet/seq','cabinet/cond']as const;
export interface SandboxController {kind:'sandbox';version:1;values:Partial<Record<keyof typeof sandboxValueTypes,string>>;pulses:Partial<Record<typeof sandboxPulseRoles[number],string>>;devices:Partial<Record<typeof sandboxDeviceRoles[number],string>>;opened:Partial<Record<typeof sandboxOpenRoles[number],string>>;night?:string;clock?:{device:string;noun:string};network?:string;audit?:string;login?:{device:string;noun:string};auditEvent?:string;pulseTuning?:string}
export const sandboxController=(data:Pick<SceneData,'controller'>)=>data.controller?.kind==='sandbox'?data.controller:undefined;
export function sandboxControllerProblems(data:SceneData,nodes:ReadonlyMap<string,DeviceData>=new Map(),reads:readonly string[]=[]):string[]{
 const c=sandboxController(data),e:string[]=[],object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
 if(!c||data.id!=='sandbox'||c.version!==1||Object.keys(c).some(k=>!['kind','version','values','pulses','devices','opened','night','clock','network','audit','login','auditEvent','pulseTuning'].includes(k))||![c.values,c.pulses,c.devices,c.opened].every(object))return['Invalid Sandbox picture controller'];
 const all=new Map([...nodes,...(data.nodes??[]).map(d=>[d.id,d]as const),...data.devices.map(d=>[d.id,d]as const)]),local=(ref:string)=>data.devices.find(d=>d.id===ref),noun=(ref:string)=>{const i=ref.indexOf('.');return all.get(ref.slice(0,i))?.nouns.find(n=>n.id===ref.slice(i+1));},endpoint=(ref:unknown,flag:'clock'|'guard')=>object(ref)&&Object.keys(ref).sort().join()==='device,noun'&&all.get(String(ref.device))?.nouns.find(n=>n.id===ref.noun)?.[flag];
 for(const[role,ref]of Object.entries(c.values))if(!Object.prototype.hasOwnProperty.call(sandboxValueTypes,role)||typeof ref!=='string'||!Object.prototype.hasOwnProperty.call(data.state,ref)||typeof data.state[ref]!==sandboxValueTypes[role as keyof typeof sandboxValueTypes])e.push('Sandbox value reference '+role);
 for(const[role,ref]of Object.entries(c.devices))if(!(sandboxDeviceRoles as readonly string[]).includes(role)||typeof ref!=='string'||!local(ref))e.push('Sandbox device role '+role);
 for(const[role,ref]of Object.entries(c.pulses))if(!(sandboxPulseRoles as readonly string[]).includes(role)||typeof ref!=='string'||!local(ref)&&!noun(ref))e.push('Sandbox pulse reference '+role);
 for(const[role,ref]of Object.entries(c.opened)){const parts=typeof ref==='string'?ref.split('/'):[];if(!(sandboxOpenRoles as readonly string[]).includes(role)||parts.length!==2||!all.get(parts[0])?.sectors?.some(s=>s.id===parts[1]))e.push('Sandbox sector reference '+role);}
 if(c.night!==undefined&&(!Object.prototype.hasOwnProperty.call(data.state,c.night)&&!reads.includes(c.night)))e.push('Sandbox night read');
 if(c.clock!==undefined&&!endpoint(c.clock,'clock'))e.push('Sandbox clock reference');
 if(c.login!==undefined&&!endpoint(c.login,'guard'))e.push('Sandbox login reference');
 if(c.network!==undefined&&!nodes.has(c.network)&&!data.nodes?.some(n=>n.id===c.network))e.push('Sandbox network reference');
 if(c.audit!==undefined&&!local(c.audit))e.push('Sandbox audit device');
 if(c.auditEvent!==undefined){const parts=c.auditEvent.split(':');if(parts.length!==2||!noun(parts[0])?.events?.includes(parts[1]))e.push('Sandbox audit event');}
 if(c.pulseTuning!==undefined&&(!Object.prototype.hasOwnProperty.call(data.tuning,c.pulseTuning)||!Number.isFinite(data.tuning[c.pulseTuning])||data.tuning[c.pulseTuning]<=0))e.push('Sandbox pulse duration tuning');
 return e;
}
export function sandboxModelSnapshot(m:SceneModel):Pick<SandboxSnapshot,'values'|'derived'|'net'|'clocks'|'pulses'|'frozen'|'opened'|'traces'|'lockouts'|'links'>{
 const c=sandboxController(m.data),s:ReturnType<typeof sandboxModelSnapshot>={values:{},derived:{},net:{},clocks:{},pulses:{},frozen:[],opened:[],traces:{},lockouts:{},links:[]};if(!c)return s;
 for(const[role,ref]of Object.entries(c.values)){const v=m.get(ref);if(v!==undefined)s.values[role]=v;}
 if(c.night!==undefined){const v=m.value(c.night);if(v!==undefined)s.derived.night=v;}
 if(c.network!==undefined){const v=m.net.get(c.network);if(v!==undefined)s.net.qasrv=v;}
 if(c.clock){const next=m.clocks.next(c.clock.device+'.'+c.clock.noun);s.clocks['metronome.beat']=next?{ms:next.ms}:null;}
 for(const[role,ref]of Object.entries(c.pulses)){const at=m.scratch['pulse.'+ref];s.pulses[role]=at===undefined||c.pulseTuning===undefined?0:Math.max(0,1-(m.now()-at)/m.data.tuning[c.pulseTuning]);}
 s.frozen=Object.entries(c.devices).filter(([,ref])=>m.frozen(ref)).map(([role])=>role);s.opened=Object.entries(c.opened).filter(([,ref])=>m.opened.has(ref)).map(([role])=>role);
 if(c.audit!==undefined){s.traces.audit=m.traceOf(c.audit);s.lockouts.audit=m.lockLeft(c.audit);}
 if(c.login)s.lockouts['login.login']=m.lockLeft(c.login.device+'.'+c.login.noun);
 if(c.auditEvent!==undefined&&m.links.some(l=>l.from===c.auditEvent))s.links=[{from:'audit.log:entry'}];
 return s;
}
