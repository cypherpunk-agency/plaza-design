/** Source-only creation recipe. Runtime motion remains ordinary Circuit movers. */
import {art,type Instance} from '../art';
import {emptyDeviceSource} from '../engine/empty-data';
import {newAuthoredScene,type AuthoredScene} from '../engine/gameplay/scene-catalogue';
import type {VehicleSource} from '../world/vehicles';
export type VehiclePreset='shuttle'|'cart';
export function newVehicleScene(scene:string,name:string,kind:VehiclePreset='shuttle'):AuthoredScene{
 const entry=newAuthoredScene(scene,name),nodes=entry.composition.instances;
 const add=(id:string,type:string,x:number,h:number,props:Instance['props']={},attach?:Instance['attach'],layer:Instance['layer']='set',bindings?:Instance['bindings'])=>nodes.push({id,type,props,placement:{x,h},order:nodes.length,layer,...(attach?{attach}:{}),...(bindings?{bindings}:{})});
 entry.scene.manifest!.width=2400;nodes[0].placement.x=224;
 entry.scene.environment={outdoor:true,ambient:{sky:true,weather:false}};
 add('sky-traffic','environment.sky-traffic',0,0,{},undefined,'distance');
 add('platform','level.floor',0,0,{width:2400,label:'Platform'},undefined,'logic');
 add('surface','level.slab',0,0,{width:2400,thickness:18},undefined,'backdrop');
 const vehicle:VehicleSource={id:'service',kind:kind==='cart'?'cart':'shuttle',mover:'service.frame',doors:{mover:'service.doors',open:.9},cars:[],gap:20,gangways:true,
  route:{legs:[{zone:scene,from:{x:160,h:0},to:{x:960,h:0},length:800,facing:1}]},berths:[{id:'west',zone:scene,x:160,h:0,floor:'platform'},{id:'east',zone:scene,x:960,h:0,floor:'platform'}],shell:[]};
 if(kind==='cart'){
  vehicle.cars=[{id:'cart',width:90,doors:[],seats:[],shellOnly:true}];
  vehicle.route.legs=[{zone:scene,from:{x:160,h:80},via:{x:560,h:220},to:{x:960,h:80},length:800,facing:1},{zone:scene,from:{x:960,h:80},to:{x:1160,h:0},drop:true,length:200,facing:1}];vehicle.berths=[];
  add('service','vehicle.frame',0,0,{vehicle:vehicle as never},undefined,'logic');
  add('cart','vehicle.road',0,0,{kind:'van',speed:0}, {instance:'service',anchor:'origin'});
 }else{
  add('service','vehicle.frame',0,0,{vehicle:vehicle as never},undefined,'logic');
  for(let i=0;i<2;i++){
   const id='car'+(i+1),props=art.properties('vehicle.car',{length:533,cab:i?'right':'left',plate:'CAR '+(i+1)}),anchors=art.get('vehicle.car').anchors(props,{});
   if(i)add('gangway','vehicle.gangway',0,0,{length:20,face:'far'},{instance:'car1',anchor:'end'},'backdrop',{open:'vehicle.service.gangway'});
   add(id,'vehicle.car',0,0,props,{instance:i?'gangway':'service',anchor:i?'end':'origin'},'backdrop');
   const doors=Object.entries(anchors).filter(([key])=>/^door\d+$/.test(key)).map(([key,a],j)=>{
    const artId=id+'-door'+j;vehicle.shell!.push(artId);add(artId,'vehicle.door',0,0,{width:36,height:54},{instance:id,anchor:key},'foreground',{open:'vehicle.service.open'});return{id:'d'+j,x:a.x,w:36};
   });
   const bench=id+'-bench';add(bench,'vehicle.seat',2,0,{places:4,place:20},{instance:id,anchor:'bay1'});
   vehicle.cars.push({id,width:533,doors,seats:Array.from({length:4},(_,s)=>({id:'seat'+s,x:anchors.bay1.x+12+s*20,h:14,artwork:bench,anchor:'seat'+s}))});
  }
 }
 if(kind==='shuttle')add('passengers','character.flow',0,0,{clock:'scene',flow:{seed:17,speed:38,maxWait:60,spawn:{kind:'interval',every:12},route:[{kind:'walk',x:120,h:0},{kind:'board',x:224,h:0,vehicle:'service',slots:3,spacing:22,gap:.6}]},vehicle:{frame:'service',board:'west',alight:'east'},exit:[{kind:'leave',x:1400,h:0}],looks:[{seed:37},{seed:51},{seed:69}]},undefined,'playfield',{people:'flow.passengers.people'});
 entry.devices=emptyDeviceSource(scene,name);
 entry.devices.devices.push({id:'service',name:'SERVICE',look:'Vehicle service',status:'automatic',layout:{spot:{x:80,y:0,w:24,h:40},board:{x:.5,y:.5}},nouns:[
  {id:'frame',layer:'hardware',function:'act',events:['started','arrived'],mover:{axis:'x',wired:false,stops:{west:0,east:kind==='cart'?1000:800},start:'west',auto:'service',paths:{service:[{ms:12000},{ms:600,drives:'doors:close'},{to:'east',ms:9000,ease:'smooth'},{ms:700,drives:'doors:open'},{ms:12000},{ms:600,drives:'doors:close'},{to:'west',ms:9000,ease:'smooth'},{ms:700,drives:'doors:open'},{run:'service'}]}}},
  {id:'doors',layer:'hardware',function:'act',events:['started','arrived'],mover:{axis:'x',wired:false,stops:{closed:0,open:1},start:'open',paths:{close:[{to:'closed',ms:600}],open:[{to:'open',ms:700}]}}}
 ]});
 return entry;
}
