async () => {
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const until=async(test,message)=>{for(let i=0;i<100;i++){if(test())return;await wait(50);}throw new Error(message);};
  const panel=()=>document.querySelector('[data-workbench="play"]');
  const state=()=>{try{return JSON.parse(panel().querySelector('pre').textContent);}catch{return null;}};
  const button=(label,scope=panel())=>{const b=[...scope.querySelectorAll('button')].find(b=>b.textContent===label);assert(b&&!b.disabled,'Missing button '+label);b.click();};
  const frame=()=>panel().querySelector('iframe');
  const key=async(key,duration=30)=>{frame().contentWindow.postMessage({channel:'editor-play-check',type:'key',key,duration},'*');await wait(duration+300);};
  const header=()=>document.querySelector('.scene-composer>header');
  const originalStorage=[JSON.stringify({...localStorage}),JSON.stringify({...sessionStorage})];
  const calls=[],native={};for(const name of ['getItem','setItem','removeItem','clear']){native[name]=Storage.prototype[name];Storage.prototype[name]=function(...args){calls.push(name);return native[name].apply(this,args);};}
  const messages=[];const receive=e=>{if(e.data?.channel==='editor-play-check')messages.push(e.data);};window.addEventListener('message',receive);
  let downloaded;const createURL=URL.createObjectURL,anchorClick=HTMLAnchorElement.prototype.click;
  URL.createObjectURL=function(blob){downloaded=blob;return createURL.call(this,blob);};HTMLAnchorElement.prototype.click=function(){if(this.download!=='access-denied-editor-edits.json')return anchorClick.call(this);};
  try {
    // Edit source through the same portable, validated import the public user can use.
    const docs=await (await fetch('./documents.json')).json();
    const composition=structuredClone(docs.find(d=>d.id==='harborShift'));
    const gameplay=structuredClone(docs.find(d=>d.id==='harbor-shift-gameplay'));
    const walk=nodes=>nodes.flatMap(n=>[n,...walk(n.children??[])]),nodes=walk(composition.value.instances);
    nodes.find(n=>n.id==='spawn').placement.x=130;
    nodes.find(n=>n.id==='office').placement.x=130;
    nodes.find(n=>n.id==='dispatch-post').placement.x=180;nodes.find(n=>n.id==='receiving-post').placement.x=230;
    gameplay.value.conversations.supervisor.nodes.assigned.pages=['PENDING ASSIGNMENT IN REAL GAME'];
    gameplay.value.commands['shift.issue-tag'].actions[0].add=2;
    const bundle={format:'access-denied-editor-edits',version:1,documents:[composition,gameplay].map(({id,kind,value})=>({id,kind,value}))};
    const file=document.querySelector('[aria-label="Import downloaded edits"]'),transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(bundle)],'play-edits.json',{type:'application/json'}));file.files=transfer.files;file.dispatchEvent(new Event('change',{bubbles:true}));
    await until(()=>!file.value,'Import did not finish');assert(!document.querySelector('.status.error'),'Import rejected');
    panel().open=true;await wait(100);button('Play');await until(()=>state()?.player.x===130,'Pending scene spawn was not used');
    assert(frame().sandbox.value==='allow-scripts','Frame gained same-origin privileges');let inaccessible=false;try{void frame().contentWindow.document;}catch{inaccessible=true;}assert(inaccessible,'Play can access parent origin');
    for(let i=0;i<6&&!state()?.save.flags['shift:assigned'];i++)await key('e'); // finish initial speech and interact at the pending position
    await until(()=>state()?.save.flags['shift:assigned'],'Real supervisor interaction failed');
    assert(state().save.items['shift.tag']===2,'Pending gameplay action was not used');
    assert(state().events.some(e=>e.id==='assignment.accepted'),'Committed events missing');
    frame().contentWindow.postMessage({channel:'editor-play-check',type:'texts'},'*');await until(()=>messages.some(e=>e.type==='texts'),'No drawing inspection');
    assert(messages.filter(e=>e.type==='texts').at(-1).value.some(t=>t.includes('PENDING ASSIGNMENT')),'Pending dialogue was not drawn by the game');
    const closeSpeech=async()=>{for(let i=0;i<10&&state()?.dialogue;i++)await key('e');assert(!state()?.dialogue,'Speech did not close');};
    const walkTo=async x=>{for(let i=0;i<5&&Math.abs(state().player.x-x)>5;i++){const dx=x-state().player.x;await key(dx>0?'ArrowRight':'ArrowLeft',Math.min(800,Math.abs(dx)/78*1000));}assert(Math.abs(state().player.x-x)<15,'Movement did not reach interaction');};
    await closeSpeech();await walkTo(180);assert(state().player.x>130,'Actual game movement did not run');await key('e');await until(()=>state()?.save.items['shift.parcel']===1,'Real parcel pickup failed');
    assert(state().objective.includes('Mara'),'Objective did not follow pickup');await closeSpeech();await walkTo(230);await key('e');await until(()=>state()?.popup,'Carried-item choice did not open');await key('Enter');await until(()=>state()?.save.flags['shift:delivered'],'Real carried-item handover failed');assert(!state().save.items['shift.parcel'],'Handover did not consume parcel');
    assert(state().events.some(e=>e.id==='delivery.completed'),'Delivery event missing');
    const oldFrame=frame();oldFrame.contentWindow.postMessage({channel:'editor-play-check',type:'reload'},'*');await until(()=>frame()&&frame()!==oldFrame&&state()?.save.flags['shift:delivered'],'Private reload lost progress');assert(state().save.items['shift.tag']===2,'Private reload lost inventory');


    const token=messages.filter(e=>e.type==='heartbeat').at(-1).value;
    button('Stop');await wait(100);const stopped=messages.filter(e=>e.type==='heartbeat'&&e.value===token).length;await wait(300);assert(messages.filter(e=>e.type==='heartbeat'&&e.value===token).length===stopped,'Stopped frame still runs callbacks');assert(!frame(),'Stop left a frame');
    button('Play');await until(()=>state()?.player.x===130,'Replay did not preserve pending artwork');assert(!state().save.flags['shift:assigned']&&!state().save.items['shift.tag'],'Replay reused progress');
    for(let i=0;i<6&&!state()?.save.flags['shift:assigned'];i++)await key('e');await until(()=>state()?.save.flags['shift:assigned'],'Second assignment failed');button('Reset play');await until(()=>state()?.player.x===130&&!state().save.flags['shift:assigned'],'Reset retained progress');
    for(let i=0;i<3;i++){button('Stop');button('Play');await until(()=>state()?.player.x===130,'Repeated start failed');assert(panel().querySelectorAll('iframe').length===1,'Multiple games running');}
    button('Stop');button('Download edits',header());assert(downloaded,'Pending edits lost');const exported=JSON.parse(await downloaded.text());assert(JSON.stringify(exported.documents.sort((a,b)=>a.id.localeCompare(b.id)))===JSON.stringify(bundle.documents.sort((a,b)=>a.id.localeCompare(b.id))),'Playing changed pending documents');
    button('Undo',header());await wait(100);button('Play');await until(()=>state()?.player.x===80,'Undo was not reflected in actual game');button('Stop');button('Redo',header());await wait(100);button('Play');await until(()=>state()?.player.x===130,'Redo was not reflected in actual game');button('Stop');
    assert(calls.length===0,'Editor accessed native storage');assert(!messages.some(e=>e.type==='storage'),'Game accessed native storage');
    return{status:'PASS',scope:'Pending artwork, dialogue/action, real inputs/movement/pickup/handover, objectives/events, private reload, Stop callback destruction, reset/replay, repeated mounts, unchanged pending source, undo/redo',parentStorageCalls:calls.length,frameStorageCalls:messages.filter(e=>e.type==='storage').length};
  } finally {
    if(frame())button('Stop');for(const[name,fn]of Object.entries(native))Storage.prototype[name]=fn;window.removeEventListener('message',receive);URL.createObjectURL=createURL;HTMLAnchorElement.prototype.click=anchorClick;
    assert(JSON.stringify({...localStorage})===originalStorage[0]&&JSON.stringify({...sessionStorage})===originalStorage[1],'Player storage changed');
  }
}
