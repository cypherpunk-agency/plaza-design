async () => {
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const storageBefore=JSON.stringify({...localStorage}),sessionBefore=JSON.stringify({...sessionStorage});
  const calls=[],originals={};
  for(const name of ['getItem','setItem','removeItem','clear']){
    originals[name]=Storage.prototype[name];
    Storage.prototype[name]=function(...args){calls.push({method:name,key:args[0]});return originals[name].apply(this,args);};
  }
  const button=(label,scope=document)=>{const b=[...scope.querySelectorAll('button')].find(b=>b.textContent===label&&!b.closest('[hidden]'));assert(b,'Missing visible button: '+label);b.click();};
  const lab=()=>document.querySelector('.gameplay-workbench');
  const state=()=>JSON.parse(lab().querySelector('[aria-label="Pilot state"]').textContent);
  const accept=()=>{button('Talk to supervisor',lab());button("I'll take the assignment.",lab());};
  const open=async label=>{button(label);await new Promise(resolve=>setTimeout(resolve,0));};
  try{
    await open('Scene');await open('Gameplay');assert(lab(),'Pilot mounted');
    button('Talk to supervisor',lab());assert(!state().flags['shift:assigned'],'Viewing conversation grants nothing');
    button('Give me a moment.',lab());assert(!state().items['shift.tag'],'Declining grants nothing');
    accept();assert(state().items['shift.tag']===1,'Choice grants one work tag');
    button('Pick up blue parcel',lab());button('Scan parcel',lab());assert(!state().flags['shift:delivered'],'Signal is delayed');
    button('Advance 150 ms',lab());assert(state().flags['shift:delivered']===true,'Native signal completed delivery');
    assert(!state().items['shift.parcel'],'Transferred parcel consumed');
    assert(lab().querySelector('[aria-label="Committed gameplay events"]').textContent.includes('signal: shift.deliver'),'Signal source is visible');
    button('Try direct signal to wage reward',lab());assert(state().tokens===0,'Wire cannot grant wages');
    button('Reset pilot',lab());assert(!state().flags['shift:assigned']&&state().pendingCallbacks===0,'Reset clears state and queue');
    accept();button('Pick up blue parcel',lab());button('Cut cable',lab());button('Scan parcel',lab());button('Advance 150 ms',lab());assert(!state().flags['shift:delivered'],'Cut prevents new delivery');
    button('Connect cable',lab());button('Scan parcel',lab());button('Advance 150 ms',lab());assert(state().flags['shift:delivered'],'Reconnect restores native delivery');
    for(let i=0;i<3;i++){await open('Scene');assert(!lab(),'Workbench unmounted');await open('Gameplay');assert(state().pendingCallbacks===0&&!state().flags['shift:assigned'],'Fresh session after remount');}
    assert(calls.length===0,'Gameplay lab accessed browser storage: '+JSON.stringify(calls));
  }finally{for(const[name,fn]of Object.entries(originals))Storage.prototype[name]=fn;}
  assert(JSON.stringify({...localStorage})===storageBefore&&JSON.stringify({...sessionStorage})===sessionBefore,'Browser storage changed');
  return{status:'PASS',scope:'Actual editor Gameplay panel; choice/cancel, native timed delivery, permission failure, cut/reconnect, reset, three remounts; zero storage reads/writes',storageCalls:calls.length};
}
