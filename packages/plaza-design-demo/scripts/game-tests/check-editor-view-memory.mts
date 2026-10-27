import assert from 'node:assert/strict';
import {createViewMemory,parseEditorView,type EditorViewSnapshot} from '../../src/ssg/game/authoring/view-memory';
const values=new Map<string,string>();let writes=0;
const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{writes++;values.set(k,v);}};
const memory=createViewMemory(storage);
const view:EditorViewSnapshot={sequence:'glide',time:32.5,compare:'',workspace:{x:850,y:70,zoom:.4,anchor:{x:980,h:0}},cameraPreview:false,
 environment:{cameraX:123,weather:'rain'},timeline:{zoom:2,collapsed:['sky'],scrollX:175,scrollY:30,height:420,folded:false},speed:.5,snap:4,loop:{enabled:true,from:10,to:45},
 outlines:true,borders:true,chunkStatus:false,reduced:false,overlays:true,scroll:{x:0,y:280},selection:{document:'authored.glide-beach',instance:'dj',timeline:{kind:'key',track:'camera-east',index:1}},outline:{sort:'order',query:''}};
memory.write('sequence-opening',view);assert.deepEqual(memory.read('sequence-opening'),view);assert.equal(memory.lastScene(),'sequence-opening');
const count=writes;memory.write('sequence-opening',view);assert.equal(writes,count,'stationary views do not rewrite storage every frame');
memory.write('downtown',{...view,sequence:'',time:5,workspace:{x:0,y:0,zoom:1}});assert.equal(memory.lastScene(),'downtown');assert.equal(memory.read('sequence-opening')!.time,32.5,'each scene retains its own view');
assert.equal(parseEditorView({...view,time:-1}),undefined);assert.equal(parseEditorView({...view,workspace:{x:0,y:0,zoom:0}}),undefined);assert.equal(parseEditorView({...view,timeline:{...view.timeline,scrollX:Infinity}}),undefined);
assert.equal(parseEditorView({...view,selection:{document:'',instance:'',timeline:{kind:'key',track:'camera-east',index:-1}}}),undefined);
values.set('access-denied.editor.view.broken','{');assert.equal(memory.read('broken'),undefined);
const denied=createViewMemory({getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}});assert.equal(denied.lastScene(),'');assert.equal(denied.read('sequence-opening'),undefined);assert.doesNotThrow(()=>denied.write('sequence-opening',view));
console.log('Editor view memory: independent scene framing/playheads/timeline/selection, stationary write coalescing, malformed state and unavailable storage PASS');
