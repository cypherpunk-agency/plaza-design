/** One-time immutable capture and conversion of the remaining Market ordinary content. */
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const fixture='scripts/scene-system/fixtures/market-ordinary-baseline.json';if(fs.existsSync(fixture))throw new Error('Market baseline exists; never overwrite it');
const original=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source'),{marketScene}=await import(pathToFileURL(path.join(original,'scenes/market/index.ts')).href),old=marketScene();
let saved:GameplayState={flags:{},items:{},tokens:0};const oldSession=new GameplaySession(old.gameplay,{read:()=>saved,write:s=>{saved=s;}});
const lines:Record<string,string[][]>={},cases:any[]=[];
for(const[id,tokens]of Object.entries({haggle:[0,0,0,0,0,2,2],fortune:[0,2,2,2,2,2,2]})){const use=old.uses.find((u:any)=>u.id===id);lines[id]=[];for(const amount of tokens){saved.tokens=amount;const before=structuredClone(saved),price=typeof use.price==='function'?use.price(saved.flags):use.price??0;
 const pages=use.use({gameplay:oldSession,get tokens(){return saved.tokens;},flags:saved.flags,pay:(n:number)=>saved.tokens>=n?(saved.tokens-=n,true):false,set:(f:string)=>{saved.flags[f]=true;}});
 cases.push({id,before,price,pages,after:structuredClone(saved)});lines[id].push(pages);
}}
fs.writeFileSync(fixture,JSON.stringify({version:1,cases},null,2)+'\n');
const gameplay=JSON.parse(fs.readFileSync('src/ssg/game/scenes/market/gameplay.json','utf8'));
gameplay.flags.push('market:umbrella');gameplay.state['market.haggle']={owner:'market',lifetime:'save',type:'number',default:0,min:0,max:4};
gameplay.purchases={...gameplay.purchases,'market.umbrella':{service:true,basePrice:1,modifiers:[{id:'still-haggling-or-owned',amount:-1,scope:'both',when:{any:[{flag:'market:umbrella'},...[0,1,2,3].map(i=>({state:'market.haggle',is:i}))]}}]},'market.fortune':{service:true,basePrice:1}};
for(let i=0;i<4;i++)gameplay.commands['market.haggle.'+i]={sources:['interaction'],when:{state:'market.haggle',is:i},actions:[{state:'market.haggle',set:i+1}]};
gameplay.commands['market.umbrella.buy']={sources:['interaction'],when:{all:[{state:'market.haggle',is:4},{not:{flag:'market:umbrella'}},{tokensAtLeast:1}]},actions:[{purchase:'market.umbrella'},{flag:'market:umbrella',value:true}]};
for(let i=0;i<5;i++)gameplay.commands['market.fortune.'+i].actions=gameplay.commands['market.fortune.'+i].actions.map((a:any)=>'tokens'in a?{purchase:'market.fortune'}:a);
const use=(id:string)=>old.uses.find((u:any)=>u.id===id),route=(pages:string[],command?:string,when?:any,failure?:string[])=>({pages,...command?{command}:{},...when?{when}:{},...failure?{failure}:{}});
const h=use('haggle'),f=use('fortune');
const scene={version:1,id:'market',name:old.name,intro:old.intro,
 uses:[{id:h.id,name:h.name,label:h.label,purchase:'market.umbrella',routes:[route(lines.haggle[6],undefined,{flag:'market:umbrella'}),...[0,1,2,3].map(i=>route(lines.haggle[i],'market.haggle.'+i,{state:'market.haggle',is:i})),route(lines.haggle[5],'market.umbrella.buy',undefined,lines.haggle[4])]},
 {id:f.id,name:f.name,label:f.label,purchase:'market.fortune',cycle:true,cycleState:'market.fortune',routes:[0,1,2,3,4].map(i=>route(lines.fortune[i+1],'market.fortune.'+i,undefined,lines.fortune[0]))}],
 people:old.people.filter((p:any)=>p.id&&p.talk?.length).map((p:any)=>({id:p.id,name:p.name,talk:typeof p.talk[0]==='string'?[p.talk]:p.talk,...p.lines?{lines:p.lines}:{}})),
 readables:old.readables.map((r:any)=>({id:r.id,name:r.name,pages:r.pages,promptH:r.promptH})),
 exits:old.exits.map((e:any)=>({id:e.id,to:e.to,...e.at?{at:e.at}:{},...e.action?{action:e.action}:{},label:e.label,...e.promptH!==undefined?{promptH:e.promptH}:{}}))};
for(const[name,value]of Object.entries({scene,gameplay}))fs.writeFileSync('src/ssg/game/scenes/market/'+name+'.json',JSON.stringify(value,null,2)+'\n');
console.log('Market: captured '+cases.length+' original ordinary interaction cases and '+scene.people.length+' remaining NPCs.');
