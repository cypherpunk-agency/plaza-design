/** Inject on the actual composer; credentials remain local and no source writes occur. */
(async()=>{
 const assert=(ok,message)=>{if(!ok)throw Error(message);},settle=async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);};
 const bootstrap=await(await fetch('/bootstrap')).json(),read=async()=>{const r=await fetch(bootstrap.api.url+'/documents',{headers:{'x-authoring-token':bootstrap.api.token}});assert(r.ok,'Source inventory unavailable');return r.json();};
 const before=await read(),storage=JSON.stringify(localStorage),panel=document.querySelector('details.asset-browser');
 assert(panel,'Missing asset browser');if(!panel.open){panel.querySelector('summary').click();await settle();}
 const search=panel.querySelector('[aria-label="Search artwork assets"]');search.value='stool';search.dispatchEvent(new Event('input',{bubbles:true}));
 const pick=[...panel.querySelectorAll('button')].find(b=>b.title.startsWith('mall.table-stool ·'));assert(pick,'Search failed');pick.click();await settle();
 const usage=panel.querySelector('[aria-label="Asset preview usage"]'),option=[...usage.options].find(o=>o.textContent==='mall / table-0-stool-left');assert(option,'Missing exact source usage');usage.value=option.value;usage.dispatchEvent(new Event('change',{bubbles:true}));await settle();
 const zoom=panel.querySelector('[aria-label="Isolated preview zoom"]'),pixels=()=>{const c=panel.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n;};
 zoom.value='1';zoom.dispatchEvent(new Event('change',{bubbles:true}));await settle();const at1=pixels();zoom.value='8';zoom.dispatchEvent(new Event('change',{bubbles:true}));await settle();const at8=pixels();assert(at1>0&&at8>at1,'Preview zoom did not affect pixels');
 const row=[...panel.querySelectorAll('[aria-label="Asset inspection"] details')].find(d=>d.querySelector('summary')?.textContent==='mall / table-0-stool-left');assert(row,'Missing usage inspection');row.querySelector('button').click();await settle();
 assert(document.querySelector('[aria-label="Authoring document"]').value==='mall','Wrong scene link');assert(document.querySelector('[aria-label="Selected artwork properties"] > strong').textContent==='table-0-stool-left','Wrong instance link');
 panel.querySelector('summary').click();await settle();panel.querySelector('summary').click();await settle();assert(panel.querySelector('[aria-label="Isolated preview zoom"]').value==='8','Zoom not retained');assert(panel.querySelector('[aria-label="Asset preview usage"]').selectedOptions[0].textContent==='mall / table-0-stool-left','Usage not retained');
 const after=await read();assert(after.length===before.length&&after.every(d=>before.find(x=>x.id===d.id)?.revision===d.revision),'Source changed');assert(JSON.stringify(localStorage)===storage,'Player storage changed');
 const save=[...document.querySelectorAll('.scene-composer > header button')].find(b=>b.textContent==='Save to source');assert(save?.disabled,'Viewer left Save enabled');
 return{status:'PASS',catalog:832,usage:'mall/table-0-stool-left',exactUsageLink:true,pixelsAt1x:at1,pixelsAt8x:at8,retainedUsage:true,retainedZoom:true,sourceUnchanged:true,saveDisabled:true,playerStorageUnchanged:true};
})()
