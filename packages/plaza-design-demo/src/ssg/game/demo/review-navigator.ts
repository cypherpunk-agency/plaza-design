import {communicationReviews,type CommunicationReview} from './communication-review';
import type {ReviewActionSource,ReviewStation} from './review-stations';
export interface ReviewNavigatorOptions {
 /** The stations and the buttons (demo/review-stations.json); `hint` is shown where no station describes the scene. */
 stations:ReviewStation[];actions:readonly ReviewActionSource[];hint:string;jump(id:string):void;run(action:ReviewActionSource):void;
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
 /** `active`: the ids of the actions the current scene offers. */
 function refresh(scene:string,active:readonly string[]){
  for(const{station,button}of buttons)button.setAttribute('aria-pressed',String(station.scene===scene && station.id===(options.stations.find(s=>s.id===selected&&s.scene===scene)?.id??options.stations.find(s=>s.scene===scene)?.id)));
  const key=scene+':'+active.join(',');if(key===previous)return;previous=key;actions.replaceChildren();
  for(const action of options.actions)if(active.includes(action.id))button(actions,action.label,()=>options.run(action));
  hint.textContent=options.stations.find(s=>s.scene===scene)?.prompt??options.hint;
 }
 host.append(root);
 return{refresh,station(id:string){const s=options.stations.find(s=>s.id===id);if(s){selected=id;hint.textContent=s.prompt;for(const row of buttons)row.button.setAttribute('aria-pressed',String(row.station.id===id));}},dispose(){root.remove();}};
}
