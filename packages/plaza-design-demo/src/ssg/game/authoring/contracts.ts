/** Editor contracts. No editor UI or document state is created by importing these types. */
import type {ArtRegistry,ChunkDocument,AssetInstance,Point,Environment} from '../art/core/composition';
import type {TimelineFrame,TimelineProgram,TimelineContext} from '../art/core/timeline';
import type {Light} from '../world/light';
import type {Climate,Weather} from '../world/weather';
import type {DocumentProjection} from './document-projection';
import type {AssetEntry,AssetUsage,AssetPreviewOverrides,AssetPreviewReport} from './asset-browser';
/** Source-store discriminators retain their persisted spelling: composition is a ChunkDocument,
 * world-composition is the named chunk-arrangement catalogue. UI names describe their actual roles. */
export interface EditorDocument { id: string; kind: 'composition' | 'world-composition' | 'world' | 'gameplay' | 'scene' | 'fixtures' | 'city' | 'transport' | 'devices' | 'people' | 'presets' | 'profiles' | 'rules' | 'storyboard'; revision: string; value: unknown }
export interface PreviewRequest { /** Ambient seconds remain continuous when changing sequence context. */ ambientTime?:number; workspace?:{x:number;h:number;zoom:number;anchorX?:number;anchorH?:number;followCamera?:boolean}; transient?:{document:string;composition:ChunkDocument}; sourceVersion?:object; documents?:ReadonlyMap<string,unknown>; composition: ChunkDocument; frame?: TimelineFrame; timeline?: TimelineProgram; sequenceId?: string; time: number; reduced: boolean; overlays: boolean; objectOutlines?:boolean; selectedId?: string; /** Editor view state: draw the player at its row, hide these objects. Never saved. */ player?: boolean; hidden?: readonly string[]; lighting?: Light; weather?: Weather; climate?: Climate | null; environment: Record<string, string | number | boolean> }
/** A scene joined to the previewed one by a seam, drawn beside it read-only: where it is on the canvas (canvas pixels) and on which side. */
export interface JoinedPreview { zone: string; label: string; x: number; y: number; width: number; height: number; side: 'left' | 'right' | 'above' | 'below' }
export interface PreviewResult {
  rendering?:Record<string,import('../world/render-settings').ResolvedRenderSettings>;
  handles?:{id:string;instance:string;label:string;x:number;y:number;cursor:string;fields:readonly string[];edit(dx:number,dy:number,snap?:number):import('../art/core/spatial').SpatialEdit}[];
  /** Resolved game-camera start; independent of editor pan/zoom. */
  gameCamera?:{scene:string;x:number;h:number};
  /** Physical chunk coordinates through the captured native view, for editor connection guides. */
  projectChunk?(chunk:string,x:number,h:number):{x:number;y:number}|undefined;
  /** Exact click picking replays captured paint commands through the same primitive painter. */
  resolved?:Record<string,import('../art/core/presentation').ArtworkInspection>;camera?:import('../runtime/frame').CameraGuide;workspaceScale?:number;workspaceAnchor?:{x:number;h:number}; activeScene?:string;regions?:{document:string;scene:string;label:string;x:number;y:number;width:number;height:number;active:boolean}[]; sources?:Record<string,{document:string;instance:string}>; bounds: { id: string; x: number; y: number; width: number; height: number; clip?:{x:number;y:number;width:number;height:number} }[]; /** Joined scenes drawn beside this one, and the camera-x range (scene units) that holds the scene and them. */ joined?: JoinedPreview[]; extent?: { from: number; to: number }; deltaToLocal?(id: string, dx: number, dy: number): Point; artwork?: { composition: ChunkDocument; environment: Environment } }
/** A saved world state for a scene: the environment keys it fixes (day, minute, weather, seed, flags). */
export interface WorldState { id: string; name: string; checkpoint?:import('../world/checkpoints').PlayFixture;environment: Record<string, string | number | boolean> }
export interface WorldStates {
  /** Empty scene lists every authored checkpoint for world-level navigation. */
  list(scene: string, documents: EditorDocument[]): WorldState[];
  /** '' means preview only: the toolbar changes nothing saved. */
  selected(scene: string, documents: EditorDocument[]): string;
  select(scene: string, id: string): void;
  /** The document change that stores `key` in the state, or undefined when states do not store that key. */
  edit(scene: string, id: string, key: string, value: string | number | boolean, documents: EditorDocument[]): { id: string; value: unknown } | undefined;
}
/** Limit an editing frame to authored composition members without changing gameplay membership. */
export interface WorkspaceScope {composition:string;origin?:string;chunks:readonly string[]}
export interface PreviewRequest {scope?:WorkspaceScope;checkpoint?:import('../world/checkpoints').PlayFixture;direction?:'base'|'sequence';viewport?:import('../runtime/frame').FrameViewport}
export interface PlayStart {mode:'preview'|'checkpoint';viewport:import('../runtime/frame').FrameViewport;sequence?:{id:string;time:number};camera?:{scene:string;x:number;h:number}}
/** `quick` controls sit in the Scene toolbar; `choices` render as a segmented row of named presets. The rest live under More. */
export interface EnvironmentControl { key: string; label: string; kind: 'number' | 'boolean' | 'select' | 'text'; options?: string[]; min?: number; max?: number; step?: number; quick?: boolean; choices?: { label: string; value: number | string }[]; /** A single key that toggles a boolean control in the Scene view. */ shortcut?: string }
/** One inspector tab beside Appearance: the logic, device or wiring that belongs to the selection (or to the scene when nothing is selected). */
export interface InspectorSection { id: string; label: string; title?: string; /** Listed first and opened first whenever the selection changes (a barrier's Access). */ primary?: boolean; mount(host: HTMLElement, context: WorkbenchContext): WorkbenchHandle }
export interface WorkbenchContext {
  openRenderingSource?(source:import('../world/render-settings').RenderSource):void;
  cityDistrict?:string;
  inspect?:import('./inspector-task').OpenInspector;
  openConversation?(document:string,conversation:string):void;
  checkpoint?:string;
  onCheckpoint?(id:string):void;
  openComposition?(id:string):void;
  openCheckpoint?(id:string):void;
  editCheckpoint?(id:string):void;
  openSequence?(id:string):void;
  /** Native Play reports actual lifecycle records, never editor-predicted loading. */
  onResidency?(chunks:readonly import('../runtime/chunk-status').ChunkStatus[]|undefined):void;
  documents: EditorDocument[]; openScene(scene: string, compare?: string): void; openInstance(document: string, instance: string): void;
  /** The scene chosen in the header; scene-mode workbenches follow it instead of keeping their own picker. */
  scene?: string;
  /** Set when the panel was opened by an action that asks it to start (the Scene toolbar's Play). */
  autostart?: boolean;
  /** In-place Play uses the existing right inspector; labs retain their own framed settings. */
  playSettings?:HTMLElement;
  playStart?:PlayStart;
  stopPlay?():void;
  authoring?: { /** Immutable current source snapshot; use for shared reads instead of copying each document. */ snapshot?():readonly EditorDocument[]; get(id: string): EditorDocument; edit(id: string, label: string, value: unknown): void; editDocuments?(changes:{id:string;value:unknown}[],label:string):void; undo(): void; redo(): void; save(): Promise<void>; reload(): Promise<void>; dirty(id: string): boolean };
}
export type WorkbenchHandle = (() => void) & { refresh?(): void };
export interface ComposerConfig {
  registry: ArtRegistry; api?: { url: string; token: string }; documents?: EditorDocument[]; viewport?: { width: number; height: number };
  preview: { render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult | Promise<PreviewResult> };
  destinations?: TimelineContext['destinations']; motionTracks?: TimelineContext['motionTracks']; clips?: TimelineContext['clips'];
  timelineContext?(base: TimelineContext, preview: { time: number; reduced: boolean; sequenceId: string; environment: Record<string, string | number | boolean>; viewport: { width: number; height: number }; timeline?: TimelineProgram }): TimelineContext;
  projections?:readonly DocumentProjection[];
  destinationsFor?(documents:EditorDocument[]):TimelineContext['destinations'];
  commandTargetsFor?(documents:EditorDocument[]):NonNullable<TimelineContext['commandTargets']>;
    validateDocument?(document: EditorDocument, documents: EditorDocument[]): void;
    /** Check physical placement constraints before displaying a transient artwork drag. */
    validatePlacement?(composition:ChunkDocument,documents:readonly EditorDocument[]):void;
  /** Complete immutable inputs read by validateDocument. Unchanged inputs may reuse its successful result. Composition and timeline validation always run. */
  validationInputs?(documents: readonly EditorDocument[]): readonly unknown[];
  initialEnvironment?: Record<string, string | number | boolean>; environmentControls?: EnvironmentControl[];
  worldPanel?(host: HTMLElement, openScene: (scene: string) => void, documents: EditorDocument[], scene: string,context:WorkbenchContext): void | (() => void);
  /** Districts and which one each scene is in, for the artwork library's filter bar. */
  /** Named world states (time, weather, flags) a scene is previewed under and Play starts from. */
  worldStates?: WorldStates;
  /** Compositions the stage can show beside a scene (a proposal and its base). Same request, same camera. */
  compareWith?(scene: string, documents: EditorDocument[]): { id: string; label: string }[];
  assetDistricts?(documents: EditorDocument[]): { list: { id: string; name: string }[]; of(scene: string): string | undefined };
  assetPreview?(canvas: HTMLCanvasElement, entry: AssetEntry, usage: AssetUsage | undefined, documents: EditorDocument[], settings: Pick<PreviewRequest, 'time' | 'reduced' | 'environment'>&AssetPreviewOverrides): string | AssetPreviewReport | Promise<string | AssetPreviewReport>;
  /** Display name for a composition's scene id in the scene picker and empty states. */
  sceneLabel?(scene: string): string;
  /** Source documents that belong to a scene beyond its composition, for unsaved-change markers. */
  sceneDocuments?(scene: string,documents:readonly EditorDocument[]): string[];
  /** The scene picker's structure: districts, their places, each place's scenes. Scenes left out are listed under "Other scenes". */
  sceneTree?(documents: readonly EditorDocument[]): { label: string; places: { label: string; scenes: string[] }[] }[];
  workbenches?: WorkbenchConfig[];
  /** The scene view's New chunk inspector: the places a scene can belong to, why creation is blocked ('' when it is not), and creation as one undoable edit. */
  newScene?: { places(api: NonNullable<WorkbenchContext['authoring']>): { places: string[]; initial: string }; blocked(api: NonNullable<WorkbenchContext['authoring']>): string; create(api: NonNullable<WorkbenchContext['authoring']>, id: string, name: string, place: string, preset?:string): void; presets?:{value:string;label:string}[];removable?(api:NonNullable<WorkbenchContext['authoring']>):string[];remove?(api:NonNullable<WorkbenchContext['authoring']>,scene:string):void };
  /** Tabs for the Scene inspector. Called for the open scene with the selected instance, or none for the scene itself. */
  inspector?(scene: string, instance: AssetInstance | undefined, documents: readonly EditorDocument[]): InspectorSection[];
  /** Scenes joined to this one with no cut (one seam away). The Scene toolbar then offers Show joined scenes and Fit joined; the preview draws them. */
  joinedScenes?(scene: string, documents: readonly EditorDocument[]): { zone: string; label: string }[];
}
/**
 * `area: 'scene'` panels are modes of the selected scene (Logic, Play; `wiring` panels sit under Logic)
 * and receive it through `showScene` before mounting; `supports` decides whether the scene has
 * anything to show. `library` panels are artwork viewers, `world` panels edit what is shared between
 * scenes (city, travel, opening, networks, shared dialogue), and `labs` panels are developer test beds.
 */
export interface WorkbenchConfig {
  selectConversation?(document:string,conversation:string):void;
  id: string; title: string; label?: string; documentDependent?: boolean; documentIds?: string[]; primaryDocumentId?: string; authoring?: boolean;
  area?: 'scene' | 'library' | 'world' | 'labs';
  /** Shown beside the Scene stage (in place of the outline) instead of replacing it, so the panel can use the stage. */
  beside?: boolean;
  /** `sections`: a long form is shown in the editor frame, its top-level sections listed on the left, one at a time. */
  layout?: 'sections';
  mode?: 'logic' | 'wiring' | 'play'; supports?(scene: string,documents:readonly EditorDocument[]): boolean; showScene?(scene: string,documents:readonly EditorDocument[]): void; unsupported?: string;
  mount(host: HTMLElement, context: WorkbenchContext): WorkbenchHandle;
}
