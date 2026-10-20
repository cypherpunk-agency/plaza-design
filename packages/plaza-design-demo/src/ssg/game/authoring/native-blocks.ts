import {KEYRING,type DeviceData,type NounData,type SceneData,type SectorData,type KeyItem,type Layer,type PartFunction} from '../data';
/** Part templates by what they are (docs/design/CIRCUIT-VOCABULARY.md): each sets a layer and a function. */
export const nativeBlockKinds=['file','sensor','actuator','character','clock','port','recorder','login','lock-rings','lock-cipher','lock-cryptex','lock-morse'] as const;
export type NativeBlockKind=typeof nativeBlockKinds[number];
export const nativeSealKinds=['key','guard','sequence','condition'] as const;
export type NativeSealKind=typeof nativeSealKinds[number];
function unique(device:DeviceData,stem:string){let i=1;while(device.nouns.some(n=>n.id===stem+'-'+i)||device.sectors?.some(s=>s.id===stem+'-'+i))i++;return stem+'-'+i;}
/** Data templates, not a second evaluator; all blocks run in SceneModel. */
export function addNativeBlock(device:DeviceData,kind:NativeBlockKind,name?:string):NounData{
 if(!nativeBlockKinds.includes(kind))throw Error('Unknown native noun template');const chosen=name?.trim();if(chosen&&(!/^[a-z][a-z0-9_.-]{0,63}$/.test(chosen)||['constructor','prototype','__proto__'].includes(chosen)||device.nouns.some(n=>n.id===chosen)||device.sectors?.some(s=>s.id===chosen)))throw Error('Choose an unused noun ID (letters, digits, dots, hyphens or underscores)');
 const id=chosen||unique(device,kind.replace(/^lock-.*/,'lock')),part=(layer:Layer,fn:PartFunction)=>({id,layer,function:fn}),plain=(layer:Layer,fn:PartFunction,verb:string,event?:string):NounData=>({...part(layer,fn),verbs:[verb],...(event?{events:[event]}:{}),on:{[verb]:{say:['use '+id+' --'+verb,'New '+kind+' response.'],...(event?{do:[{emit:event}]}:{})}}});
 let noun:NounData;
 if(kind==='file')noun=plain('data','hold','read');
 else if(kind==='sensor')noun=plain('hardware','sense','sense','seen');
 else if(kind==='actuator')noun=plain('hardware','act','activate','done');
 else if(kind==='character')noun=plain('software','talk','run','done');
 else if(kind==='clock')noun={...part('hardware','time'),events:['tick'],clock:{every:1000,first:1000,start:false}};
 else if(kind==='port')noun={...part('hardware','connect'),link:{}};
 else if(kind==='recorder')noun={...plain('software','record','read'),events:['record'],log:{rate:1,fall:.5,linger:3000,lockMs:10000}};
 else if(kind==='login')noun={...part('software','gate'),events:['opened'],guard:{password:'secret',tries:3,lockMs:3000,trace:0}};
 else {const toy=kind.slice(5) as 'rings'|'cipher'|'cryptex'|'morse';noun={...part('hardware','gate'),events:['opened'],guard:{toy,tries:3,lockMs:3000,trace:0,...(toy==='rings'?{rings:{rings:[{speed:60,gap:60,start:40}],tolerance:22}}:toy==='cipher'?{cipher:{text:'WHVW',shift:3}}:toy==='cryptex'?{cryptex:{word:'key'}}:{morse:{message:'ok',unitMs:220}})}};}
 device.nouns.push(noun);return noun;
}
export function addNativeSector(device:DeviceData,data:SceneData,kind:NativeSealKind,keyring:ReadonlyMap<string,KeyItem>=KEYRING):SectorData{
 const id=unique(device,'sector');let seal:SectorData['seal'];
 if(kind==='key'){const key=keyring.keys().next().value;if(!key)throw Error('Create a key before adding a key seal');seal={key};}
 else if(kind==='guard'){const guard=device.nouns.find(n=>n.guard)??addNativeBlock(device,'login');seal={guard:guard.id};}
 else if(kind==='sequence')seal={sequence:['open','confirm'],withinMs:1000,signal:true};
 else {const entry=Object.entries(data.state).find(([,v])=>typeof v==='boolean'||typeof v==='number');seal={if:entry?entry[0]+'='+String(entry[1]):'signal'};}
 const sector={id,label:'New sealed sector',seal};(device.sectors??=[]).push(sector);const content=addNativeBlock(device,'file');content.sector=id;return sector;
}
