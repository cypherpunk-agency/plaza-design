import {source as shippingCitySource,type CitySource} from '../world/city';
import {perfMeasure} from '../runtime/diagnostics/performance';
import {compileGameWorld} from '../world/compiled-world';
import {prepareArtwork,inspectArtwork} from '../art/core/presentation';
import {mobileInstances} from '../art/core/mobility';
import {sourceProjection,dragProjection,dragFromCanvas,transformRect} from '../art/core/geometry';
import {cutView} from '../art/sequences/cinematics';
import {authoredSceneAdapter} from './scene-adapters';
import {sequenceProgram} from '../art/core/sequence';
import {createSequenceValidationContext,frameTimelineContext} from '../art/core/sequence-context';
import {evaluateTimeline} from '../art/core/timeline';
import {pendingRegistry} from './pending-registry';
import {IntroSeekSession} from '../story/cutscenes/skyline-session';
import {renderCutsceneDocument} from '../story/cutscenes';
import type {WorldFrame} from '../runtime/frame';
/** Local editor preview. Uses the shipping frame renderer with an isolated, non-persistent model. */
import { drawLevelOverlay } from './level-overlay';
import { restingLevelView } from '../engine/level';
import { art, propertyIsLinked, compositionAppearance, type ChunkDocument, type Environment, type Resolved } from '../art';
import type { View } from '../art/core/view';
import { frameView } from '../art/core/view';
import { SceneModel } from '../engine/model';
import {readQuery} from '../engine/gameplay/queries';
import {resolveValues} from '../engine/gameplay/state';
import { emptyData, NO_RULES, type EngineDraw } from '../engine/host';
import type { SceneDef } from '../scenes/kit';
import {renderWorldFrame} from '../runtime/render-scene';
import {type ZoneFrame} from '../runtime/frame';
import {placementCoordinates, joined as zoneJoined, placeFrom } from '../world/zone-graph';
import {SCENES} from '../scenes';
import { authoredDocumentId } from '../engine/gameplay/scene-catalogue';
import { zoneInfo, zoneName } from './zone-graph-context';
import { city } from '../world/clock';
import {backdropDocuments} from '../world/backdrops';
import { lightAt } from '../world/light';
import {  isWeather, sceneClimate, weatherNow, withSceneWeather, type Weather } from '../world/weather';
import type {JoinedPreview,PreviewRequest,PreviewResult} from './contracts';
import type { PlayerServices, PlayerState } from '../runtime/player';
import { BASE_NODES } from '../runtime/save';
import { drawSelectionOverlay } from './selection-overlay';
import { PLAYER_ROW, type AssetInstance } from '../art/core/composition';
import { drawPlayer } from '../art/characters/player';
import { SPR } from '../art/core/sprites';
import {sequenceInspection} from '../runtime/sequence-state';
import {sequenceWorldZones} from '../runtime/prepare-frame';
import {validateWorldCompositions} from '../world/compositions';
import {worldWithMembership} from '../world/compositions';
import {checkpointSeed} from './checkpoint';
import {sceneStateView} from '../engine/gameplay/scene-state';

export interface NativeSceneAdapter {
  validate(value: unknown): ChunkDocument;
  definition(document: ChunkDocument, state: Environment['state'], options: NativeOptions): SceneDef;
  /** Resolve authored content before construction, so removed default bindings are never evaluated. */
  pendingDefinition?(document:ChunkDocument,state:Environment['state'],options:NativeOptions,documents:ReadonlyMap<string,unknown>):SceneDef;
  environment?(document: ChunkDocument, view: View, engine: EngineDraw): Environment;
  /** Weather and climate follow this scene instead (proposal scenes borrow their base's). */
  climateScene?: string;
}
export type NativeOptions = Pick<Environment, 'reduced'> & Partial<Pick<Environment, 'visibility' | 'opacity' | 'clips' | 'sequenceTime'>>;
const number = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
/** Reject incomplete snapshots before any scene/controller work begins. */
export function validatePreviewWeather(value: unknown): asserts value is Weather {
  const levels = ['mix', 'cloud', 'rain', 'storm', 'fog', 'smog', 'heat', 'wet', 'wind'];
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid preview weather snapshot');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== levels.length + 2 || typeof record.kind !== 'string' || !isWeather(record.kind) || typeof record.from !== 'string' || !isWeather(record.from) ||
      levels.some(key => !Object.prototype.hasOwnProperty.call(record, key) || typeof record[key] !== 'number' || !Number.isFinite(record[key]) || (record[key] as number) < 0 || (record[key] as number) > 1)) throw new Error('Invalid preview weather snapshot');
}
function object(input: string | number | boolean | undefined, name: string): Record<string, unknown> {
  if (input === undefined || input === '') return {};
  if (typeof input !== 'string') throw new Error(`${name}: expected a JSON object`);
  const parsed: unknown = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${name}: expected a JSON object`);
  for (const key of Object.keys(parsed)) if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error(`${name}: invalid key`);
  return parsed as Record<string, unknown>;
}
/** Bounds are expressed in native view pixels. World and local kernels use the same document geometry. */
export function previewBounds(rows: Resolved[], view: View, options: NativeOptions & Pick<Environment,'mobileArtwork'>, document: ChunkDocument): PreviewResult {
  const appearance=compositionAppearance(document,options);
  const mobiles=(view.sharedLayers||view.artworkScope)?(options.mobileArtwork??mobileInstances(document,art)):undefined;
  return {
    bounds: rows.flatMap(row => {
      const prepared=prepareArtwork(row,document,{...options,view,state:{}},appearance.get(row.instance.id)!,mobiles?.has(row.instance.id)??false);
      return prepared.pickable?[{id:row.instance.id,...prepared.bounds,...(prepared.clip?{clip:prepared.clip}:{})}]:[];
    }),
    deltaToLocal(id, dx, dy) {
      const row=rows.find(r=>r.instance.id===id);if(!row)throw Error('Missing selected instance');
      const parent=rows.find(r=>r.instance.id===row.instance.attach?.instance||r.instance.children?.some(c=>c.id===id));
      return dragFromCanvas(dragProjection(view,row.placement,parent?.placement),{a:1,b:0,c:0,d:1,e:0,f:0},dx,dy);
    },
  };
}
export function frameSelection(frame:WorldFrame,request:PreviewRequest,namespaced=true):PreviewResult{
    const regions:NonNullable<PreviewResult['regions']>=[];
    const resolved:NonNullable<PreviewResult['resolved']>={},bounds:PreviewResult['bounds']=[],sources:NonNullable<PreviewResult['sources']>={},deltas=new Map<string,(dx:number,dy:number)=>{x:number;h:number}>(),handles:NonNullable<PreviewResult['handles']>=[];
    const documents=request.documents??new Map([[request.composition.scene,request.composition]]),owners=new Map<string,string>();
    for(const [id,value]of documents){const doc=value as ChunkDocument;if(doc&&typeof doc.scene==='string'&&Array.isArray(doc.instances))owners.set(doc.scene,id);}
    // A proposal borrows a native scene's behavior, but its captured artwork belongs to
    // the document being edited, not to the base scene whose compiler painted it.
    if(!namespaced&&request.composition.scene!==frame.sceneId)owners.set(frame.sceneId,owners.get(request.composition.scene)??request.composition.scene);
    for(const scope of frame.inspection??[]){
      if(!scope.scene)continue;
      const box=transformRect({x:scope.view.sx(0),y:0,width:scope.view.sx(scope.scene.width)-scope.view.sx(0),height:scope.view.viewH},scope.transform);
      regions.push({document:owners.get(scope.scene.id)??scope.scene.id,scene:!namespaced&&scope.scene.id===frame.sceneId?request.composition.scene:scope.scene.id,label:scope.scene.name,x:box.x,y:0,width:box.width,height:scope.viewport.height,active:scope.scene.id===(frame.cameraGuide?.scene??frame.sceneId)});
    }
    // The renderer captures each object after shared sorting, using its actual canvas transform.
    // Near parts can submit twice; their final position in paint order owns the hit target.
    const captured=new Map<string,{record:NonNullable<WorldFrame['artwork']>[number];owner:string}>();
    for(const record of [...(frame.helpers??[]),...(frame.artwork??[])]){
      const owner=owners.get(record.document.scene)??record.document.scene;
      const key=namespaced||record.document.scene!==request.composition.scene?JSON.stringify([owner,record.row.instance.id]):record.row.instance.id;
      const previous=captured.get(key)?.record;
      if(previous?.bounds.width&&previous.bounds.height&&record.bounds.width&&record.bounds.height){const a=previous.bounds,b=record.bounds,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);record.bounds={x,y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y};}
      else if(previous?.pickable&&!record.pickable){record.bounds=previous.bounds;record.pickable=true;record.pickReason=undefined;}
      captured.set(key,{record,owner});
    }
    // A non-drawing assembly encloses its visible descendants, rather than an invented handle size.
    for(const {record,owner}of captured.values())if(record.row.element.role==='group'){
      const parents=new Map<string,string>();
      const visit=(nodes:ChunkDocument['instances'],parent?:string)=>{for(const n of nodes){const at=n.attach?.instance??parent;if(at)parents.set(n.id,at);if(n.children)visit(n.children,n.id);}};visit(record.document.instances);
      const boxes=[...captured.values()].filter(c=>{if(c.owner!==owner||!c.record.pickable||c.record.row.element.role==='group')return false;let id=parents.get(c.record.row.instance.id);const seen=new Set<string>();while(id&&!seen.has(id)){if(id===record.row.instance.id)return true;seen.add(id);id=parents.get(id);}return false;}).map(c=>c.record.bounds);
      if(boxes.length){const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));record.bounds={x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};record.boundsSource='descendants';record.pickable=record.visible;record.pickReason=record.pickable?undefined:record.reason;}
    }
    for(const [key,{record,owner}]of [...captured].sort((a,b)=>a[1].record.paintOrder-b[1].record.paintOrder)){
      resolved[key]=inspectArtwork(record);sources[key]={document:owner,instance:record.row.instance.id};
      deltas.set(key,(dx,dy)=>dragFromCanvas(record.drag,record.canvasTransform,dx,dy));
      if(request.overlays&&record.pickable&&key===request.selectedId&&record.row.element.spatial){
        const p=record.row.placement,own=record.row.instance.placement;
        for(const handle of record.row.element.spatial.handles(record.row.props,{view:record.view,placement:p,state:record.row.state})){
          if(handle.fields.some(key=>propertyIsLinked(record.row,key)))continue;
          const anchor={x:record.view.sx(p.x,p.parallax),y:record.view.y(p.h)},chunk=handle.space==='chunk',screen=handle.space==='screen';
          const point=transformRect({x:screen?anchor.x+(p.x+handle.point.x-anchor.x)*p.scale*p.facing:chunk?anchor.x+(record.view.sx(handle.point.x,1)-anchor.x)*p.scale*p.facing:record.view.sx(p.x+handle.point.x*p.scale*p.facing,p.parallax),y:screen?anchor.y+(-p.h-handle.point.h-anchor.y)*p.scale:chunk?anchor.y+(record.view.y(handle.point.h)-anchor.y)*p.scale:record.view.y(p.h+handle.point.h*p.scale),width:0,height:0},record.canvasTransform);
          const projection=screen?{xUnit:1,hUnit:-1,parentScale:p.scale,parentFacing:p.facing}:chunk?dragProjection(record.view,{x:0,h:0,parallax:1},{scale:p.scale,facing:p.facing}):record.drag;
          handles.push({id:handle.id,instance:key,label:handle.label,x:point.x,y:point.y,cursor:handle.cursor,fields:handle.fields,edit(dx,dy,snap=0){const delta=dragFromCanvas(projection,record.canvasTransform,dx,dy),local=chunk||screen?delta:{x:delta.x/(own.scale??1)/(own.facing??1),h:delta.h/(own.scale??1)};if(snap){local.x=Math.round(local.x/snap)*snap;local.h=Math.round(local.h/snap)*snap;}return handle.edit(local);}});
        }
      }
      if(!record.pickable)continue;
      const b=record.bounds;if(b.width<=0||b.height<=0)continue;
      bounds.push({id:key,...b,...(record.clip?{clip:record.clip}:{})});
    }
    return{rendering:Object.fromEntries((frame.inspection??[]).map(scope=>[scope.scene.id,scope.rendering])),bounds,sources,resolved,handles,regions,projectChunk(chunk,x,h){const id=!namespaced&&chunk===request.composition.scene?frame.sceneId:chunk,scope=frame.inspection?.find(s=>s.scene?.id===id);
      if(scope)return transformRect({x:scope.view.sx(x),y:scope.view.y(h),width:0,height:0},scope.transform);
      // Membership coordinates already belong to the native source projection. An offscreen
      // member need not be painted merely to locate its origin for explicit editor navigation.
      const origin=frame.inspection?.find(s=>s.scene?.id===frame.sceneId),at=origin?.view.worldZones?.[id];
      if(origin&&at)return transformRect({x:origin.view.sx(at.x+x),y:origin.view.y(at.h+h),width:0,height:0},origin.transform);},camera:frame.cameraGuide,workspaceScale:frame.workspaceScale,activeScene:frame.cameraGuide?.scene??frame.sceneId,deltaToLocal(id,dx,dy){const delta=deltas.get(id);if(!delta)throw Error('Missing selected source');return delta(dx,dy);}};
  }
/** No Game construction, controller stepping, player-save reads or player-save writes occur here. */
export function createNativePreview(adapters: Readonly<Record<string, NativeSceneAdapter>>,bindWorld?:(definition:SceneDef,request:PreviewRequest)=>SceneDef,resolveAdapter?:(scene:string,request:PreviewRequest)=>NativeSceneAdapter|undefined) {
  const seeks=new Map<string,IntroSeekSession>(),worlds=new WeakMap<object,ReturnType<typeof pendingRegistry>>();
  const graphs=new WeakMap<object,Map<PreviewRequest['checkpoint'],ReturnType<typeof compileGameWorld>>>();
  const memberships=new WeakMap<object,Map<PreviewRequest['checkpoint'],import('../world/compositions').WorldCompositions>>();
  const worldFor=(request:PreviewRequest)=>{if(!request.documents)return;const key=request.sourceVersion??request.documents;let cache=memberships.get(key);if(!cache)memberships.set(key,cache=new Map());let source=cache.get(request.checkpoint);if(!source){source=worldWithMembership(request.documents.get('world-compositions') as import('../world/compositions').WorldCompositions,request.checkpoint?.membership);cache.set(request.checkpoint,source);}return source;};
  const scenesFor=(request:PreviewRequest)=>{let scenes=request.sourceVersion?worlds.get(request.sourceVersion):undefined;if(!scenes){scenes=request.documents?pendingRegistry(request.documents):SCENES;if(request.sourceVersion)worlds.set(request.sourceVersion,scenes);}return scenes;};
  let seeded:{source:object;fixture:NonNullable<PreviewRequest['checkpoint']>;value:ReturnType<typeof checkpointSeed>}|undefined;
  const seedFor=(request:PreviewRequest)=>{if(!request.checkpoint)return;const source=request.sourceVersion??request.documents??SCENES;if(seeded?.source!==source||seeded.fixture!==request.checkpoint){if(!request.documents)throw Error('Checkpoint preview requires source documents');seeded={source,fixture:request.checkpoint,value:checkpointSeed(request.checkpoint,request.documents,scenesFor(request))};}return seeded.value;};
  const graphFor=(request:PreviewRequest)=>{let cache=request.sourceVersion?graphs.get(request.sourceVersion):undefined,graph=cache?.get(request.checkpoint);if(!graph){let documents=request.documents;if(request.checkpoint?.membership&&documents){documents=new Map(documents);(documents as Map<string,unknown>).set('world-compositions',worldWithMembership(validateWorldCompositions(documents.get('world-compositions')),request.checkpoint.membership));}graph=compileGameWorld(scenesFor(request),documents);if(request.sourceVersion){if(!cache)graphs.set(request.sourceVersion,cache=new Map());cache.set(request.checkpoint,graph);}}return graph;};
  let directed: {source:object;fixture?:PreviewRequest['checkpoint'];sequence:string;time:number;sample:ReturnType<typeof sequenceInspection>}|undefined;
  const clearDirected=()=>{directed?.sample.dispose();directed=undefined;};
  const renderDirected=(canvas:HTMLCanvasElement,request:PreviewRequest):PreviewResult=>{
    const composition=art.validate(request.composition),timeline=sequenceProgram({[composition.scene]:composition}),id=composition.sequence!.id;
    const scale=number(request.environment.renderScale,1);if(scale<=0)throw Error('Render scale must be positive');
    const W=canvas.width/scale,H=canvas.height/scale,lighting=request.lighting??lightAt(Number(request.environment.day??1),Number(request.environment.minute??580),Number(request.environment.facing??90),null);
    const context=frameTimelineContext(createSequenceValidationContext(art,{[composition.scene]:composition}),{time:request.time,reduced:request.reduced,sequenceId:id,environment:request.environment,viewport:request.viewport??{width:canvas.width,height:canvas.height},timeline});
    const evaluated=request.frame??evaluateTimeline(timeline,id,request.time,context,{reduced:request.reduced});
    if(request.direction==='base')evaluated.camera={x:number(request.environment.cameraX,0),h:number(request.environment.cameraH,0),zoom:number(request.environment.zoom,1)};
    const initialContext=request.workspace&&(request.workspace.anchorX===undefined||request.workspace.anchorH===undefined)?frameTimelineContext(createSequenceValidationContext(art,{[composition.scene]:composition}),{time:0,reduced:request.reduced,sequenceId:id,environment:request.environment,viewport:request.viewport??{width:canvas.width,height:canvas.height},timeline}):undefined;
    const initial=initialContext?evaluateTimeline(timeline,id,0,initialContext,{reduced:request.reduced}):undefined;
    const origin=composition.instances.find(n=>n.type==='sequence.world-control')?.props.origin;
    const rootAt=request.scope&&typeof origin==='string'?placeFrom(graphFor(request),origin,Infinity).get(request.scope.origin??request.scope.chunks[0]):undefined;
    const aw=request.viewport?request.viewport.width/scale:W,ah=request.viewport?request.viewport.height/scale:H;
    const workspace=request.workspace?{...request.workspace,anchorX:request.scope?(request.workspace.anchorX??number(request.environment.cameraX,0))+(rootAt?.dx??0):request.workspace.anchorX??initial!.camera.x,anchorH:request.scope?0:request.workspace.anchorH??initial!.camera.h,...(request.scope||request.viewport?{basis:{width:aw,height:ah,ground:ah-54+(rootAt?.dh??0)}}:{})}:undefined;
    canvas.width=canvas.width;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas 2D unavailable');
    let prepared:WorldFrame|undefined;
    if(id==='intro'||id==='act2'){
      const key=composition.scene+':'+aw+':'+ah+':'+request.reduced;let seek=seeks.get(key);if(!seek)seeks.set(key,seek=new IntroSeekSession());
      if(workspace){prepared=renderWorldFrame({background:request.workspace?'#161616':undefined,kind:'sequence',workspace,context:ctx,documents:{compositions:{[composition.scene]:composition},timeline},composition,sequenceId:id,registry:art,frame:evaluated,scale,width:W,height:H,reduced:request.reduced,lighting,time:request.time,capture:true,ambient:(request.ambientTime??request.time)*60,...(id==='intro'?{skyline:seek.prepare(ctx,cutView(aw,ah,request.reduced,lighting),request.time,composition.sequence!.duration)}:{})});}else prepared=renderCutsceneDocument(ctx,W,H,id,request.time,{composition,timeline,frame:evaluated,registry:art,sequenceId:id,reduced:request.reduced,lighting,scale,seek,capture:true,ambient:(request.ambientTime??request.time)*60});
    }else{
      let scenes=scenesFor(request);
      if(scenes&&request.transient){
        const pending=request.transient.composition,local={...request,composition:pending},adapter=adapters[pending.scene]??resolveAdapter?.(pending.scene,local)??authoredSceneAdapter(pending.scene,request.documents);
        if(adapter){const options={reduced:request.reduced},definition=adapter.pendingDefinition&&request.documents?adapter.pendingDefinition(pending,{},options,request.documents):adapter.definition(pending,{},options);scenes={...scenes,[pending.scene]:bindWorld?.(definition,local)??definition};}
      }
      const world=composition.instances.some(n=>n.type==='sequence.world-control');
      let inspection:ReturnType<ReturnType<typeof sequenceInspection>['sample']>|undefined;
      if(world){
        const source=request.sourceVersion??request.documents??SCENES,sequence=request.composition.sequence!;
        if(!directed||directed.source!==source||directed.fixture!==request.checkpoint||directed.sequence!==sequence.id||request.time<directed.time){
          clearDirected();const settings=composition.instances.find(n=>n.type==='sequence.world-control')!;
          const worldSource=worldFor(request);
          directed={source,fixture:request.checkpoint,sequence:sequence.id,time:0,sample:sequenceInspection(scenes??SCENES,{...sequence,composition:composition.scene},sequenceWorldZones(art.properties(settings.type,settings.props),scenes??SCENES,worldSource),request.documents,seedFor(request)?.seed)};
        }
        inspection=directed.sample.sample(request.time);directed.time=request.time;
      }else clearDirected();
      if(world){ctx.setTransform(scale,0,0,scale,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);}
      prepared=renderWorldFrame({background:request.workspace?'#161616':undefined,kind:'sequence',workspace,context:ctx,documents:{compositions:{[composition.scene]:composition},timeline},composition,sequenceId:id,registry:art,frame:evaluated,scale,width:W,height:H,reduced:request.reduced,lighting,time:request.time,capture:true,ambient:(request.ambientTime??request.time)*60,destination:String(request.environment.destination??'DOWNTOWN'),world:{citySource:weatherSource(request),scenes,documents:request.documents,graph:graphFor(request),ambientTime:request.ambientTime??(number(request.environment.titleOffset,id==='glide'?7:0)+request.time),...inspection}});
    }
    if(!prepared)throw Error('Missing prepared frame');
    const selection=frameSelection(prepared,request);if(workspace)selection.workspaceAnchor=request.scope?{x:workspace.anchorX-(rootAt?.dx??0),h:0}:{x:workspace.anchorX,h:workspace.anchorH};if(request.overlays)drawSelectionOverlay(ctx,selection,request.selectedId,request.objectOutlines);return selection;
  };

  /** Inspection never advances simulation: deadlines are reinitialised after replacing host time, so a clock/countdown
   * snapshot cannot depend on render duration or warmup. */
  const inspectionModel = (def: SceneDef, services: PlayerServices, request: PreviewRequest) => {
    const forbidden = () => { throw new Error('Preview cannot perform gameplay effects'); };
    const rules = typeof def.rules === 'function' ? def.rules(services) : def.rules ?? NO_RULES;
    const seeded=seedFor(request)?.save;
    const model = new SceneModel({ say: forbidden, open: forbidden, changed() {} }, def.data ?? emptyData(def.id, def.name), rules,undefined,undefined,undefined,seeded?sceneStateView(seeded.gameplay??{},def.id,def.gameplay):undefined,def.gameplay);
    model.now = () => 0;
    model.wall = () => 0;
    if(seeded)model.restore({state:{...model.state},goals:[],links:[],logic:[]});else model.reset();
    if (def.level) {
      const graph = graphFor(request);
      model.peopleLevel = { ...def.level, vehicleZones: placementCoordinates(placeFrom(graph,def.id,Infinity)) };
    }
    const player = services.save();
      // Inspection uses the shipping read evaluator over its isolated state. It never installs
      // command/timer hooks or advances simulation, and calculated values have no saved owner.
      if(def.gameplay?.queries){
        const definition=def.gameplay,ids=new Set(Object.keys(definition.queries??{}));model.gameplayQueryIds=ids;
        model.gameplayQuery=id=>{if(!ids.has(id))return undefined;const state={flags:player.flags,items:{},tokens:player.tokens,values:{[def.id]:model.state},world:{day:city.day,minute:city.min,weather:(request.weather??weatherNow(sceneClimate(def.id,weatherSource(request)),weatherSource(request))).kind}};
          return readQuery(id,{...state,values:resolveValues(definition,state)},{definition,tuning:model.data.tuning,labels:model.texts,cables:model.links,sceneTime:model.now(),cameraCrates:model.data.camera?.crates,nativeRead:key=>model.rules.derivedTypes?.[key]?model.rules.derived?.[key]?.(model):undefined});};
      }
    return model;
  };
  /**
   * The zones joined to the open one by the pending seams (world/zone-graph.json), one seam away, as runtime/game.ts
   * `zoneFrame` draws them: each its own pending scene, isolated model and light, its view moved by where it lies.
   * Captured source-qualified artwork remains selectable in the shared frame.
   */
  /** The zones one seam away and where they lie (scene units), for the composer's tags, dimming and Fit joined. */
  const placed = (request: PreviewRequest, sceneId: string) => {
    const documents = request.documents, source = documents?.get('zone-graph');
    if (!documents || source === undefined) return [];
    const graph = graphFor(request); if (!zoneJoined(graph, sceneId)) return [];
    const info = zoneInfo(documents);
    return [...placeFrom(graph, sceneId)].flatMap(([zone, at]) => zone === sceneId || request.scope&&!request.scope.chunks.includes(zone) || !info[zone] ? [] : [{ zone, label: zoneName(zone, documents), dx: at.dx, dh: at.dh, width: info[zone].width }]);
  };
  const weatherSource=(request:PreviewRequest)=>(request.documents?.get('city-source') as CitySource|undefined)??shippingCitySource;
  const neighbours = (request: PreviewRequest, sceneId: string, view: View, zoom: number, services: PlayerServices): ZoneFrame[] => {
    const documents = request.documents, source = documents?.get('zone-graph');
    if (!documents || source === undefined) return [];
    const graph = graphFor(request); if (!zoneJoined(graph, sceneId)) return [];
    const out: ZoneFrame[] = [];
    for (const [zone, at] of placeFrom(graph, sceneId)) {
      if(request.scope&&!request.scope.chunks.includes(zone))continue;
      const value = zone === sceneId ? undefined : documents.get(zone) ?? documents.get(authoredDocumentId(zone, 'composition'));
      if (value === undefined) continue;
      const nearby: PreviewRequest = { ...request, composition: value as ChunkDocument, frame: undefined };
      const adapter = adapters[zone] ?? resolveAdapter?.(zone, nearby); if (!adapter) continue;
      const document = adapter.validate(value), options: NativeOptions = { reduced: request.reduced, sequenceTime: request.time };
      const original = adapter.pendingDefinition ? adapter.pendingDefinition(document, {}, options, documents) : adapter.definition(document, {}, options);
      const def = bindWorld?.(original, { ...nearby, composition: document }) ?? original, model = inspectionModel(def, services, request);
      const engine: EngineDraw = { m: model, hover: null, layer: 'all' };
      const zoneView: View = { ...frameView((request.ambientTime??request.time) * 60),worldZones:placementCoordinates(placeFrom(graph,zone,Infinity)), viewW: view.viewW, viewH: view.viewH, gy: view.gy - at.dh,
        ...sourceProjection({cam:view.cam,gy:view.y(0)},at,zoom,request.workspace?request.workspace.anchorX??number(request.environment.cameraX,0):view.cam), flags: view.flags,
        ...(def.level ? { level: restingLevelView(def.level, false) } : {}) };
      const outdoor = def.outdoor ?? !!(def.ambient?.weather || def.ambient?.sky);
      out.push({ view: zoneView, scene: def, sceneId: zone, host: { model, draw: (ctx, v, layer = 'all') => def.drawBackdrop(ctx, v, { ...engine, layer }) },
        weather:()=>request.weather??weatherNow(sceneClimate(def.id,weatherSource(request)),weatherSource(request)),preparePresentation: prepared => def.preparePresentation?.(prepared, engine),
        lighting: W => { const L = request.lighting ?? lightAt(city.day, city.min, def.facing ?? 180, W ?? request.weather??weatherNow(sceneClimate(def.id,weatherSource(request)),weatherSource(request)), outdoor); return L; } });
    }
    return out;
  };
  const render = (canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult => {
      // Opening a composition is spatial editing; a chunk's stored sequence is optional context.
      // Only an explicitly selected timeline directs that workspace. Source data is untouched.
      if((request.direction==='base'||request.scope&&!request.timeline)&&request.composition.sequence){
        const hasChunk=adapters[request.composition.scene]??resolveAdapter?.(request.composition.scene,request);
        if(hasChunk){const {sequence,...composition}=request.composition;request={...request,composition,frame:undefined};}
        else{const sequence={...request.composition.sequence,tracks:[],commands:[],onComplete:[],onCancel:[]};return renderDirected(canvas,{...request,composition:{...request.composition,sequence},frame:undefined});}
      }
      const adapter = adapters[request.composition.scene]??resolveAdapter?.(request.composition.scene,request);
      if(request.composition.sequence && (!adapter||request.composition.instances.some(n=>n.type==='sequence.world-control')))return renderDirected(canvas,request);
      clearDirected();
      if(request.composition.sequence && !request.frame){
        const timeline=sequenceProgram({[request.composition.scene]:request.composition}),sequenceId=request.composition.sequence.id;
        const context=frameTimelineContext(createSequenceValidationContext(art,{[request.composition.scene]:request.composition}),{time:request.time,reduced:request.reduced,sequenceId,environment:request.environment,viewport:request.viewport??{width:canvas.width,height:canvas.height},timeline});
        request={...request,frame:evaluateTimeline(timeline,sequenceId,request.time,context,{reduced:request.reduced})};
      }
      if (!adapter) throw new Error(`Native composition adapter is not available yet for ${request.composition.scene}`);
      const document = perfMeasure('editor.preview-validate',()=>adapter.validate(request.frame?.composition ?? request.composition)), state = request.frame?.state ?? {};
      const hidden = request.hidden?.length ? Object.fromEntries(request.hidden.map(id => [id, false])) : undefined;
      const options: NativeOptions = { reduced: request.reduced, visibility: hidden ? { ...request.frame?.visibility, ...hidden } : request.frame?.visibility, opacity: request.frame?.opacity, clips: request.frame?.clips, sequenceTime: request.time };
      const def=perfMeasure('editor.preview-definition',()=>{const original=request.documents&&adapter.pendingDefinition?adapter.pendingDefinition(document,state,options,request.documents):adapter.definition(document,state,options);return bindWorld?.(original,request)??original;}),settings=request.environment;
      if (settings.presentation !== undefined && settings.presentation !== '') {
        if (!def.presentationState) throw new Error('This scene has no presentation controller state');
        def.presentationState.restore(object(settings.presentation, 'Presentation state') as Parameters<typeof def.presentationState.restore>[0]);
      }
      const renderScale = number(settings.renderScale, 1);
      if (renderScale <= 0) throw new Error('Render scale must be positive');
      const width = canvas.width / renderScale, height = canvas.height / renderScale;
      const basisWidth=request.viewport?request.viewport.width/renderScale:width,basisHeight=request.viewport?request.viewport.height/renderScale:height;
      const authoredWidth=request.viewport?request.viewport.width/request.viewport.scale:width,authoredHeight=request.viewport?request.viewport.height/request.viewport.scale:height;
      const authoredGround=request.viewport?.ground??authoredHeight-54;
      if(request.workspace?.followCamera){const authoredCam=request.frame?.camera.x??number(settings.cameraX,0),anchor=request.workspace.anchorX??authoredCam,cameraH=request.frame?.camera.h??number(settings.cameraH,0);request={...request,workspace:{...request.workspace,x:authoredCam+authoredWidth/2-(anchor+basisWidth/2),h:authoredGround+cameraH-authoredHeight/2-(basisHeight/2-54),zoom:Math.min(width/authoredWidth,height/authoredHeight)*.9}};}
      const zoom=request.workspace?.zoom??request.frame?.camera.zoom??number(settings.zoom,1);
      if(zoom<=0)throw new Error('Zoom must be positive');
      const authoredCam=request.frame?.camera.x??number(settings.cameraX,0),anchor=request.workspace?.anchorX??authoredCam,cam = request.workspace?anchor+basisWidth/2-width/(2*zoom)+request.workspace.x:authoredCam, cameraH = request.frame?.camera.h ?? number(settings.cameraH, 0);
      const flags = object(settings.flags, 'Flags');
      for (const v of Object.values(flags)) if (typeof v !== 'boolean') throw new Error('Flags must contain booleans');
      // The camera zoom is a canvas transform, as hack vision's in the game (runtime/game.ts `zoomed`): the whole frame is
      // drawn at renderScale × zoom over a view that much smaller, scaled about the top left so the ground stays where it
      // was on screen. Everything (kits, pieces in their own frame, people, lights, culling) then scales alike. Positions
      // still snap to whole zoomed pixels (`sx`), so where things land on screen is exactly as before the transform.
      const k = renderScale * zoom, zw = width / zoom, zh = height / zoom, ground = request.workspace?height/(2*zoom)+basisHeight/2-54+request.workspace.h:(height - 54) / zoom;
      const view: View = { ...frameView((request.ambientTime??request.time) * 60), viewW: zw, viewH: zh, gy: ground,
        ...sourceProjection({cam,gy:ground},{dx:0,dh:0},zoom,request.workspace?anchor:cam), y: h => ground - h + (request.workspace?0:cameraH),
        flags: flags as Record<string, boolean>, ...(def.level ? { level: restingLevelView(def.level, settings.inside === true, typeof settings.roomsAt === 'string' && settings.roomsAt.trim() ? settings.roomsAt.trim() : undefined) } : {}) };
      if(request.workspace){const cameraGround=authoredGround+cameraH,cameraView={...view,viewW:authoredWidth,viewH:authoredHeight,gy:cameraGround,...sourceProjection({cam:authoredCam,gy:cameraGround},{dx:0,dh:0},1)};view.cameraFrame={view:cameraView,x:authoredCam-cam,y:ground-cameraGround};}
      const player: PlayerState = { handle: typeof settings.handle === 'string' ? settings.handle : '', tokens: number(settings.tokens, 0), jump: settings.jump === true, controlled: [], flags: flags as Record<string, boolean> };
      const forbidden = () => { throw new Error('Preview cannot perform gameplay effects'); };
      const services: PlayerServices = { save: () => player, nodes: () => number(settings.nodes, BASE_NODES + player.controlled.length), persist: forbidden, granted: forbidden, end: forbidden, cutscene: forbidden };
      const model = inspectionModel(def, services, request);
      const snapshot = object(settings.state, 'Scene state');
      for (const [key, value] of Object.entries(snapshot)) {
        if (!Object.prototype.hasOwnProperty.call(model.data.state, key)) throw new Error(`Unknown scene state: ${key}`);
        const scalar = value === null || ['string', 'boolean', 'number'].includes(typeof value);
        if (!scalar || (model.data.state[key] !== null && typeof value !== typeof model.data.state[key]) || (typeof value === 'number' && !Number.isFinite(value))) throw new Error(`Invalid scene state: ${key}`);
        model.set(key, value as Parameters<SceneModel['set']>[1]);
      }
      const vision = settings.hack === true, engine: EngineDraw = { m: model, hover: typeof settings.hover === 'string' ? settings.hover || null : null, layer: 'all' };
      // A complete editor frame starts from native canvas defaults, including inherited
      // drawing state. Camera probes must not inherit the previous probe's paint state.
      canvas.width = canvas.width;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D is unavailable');
      const weather = () => request.weather ?? weatherNow(sceneClimate(def.id,weatherSource(request)),weatherSource(request));
      // joined scenes are drawn unless the composer's Show joined scenes is switched off
      view.zoneWindow={left:view.sx(0),right:view.sx(def.width)};
      view.worldZones=placementCoordinates(placeFrom(graphFor(request),def.id,Infinity));
      const showJoined = !!request.scope||settings.showJoined !== false, around = placed(request, request.composition.scene);
      const joined = showJoined && around.length ? neighbours(request, request.composition.scene, view, zoom, services) : [];
      const backdrops=new Map(backdropDocuments(request.documents));
      if(document.scene.startsWith('backdrop-'))backdrops.set(document.scene.slice(9),document);
      const prepared=renderWorldFrame({citySource:weatherSource(request),worldCompositions:request.scope?.composition?worldFor(request):undefined,compositionId:request.scope?.composition,background:request.workspace?'#161616':undefined,capture:true, context, scale: k, zoom, view, scene: def, sceneId: def.id, backdrops, ...(joined.length ? { joined } : {}),
        host: { model, visionOn: vision, draw: (ctx, v, layer = 'all') => def.drawBackdrop(ctx, v, { ...engine, layer }) },
        actors: request.player ? (ctx, v) => { const row = playerRow(document.instances); if (row && (!request.checkpoint||request.checkpoint.scene===def.id) && !request.hidden?.includes(row.id)) drawPlayer(ctx, v, SPR.stand, { x: request.checkpoint?.spawn??row.placement.x, y: row.placement.h, face: row.placement.facing ?? 1 }, undefined, vision ? null : row.placement.h); } : undefined,
        reduced: request.reduced, clock: (request.ambientTime??request.time) * 60, weather,timeline:request.frame,
        preparePresentation: prepared => def.preparePresentation?.(prepared, { ...engine, layer: vision && def.layers ? 'devices' : 'all' }),
        lighting(W: Weather | null) {
          const ambient = def.ambient ?? {}, outdoor = def.outdoor ?? !!(ambient.weather || ambient.sky);
          const light = request.lighting ?? lightAt(city.day, city.min, def.facing ?? 180, W ?? weather(), outdoor);
          return light;
        },
      });
      const preparedEnvironment = def.visualEnvironment?.(view, engine) ?? adapter.environment?.(document, view, engine);
      if (!preparedEnvironment) throw new Error(`Missing prepared visual environment for ${def.id}`);
      const env = { ...options, ...preparedEnvironment };
      const result:PreviewResult={...frameSelection(prepared,{...request,composition:document},false),gameCamera:{scene:def.id,x:authoredCam,h:cameraH},artwork:{composition:document,environment:env},...(request.workspace?{workspaceScale:k,workspaceAnchor:{x:anchor,h:0},camera:{x:view.sx(authoredCam)*k,y:view.y(authoredGround+cameraH)*k,width:authoredWidth*k,height:authoredHeight*k,scene:def.id,label:def.name,focus:{x:authoredCam+authoredWidth/2-(anchor+basisWidth/2),h:authoredGround+cameraH-authoredHeight/2-(basisHeight/2-54),zoom:Math.min(width/authoredWidth,height/authoredHeight)*.9}}}:{})};
      // the level overlay keeps its 1-unit lines and 7 px labels: drawn at renderScale over the view's zoomed positions
      if (request.overlays && def.level) drawLevelOverlay(context, def.level, { ...view, sx: (x, parallax) => view.sx(x, parallax) * zoom, y: h => view.y(h) * zoom }, renderScale);
      if (request.overlays) drawSelectionOverlay(context,result,request.selectedId,request.objectOutlines);
      if (around.length) {
        result.extent = { from: Math.min(0, ...around.map(z => z.dx)), to: Math.max(def.width, ...around.map(z => z.dx + z.width)) };
        if (showJoined) result.joined = joinedOverlay(context, around, def.width, view, k, canvas, !!request.overlays&&!request.scope);
      }
      return result;
  };
  return { render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult {
    const kind = request.environment.weather;
    if (kind !== undefined && kind !== 'forecast' && (typeof kind !== 'string' || !isWeather(kind))) throw new Error('Unknown preview weather');
    if (request.weather !== undefined) validatePreviewWeather(request.weather);
    if (request.climate !== undefined && request.climate !== null && !Object.prototype.hasOwnProperty.call(weatherSource(request).CLIMATES,request.climate)) throw new Error('Invalid preview reporting climate');
    const snapshot = request.weather ? Object.freeze({ ...request.weather }) : undefined;
    // Character.when and public screenLine/forecast still read the existing city/weather APIs.
    // Scope only those inputs synchronously; lighting is passed explicitly through each View.
    return city.withSnapshot({ day: number(request.environment.day, 1), min: number(request.environment.minute, 580), seed: number(request.environment.seed, 3) }, () => withSceneWeather(adapters[request.composition.scene]?.climateScene ?? request.composition.scene, typeof kind === 'string' && isWeather(kind) ? kind : null, () => render(canvas, { ...request, weather: snapshot }), request.climate,weatherSource(request)));
  } };
}
/**
 * Where each joined scene lies on the canvas, and (with overlays) the composer's read-only look for it: the part beside
 * the open scene is dimmed and its edge dashed, so it reads as a neighbour, not as editable artwork.
 */
function joinedOverlay(context: CanvasRenderingContext2D, around: { zone: string; label: string; dx: number; dh: number; width: number }[], width: number, view: View, k: number, canvas: HTMLCanvasElement, overlays: boolean): JoinedPreview[] {
  const out: JoinedPreview[] = [], px = (x: number) => view.sx(x) * k, py = (h: number) => view.y(h) * k;
  for (const z of around) {
    const x1 = px(z.dx), x2 = px(z.dx + z.width), side = z.dh > 0 ? 'above' : z.dh < 0 ? 'below' : z.dx >= 0 ? 'right' : 'left';
    const top = side === 'above' || side === 'below' ? Math.max(0, Math.min(canvas.height, py(z.dh + 240))) : 0, bottom = side === 'above' || side === 'below' ? Math.max(0, Math.min(canvas.height, py(z.dh))) : canvas.height;
    if (x2 <= 0 || x1 >= canvas.width) continue;
    out.push({ zone: z.zone, label: z.label, x: x1, y: top, width: x2 - x1, height: Math.max(0, bottom - top), side });
    if (!overlays) continue;
    context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
    // dim what lies beside the open scene (a scene stacked over it stays undimmed: only its floor is marked)
    const a = px(0), b = px(width);
    context.fillStyle = 'rgba(6,10,16,0.5)';
    if (x1 < a) context.fillRect(x1, 0, Math.min(x2, a) - x1, canvas.height);
    if (x2 > b) context.fillRect(Math.max(x1, b), 0, x2 - Math.max(x1, b), canvas.height);
    context.strokeStyle = 'rgba(114,219,202,0.85)'; context.lineWidth = Math.max(1, k); context.setLineDash([6 * k, 5 * k]); context.beginPath();
    if (side === 'right') { context.moveTo(x1, 0); context.lineTo(x1, canvas.height); }
    else if (side === 'left') { context.moveTo(x2, 0); context.lineTo(x2, canvas.height); }
    else { context.moveTo(x1, bottom); context.lineTo(x2, bottom); }
    context.stroke(); context.restore();
  }
  return out;
}
/** The layered composition's player row, which is also where the player arrives. */
function playerRow(nodes: readonly AssetInstance[]): AssetInstance | undefined { for (const n of nodes) { if (n.type === PLAYER_ROW) return n; const child = playerRow(n.children ?? []); if (child) return child; } return undefined; }
