/** Local editor preview. Uses the shipping frame renderer with an isolated, non-persistent model. */
import { drawLevelOverlay } from './level-overlay';
import { restingLevelView } from '../engine/level';
import { art, compositionAppearance, resolveComposition, type Composition, type Environment, type Resolved } from '../art';
import type { View } from '../art/core/view';
import { frameView } from '../art/core/view';
import { SceneModel } from '../engine/model';
import {readQuery} from '../engine/gameplay/queries';
import {resolveValues} from '../engine/gameplay/state';
import { emptyData, NO_RULES, type EngineDraw } from '../engine/host';
import type { SceneDef } from '../scenes/kit';
import { renderWorldFrame, type ZoneFrame } from '../runtime/render-scene';
import { joined as zoneJoined, placeFrom, validateZoneGraph } from '../world/zone-graph';
import shippedGraph from '../world/zone-graph.json';
import { authoredDocumentId } from '../engine/gameplay/scene-catalogue';
import { zoneInfo, zoneName } from './zone-graph-context';
import { city } from '../world/clock';
import {backdropDocuments} from '../world/backdrops';
import { light, lightAt, setLight } from '../world/light';
import { CLIMATE_IDS, isWeather, sceneClimate, weatherNow, withSceneWeather, type Weather } from '../world/weather';
import type { JoinedPreview, PreviewRequest, PreviewResult } from './app';
import type { PlayerServices, PlayerState } from '../runtime/player';
import { BASE_NODES } from '../runtime/save';
import { drawSelectionOverlay } from './selection-overlay';
import { PLAYER_ROW, type Instance } from '../art/core/composition';
import { drawPlayer } from '../art/characters/player';
import { SPR } from '../art/core/sprites';

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
export function previewBounds(rows: Resolved[], view: View, options: NativeOptions, document?: Composition): PreviewResult {
  const appearance = document ? compositionAppearance(document, options) : undefined;
  const visible = rows.filter(row => appearance ? appearance.get(row.instance.id)!.visible && appearance.get(row.instance.id)!.opacity !== 0 : options.visibility?.[row.instance.id] !== false && options.opacity?.[row.instance.id] !== 0);
  return {
    bounds: visible.map(row => {
      const b = row.element.bounds(row.props, row.state, { view, placement: row.placement }), p = row.placement;
      const x1 = view.sx(p.x + b.x * p.scale * p.facing, p.parallax), x2 = view.sx(p.x + (b.x + b.w) * p.scale * p.facing, p.parallax);
      const y1 = view.y(p.h + b.h * p.scale), y2 = view.y(p.h + (b.h - b.tall) * p.scale);
      return { id: row.instance.id, x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
    }),
    deltaToLocal(id, dx, dy) {
      const row = rows.find(row => row.instance.id === id); if (!row) throw new Error('Missing selected instance');
      const parentId = row.instance.attach?.instance ?? parentOf(rows, id);
      const parent = parentId ? rows.find(row => row.instance.id === parentId) : undefined;
      const parentScale = parent?.placement.scale ?? 1, parentFacing = parent?.placement.facing ?? 1;
      const unitX = (view.sx(row.placement.x + 1000, row.placement.parallax) - view.sx(row.placement.x, row.placement.parallax)) / 1000;
      const unitH = (view.y(row.placement.h + 1000) - view.y(row.placement.h)) / 1000;
      if (!unitX || !unitH) throw new Error('Preview transform is not invertible');
      return { x: dx / unitX / parentScale / parentFacing, h: dy / unitH / parentScale };
    },
  };
}
function parentOf(rows: Resolved[], id: string): string | undefined {
  return rows.find(row => row.instance.children?.some(child => child.id === id))?.instance.id;
}
/** No Game construction, controller stepping, player-save reads or player-save writes occur here. */
export function createNativePreview(adapters: Readonly<Record<string, NativeSceneAdapter>>,bindWorld?:(definition:SceneDef,request:PreviewRequest)=>SceneDef,resolveAdapter?:(scene:string,request:PreviewRequest)=>NativeSceneAdapter|undefined) {
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
      const graph = validateZoneGraph(request.documents?.get('zone-graph') ?? shippedGraph);
      model.peopleLevel = { ...def.level, vehicleZones: Object.fromEntries([...placeFrom(graph, def.id, Infinity)].map(([id, p]) => [id, { x: p.dx, h: p.dh }])) };
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
    const graph = validateZoneGraph(source); if (!zoneJoined(graph, sceneId)) return [];
    const info = zoneInfo(documents);
    return [...placeFrom(graph, sceneId)].flatMap(([zone, at]) => zone === sceneId || !info[zone] ? [] : [{ zone, label: zoneName(zone, documents), dx: at.dx, dh: at.dh, width: info[zone].width }]);
  };
  const neighbours = (request: PreviewRequest, sceneId: string, view: View, zoom: number, services: PlayerServices, weather: () => Weather): ZoneFrame[] => {
    const documents = request.documents, source = documents?.get('zone-graph');
    if (!documents || source === undefined) return [];
    const graph = validateZoneGraph(source); if (!zoneJoined(graph, sceneId)) return [];
    const out: ZoneFrame[] = [];
    for (const [zone, at] of placeFrom(graph, sceneId)) {
      const value = zone === sceneId ? undefined : documents.get(zone) ?? documents.get(authoredDocumentId(zone, 'composition'));
      if (value === undefined) continue;
      const nearby: PreviewRequest = { ...request, composition: value as Composition, frame: undefined };
      const adapter = adapters[zone] ?? resolveAdapter?.(zone, nearby); if (!adapter) continue;
      const document = adapter.validate(value), options: NativeOptions = { reduced: request.reduced, sequenceTime: request.time };
      const original = adapter.pendingDefinition ? adapter.pendingDefinition(document, {}, options, documents) : adapter.definition(document, {}, options);
      const def = bindWorld?.(original, { ...nearby, composition: document }) ?? original, model = inspectionModel(def, services, request);
      const cam = view.cam - at.dx, engine: EngineDraw = { m: model, hover: null, layer: 'all' };
      const zoneView: View = { ...frameView(request.time * 60), viewW: view.viewW, viewH: view.viewH, cam, gy: view.gy - at.dh,
        sx: (x, parallax = 1) => Math.round((x - cam * parallax) * zoom) / zoom, y: h => view.y(h + at.dh), flags: view.flags,
        ...(def.level ? { level: restingLevelView(def.level, false) } : {}) };
      const outdoor = def.outdoor ?? !!(def.ambient?.weather || def.ambient?.sky);
      out.push({ view: zoneView, scene: def, sceneId: zone, host: { model, draw: (ctx, v, layer = 'all') => def.drawBackdrop(ctx, v, { ...engine, layer }) },
        preparePresentation: prepared => def.preparePresentation?.(prepared, engine),
        lighting: W => { const L = request.lighting ?? lightAt(city.day, city.min, def.facing ?? 180, W ?? weather(), outdoor); setLight(L); return L; } });
    }
    return out;
  };
  const render = (canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult => {
      const adapter = adapters[request.composition.scene]??resolveAdapter?.(request.composition.scene,request);
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
        sx: (x, parallax = 1) => Math.round((x - cam * parallax) * zoom) / zoom, y: h => ground - (h - cameraH),
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
      const showJoined = settings.showJoined !== false, around = placed(request, request.composition.scene);
      const joined = showJoined && around.length ? neighbours(request, request.composition.scene, view, zoom, services, weather) : [];
      const backdrops=new Map(backdropDocuments(request.documents));
      if(document.scene.startsWith('backdrop-'))backdrops.set(document.scene.slice(9),document);
      renderWorldFrame({ context, scale: k, zoom, view, scene: def, sceneId: def.id, backdrops, ...(joined.length ? { joined } : {}),
        host: { model, visionOn: vision, draw: (ctx, v, layer = 'all') => def.drawBackdrop(ctx, v, { ...engine, layer }) },
        actors: request.player ? (ctx, v) => { const row = playerRow(document.instances); if (row && !request.hidden?.includes(row.id)) drawPlayer(ctx, v, SPR.stand, { x: row.placement.x, y: row.placement.h, face: row.placement.facing ?? 1 }, undefined, vision ? null : row.placement.h); } : undefined,
        reduced: request.reduced, clock: request.time * 60, weather,timeline:request.frame,
        preparePresentation: prepared => def.preparePresentation?.(prepared, { ...engine, layer: vision && def.layers ? 'devices' : 'all' }),
        lighting(W: Weather | null) {
          const ambient = def.ambient ?? {}, outdoor = def.outdoor ?? !!(ambient.weather || ambient.sky);
          const light = request.lighting ?? lightAt(city.day, city.min, def.facing ?? 180, W ?? weather(), outdoor);
          setLight(light); return light;
        },
      });
      const preparedEnvironment = def.visualEnvironment?.(view, engine) ?? adapter.environment?.(document, view, engine);
      if (!preparedEnvironment) throw new Error(`Missing prepared visual environment for ${def.id}`);
      const env = { ...options, ...preparedEnvironment };
      const bounds = previewBounds(resolveComposition(art, document, env), view, options, document);
      const result: PreviewResult = { artwork: { composition: document, environment: env }, bounds: bounds.bounds.map(b => ({ id: b.id, x: b.x * k, y: b.y * k, width: b.width * k, height: b.height * k })),
        deltaToLocal: (id, dx, dy) => bounds.deltaToLocal!(id, dx / k, dy / k) };
      // the level overlay keeps its 1-unit lines and 7 px labels: drawn at renderScale over the view's zoomed positions
      if (request.overlays && def.level) drawLevelOverlay(context, def.level, { ...view, sx: (x, parallax) => view.sx(x, parallax) * zoom, y: h => view.y(h) * zoom }, renderScale);
      if (request.overlays) drawSelectionOverlay(context, result, request.selectedId);
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
    const beforeLight = light(), snapshot = request.weather ? Object.freeze({ ...request.weather }) : undefined;
    try { return city.withSnapshot({ day: number(request.environment.day, 1), min: number(request.environment.minute, 580), seed: number(request.environment.seed, 3) }, () => withSceneWeather(adapters[request.composition.scene]?.climateScene ?? request.composition.scene, typeof kind === 'string' && isWeather(kind) ? kind : null, () => render(canvas, { ...request, weather: snapshot }), request.climate)); }
    finally { setLight(beforeLight); }
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
