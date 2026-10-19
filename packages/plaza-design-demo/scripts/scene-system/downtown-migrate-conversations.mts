import {gunzipSync} from 'node:zlib';import {readFileSync,writeFileSync} from 'node:fs';
const fixture=JSON.parse(gunzipSync(readFileSync('scripts/scene-system/fixtures/downtown-dialogue-original.json.gz')).toString('utf8'));
const file='src/ssg/game/scenes/downtown/gameplay.json',gameplay=JSON.parse(readFileSync(file,'utf8'));
if(gameplay.conversations?.['talk.downtown.fixer'])throw new Error('Downtown conversations already migrated; refusing to overwrite authored content.');
const goals=['handle','till','box','install','relay','gate','done'],hintGoals=['box','install','relay','gate'];
const row=(goal:string,fields:Record<string,unknown>)=>fixture.fixer.find((r:any)=>r.goal===goal&&Object.entries(fields).every(([k,v])=>JSON.stringify(k==='used'?r.input.hints[goal]:k==='keys'?r.input.keyring.filter((s:string)=>s.startsWith('glove.')):k in r.input.flags?r.input.flags[k]:r.input[k])===JSON.stringify(v)));
const node=(pages:string[],extra={})=>({speaker:'FIXER',pages,...extra});
const flag=(name:string,is=true)=>({flag:name,is}),state=(name:string,is:unknown)=>({state:name,is}),all=(...conditions:unknown[])=>({all:conditions}),any=(...conditions:unknown[])=>({any:conditions}),not=(condition:unknown)=>({not:condition});
const counts=Object.fromEntries(hintGoals.map(g=>[g,Math.max(...fixture.fixer.filter((r:any)=>r.goal===g&&r.out.spend).map((r:any)=>r.input.hints[g]))+1]));
const remaining=any(...hintGoals.flatMap(g=>Array.from({length:counts[g]},(_,i)=>all(state('downtown.goal',g),state('downtown.hints.'+g,i)))));
const gloves=all(flag('downtown.hasBothGloves'),flag('gloves',false));
const eligible=all(flag('metFixer'),flag('greeted'),not(state('downtown.goal','handle')),not(state('downtown.goal','till')),not(gloves),remaining);
for(const id of ['metFixer','greeted','gloves','downtown.hasControlled','downtown.hasBillboard','downtown.hasBothGloves'])if(!gameplay.flags.includes(id))gameplay.flags.push(id);
gameplay.state={'downtown.goal':{owner:'downtown',type:'enum',lifetime:'save',default:'handle',options:goals},'downtown.handle':{owner:'downtown',type:'string',lifetime:'save',default:'ghost',maxLength:2000},...Object.fromEntries(hintGoals.map(g=>['downtown.hints.'+g,{owner:'downtown.hints',type:'number',lifetime:'save',default:0,min:0,max:1000000}]))};
gameplay.events=['downtown.fixer.hint.paid'];
gameplay.purchases={'downtown.fixer.hint':{service:true,basePrice:1,modifiers:[{id:'not-a-paid-hint',when:not(eligible),amount:-1,scope:'both'}]}};
const nodes:any={},entry:any[]=[],commands:any={};
for(const [id,key]of [['first','metFixer'],['greet','greeted'],['gloves','gloves']])commands['downtown.fixer.'+id]={sources:['conversation'],actions:[{flag:key,value:true}]};
const first=fixture.fixer.find((r:any)=>!r.input.flags.metFixer);nodes.first=node(first.out.pages,{onEnter:'downtown.fixer.first',completion:{terminalPrefill:first.out.ask}});entry.push({when:flag('metFixer',false),node:'first'});
const handle=row('handle',{metFixer:true});nodes.handle=node(handle.out.pages,{completion:{terminalPrefill:handle.out.ask}});entry.push({when:state('downtown.goal','handle'),node:'handle'});
const greeting=row('till',{metFixer:true,greeted:false,handle:'MORGAN'});nodes.greet=node(greeting.out.pages.map((p:string)=>p.replace('MORGAN.','{state:downtown.handle}.')),{template:true,onEnter:'downtown.fixer.greet'});entry.push({when:flag('greeted',false),node:'greet'});
nodes.till=node(row('till',{metFixer:true,greeted:true}).out.pages);entry.push({when:state('downtown.goal','till'),node:'till'});
nodes.gloves=node(row('box',{metFixer:true,greeted:true,gloves:false,keys:['glove.left','glove.right']}).out.pages,{onEnter:'downtown.fixer.gloves'});entry.push({when:gloves,node:'gloves'});
for(const goal of hintGoals){for(let used=0;used<counts[goal];used++){
 const id=goal+'-hint-'+used,when=all(state('downtown.goal',goal),state('downtown.hints.'+goal,used));
 commands['downtown.fixer.'+id]={sources:['conversation'],when:all(eligible,when),actions:[{purchase:'downtown.fixer.hint'},{state:'downtown.hints.'+goal,add:1},{emit:'downtown.fixer.hint.paid'}]};
 nodes[id]=node(row(goal,{metFixer:true,greeted:true,gloves:true,keys:[],tokens:1,used}).out.pages,{onEnter:'downtown.fixer.'+id});entry.push({when:all(when,{tokensAtLeast:1}),node:id});
 }
 const exhausted=goal+'-exhausted',broke=goal+'-broke';nodes[exhausted]=node(row(goal,{metFixer:true,greeted:true,gloves:true,keys:[],tokens:0,used:9}).out.pages);nodes[broke]=node(row(goal,{metFixer:true,greeted:true,gloves:true,keys:[],tokens:0,used:0}).out.pages);
 entry.push({when:all(state('downtown.goal',goal),not(any(...Array.from({length:counts[goal]},(_,i)=>state('downtown.hints.'+goal,i))))),node:exhausted},{when:state('downtown.goal',goal),node:broke});
}
nodes.done=node(row('done',{metFixer:true,greeted:true,gloves:true,keys:[],used:0}).out.pages);entry.push({node:'done'});
gameplay.commands={...gameplay.commands,...commands};gameplay.conversations['talk.downtown.fixer']={entry,nodes};
for(const id of ['hood','umbrella','hat','unknown']){const select=(controlled:string[])=>fixture.npcs.find((r:any)=>r.id===id&&JSON.stringify(r.input.controlled)===JSON.stringify(controlled)).out;const speaker=id==='hood'?'HOODED STRANGER':id==='umbrella'?'UMBRELLA':id==='hat'?'MAN IN A HAT':'STRANGER';gameplay.conversations['talk.downtown.'+id]={entry:[...(id==='hood'?[{when:flag('downtown.hasBillboard'),node:'pigeon'}]:[]),{when:flag('downtown.hasControlled'),node:'after'},{node:'before'}],nodes:{before:{speaker,pages:select([])},after:{speaker,pages:select(['foreign.node'])},...(id==='hood'?{pigeon:{speaker,pages:select(['0x3C'])}}:{})}};}
writeFileSync(file,JSON.stringify(gameplay,null,2)+'\n');console.log('Lifted Downtown Fixer/NPC graphs directly from immutable6240-case fixture; no fixture edits.');
