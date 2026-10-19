import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const dir='src/ssg/game/scenes/beach';if(fs.existsSync(dir+'/scene.json'))throw new Error('Refusing to overwrite extracted source');
const {beach:s}=await import(pathToFileURL(path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/scenes/beach/index.ts')).href),gp=JSON.parse(fs.readFileSync(dir+'/gameplay.json','utf8'));
const order=s.uses.find((u:any)=>u.id==='order'),gull=s.uses.find((u:any)=>u.id==='gull'),crab=s.uses.find((u:any)=>u.id==='crab');
gp.flags.push('beach:drink');gp.events.push('beach.gull.shooed');gp.purchases={...(gp.purchases??{}),'beach.order':{service:true,basePrice:2}};
gp.commands['beach.order']={sources:['interaction'],actions:[{purchase:'beach.order'},{flag:'beach:drink',value:true}]};
for(const kind of ['gull','crab']){gp.state['beach.'+kind+'.cursor']={owner:'beach.'+kind,lifetime:'save',type:'number',default:0,min:0,max:1};for(let i=0;i<2;i++)gp.commands['beach.'+kind+'.'+i]={sources:['interaction'],actions:[{state:'beach.'+kind+'.cursor',set:1-i},...(kind==='gull'?[{emit:'beach.gull.shooed'}]:[])]};}
const sourcePages=(use:any)=>[use.use({t:100}),use.use({t:100})];
const doc={version:1,id:'beach',name:s.name,intro:s.intro,exits:s.exits.map(({x,...r}:any)=>r),readables:s.readables.map(({x,h,...r}:any)=>r),people:s.people.filter((p:any)=>p.id&&p.talk).map((p:any)=>({id:p.id,name:p.name,talk:p.talk})),
 uses:[{id:'order',name:order.name,label:order.label,purchase:'beach.order',routes:[{command:'beach.order',template:true,pages:order.use({pay:()=>true,set:()=>{}}),failure:order.use({pay:()=>false,tokens:0}).map((p:string)=>p.replace('You have 0.','You have {tokens}.'))}]},...[['gull',gull],['crab',crab]].map(([id,use]:any)=>({id,name:use.name,label:use.label,cycle:true,cycleState:'beach.'+id+'.cursor',routes:sourcePages(use).map((pages,i)=>({command:'beach.'+id+'.'+i,pages}))}))],
 cues:[{event:'beach.gull.shooed',target:'gullShooed'}],nativeTargets:[{id:'stairs',anchor:'stairs-exit',promptH:116,labels:[{text:'prompt.out'}],routes:[{steps:[{say:'stairs.out'},{exit:'stairs'}]}]}]};
fs.writeFileSync(dir+'/scene.json',JSON.stringify(doc,null,2)+'\n');fs.writeFileSync(dir+'/gameplay.json',JSON.stringify(gp,null,2)+'\n');console.log('Extracted immutable Beach content, seven actors, paid order and animal events');
