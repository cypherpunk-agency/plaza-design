import assert from 'node:assert/strict';
import {createViewMemory,parseEditorView,viewMatchesLocation,type EditorViewSnapshot} from '../../src/ssg/game/authoring/view-memory';
import {resizeWorkspace} from '../../src/ssg/game/authoring/viewport-navigation';
const values=new Map<string,string>();let writes=0;
const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{writes++;values.set(k,v);}};
const memory=createViewMemory(storage);
const view:EditorViewSnapshot={sequence:'glide',time:32.5,compare:'',workspace:{x:850,y:70,zoom:.4,anchor:{x:980,h:0}},cameraPreview:false,
 environment:{cameraX:123,weather:'rain'},timeline:{zoom:2,collapsed:['sky'],scrollX:175,scrollY:30,height:420,folded:false},speed:.5,snap:4,loop:{enabled:true,from:10,to:45},
 outlines:true,borders:true,chunkStatus:false,reduced:false,overlays:true,scroll:{x:0,y:280},selection:{document:'authored.glide-beach',instance:'dj',timeline:{kind:'key',track:'camera-east',index:1}},outline:{sort:'order',query:''}};
memory.write('sequence-opening',view);assert.deepEqual(memory.read('sequence-opening'),view);assert.equal(memory.lastScene(),'sequence-opening');
const count=writes;memory.write('sequence-opening',view);assert.equal(writes,count,'stationary views do not rewrite storage every frame');
const pausedBase={...view,sequence:'',time:32.5,ambientTime:35,sequenceTimes:{'sequence-opening':32.5,'sequence-title':7}};
memory.write('harbor-world',pausedBase);assert.deepEqual(memory.read('harbor-world')!.sequenceTimes,pausedBase.sequenceTimes,'Sequence positions survive base editing and browser reload');
assert.equal(memory.read('harbor-world')!.ambientTime,35,'Ambient time survives separately from the sequence playhead');
assert.equal(parseEditorView({...view,ambientTime:NaN}),undefined);
for(const scale of [.2,1,2.7]){
 const before={x:850,y:70,zoom:scale},from={width:960,height:840},to={width:740,height:540},after=resizeWorkspace(before,from,to,scale);
 const project=(v:typeof before,size:typeof from)=>({x:(1200-v.x)*scale+size.width/2,y:(v.y-160)*scale+size.height/2});
 const a=project(before,from),b=project(after,to);assert(Math.abs(a.x-b.x)<1e-8&&Math.abs(a.y-b.y)<1e-8,'Panel resize must preserve screen position');
 assert.equal(after.zoom,before.zoom);const restored=resizeWorkspace(after,to,from,scale);assert(Math.abs(restored.x-before.x)<1e-8&&Math.abs(restored.y-before.y)<1e-8);
}
assert(viewMatchesLocation({...pausedBase,checkpoint:'review-glide'},new URLSearchParams('composition=harbor-world&checkpoint=review-glide')),'Reload in base editing must not reactivate the checkpoint sequence');
assert(!viewMatchesLocation({...view,checkpoint:'review-glide'},new URLSearchParams('checkpoint=review-glide')),'A new direct checkpoint link opens its authored start');
assert(!viewMatchesLocation(view,new URLSearchParams('composition=harbor-world&sequence=glide&time=0')),'An explicit new playhead wins over a stored editing position');
assert.equal(parseEditorView({...view,sequenceTimes:{glide:-1}}),undefined);assert.equal(parseEditorView({...view,sequenceTimes:[]}),undefined);
memory.write('downtown',{...view,sequence:'',time:5,workspace:{x:0,y:0,zoom:1}});assert.equal(memory.lastScene(),'downtown');assert.equal(memory.read('sequence-opening')!.time,32.5,'each scene retains its own view');
assert.equal(parseEditorView({...view,time:-1}),undefined);assert.equal(parseEditorView({...view,workspace:{x:0,y:0,zoom:0}}),undefined);assert.equal(parseEditorView({...view,timeline:{...view.timeline,scrollX:Infinity}}),undefined);
assert.equal(parseEditorView({...view,selection:{document:'',instance:'',timeline:{kind:'key',track:'camera-east',index:-1}}}),undefined);
values.set('access-denied.editor.view.broken','{');assert.equal(memory.read('broken'),undefined);
const denied=createViewMemory({getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}});assert.equal(denied.lastScene(),'');assert.equal(denied.read('sequence-opening'),undefined);assert.doesNotThrow(()=>denied.write('sequence-opening',view));
console.log('Editor view memory: independent scene framing/playheads/timeline/selection, stationary write coalescing, malformed state and unavailable storage PASS');
