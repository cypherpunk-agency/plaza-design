import {downtownScene} from '../../src/ssg/game/scenes/downtown/index.ts';import {SceneModel} from '../../src/ssg/game/engine/model';
const s=downtownScene(),save:any={handle:'MORGAN',tokens:1,jump:false,controlled:[],flags:{metFixer:true,greeted:true},hints:{},keyring:[],scenes:{},items:{}};
const services:any={save:()=>save,persist:()=>{},nodes:()=>42,granted:()=>{},end:()=>{}};const m=new SceneModel({say:()=>{},changed:()=>{},open:()=>{}},s.data!,typeof s.rules==='function'?s.rules(services):s.rules!);m.setPaused(true);
const exits=s.exits.filter(e=>!e.requires||save.flags[e.requires]).map(e=>({id:'exit:'+e.id,x:e.x,h:0}));
const stand=(x:number,y=0)=>Math.max(0,...s.platforms!.filter(p=>x>p.x&&x<p.x+p.w&&p.h<=y).map(p=>p.h));
const devices=m.spots().map(d=>({id:'device:'+d.id,x:d.x,h:stand(d.x,d.y)}));const talks=s.uses!.map(u=>({id:'talk:'+u.id,x:u.x,h:0}));
const old=[...exits,...['hood','umbrella','hat','fixer'].map(id=>talks.find(t=>t.id==='talk:'+id)!),...devices],now=[...exits,...devices,...talks];
const nearest=(rows:typeof old,x:number)=>{let best:any=null,bd=26;for(const t of rows){if(Math.abs(t.h)>8)continue;const d=Math.abs(x-t.x);if(d<bd){bd=d;best=t;}}return best?.id;};
for(const x of [835,1087,620])console.log({x,old:nearest(old,x),now:nearest(now,x)});m.reset();m.setPaused(true);
