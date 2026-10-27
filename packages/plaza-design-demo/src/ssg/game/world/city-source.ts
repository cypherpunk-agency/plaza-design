/** Source-owned world registries, independent of rendering and campaign storage. */
import baseline from './city.json';
import type {CitySource} from './city';
export interface CitySourceContext {flags?:ReadonlySet<string>;scenes:Readonly<Record<string,{exits:readonly {id:string;to?:string;at?:string}[]}>>}
const fail=(at:string):never=>{throw new Error('Invalid city source: '+at);};
function object(v:unknown):Record<string,any>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('plain object');return v as Record<string,any>;}
function fields(v:unknown,allowed:readonly string[],required=allowed){const r=object(v);if(Object.keys(r).some(k=>!allowed.includes(k))||required.some(k=>!Object.prototype.hasOwnProperty.call(r,k)))fail('unknown or missing fields');return r;}
const text=(v:unknown)=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail('text');};
const name=(v:unknown)=>{if(typeof v!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(v)||['constructor','prototype','__proto__'].includes(v))fail('id');};
function list(v:unknown,max=128):any[]{if(!Array.isArray(v)||v.length>max)fail('bounded list');return v as any[];}
function number(v:unknown,min=-1000000,max=1000000){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail('number');}
function point(v:unknown){const p=list(v,2);if(p.length!==2)fail('point');p.forEach(n=>number(n));}
function path(v:unknown){const p=list(v,128);if(p.length<2)fail('path');p.forEach(point);}
function unique(values:unknown[]){values.forEach(name);if(new Set(values).size!==values.length)fail('duplicate ids');return new Set(values as string[]);}
function rgb(v:unknown){if(typeof v!=='string'||!/^\d{1,3},\d{1,3},\d{1,3}$/.test(v)||v.split(',').some(s=>Number(s)>255))fail('RGB color');}
export function validateCitySource(value:unknown,context?:CitySourceContext):CitySource {
 const seen=new Set<object>();function json(v:unknown,depth=0):void{if(depth>24)fail('depth');if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return;if(!v||typeof v!=='object'||seen.has(v))fail('finite JSON');if(!Array.isArray(v))object(v);const node=v as object;seen.add(node);for(const[k,child]of Object.entries(node)){if(['__proto__','constructor','prototype'].includes(k))fail('reserved key');json(child,depth+1);}seen.delete(node);}json(value);if(JSON.stringify(value).length>128000)fail('size');
 const current=object(value);if(current.version!==2)fail('version');
 const d=fields(current,['version','ACCESS','DISTRICTS','PLACES','TRANSPORT','LINE','STATIONS','HARBOR_FLAG','LOCKS','DRIVER_HARBOR','STAND_IDS','STANDS','FARE','HOP','DRIVER_BROKE','MAP_W','MAP_H','DISTRICT_MAP','PLACE_MAP','STATION_MAP','PAD_MAP','LOOP_MAP','LINES_PLANNED','LINKS','DISTRICT_REVEAL','PLACE_IN_VIEW']);if(d.version!==2)fail('version');
 const districts=list(d.DISTRICTS,32);if(!districts.length)fail('districts');const districtIds=unique(districts.map(r=>r.id));for(const row of districts){const r=fields(row,['id','name','short','stratum']);text(r.name);text(r.short);if(!['overworld','street','underworld'].includes(r.stratum))fail('stratum');}
 const places=list(d.PLACES,128);if(!places.length)fail('places');const placeIds=unique(places.map(r=>r.id)),members=new Set<string>();
 const knownScenes=new Set(context?Object.keys(context.scenes):baseline.PLACES.flatMap(p=>p.scenes));
 const hasScene=(id:unknown)=>{name(id);if(!knownScenes.has(String(id)))fail('unknown scene '+id);};
 const destination=(id:unknown,at:unknown)=>{hasScene(id);if(at!==undefined){name(at);if(context&&!context.scenes[String(id)].exits.some(e=>e.id===at))fail('unknown arrival '+id+'/'+at);}};
 for(const row of places){const p=fields(row,['id','name','district','entrance','at','scenes','access'],['id','name','district','entrance','scenes']);text(p.name);if(p.district!==null&&!districtIds.has(p.district))fail('place district');const scenes=list(p.scenes,128);if(!scenes.length)fail('place without scene');for(const scene of scenes){hasScene(scene);if(members.has(scene))fail('scene belongs to multiple places');members.add(scene);}if(!scenes.includes(p.entrance))fail('place entrance outside membership');destination(p.entrance,p.at);}
 if(context)for(const id of Object.keys(context.scenes))if(!members.has(id))fail('scene without place '+id);
 const policies=object(d.ACCESS);if(Object.keys(policies).length>128)fail('access policies');
 for(const[id,row]of Object.entries(policies)){name(id);const policy=fields(row,['exit','reason']),exit=fields(policy.exit,['scene','id']);text(policy.reason);hasScene(exit.scene);name(exit.id);if(context&&!context.scenes[exit.scene].exits.some(e=>e.id===exit.id))fail('unknown access exit '+exit.scene+'/'+exit.id);}
 const access=(id:unknown)=>{if(id!==undefined){name(id);if(!Object.prototype.hasOwnProperty.call(policies,String(id)))fail('unknown access policy '+id);}};
 for(const place of places)access(place.access);
 const keys=(v:unknown,ids:Set<string>)=>{const r=object(v);if(Object.keys(r).length!==ids.size||Object.keys(r).some(k=>!ids.has(k)))fail('registry keys');return r;};
 const order=list(d.LINE,16),stations=unique(order);if(order.length!==3||!['downtown','galleria','harbor'].every(id=>stations.has(id)))fail('registered metro stations');for(const s of Object.values(keys(d.STATIONS,stations))){const r=fields(s,['name','scene','up','at'],['name','scene','up']);text(r.name);destination(r.scene,r.at);hasScene(r.up);}
 if(new Set(Object.values(d.STATIONS).map((s:any)=>s.scene)).size!==stations.size)fail('ambiguous station scene');
 const taxiOrder=list(d.STAND_IDS,16),stands=unique(taxiOrder);if(taxiOrder.length!==3||!['downtown','galleria','harbor'].every(id=>stands.has(id)))fail('registered taxi stands');for(const s of Object.values(keys(d.STANDS,stands))){const r=fields(s,['name','scene','at'],['name','scene']);text(r.name);destination(r.scene,r.at);}
 if(new Set(Object.values(d.STANDS).map((s:any)=>s.scene)).size!==stands.size)fail('ambiguous taxi scene');
 const transport=fields(d.TRANSPORT,['boarding','siding']);for(const route of Object.values(transport)){const r=fields(route,['scene','entrance'],['scene']);destination(r.scene,r.entrance);}
 number(d.FARE,0,1000000);if(!Number.isSafeInteger(d.FARE))fail('fare');number(d.HOP,1,1000000);number(d.MAP_W,1,100000);number(d.MAP_H,1,100000);name(d.HARBOR_FLAG);if(context?.flags&&!context.flags.has(d.HARBOR_FLAG))fail('unknown shared harbor access flag '+d.HARBOR_FLAG);
 const locks=object(d.LOCKS);if(Object.keys(locks).length>32)fail('destination locks');
 for(const[id,row]of Object.entries(locks)){name(id);const lock=fields(row,['unlockedBy','destinations','reason']);if(lock.unlockedBy!=='HARBOR_FLAG')fail('a lock is unlocked by a registered world flag role (HARBOR_FLAG)');text(lock.reason);const dest=list(lock.destinations,32);if(!dest.length)fail('lock without destination');unique(dest);if(dest.some(x=>!districtIds.has(x)&&!stations.has(x)&&!stands.has(x)))fail('lock destination is a district, station or taxi stand of this city');}
 for(const key of ['DRIVER_HARBOR','DRIVER_BROKE']){const pages=list(d[key],16);if(!pages.length)fail('transport dialogue');pages.forEach(text);}
 for(const plan of Object.values(keys(d.DISTRICT_MAP,districtIds))){const p=fields(plan,['centre','sep','dens','col','frame','label','note']);if(p.centre!==null)point(p.centre);number(p.sep,p.centre===null?0:.1,1000);number(p.dens,0,100);rgb(p.col);const f=list(p.frame,4);if(f.length!==4)fail('district frame');f.forEach(n=>number(n));if(f[2]<=0||f[3]<=0)fail('district frame extent');point(p.label);if(typeof p.note!=='string'||p.note.length>2000)fail('district note');}
 for(const [id,p]of Object.entries(object(d.PLACE_MAP))){if(!placeIds.has(id))fail('unknown mapped place');point(p);}
 for(const p of Object.values(keys(d.STATION_MAP,stations)))point(p);for(const p of Object.values(keys(d.PAD_MAP,stands)))point(p);path(d.LOOP_MAP);
 const lines=list(d.LINES_PLANNED,32);unique(lines.map(l=>l.id));for(const row of lines){const l=fields(row,['id','name','short','col','width','dash','path','stops'],['id','name','short','col','width','path','stops']);text(l.name);text(l.short);rgb(l.col);number(l.width,.1,100);if(l.dash!==undefined)list(l.dash,8).forEach(v=>number(v,.1,100));path(l.path);for(const row of list(l.stops,64)){const stop=fields(row,['name','pt','district']);text(stop.name);point(stop.pt);if(!districtIds.has(stop.district))fail('planned stop district');}}
 for(const row of list(d.LINKS,128)){const l=fields(row,['kind','name','from','to','path','state','at','access'],['kind','name','from','to','path','state']);if(!['walk','road','elevator','taxi','bridge','drain','tunnel','canal','lift'].includes(l.kind)||!['open','gate','planned'].includes(l.state)||!districtIds.has(l.from)||!districtIds.has(l.to))fail('link');text(l.name);path(l.path);access(l.access);if(l.state==='gate'&&l.access===undefined)fail('gate link requires access policy');if(l.at!==undefined)list(l.at).forEach(hasScene);}
 for(const row of Object.values(keys(d.DISTRICT_REVEAL,districtIds))){const r=fields(row,['near','landmark'],['near']);const near=list(r.near,32);unique(near);if(near.some(id=>!districtIds.has(id))||r.landmark!==undefined&&typeof r.landmark!=='boolean')fail('district reveal');}
 for(const[id,rows]of Object.entries(object(d.PLACE_IN_VIEW))){if(!placeIds.has(id))fail('discovery place');const scenes=list(rows);unique(scenes);scenes.forEach(hasScene);}
 return structuredClone(d) as CitySource;
}
