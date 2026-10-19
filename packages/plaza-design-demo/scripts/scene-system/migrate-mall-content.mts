/** One-time data extraction from the immutable pre-migration implementation. */
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const fixture='scripts/scene-system/fixtures/mall-interactions-baseline.json';
if(fs.existsSync(fixture))throw new Error('Mall baseline already captured; never overwrite preservation evidence');
const {mallScene}=await import(pathToFileURL(path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/scenes/mall/index.ts')).href);
const old=mallScene(),flags:Record<string,boolean>={},items:Record<string,number>={},cases:any[]=[],lines:Record<string,string[][]>={};
const schedule:Record<string,number[]>={implants:[20,0,20,20],kiosk:[20,20],pawn:[20,20,20,20],deck:[0,20,20],florist:[20,0,20,20],keys:[20,0,20,20],order:[0,20,20,20,20]};
for(const[id,amounts]of Object.entries(schedule)){const u=old.uses.find((u:any)=>u.id===id);lines[id]=[];for(const amount of amounts){let tokens=amount;const before={flags:{...flags},items:{...items},tokens},price=typeof u.price==='function'?u.price(flags):u.price??0;
 const pages=u.use({flags,get tokens(){return tokens;},pay:(n:number)=>tokens>=n?(tokens-=n,true):false,give:(n:number)=>{tokens+=n;},set:(f:string)=>{flags[f]=true;},has:(id:string,n=1)=>(items[id]??0)>=n,take:(id:string,n=1)=>{if((items[id]??0)<n)return false;items[id]-=n;return true;},add:(id:string,n=1)=>{items[id]=(items[id]??0)+n;},t:0,min:580,weather:'clear'});
 lines[id].push(pages);cases.push({id,before,price,pages,after:{flags:{...flags},items:{...items},tokens}});
}}
fs.writeFileSync(fixture,JSON.stringify({version:1,source:'immutable all-game source snapshot',cases},null,2)+'\n');
const bool=(id:string,is=true)=>({state:'mall.'+id,is}),flag=(id:string,is=true)=>({flag:'mall:'+id,is}),all=(...conditions:any[])=>({all:conditions});
const state=Object.fromEntries(['implantAsked','kioskAsked','deckChecked','floristAsked','leafBought','keyAsked'].map(id=>['mall.'+id,{owner:'mall',lifetime:'save',type:'boolean',default:false}]));
state['mall.meal']={owner:'mall',lifetime:'save',type:'number',default:0,min:0,max:2} as any;
const set=(id:string)=>({state:'mall.'+id,set:true}),mark=(id:string)=>({flag:'mall:'+id,value:true});
const commands:Record<string,any>={},purchases:Record<string,any>={};
const command=(id:string,actions:any[],when?:any)=>{commands[id]={sources:['interaction'],...(when?{when}:{}),actions};return id;};
const intro=(name:string)=>command('mall.'+name+'.intro',[set(name)]);
const purchase=(id:string,price:number,goods?:string,modifiers:any[]=[])=>{purchases['mall.'+id]={basePrice:price,...(goods?{goods:[{item:goods,quantity:1}]}:{service:true}),...(modifiers.length?{modifiers}:{})};return {purchase:'mall.'+id};};
const quoteZero=(id:string,when:any,price:number)=>({id,when,amount:-price,scope:'both'});
purchase('implant',2,undefined,[quoteZero('introduction',bool('implantAsked',false),2),quoteZero('already-owned',all(bool('implantAsked'),flag('implant')),2)]);
purchase('deck',1);purchase('leaf',2,'basil',[quoteZero('introduction',bool('floristAsked',false),2)]);
purchase('blankchip',2,'blankchip',[quoteZero('introduction',bool('keyAsked',false),2),quoteZero('already-owned',all(bool('keyAsked'),flag('blankchip')),2)]);
purchase('meal',1);
const route=(pages:string[],cmd?:string,when?:any)=>({...when?{when}:{},...cmd?{command:cmd}:{},pages});
const enough=(n:number)=>({tokensAtLeast:n});
const uses:any[]=[];
const add=(id:string,routes:any[],purchase?:string,speakerKind?:string)=>{const u=old.uses.find((u:any)=>u.id===id);uses.push({id,name:u.name,label:u.label,...purchase?{purchase:'mall.'+purchase}:{},...speakerKind?{speakerKind}:{},routes});};
add('implants',[
 route(lines.implants[0],intro('implantAsked'),bool('implantAsked',false)),
 route(lines.implants[3],undefined,flag('implant')),
 route(lines.implants[2],command('mall.implant.buy',[{purchase:'mall.implant'},mark('implant')],enough(2)),enough(2)),
 route(lines.implants[1])],'implant');
add('kiosk',[route(lines.kiosk[0],command('mall.kiosk.first',[mark('kiosk'),set('kioskAsked')]),bool('kioskAsked',false)),route(lines.kiosk[1],command('mall.kiosk.again',[mark('kiosk')]))],undefined,'device');
const pawnFlags=['pawn1','pawn2','pawn3'];
const count=(n:number)=>({any:Array.from({length:8},(_,bits)=>bits).filter(bits=>bits.toString(2).replaceAll('0','').length===n).map(bits=>all(...pawnFlags.map((id,i)=>flag(id,!!(bits&(1<<i))))))});
add('pawn',[0,1,2].map(n=>route(lines.pawn[n],command('mall.pawn.'+(n+1),[mark('pawn'+(n+1)),{tokens:1}],count(n)),count(n))).concat([route(lines.pawn[3])]));
add('deck',[
 route(lines.deck[0],undefined,{not:enough(1)}),
 route(lines.deck[1],command('mall.deck.first',[{purchase:'mall.deck'},mark('deck'),set('deckChecked')],enough(1)),bool('deckChecked',false)),
 route(lines.deck[2],command('mall.deck.again',[{purchase:'mall.deck'},mark('deck')],enough(1)))],'deck');
add('florist',[
 route(lines.florist[0],intro('floristAsked'),bool('floristAsked',false)),
 route(lines.florist[1],undefined,{not:enough(2)}),
 route(lines.florist[2],command('mall.leaf.first',[{purchase:'mall.leaf'},mark('leaf'),set('leafBought')],enough(2)),bool('leafBought',false)),
 route(lines.florist[3],command('mall.leaf.again',[{purchase:'mall.leaf'},mark('leaf')],enough(2)))],'leaf');
add('keys',[
 route(lines.keys[0],command('mall.keys.intro',[mark('keycutter'),set('keyAsked')]),bool('keyAsked',false)),
 route(lines.keys[3],command('mall.keys.owned',[mark('keycutter')]),flag('blankchip')),
 route(lines.keys[2],command('mall.keys.buy',[mark('keycutter'),{purchase:'mall.blankchip'},mark('blankchip')],enough(2)),enough(2)),
 route(lines.keys[1],command('mall.keys.refuse',[mark('keycutter')]))],'blankchip');
add('order',[route(lines.order[0],undefined,{not:enough(1)}),...Array.from({length:3},(_,i)=>route(lines.order[i+1],command('mall.meal.'+i,[{purchase:'mall.meal'},mark('ate'),{state:'mall.meal',set:(i+1)%3}],enough(1)),i<2?{state:'mall.meal',is:i}:undefined))],'meal');
const gameplay={version:1,flags:['implant','kiosk','pawn1','pawn2','pawn3','deck','leaf','keycutter','blankchip','ate'].map(f=>'mall:'+f),items:['basil','blankchip'],state,purchases,events:[],commands,reactions:[],conversations:{}};
const scene={version:1,id:'mall',name:old.name,intro:old.intro,uses,
 people:old.people.filter((p:any)=>p.id&&p.talk).map((p:any)=>({id:p.id,name:p.name,talk:typeof p.talk[0]==='string'?[p.talk]:p.talk})),
 readables:old.readables.map((r:any)=>({id:r.id,name:r.name,pages:r.pages})),
 exits:old.exits.map((e:any)=>({id:e.id,to:e.to,...e.at?{at:e.at}:{},...e.action?{action:e.action}:{},label:e.label}))};
for(const[name,value]of Object.entries({scene,gameplay}))fs.writeFileSync('src/ssg/game/scenes/mall/'+name+'.json',JSON.stringify(value,null,2)+'\n');
console.log('Extracted Mall content and '+cases.length+' immutable native interaction cases.');
