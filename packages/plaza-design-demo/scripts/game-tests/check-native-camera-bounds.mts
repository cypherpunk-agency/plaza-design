import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';
import{centerNativePreview,NATIVE_FOCUS_LIMITS}from'../../src/ssg/game/authoring/native-camera';
import type {PreviewRequest} from '../../src/ssg/game/authoring/contracts';
const canvas={width:960,height:540} as HTMLCanvasElement,request:PreviewRequest={composition:{version:1,scene:'camera-guards',instances:[]},time:1,reduced:false,overlays:false,environment:{cameraX:30,cameraH:-12,renderScale:1}};
let ordinary=0;for(const depth of [.1,.3,.7,1,1.4])for(const scale of [.5,1,4]){const focused=centerNativePreview((_c,r)=>({bounds:[{id:'piece',x:(2300-Number(r.environment.cameraX)*depth)*scale,y:(88+Number(r.environment.cameraH))*scale,width:40*scale,height:70*scale}]}),canvas,{...request,environment:{...request.environment,renderScale:scale}},r=>r.bounds[0]);assert.ok(Math.abs(Number(focused.request.environment.cameraX)-(2320-480/scale)/depth)<1e-7);assert.ok(Math.abs(Number(focused.request.environment.cameraH)-(270/scale-123))<1e-7);assert.deepEqual(focused.diagnostics,[]);ordinary++;}
let invalidInputs=0;for(const[key,value]of [['cameraX',NaN],['cameraX',Infinity],['cameraH',-Infinity],['cameraH',NATIVE_FOCUS_LIMITS.camera+1]] as const){let calls=0;assert.throws(()=>centerNativePreview(()=>{calls++;return{bounds:[]};},canvas,{...request,environment:{...request.environment,[key]:value}},r=>r.bounds[0]));assert.equal(calls,0);invalidInputs++;}
for(const offset of [{x:NaN,h:0},{x:0,h:Infinity},{x:NATIVE_FOCUS_LIMITS.camera+1,h:0}]){let calls=0;assert.throws(()=>centerNativePreview(()=>{calls++;return{bounds:[]};},canvas,request,r=>r.bounds[0],offset));assert.equal(calls,0);invalidInputs++;}
const malformed=[{x:NaN,y:0,width:40,height:70},{x:0,y:Infinity,width:40,height:70},{x:0,y:0,width:NaN,height:70},{x:0,y:0,width:40,height:Infinity},{x:Number.MAX_VALUE,y:0,width:Number.MAX_VALUE,height:70}];let badBounds=0;
for(const b of malformed){let calls=0;const result=centerNativePreview(()=>{calls++;return{bounds:[{id:'bad',...b}]};},canvas,request,r=>r.bounds[0]);assert.equal(calls,1);assert.equal(result.request.environment.cameraX,30);assert.ok(result.diagnostics.some(d=>d.includes('Non-finite')));badBounds++;}
let illConditioned=0;for(const depth of [0,.00001,.00011,1e-3]){let calls=0;const before=JSON.stringify(request),result=centerNativePreview((_c,r)=>{calls++;const x=Number(r.environment.cameraX),h=Number(r.environment.cameraH);assert.ok(Number.isFinite(x)&&Number.isFinite(h));assert.ok(Math.abs(x)<=NATIVE_FOCUS_LIMITS.camera&&Math.abs(h)<=NATIVE_FOCUS_LIMITS.camera);return{bounds:[{id:'far',x:1e9-x*depth,y:200+h,width:40,height:70}]};},canvas,request,r=>r.bounds[0]);assert.ok(calls<=7);assert.ok(result.diagnostics.length);assert.equal(JSON.stringify(request),before);illConditioned++;}
let boundaryCalls=0;const nearBoundary=centerNativePreview((_c,r)=>{boundaryCalls++;const x=Number(r.environment.cameraX),h=Number(r.environment.cameraH);assert.ok(Math.abs(x)<=NATIVE_FOCUS_LIMITS.camera&&Math.abs(h)<=NATIVE_FOCUS_LIMITS.camera);return{bounds:[{id:'limit',x:1e8-x,y:200+h,width:40,height:70}]};},canvas,{...request,environment:{cameraX:100000,cameraH:0}},r=>r.bounds[0],{x:100000,h:0});assert.ok(boundaryCalls<=8);assert.equal(nearBoundary.request.environment.cameraX,100000);assert.ok(nearBoundary.diagnostics.some(d=>d.includes('bounded')));
const report={status:'PASS',ordinaryClosedFormCases:ordinary,unchangedOrdinaryCameras:true,invalidInputsRejectedBeforeRender:invalidInputs,malformedBoundsStoppedBeforeProbes:badBounds,illConditionedCases:illConditioned,boundaryPanCase:true,finiteBoundedCalls:true,limits:NATIVE_FOCUS_LIMITS};fs.mkdirSync(path.resolve('../../.game-test-output/evidence'),{recursive:true});fs.writeFileSync(path.resolve('../../.game-test-output/evidence/S11-native-camera-guardrails.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

// Moving actors must be picked where the native pose is painted, including parallax.
const {SCENES}=await import('../../src/ssg/game/scenes');
const {art,resolveComposition}=await import('../../src/ssg/game/art');
const {SceneModel}=await import('../../src/ssg/game/engine/model');
const {emptyData}=await import('../../src/ssg/game/engine/empty-data');
const {frameView}=await import('../../src/ssg/game/art/core/view');
const {projectedBounds}=await import('../../src/ssg/game/art/core/geometry');
let actorSamples=0,mobileActors=0;
for(const [id,scene] of Object.entries(SCENES)){
 if(!scene.artwork||!scene.visualEnvironment)continue;
 const model=new SceneModel({say(){},open(){},changed(){}},scene.data??emptyData(id,id),undefined,undefined,undefined,undefined,undefined,scene.gameplay);
 for(const t of [0,600,1700])for(const cam of [0,400]){
  const view={...frameView(t),viewW:1280,viewH:720,cam,gy:591,sx:(x:number,p=1)=>x-cam*p,y:(h:number)=>591-h};
  const env=scene.visualEnvironment(view,{m:model,hover:null,layer:'all'});
  for(const row of resolveComposition(art,scene.artwork,env)){
   if(!['character.prepared','actor.prepared'].includes(row.instance.type))continue;
   const pose=row.state.pose as any;if(!pose?.visible)continue;
   const worldX=pose.frame?.x??(pose.character.x+(pose.rider?.offset??0)),drawnX=view.sx(worldX,pose.character.parallax??1);
   const box=projectedBounds(view,row.placement,row.element.bounds(row.props,row.state,{view,placement:row.placement}));
   const clip=row.state.clip as number[]|null;
   if(!clip)assert(drawnX>=box.x&&drawnX<=box.x+box.width,id+'/'+row.instance.id+' bounds must follow the drawn pose');
   else if(box.width>0&&box.height>0){assert(box.x>=Math.min(clip[0],clip[0]+clip[2])-1e-6&&box.x+box.width<=Math.max(clip[0],clip[0]+clip[2])+1e-6);assert(box.y>=Math.min(clip[1],clip[1]+clip[3])-1e-6&&box.y+box.height<=Math.max(clip[1],clip[1]+clip[3])+1e-6);}
   actorSamples++;
   if(env.mobileArtwork?.has(row.instance.id)){mobileActors++;assert(scene.mobileExtent,'moving actors need a source lifetime envelope');}
  }
 }
}
assert(actorSamples>500&&mobileActors>100,'exercise current native scene actors');
console.log('Native actor bounds PASS:',actorSamples,'posed/parallax samples;',mobileActors,'mobile actor samples.');

const {previewBounds}=await import('../../src/ssg/game/authoring/native-preview');
const {hitTestArtwork}=await import('../../src/ssg/game/authoring/selection');
const {residentCharacter}=await import('../../src/ssg/game/art/characters/resident');
const {characterX}=await import('../../src/ssg/game/runtime/characters');
let residents=0,masked=0,fullyMasked=0;
for(const id of ['harbor-yard','harbor-shed','harbor-quay','shop','laundromat']){
 const scene=SCENES[id],model=new SceneModel({say(){},open(){},changed(){}},scene.data??emptyData(id,id),undefined,undefined,undefined,undefined,undefined,scene.gameplay);
 for(const t of [0,600,1700])for(const cam of [0,400,1200]){
  const view={...frameView(t),viewW:1280,viewH:720,cam,gy:591,sx:(x:number,p=1)=>x-cam*p,y:(h:number)=>591-h},env=scene.visualEnvironment!(view,{m:model,hover:null,layer:'all'});
  for(const row of resolveComposition(art,scene.artwork!,env)){
   const box=projectedBounds(view,row.placement,row.element.bounds(row.props,row.state,{view,placement:row.placement}));
   if(row.instance.type==='character.resident'){
    const body=residentCharacter(row.props,row.placement),anchor=view.sx(row.placement.x,row.placement.parallax),drawn=anchor+(view.sx(characterX(body,t),body.parallax??1)-anchor)*row.placement.scale*row.placement.facing;
    assert(drawn>=box.x-1e-6&&drawn<=box.x+box.width+1e-6,id+'/'+row.instance.id+' resident depth and mirroring');residents++;
   }
   if(row.instance.type!=='character.prepared'||!row.state.clip)continue;
   masked++;const preview=previewBounds([row],view,env,scene.artwork),clip=row.state.clip as number[],left=Math.min(clip[0],clip[0]+clip[2]),top=Math.min(clip[1],clip[1]+clip[3]),right=Math.max(clip[0],clip[0]+clip[2]),bottom=Math.max(clip[1],clip[1]+clip[3]);
   if(box.width<=0||box.height<=0){assert.equal(preview.bounds.length,0,'fully masked actors have no hit target');fullyMasked++;}
   else{assert.equal(preview.bounds.length,1);const b=preview.bounds[0];for(const point of [{x:left-1,y:b.y+b.height/2},{x:right+1,y:b.y+b.height/2},{x:b.x+b.width/2,y:top-1},{x:b.x+b.width/2,y:bottom+1}])assert.equal(hitTestArtwork(preview,point,100),undefined,'minimum target size must respect native mask');assert.equal(hitTestArtwork(preview,{x:b.x+b.width/2,y:b.y+b.height/2},0)?.id,row.instance.id);}
  }
 }
}
assert(residents>40&&masked>20&&fullyMasked>0);
// Source-derived membership must survive a valid pending edit to a background layer.
const warehouse=SCENES.warehouse,doc=structuredClone(warehouse.artwork!),mech=doc.instances.find(n=>n.id==='mech')!;mech.layer='backdrop';const valid=art.validate(doc),model=new SceneModel({say(){},open(){},changed(){}},warehouse.data!,undefined,undefined,undefined,undefined,undefined,warehouse.gameplay);
const view={...frameView(600),sharedLayers:true,viewW:1280,viewH:720,cam:0,gy:591,sx:(x:number)=>x,y:(h:number)=>591-h,zoneWindow:{left:0,right:warehouse.width}},env=warehouse.visualEnvironment!(view,{m:model,hover:null,layer:'all'}),rows=resolveComposition(art,valid,env);
assert(env.mobileArtwork?.has('mech'));assert.equal(previewBounds(rows,view,env,valid).bounds.find(b=>b.id==='mech')!.clip,undefined,'compiled actor mobility prevents an editor-only chunk clip');
assert.equal(previewBounds(rows,view,{...env,mobileArtwork:undefined},valid).bounds.find(b=>b.id==='mech')!.clip?.width,warehouse.width,'fixture exercises the lost-membership failure');
console.log('Picking fixes PASS:',residents,'resident samples,',masked,'masked samples,',fullyMasked,'fully masked, and pending mobile layer edit.');


// Workspace navigation must move artwork and its picking box together at every depth.
const {drawCompositionSlot}=await import('../../src/ssg/game/art');
const {measureArtwork}=await import('../../src/ssg/game/art/core/measure');
// Offscreen dimming uses the same registered kernels; a measuring canvas needs no DOM pixels.
(globalThis as any).document={createElement:()=>{let ctx!:CanvasRenderingContext2D;measureArtwork(c=>{ctx=c;});return {width:0,height:0,getContext:()=>ctx};}};
let vehicleCases=0;
for(const type of ['vehicle.road','vehicle.air','vehicle.rail','vehicle.boat'])for(const depth of ['far','back','play','near'])for(const facing of [-1,1])for(const scale of [.5,2]){
 const doc=art.validate({version:1,scene:'camera-bounds',instances:[{id:'vehicle',type,props:{depth,motion:'parked'},placement:{x:1000,h:0,facing,scale},layer:'set',order:0}]});
 const samples=[150,600].map(cam=>{
  const view={...frameView(600),viewW:1600,viewH:720,cam,gy:500,sx:(x:number,p=1)=>x-100*p+100-cam,y:(h:number)=>500-h},env={view,state:{},reduced:false},r=resolveComposition(art,doc,env)[0];
  return {box:projectedBounds(view,r.placement,r.element.bounds(r.props,r.state,{view,placement:r.placement})),painted:measureArtwork(ctx=>drawCompositionSlot(ctx,art,doc,env,'behind-player'))};
 });
 assert(Math.abs((samples[1].box.x-samples[0].box.x)-(samples[1].painted.x-samples[0].painted.x))<1e-6,type+' workspace bounds follow native projection');vehicleCases++;
}
const skyScene=SCENES['harbor-station'],skyView={...frameView(600),sequence:{time:10,state:{}},viewW:1280,viewH:720,cam:0,gy:591,sx:(x:number)=>x,y:(h:number)=>591-h},skyEnv=skyScene.visualEnvironment!(skyView),sky=resolveComposition(art,skyScene.artwork!,skyEnv).find(r=>r.instance.type==='environment.sky-traffic')!;
assert.equal(sky.props.inSequences,false);
assert.deepEqual(previewBounds([sky],skyView,skyEnv,skyScene.artwork).bounds,[],'sequence-hidden sky traffic is not selectable');
const visibleSky={...sky,props:{...sky.props,inSequences:true}};
assert.equal(previewBounds([visibleSky],skyView,skyEnv,skyScene.artwork).bounds.length,1,'explicitly enabled sequence traffic remains selectable');
console.log('Vehicle workspace and sky visibility PASS:',vehicleCases,'depth/scale/facing cases.');

{
const bad:any[]=[],count:Record<string,number>={};let tested=0;
for(const[id,s]of Object.entries(SCENES)){if(!s.artwork||!s.visualEnvironment)continue;const m=new SceneModel({say(){},open(){},changed(){}},s.data??emptyData(id,id),undefined,undefined,undefined,undefined,undefined,s.gameplay),view={...frameView(0),viewW:30000,viewH:6000,cam:0,gy:3000,sx:(x:number)=>x,y:(h:number)=>3000-h},env=s.visualEnvironment(view,{m,hover:null,layer:'all'});for(const r of resolveComposition(art,s.artwork,env)){if(!r.instance.type.startsWith('level.')||!r.element.parts.length)continue;tested++;const b=projectedBounds(view,r.placement,r.element.bounds(r.props,r.state,{view,placement:r.placement}));const painted=measureArtwork(ctx=>{for(const slot of ['behind-player','over-player','foreground'] as const)drawCompositionSlot(ctx,art,s.artwork!,env,slot,n=>n.instance.id===r.instance.id);});if(!painted.width&&!painted.height)continue;if(painted.x<b.x-2||painted.y<b.y-2||painted.x+painted.width>b.x+b.width+2||painted.y+painted.height>b.y+b.height+2){bad.push({scene:id,id:r.instance.id,type:r.instance.type,bounds:b,painted});count[r.instance.type]=(count[r.instance.type]??0)+1;}}
 m.dispose();}
assert.deepEqual(bad,[],'native level placements contain registered artwork');assert(tested>=59);console.log('Native level bounds PASS:',tested,'placements');

}