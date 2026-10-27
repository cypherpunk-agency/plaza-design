/** Layered compositions: validation rules, slot drawing, editor restacking and the editor's player figure and eyes. */
import assert from 'node:assert/strict';
import {canonicalPaint} from './canonical-paint.mts';
import {art} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {drawCompositionSlot, resolveComposition, slotHasContent, type ChunkDocument, type AssetInstance, type LayerSlot} from '../../src/ssg/game/art/core/composition';
import {layerRows, restack} from '../../src/ssg/game/authoring/layer-stack';
import {FOLDER_SOURCES} from '../../src/ssg/game/scenes/folder-scenes';
import {sceneSourceDefinition,compositionRows} from '../../src/ssg/game/engine/gameplay/folder-scene';
const libraryComposition=art.validate(FOLDER_SOURCES.library.composition),libraryScene=(composition?:ChunkDocument)=>sceneSourceDefinition('library',FOLDER_SOURCES.library,{composition});

function recorder(){const commands:unknown[][]=[];let gradient=0;const values:Record<string,unknown>={globalAlpha:1,lineWidth:1,font:'',getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:(text:string)=>({width:text.length*6}),getImageData:(_x:number,_y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h})};const ctx=new Proxy(values,{get(t,k:string){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return(...args:unknown[])=>{const id=++gradient;commands.push([k,...args,id]);return{id,addColorStop:(...a:unknown[])=>commands.push(['stop',id,...a]),setTransform:()=>{}};};return(...args:unknown[])=>{commands.push([k,...args]);};},set(t,k:string,value){t[k]=value;commands.push(['set',k,value]);return true;}});return{ctx:ctx as unknown as CanvasRenderingContext2D,commands};}
(globalThis as any).document={createElement:()=>{const rec=recorder();return{width:0,height:0,getContext:()=>rec.ctx,style:{}};},fonts:{load:async()=>[],ready:Promise.resolve()}};
const {createNativePreview}=await import('../../src/ssg/game/authoring/native-preview.ts');
const {nativeSceneAdapters}=await import('../../src/ssg/game/authoring/scene-adapters.ts');

const copy=<T,>(v:T):T=>structuredClone(v);
const flat=(nodes:AssetInstance[]):AssetInstance[]=>nodes.flatMap(n=>[n,...flat(n.children??[])]);
const doc=art.validate(copy(libraryComposition));
const node=(d:ChunkDocument,id:string)=>flat(d.instances).find(n=>n.id===id)!;
assert.equal(node(doc,'spawn').type,'scene.player','the spawn is the player row');
assert.equal(libraryScene().spawn,74,'the player row is still where the player arrives');

// Validation: a layer on every instance, drawn artwork in visual layers, markers in logic, at most one player row, in the playfield.
const rejects=(edit:(d:ChunkDocument)=>void,pattern:RegExp)=>{const d=copy(doc);edit(d);assert.throws(()=>art.validate(d),pattern);};
rejects(d=>{delete (node(d,'counter') as Partial<AssetInstance>).layer;},/missing layer/);
rejects(d=>{node(d,'counter').layer='logic';},/visual layer/);
rejects(d=>{d.instances.push({id:'marker',type:'library.spawn-marker',props:{},placement:{x:90,h:0},order:0,layer:'set'});},/logic layer/);
rejects(d=>{node(d,'spawn').layer='set';},/player row belongs in the playfield/);
rejects(d=>{d.instances.push({...copy(node(d,'spawn')),id:'player-2'});},/at most one player row/);
assert.throws(()=>art.validate({version:1,scene:'sequence-x',instances:[{id:'p',type:'scene.player',props:{},placement:{x:0,h:0},order:0,layer:'playfield'}]}),/sequence has no player row/);

// Sorting follows layer, then order: a low order key in a front layer still draws later.
const sorted=copy(doc);node(sorted,'room').layer='foreground';node(sorted,'room').order=-50;
{const ids=compositionRows(art.validate(sorted)).map(r=>r.instance.id);assert.ok(ids.indexOf('room')>ids.indexOf('spawn'),'foreground sorts after the playfield');}

// Slots: Library starts with everything behind the player.
assert.equal(slotHasContent(doc,'behind-player'),true);
assert.equal(slotHasContent(doc,'over-player'),false);
assert.equal(slotHasContent(doc,'foreground'),false);

// Restacking: moving the counter to the foreground and the player to the back of the playfield.
const moved=copy(doc);restack(moved,'counter','foreground',0);restack(moved,'spawn','playfield',0);art.validate(moved);
assert.deepEqual(layerRows(moved,'foreground').map(n=>n.id),['counter']);
assert.equal(layerRows(moved,'playfield')[0].id,'spawn');
assert.deepEqual(layerRows(moved,'playfield').map(n=>n.order),layerRows(moved,'playfield').map((_,i)=>i),'restack renumbers the layer');
assert.equal(slotHasContent(moved,'over-player'),true);assert.equal(slotHasContent(moved,'foreground'),true);
assert.throws(()=>restack(copy(doc),'spawn','set',0),/stays in the playfield/);

// Each slot draws only its own rows.
const engine={m:{value:()=>false},hover:null,layer:'all'} as any,view={...frameView(0),sx:(x:number)=>x,y:(h:number)=>300-h,gy:300,viewW:960,viewH:360};
const env=libraryScene(moved).visualEnvironment!(view as any,engine),drawn=(slot:LayerSlot)=>{const ids:string[]=[];const registry=new Proxy(art,{get(t,k){if(k==='get')return(type:string)=>{const e=t.get(type);return{...e,draw:(...a:unknown[])=>{ids.push(type);return (e.draw as any)(...a);}};};const v=(t as any)[k];return typeof v==='function'?v.bind(t):v;}});drawCompositionSlot(recorder().ctx,registry as typeof art,moved,env,slot);return ids;};
assert.deepEqual(drawn('foreground'),['library.counter']);
assert.ok(drawn('over-player').includes('library.printer')&&!drawn('over-player').includes('library.counter'));
assert.ok(!drawn('behind-player').includes('library.printer')&&drawn('behind-player').includes('library.room'));

// Painting through the native preview, for the layer and editor-view checks below.
const configs=[{width:640,height:360,minute:580,time:0,weather:'clear',reduced:false,hack:false},{width:960,height:540,minute:0,time:2.25,weather:'rain',reduced:false,hack:false},{width:1280,height:720,minute:1100,time:5,weather:'storm',reduced:false,hack:false},{width:400,height:900,minute:1200,time:3.3,weather:'fog',reduced:true,hack:false},{width:960,height:540,minute:580,time:1,weather:'clear',reduced:false,hack:true}];
const paint=(composition:ChunkDocument,c:typeof configs[number],index:number,view:{player?:boolean;hidden?:string[]}={})=>{const rec=recorder();createNativePreview(nativeSceneAdapters).render({width:c.width,height:c.height,getContext:()=>rec.ctx,style:{}} as any,{...view,composition,time:c.time,reduced:c.reduced,overlays:false,environment:{day:1,minute:c.minute,seed:3,weather:c.weather,cameraX:index%2?150:0,zoom:1,flags:'{}',state:'{}',hack:c.hack,hover:''}} as any);return JSON.stringify(canonicalPaint(rec.commands));};
assert.notEqual(paint(moved,configs[0],0),paint(doc,configs[0],0),'moving the counter to the foreground changes the frame');
// Editor view state: the player figure is drawn only on request, at the player row; eyes hide objects.
const base=paint(doc,configs[0],0),withPlayer=paint(doc,configs[0],0,{player:true});assert.notEqual(withPlayer,base,'the editor preview draws the player');
const placed=copy(doc);node(placed,'spawn').placement.x=300;assert.notEqual(paint(placed,configs[0],0,{player:true}),withPlayer,'the figure follows the player row');
assert.equal(paint(doc,configs[0],0,{player:true,hidden:['spawn']}),base,'hiding the player row hides the figure');
assert.notEqual(paint(doc,configs[0],0,{hidden:['notice']}),base,'a hidden object drops out of the frame');
console.log('Scene layers PASS: validation, layer-then-order sorting, slots, restacking, the editor player figure and hidden objects.');

// Native joined rendering collects actors before the shared behind-player flush.
{
 const {SCENES}=await import('../../src/ssg/game/scenes');
 const {SceneModel}=await import('../../src/ssg/game/engine/model');
 const {renderWorldFrame}=await import('../../src/ssg/game/runtime/render-scene');
 const {restingLevelView}=await import('../../src/ssg/game/engine/level');
 const results:string[][]=[];
 for(const joined of [false,true]){
  const scene=SCENES.downtown,other=SCENES.metro;
  const model=(s:typeof scene)=>new SceneModel({say(){},open(){},changed(){}},s.data!,undefined,undefined,undefined,undefined,undefined,s.gameplay);
  const m=model(scene),n=model(other),cam=500;
  const v={...frameView(600),viewW:1280,viewH:720,cam,gy:591,sx:(x:number,p=1)=>Math.round(x-cam*p),y:(h:number)=>591-h,flags:{},level:restingLevelView(scene.level!,false)};
  const z={...v,cam:cam-1380,gy:741,sx:(x:number,p=1)=>Math.round(x-(cam-1380)*p),y:(h:number)=>741-h,level:restingLevelView(other.level!,false)};
  const e=art.get('actor.prepared'),original=e.draw,actors:string[]=[];
  e.draw=(...args)=>{const pose=args[3].pose as any;if(pose?.visible){const x=args[1].sx(pose.frame?.x??pose.character.x,pose.character.parallax??1);if(x>=0&&x<1280)actors.push(String(args[2].actor));}return original(...args);};
  try{
   renderWorldFrame({context:recorder().ctx,scale:1,view:v,scene,sceneId:scene.id,host:{model:m,visionOn:false,draw:(ctx,v)=>scene.drawBackdrop(ctx,v,{m,hover:null,layer:'all'})},reduced:false,clock:10,lighting:()=>v.lighting,weather:()=>null,...(joined?{joined:[{scene:other,sceneId:other.id,view:z,host:{model:n,visionOn:false,draw:(ctx,v)=>other.drawBackdrop(ctx,v,{m:n,hover:null,layer:'all'})},lighting:()=>z.lighting}]}:{})});
   results.push(actors);
  }finally{e.draw=original;m.dispose();n.dispose();}
 }
 assert.equal(results[0].length,3,'fixture includes three on-screen Downtown actors');
 assert.deepEqual(results[1],results[0],'joining Metro must retain Downtown people exactly once');
 // Equal-order artwork follows source ordinal, including Train wall/ad and roof/plate overlaps.
 const {beginLayeredFrame,flushLayeredSlot}=await import('../../src/ssg/game/art/core/composition');
 const train=SCENES.train,m=new SceneModel({say(){},open(){},changed(){}},train.data!,undefined,undefined,undefined,undefined,undefined,train.gameplay);
 const {GameplaySession}=await import('../../src/ssg/game/engine/gameplay/session');
 let state:any={flags:{},items:{},tokens:0};const session=new GameplaySession(train.gameplay!,{read:()=>state,write:v=>{state=v;}});m.gameplayQuery=id=>session.query(id);
 const traces:string[][]=[];
 for(const sharedLayers of [false,true]){
  const v={...frameView(600),viewW:1280,viewH:720,cam:0,gy:591,sx:(x:number)=>x,y:(h:number)=>591-h,sharedLayers};
  const env=train.visualEnvironment!(v,{m,hover:null,layer:'all'}),trace:string[]=[];
  const registry=new Proxy(art,{get(t,k){if(k==='get')return(type:string)=>{const e=t.get(type);return {...e,draw:(...args:any[])=>{trace.push(type+':'+args[5].x+':'+String(args[2].text??''));return (e.draw as any)(...args);}};};const value=(t as any)[k];return typeof value==='function'?value.bind(t):value;}});
  beginLayeredFrame();for(const slot of ['behind-player','over-player','foreground'] as const){drawCompositionSlot(recorder().ctx,registry,train.artwork!,env,slot);flushLayeredSlot(slot);}traces.push(trace);
 }
 assert(traces[0].some(s=>s.startsWith('train.wall')),'fixture exercises Train artwork');
 assert.deepEqual(traces[1],traces[0],'shared and isolated frames preserve authored equal-order layering');m.dispose();
 console.log('Shared layering PASS: Downtown people and Train authored tie order.');
}

// Picking and read-only inspection consume the actual shared paint records, including canvas projection.
{
 const {renderWorldFrame}=await import('../../src/ssg/game/runtime/render-scene');
 const {frameSelection}=await import('../../src/ssg/game/authoring/native-preview');
 const {hitTestArtwork}=await import('../../src/ssg/game/authoring/selection');
 const {measureArtwork}=await import('../../src/ssg/game/art/core/measure');
 const {SceneModel}=await import('../../src/ssg/game/engine/model');
 const {emptyData}=await import('../../src/ssg/game/engine/empty-data');
 const {drawComposition,beginLayeredFrame,flushLayeredSlot,endLayeredFrame}=await import('../../src/ssg/game/art/core/composition');
 const docs=['front-source','back-source'].map((scene,i)=>art.validate({version:1,scene,instances:[{id:scene,type:'level.slab',layer:i?'set':'foreground',order:0,props:{width:100,thickness:10},placement:{x:100,h:0}}]}));
 docs[0]=art.validate({...docs[0],instances:[...docs[0].instances,{id:'parent',type:'assembly.group',props:{},layer:'set',order:0,placement:{x:200,h:30,scale:2,facing:-1},children:[{id:'helper',type:'library.spawn-marker',props:{},layer:'logic',order:0,placement:{x:10,h:0}}]}]});
 const v={...frameView(0),viewW:640,viewH:360,gy:306,sx:(x:number)=>x,y:(h:number)=>306-h};
 const zones=docs.map(doc=>{const m=new SceneModel({say(){},open(){},changed(){}},emptyData(doc.scene,doc.scene));const scene={id:doc.scene,name:doc.scene,width:640,spawn:0,ambient:{},artwork:doc,visualEnvironment:(view:typeof v)=>({view,reduced:false,state:{}}),drawBackdrop:(ctx:CanvasRenderingContext2D,view:typeof v)=>drawComposition(ctx,art,doc,{view,state:{},reduced:false},'backdrop')};return {scene,sceneId:scene.id,view:v,host:{model:m,visionOn:false,draw:scene.drawBackdrop},lighting:()=>v.lighting};});
 let frame!:ReturnType<typeof renderWorldFrame>;
 measureArtwork(context=>{frame=renderWorldFrame({...zones[0],context,scale:2,reduced:false,clock:0,weather:()=>null,capture:true,joined:[zones[1]]});});
 for(const zone of zones)zone.scene.visualEnvironment=()=>{throw Error('Inspection must not resolve sources again');};
 const selection=frameSelection(frame,{composition:docs[0],documents:new Map(docs.map(d=>[d.scene,d])),time:0,reduced:false,overlays:false,environment:{}});
 const hit=hitTestArtwork(selection,{x:300,y:620},0)!;
 assert.equal(selection.sources![hit.id].document,'front-source','foreground beats covered equal-area artwork across sources');
 const info=selection.resolved![hit.id];assert.equal(info.layer,'foreground');assert.equal(info.bounds.x,200);assert.equal(info.bounds.width,200);assert.equal(info.clipSource,'None');assert(info.visible);
 assert.equal(selection.deltaToLocal!(hit.id,20,-10).x,10,'drag uses actual canvas transform');
 const helper=selection.bounds.find(b=>selection.sources![b.id].instance==='helper')!;assert.equal(helper.width,32);assert.deepEqual(selection.deltaToLocal!(helper.id,20,-10),{x:-5,h:2.5},'helpers use captured mirrored parent scale and actual canvas transform');
 // Source and current positions stay separate; captured data is never authoring or save state.
 assert.equal(info.authored.x,100);assert.equal(info.placement.x,100);
 assert.deepEqual(frame.artwork!.map(a=>a.document.scene),['back-source','front-source']);
 beginLayeredFrame();flushLayeredSlot('behind-player');assert.throws(()=>measureArtwork(ctx=>drawCompositionSlot(ctx,art,docs[1],{view:{...v,sharedLayers:true},state:{},reduced:false},'behind-player')),/after slot flush/);endLayeredFrame();
 for(const z of zones)z.host.model.dispose();
 const proposal={...docs[0],scene:'proposal-source'};
 const proposalSelection=frameSelection(frame,{composition:proposal,documents:new Map([...docs.map(d=>[d.scene,d] as const),['proposal-doc',proposal]]),time:0,reduced:false,overlays:false,environment:{}},false);
 assert(Object.values(proposalSelection.sources!).filter(s=>s.instance==='front-source').every(s=>s.document==='proposal-doc'),'Borrowed native behavior must not redirect picking to the base scene');
 assert.equal(proposalSelection.regions!.find(r=>r.document==='proposal-doc')!.scene,'proposal-source','Chunk-border selection retains the edited proposal identity');
 console.log('Prepared artwork PASS: actual cross-source paint order, projected inspection, shared picking, drag projection and late-submission guard.');
}

// Slot collection freezes prepared facts now, and an explicit foreground draw replaces its queued command.
{
 const {beginLayeredFrame,endLayeredFrame,flushLayeredSlot,queueLayeredSlots,drawComposition}=await import('../../src/ssg/game/art/core/composition');
 const e=art.get('level.slab'),bounds=e.bounds,draw=e.draw;let paints=0;
 const d=art.validate({version:1,scene:'prepared-flush',instances:[{id:'slab',type:'level.slab',layer:'foreground',order:0,props:{width:40,thickness:10},placement:{x:0,h:0}}]});
 const environment={view:frameView(0),state:{},reduced:false};
 try{
  e.draw=(...args)=>{paints++;return draw(...args);};
  beginLayeredFrame();queueLayeredSlots(recorder().ctx,art,d,environment);
  e.bounds=()=>{throw Error('Flush must not prepare geometry');};flushLayeredSlot('foreground');assert.equal(paints,1);
  endLayeredFrame();e.bounds=bounds;paints=0;beginLayeredFrame();const ctx=recorder().ctx;
  queueLayeredSlots(ctx,art,d,environment);drawComposition(ctx,art,d,environment,'foreground');flushLayeredSlot('foreground');assert.equal(paints,1,'explicit drawing replaces the queued version');
 }finally{endLayeredFrame();e.bounds=bounds;e.draw=draw;}
 console.log('Collector cleanup PASS: no source resolution during flush and no duplicated foreground paint.');
}
