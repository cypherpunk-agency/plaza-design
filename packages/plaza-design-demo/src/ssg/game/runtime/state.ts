

import { GameplaySession } from '../engine/gameplay/session';

import {SceneHost} from "../engine/index";

import {type SceneDef,type SceneId,type SceneView} from "../scenes/index";

import {type CardSpec,type GateRule} from "../story/story-rules";
import {CutscenePlay} from "../story/cutscenes/index";

import { Opening } from "../story/title/index";
import {type MapView} from "../ui/citymap";

import {type NetView} from "../ui/netmap";

import type {MapPlace,Stand} from '../world/city';

import {playProfile} from "./play-profile";

import {type Level} from "../engine/level";

import {type ZonePlacement,type ResidencyTier} from "../world/zone-graph";
export interface Bubble {name:string;pages:string[];page:number;chars:number;x:number;h:number;then?:()=>void}

/** Camera data owned by the runtime; no scheduler or secondary model. */
export const createCameraState=()=>({
    k: 2,
    viewW: 640,
    viewH: 320,
    gy: 270,
    gyBase: 270,
    camH: 0,
    cam: 0,
    fitW: 0,
    vz: 1,
    vcam: 0,
    panned: false,
    wasVision: false,
    nudge: (null) as { goal: number; until: number; px: number } | null,
    easeBack: false,
    lastNudge: -1e9
});
export type CameraState=ReturnType<typeof createCameraState>;

/** Input data owned by the runtime; no scheduler or secondary model. */
export const createInputState=()=>({
    keys: new Set<string>(),
    vptr: new Map<number, { x: number; y: number }>(),
    vgest: (null) as { kind: 'tap' | 'pan' | 'pinch'; sx: number; sy: number; cam: number; z: number; d: number; mid: number } | null,
    lastTap: 0
});
export type InputState=ReturnType<typeof createInputState>;

/** Scenes data owned by the runtime; no scheduler or secondary model. */
export const createScenesState=()=>({
    here: (playProfile().home as SceneId) as SceneId,
    level: (null) as Level | null,
    hosts: new Map<SceneId, SceneHost>(),
    gameplaySessions: new Map<SceneId, GameplaySession>(),
    compiledScenes: new Map<SceneId,SceneDef>(),
    mobileOwners: new Set<SceneId>(),
    mobiles: new Map<SceneId,{model:import('../engine/model').SceneModel;gameplay?:GameplaySession}>(),
    joinedZones: ([]) as ScenePlacement[],
    zoneTiers: new Map<string, ResidencyTier>()
      ,zoneReasons: new Map<string,string>()
      ,directedZones: new Set<string>(),directedOrigin:undefined as string|undefined
});
export type ScenesState=ReturnType<typeof createScenesState>;

/** Timing data owned by the runtime; no scheduler or secondary model. */
export const createTimingState=()=>({
    t: 0,
    last: 0,
    raf: 0,
    running: false,
    started: false,
    clock: 0
});
export type TimingState=ReturnType<typeof createTimingState>;

/** Presentation data owned by the runtime; no scheduler or secondary model. */
export const createPresentationState=()=>({
    bubble: (null) as Bubble | null,
    showEnd: false,
    opening: (null) as Opening | null,
    cut: (null) as CutscenePlay | null,
    cutThen: (null) as (() => void) | null,
    pendingCut: (null) as string | null,
    mapView: (null) as MapView | null,
    netView: (null) as NetView | null,
    netBack: false,
    hop: (null) as { place: MapPlace; start: number; done: boolean } | null,
    flight: (null) as { to: Stand; start: number } | null,
    beat: (null) as { start: number; checkpoint: { x: number; h: number }; gate: GateRule; go: { to: string; at?: string } | { barrier: string } | null } | null,
    sleep: (null) as { start: number; woke: boolean; card: CardSpec } | null,
    stamps: ({}) as Record<string, number>,
    still: 0,
    goalAt: (null) as number | null,
    bubbleBox: (null) as { x: number; y: number; w: number; h: number } | null,
    hudH: 46,
    gainWords: '',
    hudHint: '',
    carListOn: false,
    carListOff: false,
    liftIds: new Set<string>(),
    modeKey: '',
    arrowsKey: '',
    shownClock: '',
    storyPinned: false,
    clockSaved: 0,
    sceneView: (null) as SceneView | null
});
export type PresentationState=ReturnType<typeof createPresentationState>;

export interface PlayerState {x:number;y:number;vy:number;face:number;onGround:boolean;moving:boolean}

export interface ScenePlacement extends Pick<ZonePlacement,'dx'|'dh'>{id:SceneId}
