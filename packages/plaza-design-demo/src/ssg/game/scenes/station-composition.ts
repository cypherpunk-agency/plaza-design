import { frameView } from '../art/core/view';
/** Station-specific composition/state adapter, shared by the two LINE 0 platforms. */
import { art } from '../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Instance,type Value } from '../art/core/composition';
import type { View } from '../art/core/view';
import type { SceneDef } from './kit';
import { crowd,type RiderKind } from '../art/characters/riders';
import { departureVisual,platformQueue,platformTrainVisual } from '../world/transport/line';
import { harborOpen } from '../world/city';
import type { StationLayout as GLayout } from '../art/assemblies/galleria-station';
import type { StationLayout as HLayout } from '../art/assemblies/harbor-station';
export type StationRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export const stationMarkerPolicy={exitAxes:['x'] as const,platformStopAxes:['x'] as const,platformTrainGeometry:'Horizontal stop position drives artwork, boarding doors and train arrival; height, scale, mirror and parallax remain fixed'} as const;
const all=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...all(n.children??[])]);
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,t:0,cam:0,gy:0,viewW:1200,viewH:360,flags:{}};
export function createStationComposition(id:'galleriaStation'|'harborStation',source:unknown){
 const station=id==='galleriaStation'?'galleria':'harbor';
 const original=art.validate(source),expectedTypes=new Map(all(original.instances).map(n=>[n.id,n.type]));
 const required=['scene','spawn','train-exit','street-exit','roof','board','screen','regular','platform-train','slab','bench0','bench1',...(station==='galleria'?['snacks','linemap']:['horizon','water','checkpoint','tide'])];
 function defaults(doc:Composition){const result:Record<string,Value>={};for(const node of all(doc.instances))for(const[field,name]of Object.entries(node.bindings??{}))result[name]=art.get(node.type).visualFields![field].default;return result;}
 function geometry(doc:Composition=composition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
 function validate(input:unknown):Composition{
  const doc=art.validate(input);if(doc.scene!==id)throw new Error('Expected '+id+' composition');
  const nodes=all(doc.instances);
  for(const key of required){const n=nodes.find(n=>n.id===key);if(!n||n.type!==expectedTypes.get(key))throw new Error(id+': missing/changed gameplay-bound instance '+key);}
  for(const node of nodes)for(const name of Object.values(node.bindings??{}))if(!['architecture.roof','transit.train','transit.departure','transit.closed'].includes(name)&&!/^transit\.waiting\.\d+$/.test(name))throw new Error(node.id+': unknown station binding '+name);
  const stop=geometry(doc).find(r=>r.instance.id==='platform-train')!.placement;
  if(stop.h!==0||stop.scale!==1||stop.facing!==1||stop.parallax!==1)throw new Error('platform-train.placement: transport supports horizontal stop edits only; height, scale, facing and parallax must retain their native values');
  return doc;
 }
 const composition=validate(original);
 function environment(doc:Composition,view:View,state:Environment['state']={},options:StationRenderOptions={}):Environment{
  const bindings=defaults(doc),g=geometry(doc),get=(key:string)=>{const r=g.find(r=>r.instance.id===key);if(!r)throw new Error('Missing station geometry '+key);return r;};
  const roof=get('roof');bindings['architecture.roof']=roof.placement.h+Number(roof.props.under);
  bindings['transit.train']=platformTrainVisual(station,view.t,get('platform-train').placement.x) as unknown as Value;
  const departure=departureVisual(station,view.t);bindings['transit.departure']={...departure,due:Number.isFinite(departure.due)?departure.due:0};
  const closed=station==='harbor'&&!harborOpen(view.flags);bindings['transit.closed']=closed;
  const waiting=g.filter(r=>r.instance.type==='station.waiting-passenger').sort((a,b)=>a.instance.order-b.instance.order),q=platformQueue(station,view.t),folk=crowd(300+q.train*11+waiting.length*3+station.length,waiting.length);
  waiting.forEach((_row,i)=>{const r=folk[i];bindings['transit.waiting.'+i]={on:!closed&&!q.boarded&&r.on,kind:r.kind,flip:r.flip,phase:r.phase};});
  return{view,bindings,state,reduced:false,...options};
 }
 function layout(doc:Composition=composition):GLayout&HLayout{
  const g=geometry(doc),get=(key:string)=>{const r=g.find(r=>r.instance.id===key);if(!r)throw new Error('Missing station geometry '+key);return r;},of=(type:string)=>g.filter(r=>r.instance.type==='station.'+type),x=(key:string)=>get(key).placement.x,roof=get('roof'),frieze=g.find(r=>r.instance.id==='frieze'),names=of('nameplate').filter(r=>r.instance.id.startsWith('frieze-')),water=g.find(r=>r.instance.id==='water');
  return{width:Number(get('scene').props.width),spawn:x('spawn'),exit:x('street-exit'),boardAt:x('train-exit'),beam:{under:Number(roof.props.under)+roof.placement.h,top:Number(roof.props.top)+roof.placement.h},canopy:{under:Number(roof.props.under)+roof.placement.h,fascia:Number(roof.props.top)+roof.placement.h},
   frieze:{h0:frieze?.placement.h??0,h1:(frieze?.placement.h??0)+Number(frieze?.props.height??0),step:names.length>1?names[1].placement.x-names[0].placement.x:280},
   posters:of('poster').map(r=>({x:r.placement.x,lines:[String(r.props.first),String(r.props.second)],...(r.props.red?{red:true}:{})})),
   columns:of('column').map(r=>r.placement.x),posts:of('canopy-post').map(r=>r.placement.x),lamps:[...of('strip-lamp'),...of('canopy-lamp')].map(r=>r.placement.x),
   board:x('board'),benches:of('bench').map(r=>({x:r.placement.x,...(r.props.who?{who:r.props.who as RiderKind}:{})})),snacks:g.find(r=>r.instance.id==='snacks')?.placement.x??0,lineMap:g.find(r=>r.instance.id==='linemap')?.placement.x??0,screen:x('screen'),
   cams:of('camera').map(r=>r.instance.attach?x(r.instance.attach.instance):r.placement.x),cam:of('camera')[0].instance.attach?x(of('camera')[0].instance.attach!.instance):of('camera')[0].placement.x,
   waiting:of('waiting-passenger').map(r=>r.placement.x),horizon:water?Number(water.props.horizon):0,wall:water?Number(water.props.wall):0,cranes:of('harbor-crane').map(r=>[r.placement.x,Number(r.props.height),Number(r.props.phase)]),tide:g.find(r=>r.instance.id==='tide')?.placement.x??0,checkpoint:g.find(r=>r.instance.id==='checkpoint')?.placement.x??0,
  };
 }
 function draw(ctx:CanvasRenderingContext2D,view:View,doc:Composition=composition,state:Environment['state']={},options:StationRenderOptions={}){drawComposition(ctx,art,doc,environment(doc,view,state,options),'backdrop');}
 function adapt(scene:SceneDef,document:Composition=composition,state:Environment['state']={},options:StationRenderOptions={}):SceneDef{
  const doc=validate(document),g=geometry(doc),get=(key:string)=>g.find(r=>r.instance.id===key)!,l=layout(doc);
  return{...scene,width:l.width,spawn:l.spawn,platformStop:get('platform-train').placement.x,rests:l.benches.map((b,i)=>({id:'bench'+i,x:b.x-(b.who?12:0),kind:'bench' as const})),
   exits:scene.exits.map(e=>({...e,x:e.id==='train'?l.boardAt:l.exit})),readables:scene.readables?.map(r=>({...r,x:get(r.id).placement.x})),
   ...(station==='harbor'?{horizon:l.horizon,ambient:{...scene.ambient,covers:[{from:-60,to:l.width+60,under:l.canopy.under}]}}:{}),
   drawBackdrop:(ctx,view)=>draw(ctx,view,doc,state,options),
  };
 }
 return{composition,validate,geometry,environment,layout,draw,adapt};
}
