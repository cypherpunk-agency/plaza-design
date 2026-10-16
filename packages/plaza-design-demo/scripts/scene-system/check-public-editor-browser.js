/** Trusted browser QA against the built static /editor/; no repository writes. */
(async()=>{
 const assert=(ok,message)=>{if(!ok)throw Error(message);},settle=async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);};
 const header=()=>document.querySelector('.scene-composer>header'),button=(text,parent=header())=>{const b=[...parent.querySelectorAll('button')].find(b=>b.textContent===text);assert(b&&!b.disabled,'Missing enabled '+text);return b;};
 const pick=async(element,value,event='change')=>{assert(element,'Missing control');element.value=value;element.dispatchEvent(new Event(event,{bubbles:true}));await settle();};
 const stateBefore=JSON.stringify({local:localStorage,session:sessionStorage}),originalFetch=window.fetch,requests=[];let blob;
 window.fetch=async(...args)=>{const method=args[1]?.method??'GET';requests.push({url:String(args[0]),method});assert(method==='GET','Public editor attempted a write');return originalFetch(...args);};
 const originalCreate=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click;
 try{
  assert(document.documentElement.dataset.editorMode==='public','Not the public artifact');assert(!document.querySelector('#boot-error'),'Boot failed');assert(document.querySelector('[aria-label="Authoring document"]').options.length===26,'26 documents not loaded');
  assert(!header().textContent.includes('Save to source'),'Public source Save exposed');
  await pick(document.querySelector('[aria-label="Authoring document"]'),'capsule');
  const stool=[...document.querySelectorAll('.hierarchy button')].find(b=>b.textContent==='stool');assert(stool,'No actual stool instance');stool.click();await settle();
  const x=()=>[...document.querySelectorAll('[aria-label="Selected artwork properties"] label')].find(l=>l.firstChild.textContent==='x').querySelector('input'),start=Number(x().value);
  const hash=async()=>{const c=document.querySelector('canvas[aria-label="Game renderer preview. Select artwork to edit."]');return [...new Uint8Array(await crypto.subtle.digest('SHA-256',c.getContext('2d').getImageData(0,0,c.width,c.height).data))].join(',');};
  const originalPixels=await hash();await pick(x(),String(start+24));assert(Number(x().value)===start+24,'Transform edit failed');assert(await hash()!==originalPixels,'Transform did not change native pixels');
  const behavior=document.querySelector('[data-workbench="behavior"]');behavior.open=true;await settle();
  const control=name=>behavior.querySelector('[aria-label="'+name+'"]');await pick(control('Handler noun'),'lamp.lamp');await pick(control('Verb'),'on');await pick(control('Reply'),'Public editor roundtrip');button('Reset new state',behavior).click();button('Trigger selected verb',behavior).click();await settle();assert(control('Sandbox state').textContent.includes('Public editor roundtrip'),'Native behavior lab did not run edit');
  URL.createObjectURL=function(value){blob=value;return originalCreate.call(this,value);};HTMLAnchorElement.prototype.click=function(){if(this.download!=='access-denied-editor-edits.json')return originalClick.call(this);};
  button('Download edits').click();await settle();assert(blob,'No download produced');const text=await blob.text(),bundle=JSON.parse(text);assert(bundle.format==='access-denied-editor-edits'&&bundle.documents.length===2,'Wrong portable edits bundle');assert(!text.includes('"revision"'),'Saved revision leaked into portable bundle');
  button('Undo').click();await settle();button('Undo').click();await settle();assert(!header().textContent.includes('Unsaved changes'),'Undo did not restore clean snapshot');
  const importer=document.querySelector('[aria-label="Import downloaded edits"]'),transfer=new DataTransfer();transfer.items.add(new File([text],'edits.json',{type:'application/json'}));importer.files=transfer.files;importer.dispatchEvent(new Event('change',{bubbles:true}));
  for(let i=0;i<100&&!header().textContent.includes('Unsaved changes');i++)await settle();assert(header().textContent.includes('Unsaved changes'),'Downloaded bundle did not import');
  await pick(document.querySelector('[aria-label="Authoring document"]'),'capsule');[...document.querySelectorAll('.hierarchy button')].find(b=>b.textContent==='stool').click();await settle();assert(Number(x().value)===start+24,'Imported transform lost');
  button('Undo').click();await settle();assert(!header().textContent.includes('Unsaved changes'),'Bundle import was not one atomic undo command');button('Redo').click();await settle();assert(header().textContent.includes('Unsaved changes'),'Bundle redo failed');button('Undo').click();await settle();
  for(const name of['characters','vehicles','signage']){const panel=document.querySelector('[data-workbench="'+name+'"]');panel.open=true;await settle();assert(panel.querySelector('canvas'),'Missing public '+name+' preview');panel.open=false;await settle();}
  const events=document.querySelector('[data-workbench="events"]');events.open=true;await settle();await pick(events.querySelector('[aria-label="Scenes"]'),'library');const search=events.querySelector('input[type=search]');await pick(search,'window-1','input');const node=events.querySelector('[data-id="instance:library:window-1"]');assert(node,'Missing actual event node');node.click();await settle();button('Open source',events).click();
  for(let i=0;i<150&&!events.querySelector('[aria-label="Complete source"]')?.textContent.includes('window-1');i++)await settle();assert(events.querySelector('[aria-label="Complete source"]').textContent.includes('window-1'),'Static source snapshot failed');
  assert(requests.every(r=>r.method==='GET'&&!r.url.includes('127.0.0.1:4201')&&!r.url.includes('/bootstrap')&&!r.url.includes('/source?')),'Public editor contacted private service');assert(stateBefore===JSON.stringify({local:localStorage,session:sessionStorage}),'Player storage changed');
  return{status:'PASS',documents:26,nativeTransformPixels:true,nativeBehaviorLab:true,portableTwoDocumentDownloadImport:true,atomicUndoRedo:true,allWorkbenchesMounted:true,staticSourceViewer:true,publicWrites:0,playerStorageUnchanged:true,requests};
 }finally{window.fetch=originalFetch;URL.createObjectURL=originalCreate;HTMLAnchorElement.prototype.click=originalClick;}
})()
