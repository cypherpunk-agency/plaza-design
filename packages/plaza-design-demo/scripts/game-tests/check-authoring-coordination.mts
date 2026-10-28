/** Latest source/view requests win; playback still progresses under a slower asynchronous renderer. */
import assert from 'node:assert/strict';
import {createPreviewState,createPreviewRenderer} from '../../src/ssg/game/authoring/preview-integration';
import {createInspector} from '../../src/ssg/game/authoring/inspector';
import {selectionKey,sourceSelection} from '../../src/ssg/game/authoring/selection';
import {Element} from './rules-harness.mts';
const result=(id:string)=>({bounds:[{id,x:0,y:0,width:10,height:10}]});
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture(){
 const waiting:{resolve:(v:any)=>void;reject:(e:Error)=>void}[]=[],shown:string[]=[],painting=createPreviewState();
 const port:any={disposed:false,painting,currentId:'a',selectedDocumentId:'',viewport:{},time:0,reduced:false,sequenceId:'',baseWidth:100,baseHeight:100,overlays:true,compareId:'',
  viewCompositionDocument:()=>({id:port.currentId,value:{id:port.currentId,instances:[]}}),current:()=>({kind:'composition'}),previewError:{textContent:'',hidden:true},canvas:{width:100,height:100,getContext:()=>({clearRect(){}})},syncWorldState(){},currentTimeline(){},evaluationContext:()=>({}),sequence(){},previewRequest:(composition:any)=>({composition}),sizeCanvas(){},
  config:{preview:{render:()=>new Promise((resolve,reject)=>waiting.push({resolve,reject}))}},updateRenderStatus(){},placeHover:()=>shown.push(painting.result!.bounds[0].id),placeJoined(){},comparing:()=>false,documentsForView:()=>[],stage:{classList:{toggle(){}}},compareCanvas:{hidden:true}};
 return{port,waiting,shown,renderer:createPreviewRenderer(port)};
}
for(const fail of [false,true]){
 const f=fixture(),first=f.renderer.draw();f.port.currentId='b';const latest=f.renderer.draw();let completed=false;void latest.then(()=>{completed=true;});
 if(fail)f.waiting[0].reject(Error('stale failure'));else f.waiting[0].resolve(result('a'));
 await flush();assert.equal(completed,false,'A coalesced request must not resolve before its current source is painted');assert.equal(f.port.painting.result,undefined);assert.equal(f.port.previewError.textContent,'');assert.deepEqual(f.shown,[]);
 f.waiting[1].resolve(result('b'));await Promise.all([first,latest]);await flush();assert.deepEqual(f.shown,['b']);assert.equal(f.port.painting.resultDocument,'b');
}
{const f=fixture(),first=f.renderer.draw(true),next=f.renderer.draw(true);f.waiting[0].resolve(result('frame1'));await first;await flush();assert.deepEqual(f.shown,['frame1'],'continuous playback does not starve accepted frames');f.port.disposed=true;f.waiting[1].resolve(result('frame2'));await next;await flush();assert.deepEqual(f.shown,['frame1']);}
{const f=fixture(),first=f.renderer.draw(),next=f.renderer.draw();f.port.disposed=true;f.waiting[0].reject(Error('disposed'));await Promise.all([first,next]);await flush();assert.equal(f.waiting.length,1);assert.deepEqual(f.shown,[]);assert.equal(f.port.previewError.textContent,'');}
{const f=fixture();f.port.syncWorldState=()=>{throw Error('invalid current state');};await f.renderer.draw();assert(!f.port.painting.previewPending);assert.match(f.port.previewError.textContent,/invalid current state/);}
// Same local object ID in different source documents must reset primary selection and mounted controls.
const inspector=createInspector(),mounts:string[]=[];
function inspect(doc:string){const right=new Element();inspector.render(right as any,{node:{id:'same',type:'test'},doc:{id:doc},scene:'same-scene',sceneName:'Example',sharedSource:true,registry:{get:()=>({label:'Test'})},duplicate(){},remove(){},deselect(){},openSource(){},refresh(){},sections:()=>[{id:'logic',label:'Logic',primary:true,mount:()=>{mounts.push(doc);return()=>{};}}],context:()=>({}),appearance(){}} as any);}
inspect('a');inspector.appearance();inspect('b');assert.deepEqual(mounts,['a','b']);assert.notEqual(selectionKey('a','same'),selectionKey('b','same'));inspector.dispose();
assert.deepEqual(sourceSelection(undefined,'same','display'),{document:'display',instance:'same'});

// Base editing must not depend on an unrelated whole-world timeline context.
{const f=fixture();f.port.evaluationContext=()=>{throw Error('Unrelated timeline compilation');};
 const pending=f.renderer.draw();assert.equal(f.waiting.length,1,'Base source reaches the native preview without compiling a timeline');
 f.waiting[0].resolve(result('base'));await pending;assert.deepEqual(f.shown,['base']);assert(f.port.previewError.hidden);
}

// Offscreen member origins come from the same captured native view and world placement map.
const {frameSelection}=await import('../../src/ssg/game/authoring/native-preview');
const {frameView}=await import('../../src/ssg/game/art/core/view');
const sourceView={...frameView(0),viewW:640,viewH:360,gy:300,cam:400,sx:(x:number)=>x-400,y:(h:number)=>300-h,worldZones:{far:{x:1200,h:80,w:900}}};
const transform={a:2,b:0,c:0,d:2,e:10,f:20},scope={scene:{id:'active',width:1000,name:'Active'},view:sourceView,transform,viewport:{width:1280,height:720}};
const frame:any={sceneId:'active',inspection:[scope],artwork:[],helpers:[]},request:any={composition:{scene:'active',instances:[]},time:0,reduced:false,overlays:true,environment:{}};
const offscreen=frameSelection(frame,request).projectChunk!('far',25,10);
assert.deepEqual(offscreen,{x:1660,y:440,width:0,height:0});assert.equal(frame.inspection.length,1,'Locating an unpainted member does not paint or simulate it');
const painted=frameSelection({...frame,inspection:[scope,{...scope,scene:{id:'far',width:900,name:'Far'},view:{...sourceView,sx:(x:number)=>sourceView.sx(1200+x),y:(h:number)=>sourceView.y(80+h)}}]},request).projectChunk!('far',25,10);
assert.deepEqual(offscreen,painted,'Painted and unpainted member origins share one projection');
console.log('Authoring coordination PASS: stale success/error rejection, latest source bounds, non-starving playback, disposal and source-aware inspector identity.');
