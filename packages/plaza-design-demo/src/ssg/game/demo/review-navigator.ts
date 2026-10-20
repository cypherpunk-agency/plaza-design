import {communicationReviews,type CommunicationReview} from './communication-review';
import type {ReviewStation} from './review-stations';
export interface ReviewNavigatorOptions {
 stations:ReviewStation[];jump(id:string):void;use(id:string):void;talk(id:string):void;actor(id:string):void;
 /** Start expanded. The editor's Play keeps it collapsed so it does not cover the scene. */
 open?:boolean;communication?:(id:CommunicationReview)=>void;
}
/** Review-only navigation chrome. Every interaction still runs through the native game. */
export function mountReviewNavigator(host:HTMLElement,options:ReviewNavigatorOptions){
 const root=document.createElement('details');root.open=options.open??true;root.setAttribute('aria-label','Review shortcuts');
 root.style.cssText='position:absolute;right:8px;top:8px;z-index:40;max-width:calc(100% - 16px);background:#101820ee;border:1px solid #46525e;border-radius:4px;padding:6px 9px;color:#e3eaf3;font:12px/1.5 "IBM Plex Mono",monospace';
 const summary=document.createElement('summary');summary.textContent='Review shortcuts · skip the walking';root.append(summary);
 const stations=document.createElement('div'),actions=document.createElement('div'),hint=document.createElement('p');stations.style.cssText=actions.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-top:6px';hint.style.cssText='margin:6px 0 0;max-width:620px';hint.setAttribute('role','status');root.append(stations,actions,hint);
 const button=(parent:HTMLElement,label:string,run:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='font:inherit;color:inherit;background:#243440;border:1px solid #617383;border-radius:3px;padding:4px 8px;cursor:pointer';b.onclick=()=>{if(parent===actions)root.open=false;run();};parent.append(b);return b;};
 if(options.communication){const cases=document.createElement('details'),label=document.createElement('summary');label.textContent='Communication examples';cases.append(label);const controls=document.createElement('div');controls.style.cssText=actions.style.cssText;cases.append(controls);for(const[id,title]of communicationReviews)button(controls,title,()=>{root.open=false;options.communication!(id);});root.append(cases);}
 const buttons=options.stations.map(s=>({station:s,button:button(stations,s.label,()=>options.jump(s.id))}));
 let previous='',selected='';
 function refresh(scene:string,purchases:boolean,permissions:boolean,catalog=false){
  for(const{station,button}of buttons)button.setAttribute('aria-pressed',String(station.scene===scene && station.id===(options.stations.find(s=>s.id===selected&&s.scene===scene)?.id??options.stations.find(s=>s.scene===scene)?.id)));
  const key=scene+':'+purchases+':'+permissions+':'+catalog;if(key===previous)return;previous=key;actions.replaceChildren();
  if(purchases){button(actions,'Buy at counter',()=>options.use('buy'));button(actions,'Pricing & stock',()=>options.talk('demo.desk'));button(actions,'Guidance example',()=>options.talk('demo.mission'));}
  if(scene==='library'&&options.stations.some(s=>s.id==='dialogue')){button(actions,'Talk: Librarian',()=>options.actor('librarian'));button(actions,'Talk: SHELF-E',()=>options.actor('shelfe'));}
  if(catalog)button(actions,'Catalog choices',()=>options.talk('catalog'));
  if(permissions)button(actions,'Hatch permissions',()=>options.talk('workshop.operator'));
  hint.textContent=options.stations.find(s=>s.scene===scene)?.prompt??'Jump directly to an example. Your current experiment is preserved.';
 }
 host.append(root);
 return{refresh,station(id:string){const s=options.stations.find(s=>s.id===id);if(s){selected=id;hint.textContent=s.prompt;for(const row of buttons)row.button.setAttribute('aria-pressed',String(row.station.id===id));}},dispose(){root.remove();}};
}
