/** Read-only authoring navigation using the real city-map renderer and its discovery/access rules. */
import { isSceneId, type SceneId } from '../scenes';
import { drawCityMap, mapKey, mapPointer, openMap, type Layer, type MapAct, type MapState } from '../ui/citymap';
import { DISTRICTS, PLACES, STAND_IDS, placeBlocked, placeOf, type PlaceId, type Station, type TravelState } from '../world/city';
import type { WorldDocument } from '../world/document';

export interface WorldMapPreviewState {
  scene: SceneId;
  seenSceneIds: 'all' | readonly SceneId[];
  flags: Readonly<Record<string, boolean>>;
  /** Frames for map traffic/zoom animation, independent of the running game's clock. */
  time: number;
  reduced: boolean;
  layer: Layer;
  flat: boolean;
  gateOpen: boolean;
  harborOpen: boolean;
  tokens: number;
  ride: TravelState['ride'];
  touch: boolean;
  tapMin: number;
}
export interface WorldPlaceInspection {
  place: WorldDocument['map']['places'][number];
  district: WorldDocument['map']['districts'][number] | null;
  scenes: WorldDocument['scenes'];
  transport: {
    stations: WorldDocument['transport']['metro']['stations'];
    taxi: WorldDocument['transport']['taxi'];
    links: WorldDocument['transport']['links'];
  };
  /** The real quick-travel rule's current reason; opening an editor scene performs no travel. */
  blocked: string;
}
export interface WorldMapPreviewOptions {
  canvas: HTMLCanvasElement;
  /** Validated with validateWorldDocument before mounting the composer. */
  document: WorldDocument;
  preview?: Partial<WorldMapPreviewState>;
  onOpenScene(scene: SceneId, entry: { place: PlaceId; entrance?: string }): void;
  onSelection?(selection: WorldPlaceInspection): void;
  /** A caller may draw the current scene first, matching the game's world-then-map order. */
  drawBackground?(ctx: CanvasRenderingContext2D, width: number, height: number): void;
}
const layers: readonly Layer[] = ['street','metro','above','below'];
const finite = (v: number, name: string, min = 0) => {
  if (!Number.isFinite(v) || v < min) throw new Error(`map.preview.${name}: expected finite number >= ${min}`);
};
function checked(value: WorldMapPreviewState): WorldMapPreviewState {
  if (!isSceneId(value.scene)) throw new Error('map.preview.scene: unknown scene');
  if (!layers.includes(value.layer)) throw new Error('map.preview.layer: unknown layer');
  if (value.seenSceneIds !== 'all' && (!Array.isArray(value.seenSceneIds) || value.seenSceneIds.some(id=>!isSceneId(id)))) throw new Error('map.preview.seenSceneIds: unknown scene');
  if(!value.flags || typeof value.flags !== 'object' || Array.isArray(value.flags)) throw new Error('map.preview.flags: expected a boolean flag object');
  for (const [key,v] of Object.entries(value.flags)) if(typeof v !== 'boolean' || ['__proto__','prototype','constructor'].includes(key)) throw new Error(`map.preview.flags.${key}: expected a boolean flag`);
  for (const key of ['reduced','flat','gateOpen','harborOpen','touch'] as const) if(typeof value[key] !== 'boolean') throw new Error(`map.preview.${key}: expected boolean`);
  finite(value.time,'time');finite(value.tokens,'tokens');finite(value.tapMin,'tapMin',1);
  if(value.ride) {
    if(!STAND_IDS.includes(value.ride.from)||!STAND_IDS.includes(value.ride.to)) throw new Error('map.preview.ride: unknown station');
    finite(value.ride.f,'ride.f');if(value.ride.f>1) throw new Error('map.preview.ride.f: expected progress <= 1');
  }
  return structuredClone(value);
}

/** No save access, travel command, geometry setter, destination setter or player-clock mutation. */
export class WorldMapPreview {
  private readonly context: CanvasRenderingContext2D;
  private readonly document: WorldDocument;
  private preview: WorldMapPreviewState;
  private map: MapState;
  private selected: PlaceId | null = null;
  private width: number;
  private height: number;
  constructor(private readonly options: WorldMapPreviewOptions) {
    const context=options.canvas.getContext('2d');
    if(!context) throw new Error('map.canvas: a 2D canvas is required');
    this.context=context;this.document=structuredClone(options.document);
    this.width=options.canvas.width;this.height=options.canvas.height;
    this.preview=checked({scene:'downtown',seenSceneIds:'all',flags:{},time:0,reduced:false,layer:'street',flat:false,gateOpen:false,harborOpen:false,tokens:0,ride:null,touch:false,tapMin:22,...options.preview});
    this.map=this.makeMap();
  }
  private makeMap(): MapState {
    const p=this.preview, seen=new Set(p.seenSceneIds==='all' ? this.document.scenes.map(s=>s.id) : p.seenSceneIds);
    const view=openMap('view',p.scene,p.ride?.from ?? null);
    // Always explicit: runtime's remembered preferences are neither read nor written by preview choices.
    view.layer=p.layer;view.flat=p.flat;
    view.district=p.layer==='below' ? DISTRICTS.findIndex(d=>d.id==='undercity') : DISTRICTS.findIndex(d=>d.id===(placeOf(p.scene).district ?? (p.ride ? placeOf(this.stationScene(p.ride.from)).district : 'downtown')));
    if(view.district<0) view.district=0;
    return {view,rememberPreferences:false,scene:p.scene,ride:p.ride ? {...p.ride}:null,seen:id=>seen.has(id),flag:key=>Object.prototype.hasOwnProperty.call(p.flags,key)&&p.flags[key],gateOpen:p.gateOpen,harborOpen:p.harborOpen,tokens:p.tokens,t:p.time,reduced:p.reduced,touch:p.touch,tapMin:p.tapMin,avoid:null};
  }
  private stationScene(id: Station): SceneId {
    return this.document.transport.metro.stations.find(s=>s.id===id)!.scene;
  }
  private act(action: MapAct): void {
    // Native map actions become editor selection only. Never forward go/fly to gameplay.
    if(action.kind==='go') this.selectPlace(action.place.id);
    this.preview.layer=this.map.view.layer;this.preview.flat=this.map.view.flat;
  }
  setViewport(width: number, height: number): void {
    finite(width,'width',1);finite(height,'height',1);this.width=width;this.height=height;
  }
  setPreview(patch: Partial<WorldMapPreviewState>): void {
    const old=this.preview;
    this.preview=checked({...old,...patch});
    // Time-only scrubbing preserves the map's current zoom/selection.
    if(Object.keys(patch).every(k=>k==='time'||k==='reduced')) {
      this.map.t=this.preview.time;this.map.reduced=this.preview.reduced;
    } else this.map=this.makeMap();
    if(this.selected) this.options.onSelection?.(this.selection()!);
  }
  getPreview(): WorldMapPreviewState { return structuredClone(this.preview); }
  /** Call from the composer's own render loop; this adapter starts no RAF/timer. */
  draw(): void {
    this.options.drawBackground?.(this.context,this.width,this.height);
    drawCityMap(this.context,this.width,this.height,this.map);
  }
  key(key: string): void { this.act(mapKey(this.map,key)); }
  /** Coordinates are canvas view units, matching draw(), rather than client/screen pixels. */
  pointer(x: number,y: number,press: boolean,mouse=true): boolean {
    const result=mapPointer(this.map,this.width,this.height,x,y,press,mouse);
    this.act(result.act);return result.pointer;
  }
  selectPlace(id: PlaceId): WorldPlaceInspection {
    if(!this.document.map.places.some(p=>p.id===id)) throw new Error(`map.selection: unknown place ${id}`);
    this.selected=id;const selection=this.selection()!;this.options.onSelection?.(selection);return selection;
  }
  selection(): WorldPlaceInspection | null {
    const place=this.document.map.places.find(p=>p.id===this.selected);
    if(!place) return null;
    const actual=PLACES.find(p=>p.id===place.id)!;
    return structuredClone({
      place,district:this.document.map.districts.find(d=>d.id===place.district) ?? null,
      scenes:this.document.scenes.filter(s=>place.scenes.includes(s.id)),
      transport:{
        stations:this.document.transport.metro.stations.filter(s=>place.scenes.includes(s.scene)||place.scenes.includes(s.up)),
        taxi:this.document.transport.taxi.filter(s=>place.scenes.includes(s.scene)),
        links:this.document.transport.links.filter(l=>l.from===place.district||l.to===place.district),
      },
      blocked:placeBlocked(actual,this.map),
    });
  }
  /** Opens a composition for inspection/editing; it does not enter/unlock a scene in the game. */
  openScene(id?: SceneId): void {
    const selection=this.selection();if(!selection) throw new Error('map.selection: select a place first');
    const scene=id ?? selection.place.entrance;
    if(!selection.place.scenes.includes(scene)) throw new Error(`map.selection.scene: ${scene} is outside ${selection.place.id}`);
    const entrance=scene===selection.place.entrance ? selection.place.at : undefined;
    this.options.onOpenScene(scene,{place:selection.place.id,...(entrance ? {entrance}: {})});
  }
}
export const createWorldMapPreview = (options: WorldMapPreviewOptions) => new WorldMapPreview(options);
