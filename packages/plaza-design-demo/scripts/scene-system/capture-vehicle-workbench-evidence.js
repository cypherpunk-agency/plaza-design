/** Run as a DevTools function on isolated s10-workbench-evidence.html. No Game/RAF. */
() => {
 if(window.s10Evidence?.status==='RUNNING')return {status:'already-running',completed:window.s10Evidence.completed};
 const prefix='S10-final-v5',expectedPin='a21084adffca7b9db4a7d571c0fd16dcacbeac454c48a238535715a4d0d06a78';
 window.s10Evidence={status:'RUNNING',completed:0,total:229};
 const hash=async raw=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const save=async(name,data)=>{const response=await fetch('/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,data})});if(!response.ok)throw new Error(name+': '+response.status+' '+await response.text());};
 window.s10EvidenceTask=(async()=>{
  await Promise.all([400,500,600,700].map(w=>document.fonts.load(`${w} 12px "IBM Plex Mono"`)));await document.fonts.ready;
  if(![400,500,600,700].every(w=>document.fonts.check(`${w} 12px "IBM Plex Mono"`)))throw new Error('IBM Plex Mono fonts unavailable');
  const source=await(await fetch('/s10-vehicles.js?v=5')).text(),pin=await hash(new TextEncoder().encode(source));if(pin!==expectedPin)throw new Error('Unexpected v5 bundle '+pin);
  await save(prefix+'-bundle.js',source);
  const fixture=await import('/s10-vehicles.js?v=5');if(fixture.vehicleCases.length!==229)throw new Error('Frozen case count changed');
  const rows=[];
  for(let i=0;i<fixture.vehicleCases.length;i++){
   const {original,candidate,diff,...row}=await fixture.compareVehicleCase(i,true),stem=prefix+'-'+String(i).padStart(3,'0');
   const originalImage=stem+'-source.png',candidateImage=stem+'-candidate.png',diffImage=stem+'-diff.png';
   await save(originalImage,original);await save(candidateImage,candidate);await save(diffImage,diff);
   rows.push({...row,originalImage,candidateImage,diffImage});window.s10Evidence.completed=rows.length;
   if(rows.length%20===0)await save(prefix+'-rows-'+String(rows.length).padStart(3,'0')+'.json',JSON.stringify(rows.slice(-20),null,2));
  }
  const failures=rows.filter(r=>r.differentPixels||r.repeatDifferentPixels||!r.isolation||!r.visibleDefault||!r.visibleSupportedControl),controls=rows.filter(r=>r.supportedControl),defaults=rows.filter(r=>r.case==='default');
  const report={milestone:'S10',gate:'F3 rendered evidence only; UI acceptance pending',status:failures.length?'FAIL':'PASS',bundle:prefix+'-bundle.js',bundleSha256:pin,width:800,height:420,families:new Set(rows.map(r=>r.id)).size,total:rows.length,controls:controls.length,defaults:defaults.length,defaultsNonempty:defaults.every(r=>r.nonBackgroundPixels>0),allSupportedControlsVisibleAndEffective:controls.every(r=>r.visibleSupportedControl),allSeekRepeatsExact:rows.every(r=>r.repeatDifferentPixels===0),allStateIsolation:rows.every(r=>r.isolation),failures,rows};
  await save(prefix+'-rendered-evidence.json',JSON.stringify(report,null,2));
  window.s10Evidence={status:report.status,completed:rows.length,total:rows.length,controls:controls.length,families:report.families,failures:failures.map(r=>({index:r.index,id:r.id,case:r.case,differentPixels:r.differentPixels,visibleDefault:r.visibleDefault,visibleSupportedControl:r.visibleSupportedControl})),report:prefix+'-rendered-evidence.json'};
 })().catch(error=>{window.s10Evidence={...window.s10Evidence,status:'ERROR',error:String(error)};});
 return window.s10Evidence;
}
