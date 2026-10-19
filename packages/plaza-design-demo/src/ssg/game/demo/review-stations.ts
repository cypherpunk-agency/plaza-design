import type {SceneDef} from '../scenes/kit';

/** Review bookmarks resolve native source placements, including pending editor compositions. */
export interface ReviewStation {id:string;label:string;scene:string;x:number;prompt:string}
export function reviewStations(content:Readonly<Record<string,SceneDef|undefined>>):ReviewStation[]{
 const rows:ReviewStation[]=[];
 const add=(scene:string,id:string,label:string,x:number|undefined,prompt:string)=>{if(x!==undefined)rows.push({scene,id,label,x,prompt});};
 const use=(s:SceneDef,id:string)=>s.uses?.find(u=>u.id===id)?.x;
 const device=(s:SceneDef,id:string)=>s.data?.devices.find(d=>d.id===id)?.layout?.spot?.x;
 for(const[scene,s]of Object.entries(content)){if(!s)continue;
  if(s.gameplay?.conversations['demo.desk']){
   if(scene==='shop')add(scene,'purchases','Purchases',use(s,'buy'),'Try a purchase. Pricing & stock opens the controls here; no room change needed.');
   if(scene==='library')add(scene,'dialogue','Conversations',s.people?.find(p=>p.id==='librarian')?.x,'Talk to the librarian or SHELF-E. Is it clear who is speaking and how to continue?');
  }
  if(s.gameplay?.conversations['workshop.operator']){
   add(scene,'devices','Devices',device(s,'sensor'),'Wave at the sensor or switch the lamp directly. Can you see what caused the change?');
   add(scene,'wiring','Wiring & chains',device(s,'plate'),'Use H and L to try the pressure plate, timer, switch, hatch and fan. Permissions opens the controls here.');
  }
  if(scene==='market')for(const id of ['cook','fish','repair','sleeper']){const actor=s.people?.find(p=>p.id===id&&p.conversation);if(actor)add(scene,'talk-'+id,actor.name??id,actor.x,'Talk here. Judge the wording and response; progress is saved by the shared runner.');}
  if(scene==='market')add(scene,'fortune','Market fortune',use(s,'fortune'),'Ask for a fortune. Does the price and response feel clear and worthwhile?');
  if(scene==='beach'){
   add(scene,'meter','Beach meter',device(s,'kiosk'),'Rent a sunbed and inspect its meter. Is the billing behavior understandable?');
   add(scene,'mixer','Beach mixer',device(s,'mixer'),'Try the mixer and jukebox. Does the manual refusal suggest a useful next action?');
  }
  if(scene==='shop'&&!s.gameplay?.conversations['demo.desk'])add(scene,'shop-counter','Shop counter',use(s,'buy'),'Try the purchase interaction. Comment on presentation and feedback.');
  if(scene==='laundromat')add(scene,'laundry','Laundry counter',s.uses?.[0]?.x,'Try the counter interaction. Comment on clarity, tone and feedback.');
  if(scene==='library'&&!s.gameplay?.conversations['demo.desk'])add(scene,'catalog','Library catalog',device(s,'catalog')??s.spawn,'Open the catalog conversation. Are the choices and their consequences understandable?');
 }
 const order=['purchases','dialogue','devices','wiring'];return rows.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):99)-(order.includes(b.id)?order.indexOf(b.id):99));
}
