import {compileGameWorld} from '../world/compiled-world';
import {prepareArtwork,inspectArtwork} from '../art/core/presentation';
import {mobileInstances} from '../art/core/mobility';
import {sourceProjection,projectX,dragProjection,dragFromCanvas,transformRect} from '../art/core/geometry';
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
import { art, compositionAppearance, type Composition, type Environment, type Resolved } from '../art';
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
import { CLIMATE_IDS, isWeather, sceneClimate, weatherNow, withSceneWeather, type Weather } from '../world/weather';
import type {JoinedPreview,PreviewRequest,PreviewResult} from './contracts';
import type { PlayerServices, PlayerState } from '../runtime/player';
import { BASE_NODES } from '../runtime/save';
import { drawSelectionOverlay } from './selection-overlay';
import { PLAYER_ROW, type Instance } from '../art/core/composition';
import { drawPlayer } from '../art/characters/player';
import { SPR } from '../art/core/sprites';
import {sequenceInspection} from './sequence-inspection';
import {sequenceWorldZones} from '../runtime/prepare-frame';
import {validateWorldCompositions} from '../world/compositions';

export interface NativeSceneAdapter {
  validate(value: unknown): Composition;
  definition(document: Composition, state: Environment['state'], options: NativeOptions): SceneDef;
  /** Resolve authored content before construction, so removed default bindings are never evaluated. */
  pendingDefinition?(document:Composition,state:Environment['state'],options:NativeOptions,documents:ReadonlyMap<string,unknown>):SceneDef;
  environment?(document: Composition, view: View, engine: EngineDraw): Environment;
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
export function previewBounds(rows: Resolved[], view: View, options: NativeOptions & Pick<Environment,'mobileArtwork'>, document: Composition): PreviewResult {
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
    const resolved:NonNullable<PreviewResult['resolved']>={},bounds:PreviewResult['bounds']=[],sources:NonNullable<PreviewResult['sources']>={},deltas=new Map<string,(dx:number,dy:number)=>{x:number;h:number}>();
    const documents=request.documents??new Map([[request.composition.scene,request.composition]]),owners=new Map<string,string>();
    for(const [id,value]of documents){const doc=value as Composition;if(doc&&typeof doc.scene==='string'&&Array.isArray(doc.instances))owners.set(doc.scene,id);}
    for(const scope of frame.inspection??[]){
      if(!scope.scene||!namespaced&&scope.scene.id!==request.composition.scene)continue;
      const box=transformRect({x:scope.view.sx(0),y:0,width:scope.view.sx(scope.scene.width)-scope.view.sx(0),height:scope.view.viewH},scope.transform);
      regions.push({document:owners.get(scope.scene.id)??scope.scene.id,scene:scope.scene.id,label:scope.scene.name,x:box.x,y:0,width:box.width,height:scope.viewport.height,active:scope.scene.id===(frame.cameraGuide?.scene??frame.sceneId)});
    }
    // The renderer captures each object after shared sorting, using its actual canvas transform.
    // Near parts can submit twice; their final position in paint order owns the hit target.
    const captured=new Map<string,{record:NonNullable<WorldFrame['artwork']>[number];owner:string}>();
    for(const record of [...(frame.helpers??[]),...(frame.artwork??[])]){
      if(!namespaced&&record.document.scene!==request.composition.scene)continue;
      const owner=owners.get(record.document.scene)??record.document.scene;
      const key=namespaced?JSON.stringify([owner,record.row.instance.id]):record.row.instance.id;
      captured.set(key,{record,owner});
    }
    for(const [key,{record,owner}]of [...captured].sort((a,b)=>a[1].record.paintOrder-b[1].record.paintOrder)){
      resolved[key]=inspectArtwork(record);sources[key]={document:owner,instance:record.row.instance.id};
      if(!record.pickable)continue;
      const b=record.bounds;if(b.width<=0||b.height<=0)continue;
      bounds.push({id:key,...b,...(record.clip?{clip:record.clip}:{})});
      deltas.set(key,(dx,dy)=>dragFromCanvas(record.drag,record.canvasTransform,dx,dy));
    }
    return{bounds,sources,resolved,regions,camera:frame.cameraGuide,workspaceScale:frame.workspaceScale,activeScene:frame.cameraGuide?.scene??frame.sceneId,deltaToLocal(id,dx,dy){const delta=deltas.get(id);if(!delta)throw Error('Missing selected source');return delta(dx,dy);}};
  }
/** No Game construction, controller stepping, player-save reads or player-save writes occur here. */
export function createNativePreview(adapters: Readonly<Record<string, NativeSceneAdapter>>,bindWorld?:(definition:SceneDef,request:PreviewRequest)=>SceneDef,resolveAdapter?:(scene:string,request:PreviewRequest)=>NativeSceneAdapter|undefined) {
  const seeks=new Map<string,IntroSeekSession>(),worlds=new WeakMap<object,ReturnType<typeof pendingRegistry>>();
  let directed: {source:object;sequence:string;time:number;sample:ReturnType<typeof sequenceInspection>}|undefined;
  const clearDirected=()=>{directed?.sample.dispose();directed=undefined;};
  const renderDirected=(canvas:HTMLCanvasElement,request:PreviewRequest):PreviewResult=>{
    const composition=art.validate(request.composition),timeline=sequenceProgram({[composition.scene]:composition}),id=composition.sequence!.id;
    const scale=number(request.environment.renderScale,1);if(scale<=0)throw Error('Render scale must be positive');
    const W=canvas.width/scale,H=canvas.height/scale,lighting=request.lighting??lightAt(Number(request.environment.day??1),Number(request.environment.minute??580),Number(request.environment.facing??90),null);
    const context=frameTimelineContext(createSequenceValidationContext(art,{[composition.scene]:composition}),{time:request.time,reduced:request.reduced,sequenceId:id,environment:request.environment,viewport:{width:canvas.width,height:canvas.height},timeline});
    const evaluated=request.frame??evaluateTimeline(timeline,id,request.time,context,{reduced:request.reduced});
    const initialContext=request.workspace&&(request.workspace.anchorX===undefined||request.workspace.anchorH===undefined)?frameTimelineContext(createSequenceValidationContext(art,{[composition.scene]:composition}),{time:0,reduced:request.reduced,sequenceId:id,environment:request.environment,viewport:{width:canvas.width,height:canvas.height},timeline}):undefined;
    const initial=initialContext?evaluateTimeline(timeline,id,0,initialContext,{reduced:request.reduced}):undefined,workspace=request.workspace?{...request.workspace,anchorX:request.workspace.anchorX??initial!.camera.x,anchorH:request.workspace.anchorH??initial!.camera.h}:undefined;
    canvas.width=canvas.width;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas 2D unavailable');
    let prepared:WorldFrame|undefined;
    if(id==='intro'||id==='act2'){
      const key=composition.scene+':'+W+':'+H+':'+request.reduced;let seek=seeks.get(key);if(!seek)seeks.set(key,seek=new IntroSeekSession());
      if(workspace){prepared=renderWorldFrame({kind:'sequence',workspace,context:ctx,documents:{compositions:{[composition.scene]:composition},timeline},composition,sequenceId:id,registry:art,frame:evaluated,scale,width:W,height:H,reduced:request.reduced,lighting,time:request.time,capture:true,ambient:request.time*60,...(id==='intro'?{skyline:seek.prepare(ctx,cutView(W,H,request.reduced,lighting),request.time,composition.sequence!.duration)}:{})});}else prepared=renderCutsceneDocument(ctx,W,H,id,request.time,{composition,timeline,frame:evaluated,registry:art,sequenceId:id,reduced:request.reduced,lighting,scale,seek,capture:true,ambient:request.time*60});
    }else{
      let scenes=request.sourceVersion?worlds.get(request.sourceVersion):undefined;
      if(!scenes&&request.documents){scenes=pendingRegistry(request.documents);if(request.sourceVersion)worlds.set(request.sourceVersion,scenes);}
      if(scenes&&request.transient){
        const pending=request.transient.composition,local={...request,composition:pending},adapter=adapters[pending.scene]??resolveAdapter?.(pending.scene,local)??authoredSceneAdapter(pending.scene,request.documents);
        if(adapter){const options={reduced:request.reduced},definition=adapter.pendingDefinition&&request.documents?adapter.pendingDefinition(pending,{},options,request.documents):adapter.definition(pending,{},options);scenes={...scenes,[pending.scene]:bindWorld?.(definition,local)??definition};}
      }
      const world=composition.instances.some(n=>n.type==='sequence.world-control');
      let inspection:ReturnType<ReturnType<typeof sequenceInspection>['sample']>|undefined;
      if(world){
        const source=request.sourceVersion??request.documents??SCENES,sequence=request.composition.sequence!;
        if(!directed||directed.source!==source||directed.sequence!==sequence.id||request.time<directed.time||request.transient){
          clearDirected();const settings=composition.instances.find(n=>n.type==='sequence.world-control')!;
          directed={source,sequence:sequence.id,time:0,sample:sequenceInspection(scenes??SCENES,{...sequence,composition:composition.scene},sequenceWorldZones(art.properties(settings.type,settings.props),scenes??SCENES,request.documents?validateWorldCompositions(request.documents.get('world-compositions')):undefined),request.documents)};
        }
        inspection=directed.sample.sample(request.time);directed.time=request.time;
      }else clearDirected();
      if(world){ctx.setTransform(scale,0,0,scale,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);}
      prepared=renderWorldFrame({kind:'sequence',workspace,context:ctx,documents:{compositions:{[composition.scene]:composition},timeline},composition,sequenceId:id,registry:art,frame:evaluated,scale,width:W,height:H,reduced:request.reduced,lighting,time:request.time,capture:true,ambient:request.time*60,destination:String(request.environment.destination??'DOWNTOWN'),world:{scenes,documents:request.documents,graph:scenes?compileGameWorld(scenes,request.documents):undefined,ambientTime:number(request.environment.titleOffset,id==='glide'?7:0)+request.time,...inspection}});
    }
    if(!prepared)throw Error('Missing prepared frame');
    const selection=frameSelection(prepared,request);if(workspace)selection.workspaceAnchor={x:workspace.anchorX,h:workspace.anchorH};if(request.overlays)drawSelectionOverlay(ctx,selection,request.selectedId,request.objectOutlines);return selection;
  };

  /** Inspection never advances simulation: deadlines are reinitialised after replacing host time, so a clock/countdown
   * snapshot cannot depend on render duration or warmup. */
  const inspectionModel = (def: SceneDef, services: PlayerServices, request: PreviewRequest) => {
    const forbidden = () => { throw new Error('Preview cannot perform gameplay effects'); };
    const rules = typeof def.rules === 'function' ? def.rules(services) : def.rules ?? NO_RULES;
    const model = new SceneModel({ say: forbidden, open: forbidden, changed() {} }, def.data ?? emptyData(def.id, def.name), rules,undefined,undefined,undefined,undefined,def.gameplay);
    model.now = () => 0;
    model.wall = () => 0;
    model.reset();
    if (def.level) {
      const graph = compileGameWorld(request.documents?pendingRegistry(request.documents):SCENES,request.documents);
      model.peopleLevel = { ...def.level, vehicleZones: placementCoordinates(placeFrom(graph,def.id,Infinity)) };
    }
    const player = services.save();
      // Inspection uses the shipping read evaluator over its isolated state. It never installs
      // command/timer hooks or advances simulation, and calculated values have no saved owner.
      if(def.gameplay?.queries){
        const definition=def.gameplay,ids=new Set(Object.keys(definition.queries??{}));model.gameplayQueryIds=ids;
        model.gameplayQuery=id=>{if(!ids.has(id))return undefined;const state={flags:player.flags,items:{},tokens:player.tokens,values:{[def.id]:model.state},world:{day:city.day,minute:city.min,weather:(request.weather??weatherNow(sceneClimate(def.id))).kind}};
          return readQuery(id,{...state,values:resolveValues(definition,state)},{definition,tuning:model.data.tuning,labels:model.texts,cables:model.links,sceneTime:model.now(),cameraCrates:model.data.camera?.crates,nativeRead:key=>model.rules.derivedTypes?.[key]?model.rules.derived?.[key]?.(model):undefined});};
      }
    return model;
  };
  /**
   * The zones joined to the open one by the pending seams (world/zone-graph.json), one seam away, as runtime/game.ts
   * `zoneFrame` draws them: each its own pending scene, isolated model and light, its view moved by where it lies.
   * Read-only: they give no bounds, so nothing in them is selected or dragged.
   */
  /** The zones one seam away and where they lie (scene units), for the composer's tags, dimming and Fit joined. */
  const placed = (request: PreviewRequest, sceneId: string) => {
    const documents = request.documents, source = documents?.get('zone-graph');
    if (!documents || source === undefined) return [];
    const graph = compileGameWorld(pendingRegistry(documents),documents); if (!zoneJoined(graph, sceneId)) return [];
    const info = zoneInfo(documents);
    return [...placeFrom(graph, sceneId)].flatMap(([zone, at]) => zone === sceneId || !info[zone] ? [] : [{ zone, label: zoneName(zone, documents), dx: at.dx, dh: at.dh, width: info[zone].width }]);
  };
  const neighbours = (request: PreviewRequest, sceneId: string, view: View, zoom: number, services: PlayerServices, weather: () => Weather): ZoneFrame[] => {
    const documents = request.documents, source = documents?.get('zone-graph');
    if (!documents || source === undefined) return [];
    const graph = compileGameWorld(pendingRegistry(documents),documents); if (!zoneJoined(graph, sceneId)) return [];
    const out: ZoneFrame[] = [];
    for (const [zone, at] of placeFrom(graph, sceneId)) {
      const value = zone === sceneId ? undefined : documents.get(zone) ?? documents.get(authoredDocumentId(zone, 'composition'));
      if (value === undefined) continue;
      const nearby: PreviewRequest = { ...request, composition: value as Composition, frame: undefined };
      const adapter = adapters[zone] ?? resolveAdapter?.(zone, nearby); if (!adapter) continue;
      const document = adapter.validate(value), options: NativeOptions = { reduced: request.reduced, sequenceTime: request.time };
      const original = adapter.pendingDefinition ? adapter.pendingDefinition(document, {}, options, documents) : adapter.definition(document, {}, options);
      const def = bindWorld?.(original, { ...nearby, composition: document }) ?? original, model = inspectionModel(def, services, request);
      const engine: EngineDraw = { m: model, hover: null, layer: 'all' };
      const zoneView: View = { ...frameView(request.time * 60),worldZones:placementCoordinates(placeFrom(graph,zone,Infinity)), viewW: view.viewW, viewH: view.viewH, gy: view.gy - at.dh,
        ...sourceProjection({cam:view.cam,gy:view.y(0)},at,zoom), flags: view.flags,
        ...(def.level ? { level: restingLevelView(def.level, false) } : {}) };
      const outdoor = def.outdoor ?? !!(def.ambient?.weather || def.ambient?.sky);
      out.push({ view: zoneView, scene: def, sceneId: zone, host: { model, draw: (ctx, v, layer = 'all') => def.drawBackdrop(ctx, v, { ...engine, layer }) },
        preparePresentation: prepared => def.preparePresentation?.(prepared, engine),
        lighting: W => { const L = request.lighting ?? lightAt(city.day, city.min, def.facing ?? 180, W ?? weather(), outdoor); return L; } });
    }
    return out;
  };
  const render = (canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult => {
      const adapter = adapters[request.composition.scene]??resolveAdapter?.(request.composition.scene,request);
      if(request.composition.sequence && (!adapter||request.composition.instances.some(n=>n.type==='sequence.world-control')))return renderDirected(canvas,request);
      clearDirected();
      if(request.composition.sequence && !request.frame){
        const timeline=sequenceProgram({[request.composition.scene]:request.composition}),sequenceId=request.composition.sequence.id;
        const context=frameTimelineContext(createSequenceValidationContext(art,{[request.composition.scene]:request.composition}),{time:request.time,reduced:request.reduced,sequenceId,environment:request.environment,viewport:{width:canvas.width,height:canvas.height},timeline});
        request={...request,frame:evaluateTimeline(timeline,sequenceId,request.time,context,{reduced:request.reduced})};
      }
      if (!adapter) throw new Error(`Native composition adapter is not available yet for ${request.composition.scene}`);
      const document = adapter.validate(request.frame?.composition ?? request.composition), state = request.frame?.state ?? {};
      const hidden = request.hidden?.length ? Object.fromEntries(request.hidden.map(id => [id, false])) : undefined;
      const options: NativeOptions = { reduced: request.reduced, visibility: hidden ? { ...request.frame?.visibility, ...hidden } : request.frame?.visibility, opacity: request.frame?.opacity, clips: request.frame?.clips, sequenceTime: request.time };
      const original = request.documents&&adapter.pendingDefinition?adapter.pendingDefinition(document,state,options,request.documents):adapter.definition(document, state, options), def=bindWorld?.(original,request)??original, settings = request.environment;
      if (settings.presentation !== undefined && settings.presentation !== '') {
        if (!def.presentationState) throw new Error('This scene has no presentation controller state');
        def.presentationState.restore(object(settings.presentation, 'Presentation state') as Parameters<typeof def.presentationState.restore>[0]);
      }
      const renderScale = number(settings.renderScale, 1);
      if (renderScale <= 0) throw new Error('Render scale must be positive');
      const width = canvas.width / renderScale, height = canvas.height / renderScale, zoom = request.frame?.camera.zoom ?? number(settings.zoom, 1);
      if (zoom <= 0) throw new Error('Zoom must be positive');
      const cam = request.frame?.camera.x ?? number(settings.cameraX, 0), cameraH = request.frame?.camera.h ?? number(settings.cameraH, 0);
      const flags = object(settings.flags, 'Flags');
      for (const v of Object.values(flags)) if (typeof v !== 'boolean') throw new Error('Flags must contain booleans');
      // The camera zoom is a canvas transform, as hack vision's in the game (runtime/game.ts `zoomed`): the whole frame is
      // drawn at renderScale × zoom over a view that much smaller, scaled about the top left so the ground stays where it
      // was on screen. Everything (kits, pieces in their own frame, people, lights, culling) then scales alike. Positions
      // still snap to whole zoomed pixels (`sx`), so where things land on screen is exactly as before the transform.
      const k = renderScale * zoom, zw = width / zoom, zh = height / zoom, ground = (height - 54) / zoom;
      const view: View = { ...frameView(request.time * 60), viewW: zw, viewH: zh, cam, gy: ground,
        sx: (x, parallax = 1) => projectX(x,cam,parallax,zoom), y: h => ground - (h - cameraH),
        flags: flags as Record<string, boolean>, ...(def.level ? { level: restingLevelView(def.level, settings.inside === true, typeof settings.roomsAt === 'string' && settings.roomsAt.trim() ? settings.roomsAt.trim() : undefined) } : {}) };
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
      const weather = () => request.weather ?? weatherNow(sceneClimate(def.id));
      // joined scenes are drawn unless the composer's Show joined scenes is switched off
      view.zoneWindow={left:view.sx(0),right:view.sx(def.width)};
      view.worldZones=placementCoordinates(placeFrom(compileGameWorld(request.documents?pendingRegistry(request.documents):SCENES,request.documents),def.id,Infinity));
      const showJoined = settings.showJoined !== false, around = placed(request, request.composition.scene);
      const joined = showJoined && around.length ? neighbours(request, request.composition.scene, view, zoom, services, weather) : [];
      const backdrops=new Map(backdropDocuments(request.documents));
      if(document.scene.startsWith('backdrop-'))backdrops.set(document.scene.slice(9),document);
      const prepared=renderWorldFrame({capture:true, context, scale: k, zoom, view, scene: def, sceneId: def.id, backdrops, ...(joined.length ? { joined } : {}),
        host: { model, visionOn: vision, draw: (ctx, v, layer = 'all') => def.drawBackdrop(ctx, v, { ...engine, layer }) },
        actors: request.player ? (ctx, v) => { const row = playerRow(document.instances); if (row && !request.hidden?.includes(row.id)) drawPlayer(ctx, v, SPR.stand, { x: row.placement.x, y: row.placement.h, face: row.placement.facing ?? 1 }, undefined, vision ? null : row.placement.h); } : undefined,
        reduced: request.reduced, clock: request.time * 60, weather,timeline:request.frame,
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
      const result:PreviewResult={...frameSelection(prepared,{...request,composition:document},false),artwork:{composition:document,environment:env}};
      // the level overlay keeps its 1-unit lines and 7 px labels: drawn at renderScale over the view's zoomed positions
      if (request.overlays && def.level) drawLevelOverlay(context, def.level, { ...view, sx: (x, parallax) => view.sx(x, parallax) * zoom, y: h => view.y(h) * zoom }, renderScale);
      if (request.overlays) drawSelectionOverlay(context,result,request.selectedId,request.objectOutlines);
      if (around.length) {
        result.extent = { from: Math.min(0, ...around.map(z => z.dx)), to: Math.max(def.width, ...around.map(z => z.dx + z.width)) };
        if (showJoined) result.joined = joinedOverlay(context, around, def.width, view, k, canvas, !!request.overlays);
      }
      return result;
  };
  return { render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult {
    const kind = request.environment.weather;
    if (kind !== undefined && kind !== 'forecast' && (typeof kind !== 'string' || !isWeather(kind))) throw new Error('Unknown preview weather');
    if (request.weather !== undefined) validatePreviewWeather(request.weather);
    if (request.climate !== undefined && request.climate !== null && !CLIMATE_IDS.includes(request.climate)) throw new Error('Invalid preview reporting climate');
    const snapshot = request.weather ? Object.freeze({ ...request.weather }) : undefined;
    // Character.when and public screenLine/forecast still read the existing city/weather APIs.
    // Scope only those inputs synchronously; lighting is passed explicitly through each View.
    return city.withSnapshot({ day: number(request.environment.day, 1), min: number(request.environment.minute, 580), seed: number(request.environment.seed, 3) }, () => withSceneWeather(adapters[request.composition.scene]?.climateScene ?? request.composition.scene, typeof kind === 'string' && isWeather(kind) ? kind : null, () => render(canvas, { ...request, weather: snapshot }), request.climate));
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
function playerRow(nodes: readonly Instance[]): Instance | undefined { for (const n of nodes) { if (n.type === PLAYER_ROW) return n; const child = playerRow(n.children ?? []); if (child) return child; } return undefined; }
