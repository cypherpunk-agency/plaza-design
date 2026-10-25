/** Editor contracts. No editor UI or document state is created by importing these types. */
import type {ArtRegistry,Composition,Instance,Point,Environment} from '../art/core/composition';
import type {TimelineFrame,TimelineProgram,TimelineContext} from '../art/core/timeline';
import type {Light} from '../world/light';
import type {Climate,Weather} from '../world/weather';
import type {DocumentProjection} from './document-projection';
import type {AssetEntry,AssetUsage,AssetPreviewOverrides,AssetPreviewReport} from './asset-browser';
export interface EditorDocument { id: string; kind: 'composition' | 'world' | 'gameplay' | 'scene' | 'fixtures' | 'conversations' | 'city' | 'transport' | 'devices' | 'people' | 'presets' | 'profiles' | 'rules' | 'storyboard'; revision: string; value: unknown }
export interface PreviewRequest { workspace?:{x:number;h:number;zoom:number;anchorX?:number;anchorH?:number}; transient?:{document:string;composition:Composition}; sourceVersion?:object; documents?:ReadonlyMap<string,unknown>; composition: Composition; frame?: TimelineFrame; timeline?: TimelineProgram; sequenceId?: string; time: number; reduced: boolean; overlays: boolean; objectOutlines?:boolean; selectedId?: string; /** Editor view state: draw the player at its row, hide these objects. Never saved. */ player?: boolean; hidden?: readonly string[]; lighting?: Light; weather?: Weather; climate?: Climate | null; environment: Record<string, string | number | boolean> }
/** A scene joined to the previewed one by a seam, drawn beside it read-only: where it is on the canvas (canvas pixels) and on which side. */
export interface JoinedPreview { zone: string; label: string; x: number; y: number; width: number; height: number; side: 'left' | 'right' | 'above' | 'below' }
export interface PreviewResult {resolved?:Record<string,import('../art/core/presentation').ArtworkInspection>;camera?:import('../runtime/frame').CameraGuide;workspaceScale?:number;workspaceAnchor?:{x:number;h:number}; activeScene?:string;regions?:{document:string;scene:string;label:string;x:number;y:number;width:number;height:number;active:boolean}[]; sources?:Record<string,{document:string;instance:string}>; bounds: { id: string; x: number; y: number; width: number; height: number; clip?:{x:number;y:number;width:number;height:number} }[]; /** Joined scenes drawn beside this one, and the camera-x range (scene units) that holds the scene and them. */ joined?: JoinedPreview[]; extent?: { from: number; to: number }; deltaToLocal?(id: string, dx: number, dy: number): Point; artwork?: { composition: Composition; environment: Environment } }
/** A saved world state for a scene: the environment keys it fixes (day, minute, weather, seed, flags). */
export interface WorldState { id: string; name: string; environment: Record<string, string | number | boolean> }
export interface WorldStates {
  list(scene: string, documents: EditorDocument[]): WorldState[];
  /** '' means preview only: the toolbar changes nothing saved. */
  selected(scene: string, documents: EditorDocument[]): string;
  select(scene: string, id: string): void;
  /** The document change that stores `key` in the state, or undefined when states do not store that key. */
  edit(scene: string, id: string, key: string, value: string | number | boolean, documents: EditorDocument[]): { id: string; value: unknown } | undefined;
}
/** `quick` controls sit in the Scene toolbar; `choices` render as a segmented row of named presets. The rest live under More. */
export interface EnvironmentControl { key: string; label: string; kind: 'number' | 'boolean' | 'select' | 'text'; options?: string[]; min?: number; max?: number; step?: number; quick?: boolean; choices?: { label: string; value: number | string }[]; /** A single key that toggles a boolean control in the Scene view. */ shortcut?: string }
/** One inspector tab beside Appearance: the logic, device or wiring that belongs to the selection (or to the scene when nothing is selected). */
export interface InspectorSection { id: string; label: string; title?: string; /** Listed first and opened first whenever the selection changes (a barrier's Access). */ primary?: boolean; mount(host: HTMLElement, context: WorkbenchContext): WorkbenchHandle }
export interface WorkbenchContext {
  documents: EditorDocument[]; openScene(scene: string, compare?: string): void; openInstance(document: string, instance: string): void;
  /** The scene chosen in the header; scene-mode workbenches follow it instead of keeping their own picker. */
  scene?: string;
  /** Set when the panel was opened by an action that asks it to start (the Scene toolbar's Play). */
  autostart?: boolean;
  authoring?: { get(id: string): EditorDocument; edit(id: string, label: string, value: unknown): void; editDocuments?(changes:{id:string;value:unknown}[],label:string):void; undo(): void; redo(): void; save(): Promise<void>; reload(): Promise<void>; dirty(id: string): boolean };
}
export type WorkbenchHandle = (() => void) & { refresh?(): void };
export interface ComposerConfig {
  registry: ArtRegistry; api?: { url: string; token: string }; documents?: EditorDocument[]; viewport?: { width: number; height: number };
  preview: { render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult | Promise<PreviewResult> };
  destinations?: TimelineContext['destinations']; motionTracks?: TimelineContext['motionTracks']; clips?: TimelineContext['clips'];
  timelineContext?(base: TimelineContext, preview: { time: number; reduced: boolean; sequenceId: string; environment: Record<string, string | number | boolean>; viewport: { width: number; height: number }; timeline?: TimelineProgram }): TimelineContext;
  projections?:readonly DocumentProjection[];
  destinationsFor?(documents:EditorDocument[]):TimelineContext['destinations'];
  validateDocument?(document: EditorDocument, documents: EditorDocument[]): void;
  /** Complete immutable inputs read by validateDocument. Unchanged inputs may reuse its successful result. Composition and timeline validation always run. */
  validationInputs?(documents: readonly EditorDocument[]): readonly unknown[];
  initialEnvironment?: Record<string, string | number | boolean>; environmentControls?: EnvironmentControl[];
  worldPanel?(host: HTMLElement, openScene: (scene: string) => void, documents: EditorDocument[], scene?: string): void | (() => void);
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
  /** The Scene view's New scene dialog: the places a scene can belong to, why creation is blocked ('' when it is not), and creation as one undoable edit. */
  newScene?: { places(api: NonNullable<WorkbenchContext['authoring']>): { places: string[]; initial: string }; blocked(api: NonNullable<WorkbenchContext['authoring']>): string; create(api: NonNullable<WorkbenchContext['authoring']>, id: string, name: string, place: string, preset?:string): void; presets?:{value:string;label:string}[] };
  /** Tabs for the Scene inspector. Called for the open scene with the selected instance, or none for the scene itself. */
  inspector?(scene: string, instance: Instance | undefined, documents: readonly EditorDocument[]): InspectorSection[];
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
  id: string; title: string; label?: string; documentDependent?: boolean; documentIds?: string[]; primaryDocumentId?: string; authoring?: boolean;
  area?: 'scene' | 'library' | 'world' | 'labs';
  /** Shown beside the Scene stage (in place of the outline) instead of replacing it, so the panel can use the stage. */
  beside?: boolean;
  /** `sections`: a long form is shown in the editor frame, its top-level sections listed on the left, one at a time. */
  layout?: 'sections';
  mode?: 'logic' | 'wiring' | 'play'; supports?(scene: string,documents:readonly EditorDocument[]): boolean; showScene?(scene: string,documents:readonly EditorDocument[]): void; unsupported?: string;
  mount(host: HTMLElement, context: WorkbenchContext): WorkbenchHandle;
}
