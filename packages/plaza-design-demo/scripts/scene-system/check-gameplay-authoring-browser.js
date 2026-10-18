async () => {
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const settle=async()=>{await new Promise(resolve=>setTimeout(resolve,0));await new Promise(requestAnimationFrame);};
  const header=()=>document.querySelector('.scene-composer>header'),editor=()=>document.querySelector('.gameplay-editor'),lab=()=>document.querySelector('.gameplay-lab');
  const field=name=>editor().querySelector(`[aria-label="${name}"]`);
  const button=(label,scope=document)=>{const b=[...scope.querySelectorAll('button')].find(b=>b.textContent===label);assert(b&&!b.disabled,'Missing enabled button: '+label);b.click();};
  const change=async(name,value)=>{const input=field(name);assert(input,'Missing field '+name);input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));await settle();};
  const state=()=>JSON.parse(lab().querySelector('[aria-label="Pilot state"]').textContent);
  const run=async label=>{button(label,lab());await settle();};
  const originalStorage={local:JSON.stringify({...localStorage}),session:JSON.stringify({...sessionStorage})};
  const storageCalls=[],methods={};for(const name of ['getItem','setItem','removeItem','clear']){methods[name]=Storage.prototype[name];Storage.prototype[name]=function(...args){storageCalls.push(name);return methods[name].apply(this,args);};}
  const originalFetch=fetch,requests=[];window.fetch=async(...args)=>{const method=args[1]?.method??'GET';requests.push(method);assert(method==='GET','Public editor attempted source write');return originalFetch(...args);};
  let blob;const originalCreate=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click;
  URL.createObjectURL=function(value){blob=value;return originalCreate.call(this,value);};HTMLAnchorElement.prototype.click=function(){if(this.download!=='access-denied-editor-edits.json')return originalClick.call(this);};
  try{
    const picker=document.querySelector('[aria-label="Authoring document"]');assert(picker.options.length===29,'Expected 29 registered documents');picker.value='harbor-shift-gameplay';picker.dispatchEvent(new Event('change',{bubbles:true}));await settle();assert(editor(),'Selecting gameplay document opens its editor');
    const oldLabel=field('Choice 1 label').value,oldPages=field('Dialogue pages (blank line between pages)').value;
    await change('Dialogue pages (blank line between pages)','A revised delivery assignment.');
    await change('Choice 1 label','Accept revised assignment');
    await change('Choice 1 condition type','flag');await change('Choice 1 condition flag','shift:checked');await change('Choice 1 condition value','false');
    await change('Command','shift.issue-tag');await change('Action 1 quantity','2');
    await change('Reaction 1 event','parcel.collected');
    const accept=async()=>{await run('Talk to supervisor');assert(lab().textContent.includes('A revised delivery assignment.'),'Pending dialogue not used');await run('Accept revised assignment');};
    await accept();assert(!state().items['shift.tag'],'Edited reaction no longer grants tag at assignment');await run('Pick up blue parcel');assert(state().items['shift.tag']===2,'Edited event invokes edited action');await run('Give parcel to Mara');assert(state().flags['shift:delivered'],'Ordinary delivery works with pending document');
    const ordinary=state();await run('Reset pilot');await accept();await run('Pick up blue parcel');await run('Scan parcel');await run('Advance 150 ms');
    assert(state().flags['shift:delivered']&&JSON.stringify(state().items)===JSON.stringify(ordinary.items),'Wired and ordinary pending definitions disagree');
    button('Undo',header());await settle();await accept();assert(state().items['shift.tag']===2,'Undo restored assignment reaction and reset the lab');
    button('Redo',header());await settle();await accept();assert(!state().items['shift.tag'],'Redo restored revised event wiring');
    button('Download edits',header());await settle();assert(blob,'Download missing');const exported=await blob.text(),bundle=JSON.parse(exported);assert(bundle.documents.length===1&&bundle.documents[0].kind==='gameplay'&&bundle.documents[0].id==='harbor-shift-gameplay','Wrong gameplay bundle');assert(!exported.includes('"revision"'),'Bundle contains source revisions');
    let undos=0;while([...header().querySelectorAll('button')].find(b=>b.textContent==='Undo')?.disabled===false){assert(++undos<30,'History did not settle');button('Undo',header());await settle();}
    assert(field('Choice 1 label').value===oldLabel&&field('Dialogue pages (blank line between pages)').value===oldPages,'Undo did not recover original dialogue');
    const importBundle=async data=>{const file=document.querySelector('[aria-label="Import downloaded edits"]'),transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(data)],'edits.json',{type:'application/json'}));file.files=transfer.files;file.dispatchEvent(new Event('change',{bubbles:true}));for(let i=0;i<50&&file.value;i++)await new Promise(r=>setTimeout(r,20));await settle();assert(!file.value,'Import did not settle');};
    const bad=structuredClone(bundle);bad.documents[0].value.commands['shift.credit-wages'].sources.push('signal');await importBundle(bad);assert(field('Choice 1 label').value===oldLabel,'Invalid import changed pending document');assert(document.querySelector('.status.error')?.textContent.includes('protected'),'Permission error not shown');
    await importBundle(bundle);assert(field('Choice 1 label').value==='Accept revised assignment','Downloaded edits did not restore dialogue');await accept();await run('Pick up blue parcel');await run('Scan parcel');await run('Advance 150 ms');assert(state().flags['shift:delivered'],'Imported definition did not drive native lab');
    button('Undo',header());await settle();assert(field('Choice 1 label').value===oldLabel,'Bundle import was not one undo operation');button('Redo',header());await settle();assert(field('Choice 1 label').value==='Accept revised assignment','Bundle redo failed');
    assert(storageCalls.length===0,'Player/browser storage was accessed');
    return{status:'PASS',scope:'Actual typed gameplay forms; pending dialogue/choice/condition/action/reaction; native ordinary/wired delivery; undo/redo; download/import; forbidden import atomicity',documents:29,storageCalls:0,publicWriteRequests:requests.filter(m=>m!=='GET').length};
  }finally{
    for(const[name,fn]of Object.entries(methods))Storage.prototype[name]=fn;window.fetch=originalFetch;URL.createObjectURL=originalCreate;HTMLAnchorElement.prototype.click=originalClick;
    assert(JSON.stringify({...localStorage})===originalStorage.local&&JSON.stringify({...sessionStorage})===originalStorage.session,'Browser storage changed');
  }
}
