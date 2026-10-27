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
 const f=fixture(),first=f.renderer.draw();f.port.currentId='b';await f.renderer.draw();
 if(fail)f.waiting[0].reject(Error('stale failure'));else f.waiting[0].resolve(result('a'));
 await first;await flush();assert.equal(f.port.painting.result,undefined);assert.equal(f.port.previewError.textContent,'');assert.deepEqual(f.shown,[]);
 f.waiting[1].resolve(result('b'));await flush();assert.deepEqual(f.shown,['b']);assert.equal(f.port.painting.resultDocument,'b');
}
{const f=fixture(),first=f.renderer.draw(true);await f.renderer.draw(true);f.waiting[0].resolve(result('frame1'));await first;await flush();assert.deepEqual(f.shown,['frame1'],'continuous playback does not starve accepted frames');f.port.disposed=true;f.waiting[1].resolve(result('frame2'));await flush();assert.deepEqual(f.shown,['frame1']);}
{const f=fixture(),first=f.renderer.draw();await f.renderer.draw();f.port.disposed=true;f.waiting[0].reject(Error('disposed'));await first;await flush();assert.equal(f.waiting.length,1);assert.deepEqual(f.shown,[]);assert.equal(f.port.previewError.textContent,'');}
{const f=fixture();f.port.syncWorldState=()=>{throw Error('invalid current state');};await f.renderer.draw();assert(!f.port.painting.previewPending);assert.match(f.port.previewError.textContent,/invalid current state/);}
// Same local object ID in different source documents must reset primary selection and mounted controls.
const inspector=createInspector(),mounts:string[]=[];
function inspect(doc:string){const right=new Element();inspector.render(right as any,{node:{id:'same',type:'test'},doc:{id:doc},scene:'same-scene',sceneName:'Example',sharedSource:true,registry:{get:()=>({label:'Test'})},duplicate(){},remove(){},deselect(){},openSource(){},refresh(){},sections:()=>[{id:'logic',label:'Logic',primary:true,mount:()=>{mounts.push(doc);return()=>{};}}],context:()=>({}),appearance(){}} as any);}
inspect('a');inspector.appearance();inspect('b');assert.deepEqual(mounts,['a','b']);assert.notEqual(selectionKey('a','same'),selectionKey('b','same'));inspector.dispose();
assert.deepEqual(sourceSelection(undefined,'same','display'),{document:'display',instance:'same'});
console.log('Authoring coordination PASS: stale success/error rejection, latest source bounds, non-starving playback, disposal and source-aware inspector identity.');
