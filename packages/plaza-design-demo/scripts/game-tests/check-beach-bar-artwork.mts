/** SALT pieces keep native shared-width bindings and can also be authored independently. */
import assert from 'node:assert/strict';
import {art,resolveComposition} from '../../src/ssg/game/art';
import {frameView,placed} from '../../src/ssg/game/art/core/view';
import {saltUnder,saltBack,saltShell,saltCounter,saltLights} from '../../src/ssg/game/art/assemblies/beach-bar';
import {declaredScene} from '../../src/ssg/game/engine/gameplay/declared-scene';
import {SceneModel} from '../../src/ssg/game/engine/model';
import source from '../../src/ssg/game/scenes/beach/scene.json';
import composition from '../../src/ssg/game/scenes/beach/composition.json';
import gameplay from '../../src/ssg/game/scenes/beach/gameplay.json';
import devices from '../../src/ssg/game/scenes/beach/devices.json';
const view={...frameView(137),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h};
const kernels={'bar-under':saltUnder,'bar-back':saltBack,'bar-shell':saltShell,'bar-counter':saltCounter,'bar-lights':(x:CanvasRenderingContext2D,w:number,_p:number,t:number)=>saltLights(x,w,t)};
function record(){const ops:unknown[]=[],state:Record<string,unknown>={};return{ops,ctx:new Proxy(state,{get(o,k:string){if(k in o)return o[k];if(k.startsWith('create'))return()=>({addColorStop(...args:unknown[]){ops.push(['stop',...args]);}});return(...args:unknown[])=>ops.push([k,...args]);},set(o,k:string,value){o[k]=value;ops.push([k,value]);return true;}}) as CanvasRenderingContext2D};}
for(const [id,kernel] of Object.entries(kernels))for(const width of [80,226,380])for(const bound of [false,true])for(const t of [0,137,301]){
 const e=art.get('beach.'+id),p=art.properties(e.type,{width}),state=art.visualProperties(e.type,{...(bound?{barWidth:width+20}:{}),palette:.6}),at={x:80,h:20,scale:1,facing:1 as const,parallax:1},v={...view,t},a=record(),b=record(),before=JSON.stringify({p,state});
 placed(a.ctx,v.sx(at.x),v.y(at.h),1,()=>kernel(a.ctx,bound?width+20:width,.6,t));e.draw(b.ctx,v,p,state,'backdrop',at);
 assert.equal(JSON.stringify(b.ops),JSON.stringify(a.ops),id+' preserves shared kernel commands with '+(bound?'bound':'own')+' width');
 assert.equal(JSON.stringify({p,state}),before,'drawing does not write properties/state');
 const invisible=record();e.draw(invisible.ctx,v,p,{...state,barVisible:false},'backdrop',at);assert.equal(invisible.ops.length,0,'native visibility still controls the whole piece');
 assert.equal(e.libraryUse,'reusable');assert(e.bounds(p,state,{view:v,placement:at}).w>0);
 assert.throws(()=>art.properties(e.type,{width:0}),'zero-width bars reject');
}
// Editing the current beach's controlling width still resizes all five native source pieces.
for(const width of [226,320]){
 const doc=structuredClone(composition),under=doc.instances.find(n=>n.type==='beach.bar-under')!;under.props.width=width;
 const scene=declaredScene(source as never,doc,gameplay as never,{},devices as never),m=new SceneModel({say(){},open(){},changed(){}},scene.data!,typeof scene.rules==='function'?scene.rules(()=>0):scene.rules,undefined,undefined,undefined,undefined,scene.gameplay);
 const env=scene.visualEnvironment!(view,{m,hover:null,layer:'all'}),rows=resolveComposition(art,doc,env);
 for(const id of Object.keys(kernels)){const row=rows.find(r=>r.element.type==='beach.'+id)!;assert.equal(row.state.barWidth,width,id+' uses the actual pending source width');assert.deepEqual(Object.keys(row.instance.bindings??{}).sort(),['barVisible','barWidth','palette'],'unread scene inputs removed');}
 const drink=rows.find(r=>r.instance.id==='drink')!,stool=rows.find(r=>r.instance.id==='stool-2')!,mixer=rows.find(r=>r.instance.id==='mixer')!;
 assert.equal(drink.element.type,'props.drink','the existing source marker is now the actual artwork');
 assert.equal(drink.placement.x,stool.placement.x);assert.equal(drink.placement.h,stool.placement.h+26);
 assert.equal(drink.instance.order,mixer.instance.order+1,'the cup follows its source mixer in the same set pass');
 assert(drink.placement.x+4<mixer.placement.x-16,'source cup pixels do not overlap the mixer hover outline');
 for(const present of [false,true]){
  m.set('freeDrink',present);
  const prepared=resolveComposition(art,doc,scene.visualEnvironment!(view,{m,hover:null,layer:'all'})),cup=prepared.find(r=>r.instance.id==='drink')!,body=prepared.find(r=>r.instance.id==='mixer')!,actual=record(),expected=record(),machine=record();
  assert.equal(cup.state.present,present,'native device state controls cup presence');
  cup.element.draw(actual.ctx,view,cup.props,cup.state,'backdrop',cup.placement);
  if(present){expected.ctx.fillStyle='rgba(255,170,90,.85)';expected.ctx.fillRect(view.sx(stool.placement.x)-2,view.y(stool.placement.h+32),5,6);expected.ctx.fillStyle='#7ab83a';expected.ctx.fillRect(view.sx(stool.placement.x)+2,view.y(stool.placement.h+33),2,2);}
  assert.deepEqual(actual.ops,expected.ops,'cup retains its exact original pixels/position and presence condition');
  body.element.draw(machine.ctx,view,body.props,body.state,'backdrop',body.placement);
  assert(!machine.ops.some(op=>JSON.stringify(op).includes('255,170,90,.85')),'the mixer no longer paints a second cup');
 }
}
console.log('Beach bar PASS: independent dimensions, exact native kernel commands, visibility and actual shared-width source edits.');
