/** A hut layer needs only dimensions, not a Harbor controller or whole-scene snapshot. */
import assert from 'node:assert/strict';
import {art,resolveComposition} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {createHarborPierArtwork,type HarborLayout} from '../../src/ssg/game/art/assemblies/harbor-pier';
import {declaredScene} from '../../src/ssg/game/engine/gameplay/declared-scene';
import {SceneModel} from '../../src/ssg/game/engine/model';
import composition from '../../src/ssg/game/scenes/harbor/composition.json';
import sceneSource from '../../src/ssg/game/scenes/harbor/scene.json';
import gameplay from '../../src/ssg/game/scenes/harbor/gameplay.json';
import devices from '../../src/ssg/game/scenes/harbor/devices.json';
function record(){const ops:unknown[]=[],values:Record<string,unknown>={};return{ops,ctx:new Proxy(values,{get(o,k:string){if(k in o)return o[k];return(...a:unknown[])=>ops.push([k,...a]);},set(o,k:string,v){o[k]=v;ops.push([k,v]);return true;}}) as CanvasRenderingContext2D};}
for(const [width,height]of [[74,72],[110,100],[30,20]])for(const cam of [0,140,900]){
 const source=structuredClone(composition),hut=source.instances.find(n=>n.id==='hut')!;hut.placement.x=220;hut.props.width=width;hut.props.height=height;
 const scene=declaredScene(sceneSource as never,source,gameplay as never,{},devices as never),rules=typeof scene.rules==='function'?scene.rules({} as never):scene.rules;
 const m=new SceneModel({say(){},open(){},changed(){}},scene.data!,rules,undefined,undefined,undefined,undefined,scene.gameplay);
 const view={...frameView(137),cam,viewW:640,viewH:360,gy:300,y:(h:number)=>300-h,sx:(x:number,p=1)=>Math.round(x-cam*p)},env=scene.visualEnvironment!(view,{m,hover:null,layer:'all'}),rows=resolveComposition(art,source as never,env);
 const L=env.bindings!['harbor.layout'] as unknown as HarborLayout;assert.equal(L.hut.w,width);assert.equal(L.hut.h,height);
 for(const id of ['hutBack','hutFront'] as const){
  const e=art.get('harbor.'+id),row=rows.find(r=>r.instance.type===e.type)!,a=record(),b=record();
  assert.equal(e.libraryUse,'reusable');assert.deepEqual(Object.keys(e.visualFields!).sort(),['hutHeight','hutWidth']);
  createHarborPierArtwork({L,visual:env.bindings!['harbor.visual'],fishPose:env.bindings!['harbor.fishPose'],teaPose:env.bindings!['harbor.teaPose'],loads:env.bindings!['harbor.loads']} as never)[id](a.ctx,view);e.draw(b.ctx,view,row.props,row.state,'backdrop',row.placement);
  assert.deepEqual(b.ops,a.ops,'native pixels/commands and culling retain the shared hut kernel');
  const c=record(),p=art.properties(e.type,{width,height}),state=art.visualProperties(e.type,{});
  e.draw(c.ctx,view,p,state,'backdrop',row.placement);assert.deepEqual(c.ops,a.ops,'unbound standalone dimensions reproduce the native hut');
  assert.deepEqual(e.anchors(row.props,row.state).roof,{x:width/2,h:height+4,role:'surface'},'linked native dimensions drive selection anchors too');
 }
 assert.equal(source.instances.find(n=>n.id==='hut')!.bindings,undefined);
 assert.deepEqual(source.instances.find(n=>n.id==='hut-front')!.bindings,{hutWidth:'scene.hutWidth',hutHeight:'scene.hutHeight'},'the front keeps explicit scalar links to its rear dimensions');
}
console.log('Harbor hut artwork PASS: native/standalone command parity, dimensions, culling, anchors and source-owned front/rear links.');
