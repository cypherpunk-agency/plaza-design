import {KEYRING,type DeviceData,type NounData,type SceneData,type SectorData,type KeyItem} from '../data';
export const nativeBlockKinds=['STORE','SENSE','ACT','DAEMON','CLOCK','LINK','LOG','GUARD','guard-rings','guard-cipher','guard-cryptex','guard-morse'] as const;
export type NativeBlockKind=typeof nativeBlockKinds[number];
export const nativeSealKinds=['key','guard','sequence','condition'] as const;
export type NativeSealKind=typeof nativeSealKinds[number];
function unique(device:DeviceData,stem:string){let i=1;while(device.nouns.some(n=>n.id===stem+'-'+i)||device.sectors?.some(s=>s.id===stem+'-'+i))i++;return stem+'-'+i;}
/** Data templates, not a second evaluator; all blocks run in SceneModel. */
export function addNativeBlock(device:DeviceData,kind:NativeBlockKind,name?:string):NounData{
 if(!nativeBlockKinds.includes(kind))throw Error('Unknown native noun template');const chosen=name?.trim();if(chosen&&(!/^[a-z][a-z0-9_.-]{0,63}$/.test(chosen)||['constructor','prototype','__proto__'].includes(chosen)||device.nouns.some(n=>n.id===chosen)||device.sectors?.some(s=>s.id===chosen)))throw Error('Choose an unused noun ID (letters, digits, dots, hyphens or underscores)');
 const id=chosen||unique(device,kind.toLowerCase()),plain=(kind:'STORE'|'SENSE'|'ACT'|'DAEMON',verb:string,event?:string):NounData=>({id,kind,verbs:[verb],...(event?{events:[event]}:{}),on:{[verb]:{say:['use '+id+' --'+verb,'New '+kind.toLowerCase()+' response.'],...(event?{do:[{emit:event}]}:{})}}});
 let noun:NounData;
 if(kind==='STORE')noun=plain('STORE','read');
 else if(kind==='SENSE')noun=plain('SENSE','sense','seen');
 else if(kind==='ACT')noun=plain('ACT','activate','done');
 else if(kind==='DAEMON')noun=plain('DAEMON','run','done');
 else if(kind==='CLOCK')noun={id,kind,events:['tick'],clock:{every:1000,first:1000,start:false}};
 else if(kind==='LINK')noun={id,kind,link:{}};
 else if(kind==='LOG')noun={...plain('STORE','read'),kind:'LOG',events:['record'],log:{rate:1,fall:.5,linger:3000,lockMs:10000}};
 else if(kind==='GUARD')noun={id,kind,events:['opened'],guard:{password:'secret',tries:3,lockMs:3000,trace:0}};
 else {const toy=kind.slice(6) as 'rings'|'cipher'|'cryptex'|'morse';noun={id,kind:'GUARD',events:['opened'],guard:{toy,tries:3,lockMs:3000,trace:0,...(toy==='rings'?{rings:{rings:[{speed:60,gap:60,start:40}],tolerance:22}}:toy==='cipher'?{cipher:{text:'WHVW',shift:3}}:toy==='cryptex'?{cryptex:{word:'key'}}:{morse:{message:'ok',unitMs:220}})}};}
 device.nouns.push(noun);return noun;
}
export function addNativeSector(device:DeviceData,data:SceneData,kind:NativeSealKind,keyring:ReadonlyMap<string,KeyItem>=KEYRING):SectorData{
 const id=unique(device,'sector');let seal:SectorData['seal'];
 if(kind==='key'){const key=keyring.keys().next().value;if(!key)throw Error('Create a key before adding a key seal');seal={key};}
 else if(kind==='guard'){const guard=device.nouns.find(n=>n.kind==='GUARD')??addNativeBlock(device,'GUARD');seal={guard:guard.id};}
 else if(kind==='sequence')seal={sequence:['open','confirm'],withinMs:1000,signal:true};
 else {const entry=Object.entries(data.state).find(([,v])=>typeof v==='boolean'||typeof v==='number');seal={if:entry?entry[0]+'='+String(entry[1]):'signal'};}
 const sector={id,label:'New sealed sector',seal};(device.sectors??=[]).push(sector);const content=addNativeBlock(device,'STORE');content.sector=id;return sector;
}
