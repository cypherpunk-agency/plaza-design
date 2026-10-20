import {resolveArtworkRoles} from '../../engine/gameplay/artwork-roles';
import {transitActors,transitActorBindings,validateTransitActorNode,validateTransitBenchNodes} from './transit-actors';
import type {Character} from '../../runtime/characters';
import {content,transitBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import * as defaultMetro from '../../world/transport/line';
import type {LineSystem} from '../../world/transport/line';
import { frameView } from '../../art/core/view';
/** Elevated station source and transport/skyline controller adapter. */
import { art } from '../../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import { Skyline,type SkylineSnapshot,type SkyFrame } from '../../art/environment/skyline';
import { metroSnapshotValue,type MetroCityVisual } from '../../art/assemblies/metro-elements';
import type { MetroLayout } from '../../art/assemblies/downtown-platform';

import { light } from '../../world/light';

import type { SceneDef } from '../kit';
import source from './composition.json';
export type MetroRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>> & {metro?:LineSystem};
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:960,viewH:360,flags:{}};
function flatten(nodes:Composition['instances']):Composition['instances']{return nodes.flatMap(n=>[n,...flatten(n.children??[])]);}
function defaults(doc:Composition){const out:Record<string,Value>={};for(const n of flatten(doc.instances))for(const[k,b]of Object.entries(n.bindings??{}))out[b]=art.get(n.type).visualFields![k].default;return out;}
export function metroGeometry(doc:Composition=metroComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function validateMetroComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='metro')throw new Error('Expected metro composition');validateTransitBenchNodes(flatten(doc.instances));for(const n of flatten(doc.instances)){if(validateTransitActorNode('metro',n))continue;for(const b of Object.values(n.bindings??{}))if(!['metro.city','metro.daylight','metro.truss','metro.roof','metro.roofLocal','transit.train','transit.departure'].includes(b)&&!/^actor\.[-a-zA-Z0-9_.]+\.pose\.embedded$/.test(b))throw new Error(n.id+': unknown Metro binding '+b);}for(const row of metroGeometry(doc).filter(r=>r.instance.type==='station.train'||r.instance.type==='metro.turnstile')){const p=row.placement;if(p.h!==0||p.scale!==1||p.facing!==1||p.parallax!==1)throw Error('Metro transport/checkpoint supports horizontal stop edits only');}return doc;}
export const metroComposition=validateMetroComposition(source);
export const metroMarkerPolicy={exitAxes:['x'] as const,platformStopAxes:['x'] as const,checkpointAxes:['x'] as const,description:'Horizontal stop/checkpoint edits drive native interactions. Height, scale, mirror and parallax remain fixed.'};
export function metroArtworkRoles(doc:Composition=metroComposition,sceneDocument:SceneDocument=content.scene,rows=metroGeometry(doc)){const roles=resolveArtworkRoles('metro',sceneDocument.manifest?.artwork,rows);for(const role of ['roof','deck','horizon','stop'])if(!roles[role])throw Error('Metro requires artwork role '+role);return roles;}
export function metroLayout(doc:Composition=metroComposition,sceneDocument:SceneDocument=content.scene):Pick<MetroLayout,'width'|'spawn'|'canopy'|'deck'|'horizon'>{const rows=metroGeometry(doc),ordinary=manifestGeometry(sceneDocument,rows,transitBindingGroups,{groundExits:false}),roles=metroArtworkRoles(doc,sceneDocument,rows),roof=roles.roof;return{width:ordinary.width,spawn:ordinary.spawn,canopy:{under:Number(roof.props.under)+roof.placement.h,fascia:Number(roof.props.fascia)+roof.placement.h,truss:Number(roof.props.truss)+roof.placement.h},deck:Number(roles.deck.props.deck)+roles.deck.placement.h,horizon:roles.horizon.placement.h};}
/** Layout initialization here needs gradients only; the controller never paints a canvas. */
const layoutSink={createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})} as unknown as CanvasRenderingContext2D;
export interface MetroCityState{city:SkylineSnapshot|null;time:number;frame:SkyFrame|null}
function validateCityState(input:unknown):MetroCityState{
 const value=input as MetroCityState;if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['city','time','frame'].includes(k))||!Number.isFinite(value.time))throw new Error('Invalid Metro presentation state');
 if(value.city===null){if(value.frame!==null||value.time!==-1)throw new Error('Invalid uninitialized Metro presentation state');return value;}
 const c=value.city,f=value.frame;if(!c||typeof c!=='object'||Object.keys(c).some(k=>!['key','random','packets'].includes(k))||typeof c.key!=='string'||!Number.isInteger(c.random)||c.random<0||c.random>=233280||!Array.isArray(c.packets)||c.packets.length!==16||!f||typeof f!=='object'||Object.keys(f).some(k=>!['W','H','top','horizon','sky','sunX','camMax'].includes(k))||![f.W,f.H,f.top,f.horizon,f.sky,f.sunX,f.camMax].every(Number.isFinite)||f.W<=0||f.H<=0||value.time<0)throw new Error('Invalid Metro skyline snapshot');
 for(const p of c.packets)if(!p||typeof p!=='object'||Object.keys(p).some(k=>!['r','out','ph','k','s','v','cyan','sx','wait','dir'].includes(k))||![p.r,p.ph,p.k,p.s,p.v,p.sx,p.wait,p.dir].every(Number.isFinite)||typeof p.out!=='boolean'||typeof p.cyan!=='boolean'||!Number.isInteger(p.ph)||p.ph<0||p.ph>5||!Number.isInteger(p.r)||p.r<0||!Number.isInteger(p.k)||p.k<0||![-1,1].includes(p.dir))throw new Error('Invalid Metro packet snapshot');
 return structuredClone(value);
}
/** A scene host owns this controller; painting and bounds consume one immutable prepared frame. */
export class MetroCitySession{
 private city=new Skyline();private time=-1;private frame:SkyFrame|null=null;
 sample(doc:Composition,view:View,sceneDocument:SceneDocument=content.scene):MetroCityVisual{const L=metroLayout(doc,sceneDocument),W=Math.ceil(view.viewW),H=Math.ceil(view.viewH),horizon=view.y(L.horizon),k=this.time<0?0:Math.min(3,Math.max(0,view.t-this.time))*.6,frame={W,H,top:0,horizon,sky:Math.min(horizon,400),sunX:W*.58,camMax:Math.round(L.width*.5)},draw={cam:Math.max(0,Math.round(view.cam*.5)),a:view.t,k,still:false,floor:false,rain:0,over:{stars:light().night}};this.city.parts(layoutSink,frame,draw);const before=this.city.snapshot();this.city.advance(layoutSink,frame,k,false);this.time=view.t;this.frame=frame;return{frame,draw,before};}
 preview(doc:Composition,view:View,sceneDocument:SceneDocument=content.scene):MetroCityVisual{const copy=new MetroCitySession();copy.restore(this.snapshot());return copy.sample(doc,view,sceneDocument);}
 snapshot():MetroCityState{return{city:this.frame?this.city.snapshot():null,time:this.time,frame:this.frame?{...this.frame}:null};}
 restore(input:unknown){const value=validateCityState(input);this.city=new Skyline();if(value.city&&value.frame){this.city.parts(layoutSink,value.frame,{cam:0,a:0,k:0,still:false,floor:false,rain:0});this.city.restore(value.city);}this.time=value.time;this.frame=value.frame;}
}
export function metroEnvironment(doc:Composition,view:View,prepared:MetroCityVisual,metro:LineSystem=defaultMetro,sceneDocument:SceneDocument=content.scene,actors?:Readonly<Record<string,Character>>):Environment{const {platformTrainVisual,departureVisual}=metro;const rows=metroGeometry(doc),roles=metroArtworkRoles(doc,sceneDocument,rows),roof=roles.roof,b=defaults(doc);b['metro.city']=metroSnapshotValue(prepared);b['metro.daylight']=light().daylight;b['metro.truss']=roof.placement.h+Number(roof.props.truss);b['metro.roof']=roof.placement.h+Number(roof.props.under);b['metro.roofLocal']=Number(roof.props.under);b['transit.train']=platformTrainVisual('downtown',view.t,roles.stop.placement.x) as unknown as Value;const departure=departureVisual('downtown',view.t);b['transit.departure']={...departure,due:Number.isFinite(departure.due)?departure.due:0};Object.assign(b,transitActorBindings(sceneDocument,rows,view,{metro},actors));return{view,state:{},bindings:b,reduced:false};}
export function drawMetroComposition(ctx:CanvasRenderingContext2D,view:View,prepared:MetroCityVisual,doc=metroComposition,state:Environment['state']={},options:MetroRenderOptions={},sceneDocument:SceneDocument=content.scene,actors?:Readonly<Record<string,Character>>){const {metro:_metro,...renderOptions}=options;drawComposition(ctx,art,doc,{...metroEnvironment(doc,view,prepared,options.metro,sceneDocument,actors),state,...renderOptions},'backdrop');}
export function adaptMetro(scene:Omit<SceneDef,'drawBackdrop'>,doc=metroComposition,state:Environment['state']={},options:MetroRenderOptions={},session=new MetroCitySession(),sceneDocument:SceneDocument=content.scene):SceneDef{const document=validateMetroComposition(doc),rows=metroGeometry(document),roles=metroArtworkRoles(document,sceneDocument,rows),L=metroLayout(document,sceneDocument),actors=transitActors(sceneDocument,rows);let prepared:MetroCityVisual|undefined;return{...scene,people:(sceneDocument.actors??[]).filter(a=>a.band==='world').map(a=>actors[a.id]),platformStop:roles.stop.placement.x,horizon:L.horizon,ambient:{...scene.ambient,covers:[{from:-60,to:L.width+60,under:L.canopy.under}]},lights:rows.filter(r=>r.props.role==='light').map(r=>({x:r.placement.x,h:r.placement.h,kind:'lamp',r:Number(r.props.width),col:'255,230,190'})),presentationState:{capture:()=>session.snapshot() as unknown as Value,restore(value){session.restore(value);prepared=undefined;}},preparePresentation:v=>{prepared=session.sample(document,v,sceneDocument);},visualEnvironment:v=>metroEnvironment(document,v,prepared??session.preview(document,v,sceneDocument),options.metro,sceneDocument,actors),drawBackdrop:(ctx,v)=>drawMetroComposition(ctx,v,prepared??session.preview(document,v,sceneDocument),document,state,options,sceneDocument,actors)};}
