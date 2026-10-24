import type {ScenePlacement} from './state';
import {projectX,type CameraProjection} from '../art/core/geometry';
import * as InteractionRouting from './interaction-routing';
import * as StoryTransitions from './story-transitions';
import * as PresentationFrame from './presentation-frame';
import {stepPlayer,type MovementPort} from './movement';
import * as Camera from './camera';
import * as InputRouting from './input-routing';
import * as SceneLifecycle from './scene-lifecycle';
import {NET_OPENED,NUDGE_HOLD,NUDGE_MARGIN,NUDGE_GAP,MIN_VIEW_W,MAX_VIEW_H} from './tuning';
import type {GameHost} from './contracts';
import {createCameraState,createInputState,createScenesState,createTimingState,createPresentationState} from './state';
import {controlGroups,ownedSummary} from './hud-data';
import {exitTargets,lifeTargets,promptFloor,usePrice,type InteractionTarget as Target} from './interaction-targets';

import {runCommunicationReview,type CommunicationReview} from '../demo/communication-review';
import {movingInteractions} from '../engine/gameplay/moving-interactions';
import {nativeLiveConditionsTick} from '../engine/gameplay/native-live-conditions';
import {attachGameplayHandoffs} from '../engine/gameplay/handoffs';
import {registryLabels} from '../engine/gameplay/rewards';
import {cloneValues,mergeValues,resolveValues,deleteStateValue} from '../engine/gameplay/state';
import {type SceneModel} from '../engine/model';
import {withCompanionConversations,COMPANION_GAMEPLAY} from '../engine/gameplay/companion-conversations';
import {COMPANION_SOURCE,companionFlag,companionHere} from '../engine/gameplay/companion-source';
import type {GameRuntimeSources} from './game-sources';
import {runtimeSequenceDocuments} from '../story/sequence-documents';
import {defaultNetworkContext} from '../engine/network-context';
import {mintFeedback,type FeedbackReceipt} from '../engine/feedback-receipt';
import type {MetroStart} from '../world/transport/metro-start';
import {METRO_SOURCE,type MetroSource} from '../world/transport/metro-source';
import {CRITTER_REACTIONS} from '../engine/gameplay/critter-reactions';
import {BOT_REACTIONS,withBotConversations,type BotReactionDocument} from '../engine/gameplay/bot-conversations';
import {perfBegin,perfEnd,perfSample,performanceRecording} from './diagnostics/performance';
import {mountPerformancePanel} from './diagnostics/performance-panel';
import {capabilityView,sceneExitAccess,exitVisibility,exitPermission} from '../world/access';
import {mountReviewNavigator} from '../demo/review-navigator';
import {reviewStations,reviewActions,REVIEW_STATIONS,type ReviewActionSource} from '../demo/review-stations';
import {nativeGameplayPort} from '../engine/gameplay/native-bindings';
import {ConversationSession} from '../engine/gameplay/conversation';
import { gameStorage, reloadRuntime } from './storage';

import {validateWorldVehicles,saveVehicle,restoreVehicle,arriveVehicleLevel} from '../engine/level-vehicles';

import {type ZoneFrame} from './frame';
import { GameplaySession } from '../engine/gameplay/session';
/** Composition root for the one game runtime. Owns services, current state, save
 * serialization and frame ordering. Domain work is called through the focused
 * runtime modules; ordinary scene behavior remains in authored gameplay source. */

import { drawFlight,taxiDurationFor } from '../story/cutscenes/taxi';
import type { Handoff } from '../art/core/timeline';
import { type MachineData,type NetworkData } from "../data/index";

import { CITY,NO_RULES,SceneHost } from "../engine/index";

import { sceneShell } from "../engine/shell";

import {isSceneId,ITEMS,SCENES,sceneTitle,type ItemId,type SceneDef,type SceneId,type SceneUse,type SceneView} from "../scenes/index";
import { contactsModel,type ContactsModel } from "../story/contacts";
import {END_CARD,type EndCardSource} from "../story/end-card";
import {arrivalFor,attentionDue,goalHint} from "../story/story-rules";
import { createCutscenes,CutscenePlay,isCutsceneId,type CutsceneId } from "../story/cutscenes/index";
import {openingStoryModel,type OpeningState} from '../story/opening';
import { Opening } from "../story/title/index";
import {createCityMap,type MapAct,type MapState} from "../ui/citymap";
import { KeyBar } from "../ui/keybar";
import { Hints } from "../ui/hints";
import { Menu, type DeckData } from "../ui/menu";
import {drawNetMap,netKey,netPointer,openNet,type MachineState,type NetAct,type NetState} from "../ui/netmap";
import { ShiftGuidance } from "../ui/shift-guidance";
import { levels,startLevel,SUDO,unlockAll } from "../ui/sudo";
import { Terminal,type LineKind } from "../ui/terminal";
import { commands,NO_ARGS,run,suggest,type Ctx } from "../ui/terminal/commands";
import { ClockBar,Transport } from "../ui/transport";
import * as defaultCity from '../world/city';
import type {CityModel} from '../world/city';
import {city} from "../world/clock";
import { light,lightAt,setLight,type Light } from "../world/light";
import { frameView } from '../art/core/view';
import {createLineSystem,type LineSystem} from '../world/transport/line';
import {boardRide} from '../engine/gameplay/mechanisms/line-ride';
import { reportLines,sceneClimate,setHereClimate,weatherNow,type Weather } from "../world/weather";
import { sound } from './audio';
import {characterHeight,characterX,isHere,setSpeaker} from './characters';
import {Companion} from './companion';
import { EDITOR_PLAY, PROBE } from "./mode";
import { can,playProfile,saveKey,sudoOn } from "./play-profile";
import { loadSave,newSave,nodeCount,ownedModules,storeSave,who,type Save } from "./save";
import {levelArrive,levelArrows,levelDown,levelFloor,levelHints,levelIndoor,levelInteract,levelRiding,levelUp,nearestPrompt,levelLiftList,levelPick,savedForLevel,type Movers} from "../engine/level";
import zoneGraphSource from "../world/zone-graph.json";
import {validateZoneGraph} from "../world/zone-graph";
const SHIPPED_ZONE_GRAPH = validateZoneGraph(zoneGraphSource);

export class Game {
  private save: Save = sudoOn() ? unlockAll(loadSave()) : loadSave();
  private readonly camera=createCameraState();
  private readonly input=createInputState();
  private readonly scenes=createScenesState();
  private readonly timing=createTimingState();
  private readonly presentation=createPresentationState();

  private interactionRoutingPortValue?:InteractionRouting.InteractionRoutingPort;
  private get interactionRoutingPort():InteractionRouting.InteractionRoutingPort{return this.interactionRoutingPortValue??=(()=>{const game=this;return{
    get hints(){return game.hints;},
    get presentation(){return game.presentation;},
    get interactionHost(){return game.interactionHost;},
    nearest:(...args)=>game.nearest(...args),
    get scenes(){return game.scenes;},
    get p(){return game.p;},
    get movers(){return game.movers;},
    introduceScene:(...args)=>game.introduceScene(...args),
    persistSave:(...args)=>game.persistSave(...args),
    hostOf:(...args)=>game.hostOf(...args),
    get def(){return game.def;},
    get story(){return game.story;},
    get zh(){return game.zh;},
    gameplayFor:(...args)=>game.gameplayFor(...args),
    get companionBody(){return game.companionBody;},
    say:(...args)=>game.say(...args),
    dialogueCompletion:(...args)=>game.dialogueCompletion(...args),
    sceneDefinition:(...args)=>game.sceneDefinition(...args),
    startCard:(...args)=>StoryTransitions.startCard(game.storyTransitionsPort,...args),
    get openingStory(){return game.openingStory;},
    offerWait:(...args)=>StoryTransitions.offerWait(game.storyTransitionsPort,...args),
    get critters(){return game.critters;},
    get timing(){return game.timing;},
    get save(){return game.save;},
    usePrice:(...args)=>game.usePrice(...args),
    flash:(...args)=>game.flash(...args),
    weatherHere:(...args)=>game.weatherHere(...args),
    syncHud:(...args)=>game.syncHud(...args),
    notify:(...args)=>game.notify(...args),
    hailTaxi:(...args)=>game.hailTaxi(...args),
    showMap:(...args)=>game.showMap(...args),
    hasScene:(id):id is SceneId=>game.hasScene(id),
    travel:(...args)=>game.travel(...args),
    gameplayStatePort:(...args)=>game.gameplayStatePort(...args),
    runCues:(...args)=>StoryTransitions.runCues(game.storyTransitionsPort,...args),
    get input(){return game.input;}
};})();}

  private storyTransitionsPortValue?:StoryTransitions.StoryTransitionsPort;
  private get storyTransitionsPort():StoryTransitions.StoryTransitionsPort{return this.storyTransitionsPortValue??=(()=>{const game=this;return{
    runOpeningWorkflow:(...args)=>game.runOpeningWorkflow(...args),
    get term(){return game.term;},
    get presentation(){return game.presentation;},
    get timing(){return game.timing;},
    persistSave:(...args)=>game.persistSave(...args),
    syncHud:(...args)=>game.syncHud(...args),
    get scenes(){return game.scenes;},
    enter:(...args)=>game.enter(...args),
    hostOf:(...args)=>game.hostOf(...args),
    get p(){return game.p;},
    sceneDefinition:(...args)=>game.sceneDefinition(...args),
    get def(){return game.def;},
    get zh(){return game.zh;},
    get companionBody(){return game.companionBody;},
    say:(...args)=>game.say(...args),
    get touch(){return game.touch;},
    finishExit:(...args)=>InteractionRouting.finishExit(game.interactionRoutingPort,...args),
    get story(){return game.story;},
    get openingStory(){return game.openingStory;},
    get input(){return game.input;},
    get editorClock(){return game.editorClock;},
    get save(){return game.save;},
    gameplayFor:(...args)=>game.gameplayFor(...args),
    get stampEl(){return game.stampEl;},
    get placeName(){return game.placeName;},
    get metro(){return game.metro;},
    get world(){return game.world;},
    get sequenceDocuments(){return game.sequenceDocuments;},
    travel:(...args)=>game.travel(...args),
    flash:(...args)=>game.flash(...args),
    get canvas(){return game.canvas;},
    driverReply:(...args)=>game.driverReply(...args),
    hackLocked:(...args)=>game.hackLocked(...args),
    mapState:(...args)=>game.mapState(...args),
    get enginesPaused(){return game.enginesPaused;}
};})();}

  private presentationFramePortValue?:PresentationFrame.PresentationFramePort;
  private get presentationFramePort():PresentationFrame.PresentationFramePort{return this.presentationFramePortValue??=(()=>{const game=this;return{
    view:(...args)=>game.view(...args),
    get x(){return game.x;},
    get camera(){return game.camera;},
    get def(){return game.def;},
    get scenes(){return game.scenes;},
    get zh(){return game.zh;},
    get reduced(){return game.reduced;},
    get timing(){return game.timing;},
    get sources(){return game.sources;},
    weatherHere:(...args)=>game.weatherHere(...args),
    lightHere:(...args)=>game.lightHere(...args),
    zoneFrame:(...args)=>game.zoneFrame(...args),
    get p(){return game.p;},
    get companionPresent(){return game.companionPresent;},
    get companionBody(){return game.companionBody;},
    get companionDoc(){return game.companionDoc;},
    get interactionHost(){return game.interactionHost;},
    hostPlacement:(...args)=>game.hostPlacement(...args),
    get openingStory(){return game.openingStory;},
    get save(){return game.save;},
    groundUnder:(...args)=>game.groundUnder(...args),
    get presentation(){return game.presentation;},
    nearest:(...args)=>game.nearest(...args),
    get keyBar(){return game.keyBar;},
    get canvas(){return game.canvas;},
    get clockText(){return game.clockText;},
    get hints(){return game.hints;},
    get communicationCovered(){return game.communicationCovered;},
    gameplayFor:(...args)=>game.gameplayFor(...args),
    get story(){return game.story;},
    libraryGoal:(...args)=>game.libraryGoal(...args),
    get shiftGuidance(){return game.shiftGuidance;},
    get endCard(){return game.endCard;}
};})();}

  private movementPortValue?:MovementPort;
  private get movementPort():MovementPort{return this.movementPortValue??=(()=>{const game=this;return{
    get p(){return game.p;},get scenes(){return game.scenes;},get input(){return game.input;},get presentation(){return game.presentation;},
    get movers(){return game.movers;},get zh(){return game.zh;},hostOf:id=>game.hostOf(id),hasScene:(id):id is SceneId=>game.hasScene(id),
    followResidency:()=>SceneLifecycle.followResidency(game.sceneLifecyclePort),crossInto:id=>SceneLifecycle.crossInto(game.sceneLifecyclePort,id),keepSeenRooms:()=>SceneLifecycle.keepSeenRooms(game.sceneLifecyclePort),
    get levelW(){return game.levelW;},get platforms(){return game.platforms;},seamAt:edge=>SceneLifecycle.seamAt(game.sceneLifecyclePort,edge),walkOff:edge=>game.walkOff(edge)
  };})();}
  private cameraPortValue?:Camera.CameraPort;
  private get cameraPort():Camera.CameraPort{return this.cameraPortValue??=(()=>{const game=this;return{
    get camera(){return game.camera;},
    get timing(){return game.timing;},
    get scenes(){return game.scenes;},
    get term(){return game.term;},
    get levelW(){return game.levelW;},
    get interactionHost(){return game.interactionHost;},
    get zh(){return game.zh;},
    worldSpan:(...args)=>SceneLifecycle.worldSpan(game.sceneLifecyclePort,...args),
    get presentation(){return game.presentation;},
    get input(){return game.input;},
    get p(){return game.p;},
    get canvas(){return game.canvas;},
    hostPlacement:(...args)=>game.hostPlacement(...args),
    get menu(){return game.menu;},
};})();}

  private inputRoutingPortValue?:InputRouting.InputRoutingPort;
  private get inputRoutingPort():InputRouting.InputRoutingPort{return this.inputRoutingPortValue??=(()=>{const game=this;return{
    get presentation(){return game.presentation;},
    openingDone:(...args)=>game.openingDone(...args),
    get term(){return game.term;},
    get transport(){return game.transport;},
    get menu(){return game.menu;},
    skipRise:(...args)=>game.skipRise(...args),
    netKeyDown:(...args)=>game.netKeyDown(...args),
    mapKey:(...args)=>game.mapKey(...args),
    get interactionHost(){return game.interactionHost;},
    interact:(...args)=>InteractionRouting.interact(game.interactionRoutingPort,...args),
    openMenu:(...args)=>game.openMenu(...args),
    openDeck:(...args)=>game.openDeck(...args),
    showMap:(...args)=>game.showMap(...args),
    get netOk(){return game.netOk;},
    showNet:(...args)=>game.showNet(...args),
    resetVision:(...args)=>Camera.resetVision(game.cameraPort,...args),
    get scenes(){return game.scenes;},
    levelLocked:(...args)=>game.levelLocked(...args),
    get p(){return game.p;},
    get input(){return game.input;},
    jump:(...args)=>game.jump(...args),
    netPointerAt:(...args)=>game.netPointerAt(...args),
    mapPointer:(...args)=>game.mapPointer(...args),
    visionPointer:(...args)=>Camera.visionPointer(game.cameraPort,...args),
    get canvas(){return game.canvas;},
    get camera(){return game.camera;},
    deviceAt:(...args)=>game.deviceAt(...args),
    hackLocked:(...args)=>game.hackLocked(...args),
    get zh(){return game.zh;},
    targets:(...args)=>game.targets(...args),
    useLife:(...args)=>InteractionRouting.useLife(game.interactionRoutingPort,...args)
};})();}

  private sceneLifecyclePortValue?:SceneLifecycle.SceneLifecyclePort;
  private get sceneLifecyclePort():SceneLifecycle.SceneLifecyclePort{return this.sceneLifecyclePortValue??=(()=>{const game=this;return{
    get camera(){return game.camera;},
    sceneDefinition:(...args)=>game.sceneDefinition(...args),
    get scenes(){return game.scenes;},
    get zoneGraph(){return game.zoneGraph;},
    hasScene:(id):id is SceneId=>game.hasScene(id),
    hostOf:(...args)=>game.hostOf(...args),
    get content(){return game.content;},
    get save(){return game.save;},
    get p(){return game.p;},
    get movers(){return game.movers;},
    get interactionHost(){return game.interactionHost;},
    get platformOwner(){return game.world.stationAt(game.scenes.here)?game.world.TRANSPORT.boarding.scene as SceneId:undefined;},
    persistSave:(...args)=>game.persistSave(...args),
    get zh(){return game.zh;},
    get presentation(){return game.presentation;},
    get companionBody(){return game.companionBody;},
    get spanW(){return game.spanW;},
    markSeen:(...args)=>game.markSeen(...args),
    get canvas(){return game.canvas;},
    get def(){return game.def;},
    syncHud:(...args)=>game.syncHud(...args),
    get hints(){return game.hints;},
    introduceScene:(...args)=>game.introduceScene(...args),
    get levelW(){return game.levelW;}
};})();}

  private canvas: HTMLCanvasElement;
  private x: CanvasRenderingContext2D;
  private term: Terminal;

  /** The world's seams (world/zone-graph.json): zones joined to each other with no cut. */
  private get zoneGraph() { return this.sources?.zoneGraph ?? SHIPPED_ZONE_GRAPH; }

  private p = { x: SCENES.downtown.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false };

  private touch = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch { return false; } })();
  private disposePerformance?:()=>void;
  private reviewNav?:ReturnType<typeof mountReviewNavigator>;
  private reviewAllowed(){return can('review')||EDITOR_PLAY;}
  /** Hack is out of reach: the profile has no hacking, or the story has not given it yet (the opening's phases). */
  private hackLocked(){return !can('hack')||this.openingStory.hackLocked(this.save.flags);}
  private get reviewDoc(){return this.sources?.reviewStations??REVIEW_STATIONS;}
  private refreshReview(){this.reviewNav?.refresh(this.scenes.here,reviewActions(this.def,this.scenes.here,reviewStations(this.content,this.reviewDoc),this.reviewDoc).map(a=>a.id));}
  /** A review button (demo/review-stations.json `actions`): a use, a conversation or a person in the scene. */
  private reviewRun(a:ReviewActionSource){const r=a.run;if(r.use!==undefined)this.reviewUse(r.use);else if(r.talk!==undefined)this.reviewTalk(r.talk);else if(r.actor!==undefined)this.reviewActor(r.actor);}
  private reviewActor(id:string){if(this.reviewAllowed()&&this.def.people?.some(p=>p.id===id)){this.presentation.bubble=null;this.input.keys.clear();this.zh.closeAll();InteractionRouting.useLife(this.interactionRoutingPort,'talk:'+id);this.canvas.focus();}}
  /** Explicit review bookmarks; never available in campaign play. */
  reviewJump(id:string){
    if(!this.reviewAllowed())return;const station=reviewStations(this.content,this.reviewDoc).find(s=>s.id===id);if(!station)return;
    this.input.keys.clear();this.presentation.bubble=null;this.zh.closeAll();this.menu.hide();this.presentation.mapView=null;this.presentation.netView=null;this.term.close();
    this.enter(station.scene as SceneId,true);this.presentation.bubble=null;Object.assign(this.p,{x:station.x,y:0,vy:0,onGround:true});
    this.camera.cam=Camera.camFollow(this.cameraPort,this.p.x);
    this.syncEnginePause();this.refreshReview();this.reviewNav?.station(id);this.canvas.focus();
  }
  private reviewTalk(id:string){if(!this.reviewAllowed()||!this.content[this.scenes.here])return;const session=this.gameplayFor(this.scenes.here);if(!session?.definition.conversations[id])return;this.presentation.bubble=null;this.input.keys.clear();this.zh.closeAll();this.zh.presentConversation(new ConversationSession(session,id));}
  private reviewUse(id:string){if(!this.reviewAllowed()||!this.content[this.scenes.here])return;const use=movingInteractions(this.def,this.zh.model).uses?.find(u=>u.id===id);if(!use||use.available&&!use.available(this.save.flags,this.gameplayFor(this.scenes.here)?.state()))return;this.presentation.bubble=null;this.zh.closeAll();this.input.keys.clear();InteractionRouting.runUse(this.interactionRoutingPort,use,use.use);this.canvas.focus();}
  private reviewCommunication(id:CommunicationReview){
    if(!can('review'))return;
    this.input.keys.clear();this.zh.closeAll();this.presentation.bubble=null;this.hints.sceneChanged();
    runCommunicationReview(id,{
      status:(text,tone)=>this.notify(text,tone),
      remote:()=>{const r=this.reviewDoc.communication.remote;this.reviewJump(r.station);this.zh.react(r.device,['','Remote device reply example.']);this.zh.ping(r.device,'look');},
      dialogue:()=>{this.say('REVIEWER',['A character is speaking. Press E to finish.'],this.p.x,60);this.hints.show('review.waiting','Optional help waited until the character finished.',{repeat:true,first:true});},
      repeat:()=>{const receipt=mintFeedback('demo','review-repeat','info');for(let n=0;n<4;n++)this.hints.notify('One signal, delivered four times.','info',receipt);this.term.print('One signal, delivered four times.','out',false);},
      motion:()=>this.reduced=!this.reduced,
    });this.canvas.focus();
  }
  private reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  /** The scene the player is in. */

  /** Every key and what it does, along the top. */
  private keyBar: KeyBar;
  /** The hint lane under the scene title (ui/hints.ts); control hints are sent from `controlHints`. */
  private hints = new Hints(() => (this.save.seenHints ??= []));
  private shiftGuidance?: ShiftGuidance;
  /** Every scene on the engine, hosted the first time it is needed (`hostOf`), with its part of the save. */

  /** Where a saved game may resume: any scene, except a `stage.sudoOnly` one (the sandbox) without sudo. */
  private resumable(id: string): boolean { return this.hasScene(id) && (!this.sceneDefinition(id).sudoOnly || SUDO); }
  /** Scenes the deck can start over (`stage.resettable`; `stage.sudoOnly` ones only under sudo), in scene order. */
  private resettableScenes(): [string, SceneDef][] { return Object.entries({ ...SCENES, ...this.content } as Record<string, SceneDef | undefined>).filter((e): e is [string, SceneDef] => !!e[1]?.resettable && (!e[1].sudoOnly || SUDO)); }
  private get companionDoc(){return this.sources?.companion??COMPANION_SOURCE;}
  private get critters(){return this.sources?.critters??CRITTER_REACTIONS;}
  private get openingStory(){return this.sources?.openingStory??openingStoryModel;}
  private get contacts():ContactsModel{return this.sources?.contacts??contactsModel;}
  private get endCard():EndCardSource{return this.sources?.endCard??END_CARD;}
  private get sequenceDocuments(){return this.sources?.sequences??runtimeSequenceDocuments;}
  private get networkContext(){return this.sources?.network??defaultNetworkContext;}
  private cutsceneRegistry?:ReturnType<typeof createCutscenes>;
  private get nativeCutscenes(){return this.cutsceneRegistry??=createCutscenes(this.sequenceDocuments.cinematics);}
  private metroInstance?:LineSystem;
  private get metro(){return this.metroInstance??=createLineSystem(this.world,this.metroSource);}
  private get world():CityModel{return this.cityModel??defaultCity;}
  private cityMapInstance?:ReturnType<typeof createCityMap>;
  private get worldMap(){return this.cityMapInstance??=createCityMap(this.world);}
  private hasScene(id:string):id is SceneId{return Object.prototype.hasOwnProperty.call(this.content,id)||isSceneId(id);}
  private sceneDefinition(id:SceneId):SceneDef {let scene=this.scenes.compiledScenes.get(id);if(!scene){const source=this.content[id]??SCENES[id];if(!source)throw new Error('Unknown scene '+id);scene=withCompanionConversations(withBotConversations(source.bindWorld?.({city:this.world,metro:this.metro})??source,this.botReactions),this.sources?.companionGameplay??COMPANION_GAMEPLAY);this.scenes.compiledScenes.set(id,scene);}return scene;}
  /** One common state port for scene commands and source-authored global story workflows. */
  private gameplayStatePort(id?:SceneId):import('../engine/gameplay/types').StatePort {
    return {
        read:()=>{const state:import('../engine/gameplay/types').GameplayState={world:{day:city.day,minute:city.min,weather:weatherNow(sceneClimate(id??this.scenes.here)).kind},player:{handle:this.save.handle,jump:this.save.jump,controlled:this.save.controlled,keyring:this.save.keyring},flags:{...this.save.flags},items:this.save.items,tokens:this.save.tokens,values:this.save.gameplay};return state;},
        write:state=>{this.save.flags=state.flags;this.save.items=state.items;this.save.tokens=state.tokens;if(state.player){this.save.keyring=[...state.player.keyring];this.save.controlled=[...state.player.controlled];this.save.jump=state.player.jump;}mergeValues(this.save.gameplay??={},state.values??{});},
      };
  }
  private openingGameplaySession?:GameplaySession;
  /** The cinematic primitive reports a milestone; shared commands own flags and rewards. */
  private runOpeningWorkflow(role:import('../story/opening-source').OpeningWorkflow):boolean {
    let session=this.openingGameplaySession;
    if(!session){
      session=new GameplaySession(this.openingStory.GAMEPLAY,this.gameplayStatePort(),undefined,[],{keyring:new Set(this.networkContext.keyring.keys()),controlled:new Set(registryLabels(this.networkContext.net))});
      this.openingGameplaySession=session;
      if(session.definition.handoffs?.length)attachGameplayHandoffs(session,{schedule:(ms,run,canceled,detail)=>this.hostOf(this.scenes.here).model.later(ms,()=>{run();this.persistSave();this.syncHud();},detail,canceled),cutscene:id=>{this.presentation.pendingCut=id;},presentation:operation=>{if(operation==='end')this.presentation.showEnd=true;}});
    }
    return session.dispatch(this.openingStory.WORKFLOWS[role],'system').ok;
  }
  private gameplayFor(id:SceneId,providedModel?:SceneModel):GameplaySession|undefined {
    const definition=this.sceneDefinition(id).gameplay;
    if(!definition)return undefined;
    if(definition.native&&!providedModel&&!this.scenes.hosts.has(id)){this.hostOf(id);return this.scenes.gameplaySessions.get(id);}
    let session=this.scenes.gameplaySessions.get(id);
    if(!session){
      const port=this.gameplayStatePort(id);
      const model=()=>{const m=providedModel??this.scenes.hosts.get(id)?.model;if(!m)throw new Error('Native scene not ready');return m;};
      session=new GameplaySession(definition,definition.native?nativeGameplayPort(definition,port,model):port,()=>{
        if(definition.native){const m=model(),{state:scalar,...snapshot}=m.snapshot(),board=this.save.scenes[id]?.board;this.save.scenes[id]={...snapshot,...(board?{board}:{})};m.changed();}
        this.persistSave();this.syncHud();
      },this.sceneDefinition(id).objectives);
      const onEvent=this.sceneDefinition(id).gameplayEvent;if(onEvent)session.observe(event=>onEvent(event,this.timing.t));
      this.scenes.gameplaySessions.set(id,session);
    }
    return session;
  }
  /** Serialization works on settled copies; live common blocks keep their identity and in-flight values. */
  private prepareSave(save:Save):Save{
    const values=cloneValues(save.gameplay),scenes={...save.scenes};
    for(const[id,host]of this.scenes.hosts){const {state,...engine}=host.model.snapshot();Object.assign(values[id]??={},state);scenes[id]={...engine,...(scenes[id]?.board?{board:scenes[id]!.board}:{})};}
    for(const id of new Set([...Object.keys(this.content),...Object.keys(SCENES)]))for(const[key,d]of Object.entries(this.sceneDefinition(id as SceneId).gameplay?.state??{}))if(d.lifetime!=='save')deleteStateValue(values,key);
    for(const[key,d]of Object.entries(this.openingStory.GAMEPLAY.state??{}))if(d.lifetime!=='save')deleteStateValue(values,key);
    return {...save,gameplay:values,scenes,vehicle:saveVehicle(this.scenes.level,this.p,this.scenes.here)};
  }
  private persistSave(){storeSave(this.save,save=>this.prepareSave(save));}
  /** The companion body (engine/gameplay/companion.json): at home where a scene says so, at your heels once its flag is set. */
  private companionBody = new Companion();

  constructor(private host: GameHost, private content: Partial<Record<SceneId, SceneDef>> = {}, private editorClock:'story'|'fixed'|'running'='story',private botReactions:BotReactionDocument=BOT_REACTIONS,private cityModel:CityModel=defaultCity,private metroSource:MetroSource=METRO_SOURCE,metroStart?:MetroStart,private sources:GameRuntimeSources={}) {
    validateWorldVehicles(Object.fromEntries(Object.entries({...SCENES,...content}).filter((entry):entry is [string,SceneDef]=>!!entry[1])),this.zoneGraph);
    // sudo (developer) mode: browser checks read the player and the level, and place the player, through window.__game
    const game = this;
    if (SUDO || PROBE) (globalThis as { __game?: unknown }).__game = { get player() { return game.p; }, get level() { return game.scenes.level; }, get here() { return game.scenes.here; }, prompt: () => game.nearest(), probe: () => game.probeFrame(), ...(SUDO ? { place: (x: number) => { game.p.x = x; } } : {}) };
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: Downtown');
    this.canvas.hidden = true;
    host.windowEl.appendChild(this.canvas);
    this.x = this.canvas.getContext('2d')!;

    this.term = new Terminal(host.windowEl, host.inputHost, this.touch);
    this.term.onLine = (text, kind) => { if (kind === 'err' && !this.term.isOpen) this.hints.notify(text.split('\n').pop() ?? text,'error'); };
    this.term.onSubmit((line) => run(this.ctx(), line));
    this.term.onSuggest((line) => suggest(this.ctx(), line), NO_ARGS);
    this.term.onComplete((prefix) => {
      const [first, ...rest] = prefix.split(/\s+/);
      if (!rest.length) return commands(this.ctx()).filter((c) => c.startsWith(first.toLowerCase()));
      return [];
    });
    this.term.onClose = () => this.canvas.focus();

    this.keyBar = new KeyBar(host.windowEl);
    if (playProfile().guidance.style === 'shift') this.shiftGuidance = new ShiftGuidance(host.windowEl, this.reduced, wx => {
      this.zh.clearPing('goal');
      this.presentation.goalAt = wx;
      if (wx !== null) this.zh.ping('goal', 'look');
    }, flags=>this.def.attention?.(flags,this.gameplayFor(this.scenes.here)?.state())??null, flags=>this.def.objective?.(flags,this.gameplayFor(this.scenes.here)?.state())??'');
    this.menu = new Menu(host.windowEl, {
      save: () => this.save,
      saveSnapshot:()=>this.prepareSave(this.save),
      scene: () => ({ id: this.scenes.here, name: sceneTitle(this.def) }),
      newGame: () => this.newGame(),
      continueGame: () => this.continueGame(undefined, true),
      hasSave: () => this.hasSave(),
      quit: () => host.onExit(),
      // the city map lives in the menu too (TAB and M still open it on a keyboard)
      ...(can('map') ? { map: () => this.showMap() } : {}),
      onClose: () => { this.syncEnginePause(); this.canvas.focus(); },
      ...(sudoOn() ? { levels, enter: (id: string) => this.enterLevel(id) } : {}),
      // the deck's JOBS, CARRY, CONTROLS (and TERM on touch); the Shift prototype keeps SYSTEM only
      ...(can('deck') ? { deck: this.deckData() } : {}),
    }, this.touch);
    // sudo: the time control over the title's sunrise, the glide and cutscenes (transport.ts); in a scene, the city clock's
    if (sudoOn()) {
      this.transport = new Transport(host.windowEl);
      this.clockBar = new ClockBar(host.windowEl, () => sceneClimate(this.scenes.here), () => StoryTransitions.syncClock(this.storyTransitionsPort,true));
    }
    // the city clock: the save's, and what every scene's conditions read of the city (engine/model.ts CITY)
    city.bind(this.save.clock);
    CITY.read = (key, scene) => (key === 'weather' ? this.weatherOf(scene).kind : key === 'hour' ? city.hour : city.day);
    CITY.when = (w) => city.within(w);
    // the footer's timestamp shows the city's time while the game runs (render.tsx hides the page's UTC clock)
    const stampHost = host.footer.querySelector('.footer-timestamp');
    this.stampEl = document.createElement('span');
    this.stampEl.id = 'game-clock';
    stampHost?.appendChild(this.stampEl);
    // a click or tap during the title's sunrise skips to the settled shot (on click, not pointerdown:
    // the menu comes up under the finger, and the release must not land on it)
    this.canvas.addEventListener('click', () => { if (this.presentation.opening && !this.presentation.opening.gliding && !this.presentation.opening.risen) this.skipRise(); });
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasPointer(e, true));
    this.canvas.addEventListener('pointermove', (e) => this.onCanvasPointer(e, false));
    // hack vision: drag pans, pinch and the wheel zoom (visionPointer)
    const lift = (e: PointerEvent) => Camera.visionLift(this.cameraPort,e);
    this.canvas.addEventListener('pointerup', lift);
    this.canvas.addEventListener('pointercancel', lift);
    this.canvas.addEventListener('wheel', (e) => Camera.visionWheel(this.cameraPort,e), { passive: false });

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.onResize.bind(this);
    // Downtown is already the initial scene, so starting there does not call enter().
    this.p.x = this.def.spawn;
    // a private Play's train: boarded and run to the state its fixture asks for, on the car's own movers
    if (metroStart) StoryTransitions.startMetro(this.storyTransitionsPort,metroStart);
  }

  /**
   * A scene on the engine, with its part of the save (`save.scenes.<id>`) and the player's modules
   * and keyring: hosted the first time it is needed, then kept. Its HACK/BOARD strip joins the key bar.
   */
  private hostOf(id: SceneId): SceneHost {
    const had = this.scenes.hosts.get(id);
    if (had) return had;
    const def: SceneDef = this.sceneDefinition(id);
    const print = (text:string,kind?:LineKind,from?:string,receipt?:FeedbackReceipt)=>{this.term.print(text,kind,!from&&!receipt,receipt);};
    const rules = typeof def.rules === 'function' ? def.rules({
      save: () => this.save,
      persist: () => this.persist(),
      nodes: () => nodeCount(this.save),
      granted: (receipt) => sound.feedback(receipt??mintFeedback(this.scenes.here,'controller','success')),
      end: () => { this.presentation.showEnd = true; },
      // a story beat's cutscene (the stacks' ACT II card) waits for the screen to be free (`loop`)
      cutscene: (cut) => { this.presentation.pendingCut = cut; },
    }) : def.rules ?? NO_RULES;
    const zh = new SceneHost(this.host.windowEl, print, {
      notice:(text,tone,receipt)=>{this.hints.notify(text,tone,receipt);},
      feedbackCue:receipt=>sound.feedback(receipt),
      cue:cue=>{if(cue==='open')sound.open();else sound.close();},
      hints:this.hints,
      hintBusy:()=>document.hidden||this.menu.open||!!this.presentation.opening||!!this.presentation.cut||!!this.presentation.mapView||!!this.presentation.netView||!!this.presentation.flight||this.presentation.showEnd||!!this.presentation.sleep||this.term.isOpen||!!this.presentation.bubble||!!this.scenes.hosts.get(id)?.acknowledgmentPending,
      feedbackTime:()=>this.hints.notices.time,
      cutscene:cut=>{this.presentation.pendingCut=cut;},
      presentation:operation=>{if(operation==='end')this.presentation.showEnd=true;},
      state:()=>{const values=this.save.gameplay??={};if(def.gameplay)mergeValues(values,resolveValues(def.gameplay,{flags:this.save.flags,items:this.save.items,tokens:this.save.tokens,values}));return values[id]??={};},
      gameplay:model=>this.gameplayFor(id,model),
      conversation:(conversationId)=>{const session=this.gameplayFor(id);return session?.definition.conversations[conversationId]?new ConversationSession(session,conversationId):undefined;},
      conversationCompleted:cue=>{if(this.scenes.here===id)this.completeConversation(cue);},
      modules: () => this.save.modules,
      keyring: () => this.save.keyring,
      give: (k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); this.persistSave(); },
      // scene steps that hand out modules and tokens (GAME-DATA.md, "Giving things")
      grant: (mod) => { if (!this.save.modules.includes(mod)) this.save.modules.push(mod); this.persistSave(); this.syncHud(); },
      tokens: (n) => { this.save.tokens += n; this.persistSave(); this.syncHud(); return this.save.tokens; },
      // what you carry (the HUD's HELD) and story flags, for scene effects (the laundromat's jacket)
      carry: (item, n) => {
        const now = Math.max(0, (this.save.items[item] ?? 0) + n);
        if (now) this.save.items[item] = now; else delete this.save.items[item];
        if (n) { this.persistSave(); this.syncHud(); }
        return now;
      },
      flag: (f) => { this.save.flags[f] = true; this.persistSave(); },
      drop: () => this.persistSave(),
      sudo: SUDO,
      // the net (NET.md): programs you own (scan.so), and the nodes that answer to you
      programs: () => this.save.programs,
      program: (p,receipt) => this.grantProgram(p,receipt),
      controlled: () => this.save.controlled,
      load: () => this.save.scenes[id],
      store: (z) => { this.save.scenes[id] = z; this.persistSave(); },
    }, def, rules,this.networkContext);
    // the companion is the game's, not the scene's: lines about it stand over it, and popups keep clear of it
    zh.where = (from) => {
      if(from===this.companionDoc.speaker&&this.companionPresent)return {x:this.companionBody.x,h:this.companionBody.h};
      if(from==='goal'&&this.presentation.goalAt!==null)return {x:this.presentation.goalAt,h:20};
      const source=from.startsWith('use:')?movingInteractions(def,zh.model).uses?.find(u=>u.id===from.slice(4)):from.startsWith('exit:')?movingInteractions(def,zh.model).exits.find(e=>e.id===from.slice(5)):undefined;
      return source?{x:source.x,h:'h'in source?source.h??0:0}:null;
    };
    // the opening (opening.ts): hacking is not yours until uplink.so, and some everyday actions say something else
    zh.hackLock = () => this.hackLocked();
    zh.story = (dev) => InteractionRouting.storyChips(this.interactionRoutingPort,id, dev);
    zh.extras = () => (this.companionDoc.avoidPopups && this.companionPresent ? [{ x: this.companionBody.x, h: this.companionBody.h }] : []);
    // captions never cover the player's speech bubble, and keep their lane over people's heads
    zh.shield = () => { const b = this.presentation.bubbleBox, s = this.cssScale; return b ? [{ l: b.x * s, t: b.y * s, r: (b.x + b.w) * s, b: (b.y + b.h) * s }] : []; };
    zh.crowd = () => this.heads();
    // something reacted where you cannot see it: the camera may lean that way for a moment
    zh.onReact = (from, text, tone) => { if (this.scenes.here === id) this.nudgeTo(from, text, tone); };
    zh.onClose = () => this.canvas.focus();
    // hack vision: the reset button and what the LOGIC drawer says you own (the HUD keeps only the goal there)
    zh.onResetView = () => Camera.resetVision(this.cameraPort);
    zh.onVisionUi = () => this.syncModeUi();
    zh.drawerInfo = () => this.ownLine();
    // NET in hack vision's bar: once scan.so is yours, pinging until the net map has been opened once
    zh.netOk = () => this.netOk;
    zh.netNew = () => false;
    zh.onNet = () => this.showNet();
    if(EDITOR_PLAY)zh.model.enableInspection();
    this.scenes.hosts.set(id, zh);
    zh.setPaused(this.enginesPaused);
    // each scene host has its own HACK/BOARD strip, in the key bar; only the current scene's shows
    this.host.windowEl.querySelectorAll<HTMLElement>('#scene-btns').forEach((el) => this.keyBar.adopt(el));
    return zh;
  }

  /** A scene's lines in the deck that buzz (Downtown's ACCESS DENIED and friends), as the old terminal did. */
  private buzzPrint(text: string, kind?: LineKind) {
    this.term.print(text, kind);
    if (kind === 'err') sound.denied();
  }

  /** The scene the player is in: its definition, and its host on the engine. */
  private get def(): SceneDef { return this.sceneDefinition(this.scenes.here); }
  private get zh(): SceneHost { return this.hostOf(this.scenes.here); }
  /** A joined owner's ordinary popup/conversation keeps its own input until it closes. */
  private get interactionHost(): SceneHost {
    const here=this.zh;
    if(here.overlayOpen||here.popupOpen||here.acknowledgmentPending||here.visionOn)return here;
    for (const z of this.scenes.joinedZones) {
      const host = this.scenes.hosts.get(z.id);
      if (host && (host.overlayOpen || host.popupOpen || host.acknowledgmentPending || host.visionOn)) return host;
    }
    const ride=this.scenes.level?.state.vehicle;
    const vehicle=ride&&(this.scenes.level!.source.vehicleBase??this.scenes.level!.source).vehicles?.find(v=>v.id===ride.id);
    const owner=vehicle&&!vehicle.lift?vehicle.zone:undefined;
    if(owner&&owner!==this.scenes.here){const host=this.scenes.hosts.get(owner as SceneId);if(host)return host;}
    return here;
  }
  /** Scene hosts keep local coordinates even when their vehicle is in another zone. */
  private hostPlacement(host: SceneHost) {
    return host===this.zh?{id:this.scenes.here,dx:0,dh:0}:this.scenes.joinedZones.find(z=>this.scenes.hosts.get(z.id)===host);
  }
  /** The one player, expressed in each resident model's local coordinates for its native zones. */
  private syncPlayerLocations() {
    const floor=this.scenes.level&&!levelRiding(this.scenes.level)?levelFloor(this.scenes.level):undefined;
    for(const host of this.scenes.hosts.values()){
      const at=this.hostPlacement(host);
      if(!at){host.model.player=null;continue;}
      const building=floor?(!floor.building?'':floor.zone===at.id||!floor.zone?floor.building.replace(at.id+'/',''):undefined):undefined;
      host.model.player={x:this.p.x-at.dx,h:this.p.y-at.dh,...(building===undefined?{}:{building})};
    }
  }

  /** Write current progress, refresh the HUD and evaluate source-authored persistence triggers. */
  private persist() {
    this.persistSave();
    this.syncHud();
    for(const id of new Set([...Object.keys(this.content),...Object.keys(SCENES)])){
      const definition=this.sceneDefinition(id as SceneId).gameplay;
      if(!Object.values(definition?.native?.triggers??{}).some(row=>row.phase==='onPersist'))continue;
      const host=this.hostOf(id as SceneId),session=this.gameplayFor(id as SceneId);
      if(session)nativeLiveConditionsTick(host.model,session,run=>run(),'onPersist');
    }
  }

  /** Pause puzzle time wherever a full-screen interruption holds the world. Wall-clock locks still expire. */
  private get enginesPaused() {
    return !this.timing.running || !!this.presentation.opening || !!this.menu?.open || !!this.presentation.cut || !!this.presentation.mapView || !!this.presentation.netView;
  }

  private syncEnginePause() { this.scenes.hosts.forEach((h) => h.setPaused(this.enginesPaused)); }

  // ---------- lifecycle ----------

  /**
   * Start the game. `title`: launching it (the Konami code, `?play` or `?sudo` without a scene):
   * the title screen first (title/). A scene, a cutscene or a LOAD GAME reload goes straight there.
   */
  start(scene?: SceneId | CutsceneId, title = false, spawn?:number) {
    this.canvas.hidden = false;
    this.canvas.tabIndex = 0;
    this.onResize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    this.syncHud();
    this.disposePerformance??=mountPerformancePanel(this.host.windowEl,()=>({scene:this.scenes.here,clock:{...this.save.clock},weather:this.weatherHere().kind,camera:this.camera.cam,scale:this.camera.k,hostedScenes:[...this.scenes.hosts.keys()],actors:this.def.people?.length??0,devices:this.zh.model.data.devices.length}));
    this.timing.running = true;
    this.timing.last = 0;
    this.timing.raf = requestAnimationFrame((n) => this.loop(n));
    this.canvas.focus();
    if (scene && isCutsceneId(scene)) { this.playCutscene(scene); return; }
    if (title) { this.showTitle(); return; }
    const first = !this.timing.started;
    this.timing.started = true;
    this.continueGame(scene && this.hasScene(scene) ? scene : undefined, first);
    // A private Play's source-local spawn is an arrival input, not a mutation of a bound SceneDef.
    if(spawn!==undefined){
      if(!Number.isFinite(spawn)||spawn<12||spawn>this.def.width-12)throw Error('Starting X is outside the scene');
      const vehicle=saveVehicle(this.scenes.level,this.p,this.scenes.here);
      if(vehicle&&this.scenes.level){if(!restoreVehicle(this.scenes.level,this.p,this.movers,{...vehicle,x:spawn}))throw Error('Starting X has no vehicle floor');}
      else{this.p.x=spawn;if(this.scenes.level)this.scenes.level.state=levelArrive(this.scenes.level.source,this.p,this.def.spawnH??0,SceneLifecycle.seenRooms(this.sceneLifecyclePort,this.scenes.level.source,this.scenes.here),savedForLevel(this.scenes.level.source,this.scenes.here,this.save.barriers));}
      this.camera.cam=Camera.camFollow(this.cameraPort,this.p.x);this.camera.camH=this.p.y;this.camera.gy=this.camera.gyBase+Math.round(this.camera.camH);
    }
    if(this.reviewAllowed()&&!this.reviewNav){const stations=reviewStations(this.content,this.reviewDoc);if(stations.length)this.reviewNav=mountReviewNavigator(this.host.windowEl,{stations,actions:this.reviewDoc.actions,hint:this.reviewDoc.hint,open:!EDITOR_PLAY,communication:can('review')?id=>this.reviewCommunication(id):undefined,jump:id=>this.reviewJump(id),run:a=>this.reviewRun(a)});this.refreshReview();}
  }

  /**
   * Into the save (the title's CONTINUE, or a start in a scene). A save in the middle of the
   * saved scene takes precedence; older saves fall back to opening.ts or Downtown/the first scene.
   */
  private continueGame(scene: SceneId | undefined, first: boolean) {
    const vehicle=first&&(!scene||scene===this.save.scene)?this.save.vehicle:undefined;delete this.save.vehicle;
    this.endTitle();
    const { routes, start } = playProfile();
    if(routes==='content')scene=(scene&&this.content[scene]?scene:this.save.scene&&this.content[this.save.scene as SceneId]?this.save.scene as SceneId:start.scene as SceneId);
    this.timing.started = true;
    const resume = !scene && first ? this.openingStory.openingResumeDestination(this.save.flags) : null;let resumeEntrance:string|undefined;
    if (!scene && first && this.save.scene && this.resumable(this.save.scene)) scene = this.save.scene as SceneId;
    else if (resume && this.hasScene(resume.scene)) {scene=resume.scene;resumeEntrance=resume.entrance;}
    else if (!scene && first && !this.save.flags.arrived && !this.save.flags[this.world.seenFlag(this.openingStory.START.settled as SceneId)]) {
      // a save that never got going: the opening, on the train home (no glide: that is NEW GAME's)
      if (!this.save.flags[this.world.seenFlag(this.world.START_SCENE)]) { this.startOpening(); return; }
      scene = this.world.START_SCENE;
    }
    if (first && scene && scene === start.scene && !resumeEntrance) resumeEntrance = start.entrance;
    if (scene && (this.scenes.here !== scene||resumeEntrance)) this.enter(scene, true,resumeEntrance);
    if(vehicle&&this.scenes.level&&restoreVehicle(this.scenes.level,this.p,this.movers,vehicle)){this.camera.cam=Camera.camFollow(this.cameraPort,this.p.x);this.camera.camH=this.p.y;this.camera.gy=this.camera.gyBase+Math.round(this.camera.camH);}
    SceneLifecycle.showHosts(this.sceneLifecyclePort);
    this.markSeen(this.scenes.here);
    this.greet();
  }

  /** Is there a run to continue: a stored save that has been played? */
  private hasSave() {
    try {
      const raw = gameStorage.getItem(saveKey());
      if (!raw) return false;
      const s = JSON.parse(raw) as Partial<Save>;
      return (s.playMs ?? 0) > 0 || Object.keys(s.flags ?? {}).length > 0;
    } catch { return false; }
  }

  // ---------- the opening: the title screen and the glide (title/) ----------

  /** The title shot and the glide, while they run: the world is not drawn or stepped. */

  /** Sudo's time control (transport.ts); null without `?sudo`. */
  private transport: Transport | null = null;

  /**
   * The title screen: the sun comes up out of the sea, then the main menu pops in over it
   * (`stepOpening`; reduced motion: settled, menu up at once). `gliding`: straight into the glide
   * from the settled shot (NEW GAME from the pause menu).
   */
  private showTitle(gliding = false) {
    this.endCutscene(false);
    this.presentation.bubble = null;
    this.input.keys.clear();
    this.scenes.hosts.forEach((h) => {h.cancelAcknowledgment?.('dismissed');h.closeAll();});
    this.term.close();
    this.presentation.opening = new Opening(this.reduced,this.sequenceDocuments.opening,{scenes:{...SCENES,...this.content},graph:this.zoneGraph,backdrops:this.sources.backdrops});
    this.syncEnginePause();
    document.documentElement.classList.add('cutscene');
    this.host.setScene('ACCESS DENIED');
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: a sunrise over the sea');
    if (gliding) { this.menu.hide(); this.newGame(); } else if (this.presentation.opening.risen) this.menu.showTitle(); else this.menu.hide();
  }

  /** Any key or click while the sun comes up: the settled shot, and the menu with it. */
  private skipRise() {
    const o = this.presentation.opening;
    if (!o || o.gliding || o.risen) return;
    o.skipRise();
    this.menu.showTitle(true);
  }

  private endTitle() {
    if (!this.presentation.opening) return;
    this.presentation.opening = null;
    document.documentElement.classList.remove('cutscene');
    this.syncHud();
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + this.placeName);
  }

  private stepOpening(dt: number) {
    const o = this.presentation.opening!;
    o.step((dt / 60) * (this.transport?.rate ?? 1));
    // the title's menu is up exactly while the sun has settled (sudo can seek back into the sunrise)
    if (!o.gliding) {
      if (o.risen && !this.menu.open) this.menu.showTitle(true);
      else if (!o.risen && this.menu.open) this.menu.hide();
    }
    this.transport?.sync();
    const x = this.x;
    x.setTransform(this.camera.k, 0, 0, this.camera.k, 0, 0);
    x.imageSmoothingEnabled = false;
    // opt-in recording: the title's or the glide's beat owns the frame's render span
    const span = performanceRecording() ? perfBegin('game.render', o.gliding ? 'glide:' + o.beat : 'title') : -1;
    try { o.draw(x, this.camera.viewW, this.camera.viewH,this.camera.gyBase,light()); } finally { perfEnd(span); }
    if (o.done) this.openingDone();
  }

  /**
   * The glide finishes or is skipped: create the fresh run and commit its authored Harbor handoff.
   */
  private openingDone() {
    const destination = this.presentation.opening?.handoff;
    this.endTitle();
    this.term.close();
    this.term.clear();
    this.presentation.bubble = null;
    this.presentation.showEnd = false;
    this.hints.sceneChanged();sound.cancelFeedback();
    this.openingGameplaySession?.dispose();this.openingGameplaySession=undefined;
    this.save = sudoOn() ? unlockAll(newSave()) : newSave();
    city.bind(this.save.clock);
    // Every scene starts a first visit in the new save.
    this.save.gameplay={};
    this.scenes.hosts.forEach((h,id)=>{this.save.gameplay![id]=h.model.state;});
    this.scenes.hosts.forEach((h) => h.reset());
    this.persistSave();
    this.syncHud();
    this.timing.started = true;
    // the story half of the opening takes over: `opening:home`, the train home (opening.ts)
    this.startOpening(destination);
  }

  /** First time in Downtown: the player says where they are (and, once, how its machines open now). */
  private greet() {
    const arrival = arrivalFor(this.def.phases?.[this.story]?.arrival, { flags: this.save.flags, touch: this.touch, rain: this.weatherHere().rain, companion: this.save.flags[this.companionDoc.unlockFlag] ? this.companionDoc.greeting : null });
    if (!arrival) return;
    for (const flag of arrival.set) this.save.flags[flag] = true;
    this.say(arrival.speaker, arrival.pages, this.p.x, arrival.height);
  }

  checkpoint(){this.scenes.hosts.forEach(host=>host.persist());this.persistSave();}

  /** Detached diagnostics for editor inspection; no mutable runtime references. */
  inspect() {
    const shared=this.gameplayFor(this.scenes.here);
    return structuredClone({scene:this.scenes.here, player:{x:this.p.x,y:this.p.y}, save:this.save,
      level:EDITOR_PLAY&&this.scenes.level?{floor:this.scenes.level.state.floor,vehicle:this.scenes.level.state.vehicle,frames:this.scenes.level.source.vehicleFrames?.map(f=>({id:f.vehicle.id,x:f.part.dx,h:f.part.dh,zone:f.pose.zone,berth:f.berth?.id,doors:f.doors,boarding:f.boarding})),prompt:this.nearest()}:undefined,
      actors:EDITOR_PLAY?(this.def.people??[]).map((p,index)=>({index,id:p.id,seed:p.seed,look:p.look,x:p.x,h:p.h,act:p.act,range:p.range,speed:p.speed,facing:p.facing,when:p.when,visible:isHere(p),follow:p.follow?(this.def.people??[]).indexOf(p.follow):undefined,gap:p.gap})):undefined,
      engine:EDITOR_PLAY?this.zh.model.inspect():undefined,
      gameplay:shared?{state:shared.state(),purchases:Object.fromEntries(Object.keys(shared.definition.purchases??{}).map(id=>[id,shared.quote(id)]))}:null,conversation:this.zh.conversationFrame,
      environment:{weather:this.weatherHere().kind,clock:this.editorClock},
      capabilities:capabilityView(this.save,!this.hackLocked(),this.networkContext.net),access:{exits:this.def.exits.map(e=>({id:e.id,visibility:exitVisibility(e,this.save.flags),permission:exitPermission(e,this.save.keyring)})),interactions:this.def.uses?.map(u=>({id:u.id,result:u.eligibility?.(this.save.flags,shared)??{ok:true}}))},
      objective:this.def.objective?.(this.save.flags,this.gameplayFor(this.scenes.here)?.state()), paused:this.enginesPaused,
      dialogue:this.presentation.bubble?{speaker:this.presentation.bubble.name,pages:this.presentation.bubble.pages,page:this.presentation.bubble.page}:null, popup:this.zh.popupOpen,
      events:[...this.scenes.gameplaySessions].flatMap(([scene,session])=>session.events().map(event=>({scene,...event}))) });
  }

  stop() {
    this.cancelStoryTransitions();this.presentation.flight=null;this.presentation.hop=null;
    this.hints.sceneChanged();sound.cancelFeedback();
    this.disposePerformance?.();this.disposePerformance=undefined;
    this.reviewNav?.dispose();this.reviewNav=undefined;
    this.timing.running = false;
    // Closing returns to the homepage; cached hosts and source sessions resume together.
    // Their scene clocks pause below. Private Play destroys the entire owning frame.
    this.openingGameplaySession?.dispose();this.openingGameplaySession=undefined;
    this.shiftGuidance?.hide();
    this.syncEnginePause();
    this.endTitle();
    document.documentElement.classList.remove('game-map', 'hack-ok', 'hack-on', 'logic-open', 'unfold-on', 'level-scene', 'level-up', 'level-down');
    this.presentation.modeKey = ''; this.presentation.arrowsKey = '';
    this.menu.hide();
    this.endCutscene(false);
    this.transport?.attach(null);
    this.clockBar?.show(false);
    cancelAnimationFrame(this.timing.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    this.input.keys.clear();
    this.presentation.mapView = null;
    this.presentation.netView = null;
    this.presentation.netBack = false;
    this.scenes.hosts.forEach((h) => { h.cancelAcknowledgment?.('disposed');h.closeAll(); h.persist(); });
    this.term.close();
    this.canvas.hidden = true;
    this.persistSave();
  }

  private onResize() {
    const win = this.host.windowEl.getBoundingClientRect();
    // a hidden header or footer (phones) takes no room
    const shown = (el: HTMLElement) => el.getClientRects().length > 0;
    const top = shown(this.host.header) ? this.host.header.getBoundingClientRect().bottom - win.top : 0;
    const bottom = shown(this.host.footer) ? win.bottom - this.host.footer.getBoundingClientRect().top : 0;
    this.host.windowEl.style.setProperty('--game-top', top + 'px');
    this.host.windowEl.style.setProperty('--game-bottom', bottom + 'px');
    const cssW = win.width, cssH = Math.max(120, win.height - top - bottom);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    // Small screens (phones in landscape) show a shorter slice of the street at a larger scale (tuned: leave as is).
    // Larger screens take the integer scale nearest to a view about 300 units tall (so 1280×720 draws at 2,
    // not 1, and people read), but never under 240 units, so wide places still show enough.
    const px = cssH * dpr, phone = cssH < 420;
    let k = phone ? Math.max(1, Math.floor(px / 230)) : Math.max(1, Math.round(px / 300));
    if (!phone && k > 1 && px / k < 240) k--;
    // Squarish and tall windows: aim for MIN_VIEW_W of street across (Tommi, 2026-10-18). The scale
    // steps down instead, and the spare height shows above the street, but not past MAX_VIEW_H
    // (at a coarse scale one step can halve everything: 1000 × 1000 at 1x keeps 2, not 1).
    while (k > 1 && this.canvas.width / k < MIN_VIEW_W && px / (k - 1) <= MAX_VIEW_H) k--;
    // A place narrower than the view (a flat, the yard) is shown closer, so it fills the width,
    // as long as enough height stays in view for its rooms and signs.
    const fit = Math.floor(this.canvas.width / (this.spanW + 24));
    if (fit > k) k = Math.max(k, Math.min(fit, Math.floor(this.canvas.height / 170)));
    this.camera.k = k;
    this.camera.fitW = this.spanW;
    this.camera.viewW = this.canvas.width / this.camera.k;
    this.camera.viewH = this.canvas.height / this.camera.k;
    // On phones the ground sits above the touch buttons, so the floor and what stands on it stay in view.
    const pad = document.getElementById('touch');
    const padTop = this.touch && pad ? Math.max(0, this.canvas.getBoundingClientRect().bottom - pad.getBoundingClientRect().top) : 0;
    this.camera.gyBase = Math.round(this.camera.viewH - Math.max(54, (padTop * dpr) / this.camera.k + 8));
    this.camera.gy = this.camera.gyBase + Math.round(this.camera.camH);
  }

  /** The level width the view was fitted to; a new place refits (see onResize). */

  private loop(now:number){const span=perfBegin('game.frame',this.scenes.here);try{this.stepLoop(now);}finally{perfEnd(span);}}

  /** Readability stops while another surface covers the world; simulation clocks keep their own policy. */
  private get communicationCovered() {
    return document.hidden||this.menu.open||!!this.presentation.opening||!!this.presentation.cut||!!this.presentation.mapView||!!this.presentation.netView||!!this.presentation.flight||this.presentation.showEnd||!!this.presentation.sleep||this.term.isOpen||!!this.interactionHost.overlayOpen;
  }

  private stepLoop(now: number) {
    if (!this.timing.running) return;
    this.syncEnginePause();
    // the one tick: every scene's model moves on by this frame's time (a paused engine holds still)
    const sceneMs = this.timing.last ? Math.min(250, Math.max(0, now - this.timing.last)) : 0;
    this.scenes.hosts.forEach((h) => h.tick(sceneMs));
    if(this.timing.last)perfSample('raf.gap',now-this.timing.last);
    const readableBefore=this.hints.notices.time;
    this.hints.notices.frame(now,this.communicationCovered);
    const readableDelta=(this.hints.notices.time-readableBefore)/1000;
    const dt = this.timing.last ? Math.min(3, (now - this.timing.last) / 16.67) : 1;
    this.timing.last = now;
    // sudo's time control follows whatever timed picture is up (none: it hides); in a scene, the city clock's bar
    this.transport?.attach(this.presentation.opening?.timeline ?? this.presentation.cut?.timeline ?? null);
    this.clockBar?.show(!this.presentation.opening && !this.presentation.cut && !this.menu.open && !this.term.focused);
    // The title and the glide: their own picture, with the title's menu over it.
    if (this.presentation.opening) { this.stepOpening(dt); this.timing.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    // The deck: the world holds still under it (the last frame stays on the canvas).
    if (this.menu.open) { this.timing.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    this.save.playMs = (this.save.playMs ?? 0) + dt * 16.67;
    if (this.spanW !== this.camera.fitW) this.onResize(); // a new place: fit the view to it
    // the city map (and a taxi flight) owns the screen: the key bar and touch buttons step aside (render.tsx)
    document.documentElement.classList.toggle('game-map', !!this.presentation.mapView || !!this.presentation.flight || !!this.presentation.netView);
    Camera.visionCamera(this.cameraPort);
    this.syncModeUi();
    this.syncLevelArrows();
    if (this.presentation.cut) { this.stepCutscene(dt); this.timing.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    // a story beat asked for a cutscene: it plays once nothing is open (the talk that asked for it has closed)
    if (this.presentation.pendingCut && !this.interactionHost.overlayOpen && !this.interactionHost.popupOpen && !this.presentation.bubble && !this.presentation.mapView && !this.term.focused) {
      const id = this.presentation.pendingCut;
      this.presentation.pendingCut = null;
      this.playCutscene(id, () => this.inbox(),'after-handoff');
    }
    if (!this.reduced || this.timing.t < 1) this.timing.t += dt;
    this.timing.clock += dt;
    // the city clock: the opening's pins, then a tick if it runs here and now (clock.ts)
    StoryTransitions.pinStory(this.storyTransitionsPort);
    if (StoryTransitions.clockRuns(this.storyTransitionsPort)) city.tick(dt / 60);
    StoryTransitions.syncClock(this.storyTransitionsPort);
    const updateSpan=perfBegin('game.update');
    try{this.update(dt);}finally{perfEnd(updateSpan);}
    this.shiftGuidance?.update(this.save.flags, readableDelta,
      this.communicationCovered || !!this.presentation.bubble || !!this.interactionHost.popupOpen,
      this.p.moving, this.p.x);
    this.checkGain();
    const renderSpan=perfBegin('game.render');
    try{this.draw();}finally{perfEnd(renderSpan);}
    this.syncCarList();
    this.followHost();
    this.timing.raf = requestAnimationFrame((n) => this.loop(n));
  }

  // ---------- input ----------

  private onKeyDown(e: KeyboardEvent) { return InputRouting.onKeyDown(this.inputRoutingPort,e); }

  private onKeyUp(e: KeyboardEvent) { return InputRouting.onKeyUp(this.inputRoutingPort,e); }

  private openDeck() {
    if (!can('deck')) return;
    if (!this.term.out.childElementCount) this.term.print('[DECK] ' + who(this.save) + ' · type help', 'head');
    const at = this.hackLocked() ? null : this.termMachine();
    if (at) this.term.print('[' + (this.interactionHost.model.devices.get(at)?.name ?? at) + '] the deck talks to it · ls, cat, login, use', 'dim');
    this.term.focus();
  }

  /** The machine the deck talks to: the scene's device whose schematic is open, else the one you stand at. */
  private termMachine(): string | null {
    const zh = this.interactionHost;
    if (zh.viewing) return zh.viewing;
    const t = this.nearest();
    return t?.kind === 'device' && (t.owner??this.scenes.here) === this.hostPlacement(zh)?.id && zh.model.devices.has(t.id) ? t.id : null;
  }

  /** Overlays, the deck, travel and talk hold the level's ↑/↓ as they hold walking. */
  private levelLocked() { return this.presentation.showEnd || this.term.focused || !!this.interactionHost.overlayOpen || !!this.presentation.mapView || !!this.presentation.netView || !!this.presentation.flight || !!this.presentation.hop || !!this.presentation.beat || !!this.presentation.sleep; }

  private jump() {
    if (!can('jump')) return;
    if (!this.save.jump) { this.flash('[ERR] legs.so not found'); sound.denied(); return; }
    if (!this.p.onGround || this.scenes.level?.state.vehicle?.seat) return;
    this.p.vy = 4.6;
    this.p.onGround = false;
    sound.jump();
  }

  // ---------- the deck (menu.ts; SYSTEM is the former pause menu) ----------

  private menu: Menu;

  /** Esc with nothing else open: pause and show the menu. Progress is written first. */
  private openMenu() {
    this.input.keys.clear();
    this.p.moving = false;
    this.hints.done('ctl.deck');
    this.zh.persist();
    this.persistSave();
    this.menu.show();
    this.shiftGuidance?.hide();
    this.syncEnginePause();
  }

  /**
   * NEW GAME (the title's, or confirmed in the pause menu): the opening's glide. Nothing is reset
   * until it hands over (`openingDone`): leave mid-glide and the old run is still there. Slots are untouched.
   */
  private newGame() {
    if (EDITOR_PLAY || playProfile().routes !== 'world') {
      gameStorage.removeItem(saveKey());
      reloadRuntime();
      return;
    }
    if (!this.presentation.opening) { this.showTitle(true); return; }
    this.presentation.opening.go();
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: the coast at sunrise, from the sea west to Downtown and LINE 0');
  }

  private notify(text:string,tone:import('../ui/communication').MessageTone='info'){this.hints.notify(text,tone);this.term.print(text,tone==='error'?'err':tone==='success'?'ok':'out',false);}
  private flash(text: string) { this.notify(text,text.startsWith('[ERR]')?'error':text.startsWith('+')?'success':'info'); }

  private get levelW() { return this.def.width; }
  /**
   * E at a level barrier (engine/level.ts `LevelBarrier`): a phase rule for it (story-rules.ts `barrierPhaseRule`) runs as an exit's; else
   * its rule over the save (world/access.ts `barrierAccess`) refuses with its words, or it opens and stays open on this save
   * (`Save.barriers`, by scene). `granted`: a phase rule's beat is over. False: the prompt is not a barrier's.
   */
  /** Each lift reads its own zone's movers. */
  private readonly movers: Movers = (zone) => zone && zone !== this.scenes.here && this.hasScene(zone) ? this.hostOf(zone).model : this.zh.model;
  private get spanW() { const [lo, hi] = SceneLifecycle.worldSpan(this.sceneLifecyclePort); return hi - lo; }
  /** A joined zone in this frame: its own view (the camera moved by where it lies), scene, host and light. */
  private zoneFrame(z: ScenePlacement,camera:CameraProjection=this.camera): ZoneFrame {
    const host = this.hostOf(z.id), scene = this.sceneDefinition(z.id), cam = camera.cam - z.dx, gy = camera.gy - z.dh;
    const view: SceneView = { ...frameView(0), t: this.timing.t, viewW: camera.viewW, viewH: camera.viewH, cam, gy, sx: (wx, p = 1) => projectX(wx,cam,p), y: (h) => gy - h, flags: this.save.flags, values: this.save.gameplay, level: this.scenes.level ? SceneLifecycle.levelViewOf(this.sceneLifecyclePort,z.id) : undefined };
    const station=this.world.stationAt(z.id);if(station)view.transit={station,...this.metro.stationFrame(station,this.ride)};
    const outdoor = scene.outdoor ?? !!(scene.ambient?.weather || scene.ambient?.sky);
    return { view, scene, sceneId: z.id, host, ...(z.dh < 0 ? { below: true } : {}), preparePresentation: prepared => host.preparePresentation(prepared, 'all'),weather:()=>this.weatherOf(z.id),
      lighting: W => { const L = lightAt(city.day, city.min, scene.facing ?? 180, W ?? this.weatherOf(z.id), outdoor); setLight(L); return L; } };
  }
  /** The scene's name, for the HUD and the canvas label. */
  private get placeName() { return this.def.name; }
  private get platforms() { return this.def.platforms ?? []; }

  /**
   * Walk into a scene: at its exit `at` (the door you came through, seen from inside), else at its spawn.
   * The companion comes along where it follows you, or is at home; the first visit has the player say a few words.
   */
  private enter(id: SceneId, quiet = false, at?: string) {
    const { routes, start, label } = playProfile();
    if(routes==='content'&&!this.content[id]){this.flash(`This route is outside the ${label}.`);return;}
    if (routes === 'start') id = start.scene as SceneId;
    const s: SceneDef = this.sceneDefinition(id);
    this.zh.persist();
    this.scenes.hosts.forEach((h) => h.closeAll());
    this.presentation.bubble = null;
    this.scenes.here = id;
    this.camera.nudge = null; this.camera.easeBack = false; this.nudged.clear();
    this.hostOf(id);
    SceneLifecycle.showHosts(this.sceneLifecyclePort);
    this.markSeen(id);
    const x = (at && s.exits.find((e) => e.id === at)?.x) || s.spawn;
    Object.assign(this.p, { x, y: 0, vy: 0, onGround: true, face: s.keepFace ? this.p.face : x > s.width / 2 ? -1 : 1 });
    // a level scene: arrive on the floor at the exit's (or the spawn's) height; the camera looks there at once
    const source = SceneLifecycle.joinLevel(this.sceneLifecyclePort,id, this.p.x - this.camera.viewW * 0.45), arriveH = (at ? s.exits.find((e) => e.id === at)?.arriveH : undefined) ?? s.spawnH ?? 0;
    const vehicleOnly=s.level&&!s.level.floors.length?s.level.vehicles:undefined;
    if(vehicleOnly&&vehicleOnly.length!==1)throw Error('Vehicle-only arrival requires one source vehicle');
    this.scenes.level = source ? vehicleOnly?arriveVehicleLevel(source,this.p,this.movers,id,vehicleOnly[0].source.id,arriveH):{ source, state: levelArrive(source, this.p, arriveH, SceneLifecycle.seenRooms(this.sceneLifecyclePort,source, id), savedForLevel(source, id, this.save.barriers)) } : null;
    this.camera.camH = this.scenes.level ? Math.max(this.scenes.level.source.low, Math.min(this.scenes.level.source.high, this.p.y)) : 0; this.camera.gy = this.camera.gyBase + Math.round(this.camera.camH);
    this.camera.cam = Camera.camFollow(this.cameraPort,this.p.x);
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + s.name);
    this.syncHud();
    setHereClimate(sceneClimate(id));
    if (!quiet) sound.open();
    // the companion: at home (coming in behind you through the door, or already asleep there), at your heels where it follows you
    if (s.perch) {
      const home = s.perch(this.zh.model);
      if (at && this.save.flags[companionFlag(s, this.companionDoc)]) this.companionBody.place(x - 14, 0, 'walk', 1);
      else this.companionBody.place(home.x, home.h, home.rest);
    } else if (this.companionPresent) this.companionBody.place(x - this.p.face * 20, 0, 'sit', this.p.face);
    // the opening: the train home runs into Downtown; arriving, the player says the opening's words instead
    const st = this.story, phase = s.phases?.[st], said = phase?.intro;
    if (phase?.ride) StoryTransitions.runRide(this.storyTransitionsPort,id, phase.ride);
    this.hints.sceneChanged();sound.cancelFeedback();
    const flag = 'scene:' + id;
    if (said) {
      const once = 'opening:said:' + st + ':' + id;
      if (said.consume) this.save.flags[flag] = true;
      if (!this.save.flags[once]) { this.save.flags[once] = true; this.persistSave(); this.say(said.speaker,this.touch?said.touchPages??said.pages:said.pages,this.p.x,said.height); }
    } else this.introduceScene();
    this.greet();
  }

  /** Arrival speech belongs to scene source; an occupied vehicle can defer it until alighting. */
  private introduceScene() {
    const scene=this.def;
    if(scene.introOnFoot&&this.scenes.level?.state.vehicle)return;
    const flag='scene:'+this.scenes.here,intro=typeof scene.intro==='function'?scene.intro(this.touch):scene.intro;
    if(!intro?.length||this.save.flags[flag])return;
    this.save.flags[flag]=true;this.persistSave();this.say('YOU',intro,this.p.x,46);
  }

  /** Tap or click a thing to open its popup (in hack vision: its verbs); hovering lights it up. A tap on the scene's life within reach is E on it. */
  private onCanvasPointer(e: PointerEvent,press: boolean) { return InputRouting.onCanvasPointer(this.inputRoutingPort,e,press); }

  private deviceAt(x:number,h:number) {
    const input=this.interactionHost;
    const hosts=[input,this.zh,...this.scenes.joinedZones.filter(z=>this.scenes.zoneTiers.get(z.id)==='visible').map(z=>this.scenes.hosts.get(z.id)).filter((host):host is SceneHost=>!!host)];
    for(const host of new Set(hosts)){
      const at=this.hostPlacement(host);if(!at)continue;
      const id=host.spotAt(x-at.dx,h-at.dh);
      if(id&&(at.id===this.scenes.here||host.model.attachmentOffsets()?.devices?.[id]))return{host,id};
    }
    return null;
  }


  /** Canvas world units (the view, after the pixel scale) → CSS px of the game view. */
  private get cssScale() { return (this.camera.k * this.canvas.clientWidth) / (this.canvas.width || 1); }

  /** The heads of the people on screen (the scene's, Downtown's street people and the fixer), CSS px. */
  private heads() {
    const s = this.cssScale, list: { x: number; h: number }[] = [];
    for (const p of this.def.people ?? []) if (isHere(p)) list.push({ x: characterX(p, this.timing.t), h: characterHeight(p) });
    return list.map(({ x, h }) => ({ l: (this.sx(x) - 9) * s, t: this.y(h) * s, r: (this.sx(x) + 9) * s, b: this.y(h - 14) * s }))
      .filter((b) => b.r > 0 && b.l < this.canvas.clientWidth);
  }

  /** Hack vision hangs in the world: give the scene this frame's world → CSS px mapping (as `sx` and `y` draw it). */
  private followHost() {
    // (in hack vision the view may be panned and zoomed: the same mapping the world was drawn with)
    const camera=Camera.projection(this.camera);
    const s = camera.k*this.canvas.clientWidth/(this.canvas.width||1), top = this.keyBar.root.offsetHeight + 8 + this.presentation.hudH * s;
    const follow = (host: SceneHost, dx: number, dh: number) => {
      // The host retains local manifest coordinates, just like zoneFrame's artwork.
      // Project both its anchors and the player through the same seam placement.
      host.uiTop = top;
      host.follow((wx, h) => ({ x: Math.round(wx + dx - camera.cam) * s, y: (camera.gy - h - dh) * s }), this.canvas.clientWidth, { x: this.p.x - dx, h: this.p.y - dh });
    };
    follow(this.zh, 0, 0);
    for (const z of this.scenes.joinedZones) {
      const host = this.scenes.hosts.get(z.id);
      if (host && this.scenes.zoneTiers.get(z.id) === 'visible') follow(host, z.dx, z.dh);
    }
  }

  // ---------- world logic ----------

  private ctx(): Ctx {
    const zh = this.interactionHost,scene=this.sceneDefinition(this.hostPlacement(zh)?.id??this.scenes.here);
    return {
      save: this.save,
      scanProgram:this.networkContext.net.scanProgram,
      machine: this.termMachine(),
      // the deck's commands reach the scene's machines, when it has any
      shell: zh.model.devices.size && !this.hackLocked() ? sceneShell(zh, scene.buzz ? (text, kind) => this.buzzPrint(text, kind) : (text, kind) => this.term.print(text, kind)) : null,
      print: (text, kind) => this.term.print(text, kind),
      denied: () => sound.denied(),
      granted: () => sound.granted(),
      toggleSound: () => sound.toggle(),
      clear: () => this.term.clear(),
      leaveMachine: () => this.term.close(),
      persist: () => this.persist(),
      resettable: this.resettableScenes().map(([id, s]) => ({ id, ...s.resettable!, reset: () => this.hostOf(id as SceneId).reset() })),
      // your own deck, while you still exist
      deck: this.openingStory.persona(this.save.flags)?.deck,
      // the Registry's forecast, where you are
      weather: () => reportLines(sceneClimate(this.scenes.here)),
      // the net from where you stand (NET.md): scan, connect (needs scan.so, except what a port here knows)
      net: this.hackLocked() ? undefined : {
        scan: () => this.deckScan(),
        connect: (name) => this.deckConnect(name),
        names: () => zh.model.nodesHere().filter((id) => zh.model.net.has(id) || zh.model.ports().length),
      },
    };
  }

  private syncHud() {
    this.refreshReview();
    this.host.setNodes(nodeCount(this.save));
    this.host.setScene(playProfile().chrome.minimalHud ? sceneTitle(this.def) : sceneTitle(this.def) + this.clockText + ' · ' + this.me.toUpperCase());
  }

  /**
   * Everything to press E on here, in one list for every scene: its ways out, Downtown's street
   * people, the devices and the scene's own targets on the engine, the scene's life, and the companion.
   */
  private targets(): Target[] {
    const s = this.def, list: Target[] = [...this.exitTargets(s)];
    const life=this.lifeTargets(s),before=new Set((s.uses??[]).filter(u=>u.targetOrder==='before-devices').map(u=>'use:'+u.id));
    list.push(...life.filter(t=>before.has(t.id)));
    // a device is reached from the ground, or from the ledge under it (the relay, from the low roof)
    const floors=[...this.platforms,...(this.scenes.level?.source.floors??[])];
    const stand = (x: number, y = 0) => {const under=floors.filter(p=>x>p.x&&x<p.x+p.w&&p.h<=y).map(p=>p.h);return under.length?Math.max(...under):0;};
    for (const t of this.zh.targets()) {
      const query=s.data?.devices.find(d=>d.id===t.id)?.targetQuery;
      if(query!==undefined&&this.zh.model.gameplayQuery?.(query)!==true)continue;
      list.push({ kind: 'device', id: t.id, x: t.x, h: t.floorH??stand(t.x, t.y), label: t.label, promptH: t.promptH });
    }
    list.push(...life.filter(t=>!before.has(t.id)));
    // A route's Circuit stays in its source zone. Only its attached interactions travel
    // into neighbouring zones; ordinary local people/shops are not duplicated there.
    for (const z of this.scenes.joinedZones ?? []) {
      const host = this.scenes.hosts.get(z.id);
      if (!host || this.scenes.zoneTiers.get(z.id) !== 'visible') continue;
      const offsets = host.model.attachmentOffsets();
      if (!offsets) continue;
      const scene = this.sceneDefinition(z.id);
      const attached: SceneDef = { ...scene, people: undefined,
        uses: scene.uses?.filter(u => offsets.uses?.[u.id]),
        readables: scene.readables?.filter(r => offsets.readables?.[r.id]),
        rests: scene.rests?.filter(r => offsets.rests?.[r.id]),
      };
      for (const t of host.targets()) {
        if (!offsets.devices?.[t.id]) continue;
        const query=scene.data?.devices.find(d=>d.id===t.id)?.targetQuery;
        if(query!==undefined&&host.model.gameplayQuery?.(query)!==true)continue;
        list.push({kind:'device',id:t.id,owner:z.id,x:t.x+z.dx,h:(t.floorH??this.promptFloor(scene,t.x,t.y))+z.dh,label:t.label,promptH:t.promptH+z.dh});
      }
      for (const t of this.lifeTargets(attached, host, z.id)) list.push({ ...t, owner: z.id,
        x: t.x + z.dx, h: t.h + z.dh, ...(t.promptH === undefined ? {} : { promptH: t.promptH + z.dh }) });
    }
    // the story's own things to press E on in this phase (the bed)
    for (const [id, t] of Object.entries(this.def.phases?.[this.story]?.targets ?? {})) {
      const target = this.openingStory.resolveTarget(t, this.def);
      if (target) list.push({ kind: 'life', id: 'story:' + id, ...target });
    }
    // a level's doors, flights, escalators and lifts where the player stands
    // (the list menu beside the car is the lift's panel while it is open: no prompt over it)
    if (this.scenes.level) for (const t of levelHints(this.scenes.level, this.p, this.movers)) if (!(this.presentation.carListOn && t.id.startsWith('lift:'))) list.push({ kind: 'level', ...t });
    // the companion can always be petted, wherever it is with you
    if (this.companionPresent&&this.def.companion?.pet) list.push({ kind: 'companion', id: this.companionDoc.id, x: this.companionBody.x, h: 0, label: this.def.companion.pet.prompt, promptH: this.companionBody.h + 24 });
    return list;
  }

  private nearest(): Target | null { return nearestPrompt(this.targets(), this.p); }

  /** What the HUD's hint lane drew last (the probe reads it; nothing else does). */

  /** `?probe` / `?sudo`: a read-only snapshot of the story for scripts (scripts/opening-playthrough). It writes nothing and advances nothing. */
  private probeFrame() {
    const t = this.nearest(), b = this.presentation.bubble;
    return {
      here: this.scenes.here, phase: this.story, flags: { ...this.save.flags },
      clock: { day: city.day, min: Math.round(city.min * 100) / 100, text: city.text, pinned: city.pinned },
      title: !!this.presentation.opening, glide: !!this.presentation.opening?.gliding, menu: this.menu.open, cut: !!this.presentation.cut, end: this.presentation.showEnd, map: !!this.presentation.mapView,
      bubble: b ? { name: b.name, text: b.pages[b.page], page: b.page, pages: b.pages.length, full: b.chars >= b.pages[b.page].length } : null,
      prompt: t ? { kind: t.kind, id: t.id, label: t.label, x: Math.round(t.x) } : null,
      targets: this.targets().map(z => ({ kind: z.kind, id: z.id, label: z.label, x: Math.round(z.x) })),
      hint: this.presentation.hudHint, goal: this.goalText(), popup: this.zh.popupOpen, acknowledging: this.zh.acknowledgmentText ?? null,
      gate: PresentationFrame.probeGate(this.presentationFramePort), card: PresentationFrame.probeCard(this.presentationFramePort),
      player: { x: Math.round(this.p.x * 10) / 10, y: Math.round(this.p.y * 10) / 10 },
      term: (this.term.out.textContent ?? '').slice(-700),
    };
  }

  private say(name: string, pages: string[], x: number, h: number) {
    if(!pages.length)return;
    this.presentation.bubble = { name, pages, page: 0, chars: 0, x, h };
    if(pages.length)this.term.print(name+': '+pages.join('\n'),'out',false);
  }

  private completeConversation(cue:NonNullable<import('../engine/gameplay/conversation').ConversationFrame['completion']>) {
    this.term.prefill(cue.terminalPrefill);
  }

  /** Completion belongs to advancing the final page; replacing or abandoning a bubble cancels it. */
  private dialogueCompletion(cue:import('../engine/gameplay/conversation').ConversationFrame['completion']) {
    if(cue&&this.presentation.bubble){const scene=this.scenes.here;this.presentation.bubble.then=()=>{if(this.scenes.here===scene)this.completeConversation(cue);};}
  }

  private update(dt: number) {
    const p = this.p, b = this.presentation.bubble;
    if (b && b.chars < b.pages[b.page].length) {
      const before = Math.floor(b.chars);
      b.chars = Math.min(b.pages[b.page].length, b.chars + 1.2 * dt);
      if (Math.floor(b.chars) !== before && Math.floor(b.chars) % 2 === 0) sound.blip();
    }
    StoryTransitions.updateTravel(this.storyTransitionsPort);
    StoryTransitions.updateStory(this.storyTransitionsPort);
    const locked = this.presentation.showEnd || this.term.focused || !!this.interactionHost.overlayOpen || !!this.presentation.mapView || !!this.presentation.netView || !!this.presentation.flight || !!this.presentation.hop || !!this.presentation.beat || !!this.presentation.sleep;
    const riding=stepPlayer(this.movementPort,dt,locked);

    // zones (engine/zones.ts) watch where the player stands
    // (a joined level names buildings zone/building; the scene's own zones know them by their own name)
    this.syncPlayerLocations();
    Camera.stepFollowCamera(this.cameraPort,dt,riding);
    if (this.companionPresent) this.companionBody.update(dt, { px: p.x, face: p.face, moving: p.moving, follow: this.companionDoc.follow, perch: this.def.perch?.(this.zh.model) ?? null, warm: this.def.companion?.warm });
    this.host.setNodes(nodeCount(this.save));
    // the opening's idle ping: standing still a while, the next goal's target pings (opening.ts)
    const aim = this.shiftGuidance ? null : this.def.phases?.[this.story]?.ping ?? null;
    if (!aim || locked || p.moving || !p.onGround || this.presentation.bubble || this.zh.popupOpen) this.presentation.still = this.timing.clock;
    else if (attentionDue(this.timing.clock, this.presentation.still, this.openingStory.ATTENTION.after)) { this.presentation.still = this.timing.clock; StoryTransitions.pingGoal(this.storyTransitionsPort,aim); }
  }

  /** The companion is drawn at home (`companion.mode: home`), and where it follows you (`along`) once its flag is set (companion-source.ts). */
  private get companionPresent() { return companionHere(this.def, this.save.flags, this.companionDoc); }

  // ---------- drawing ----------

  private sx(worldX: number,parallax = 1) { return projectX(worldX,this.camera.cam,parallax); }
  private y(h: number) { return this.camera.gy-h; }

  /**
   * One frame, the same way for every scene: the engine's sky and Downtown's street walls where
   * the scene has them (`ambient`), the scene's own drawing, the player and the companion, the scene's
   * foreground, rain, then prompts, bubbles and the HUD. Hack vision mutes the world: a scene
   * that draws in two passes (`layers`) gets its devices drawn bright over the muted world; any
   * other keeps holes round its devices' frames (none: everything is muted). The player stays bright.
   */
  private draw() {
    // a person whose speech bubble is open gestures while they talk (the player's own bubble sits at the player)
    setSpeaker(this.presentation.bubble && Math.abs(this.presentation.bubble.x - this.p.x) > 2 ? this.presentation.bubble.x : null);
    const x = this.x, k = this.camera.k;
    x.imageSmoothingEnabled = false;
    // a taxi flight is the one frame too, directed by its timeline (story/cutscenes/taxi.ts)
    if (this.presentation.flight) { drawFlight(x, this.camera.viewW, this.camera.viewH, Math.min(1, (this.timing.clock - this.presentation.flight.start) / (taxiDurationFor(this.sequenceDocuments.cinematics) * 60)), this.timing.clock, this.world.STANDS[this.presentation.flight.to].name,light(),this.sequenceDocuments.cinematics,k); return; }
    // the world, at hack vision's pan and zoom; the HUD and the overlays over it at the usual scale
    PresentationFrame.drawWorld(this.presentationFramePort);
    x.setTransform(k, 0, 0, k, 0, 0);
    PresentationFrame.drawHud(this.presentationFramePort);
    if (this.presentation.showEnd) PresentationFrame.drawEnd(this.presentationFramePort);
    PresentationFrame.drawBeat(this.presentationFramePort);
    PresentationFrame.drawSleep(this.presentationFramePort);
    this.drawMap();
    if (this.presentation.netView) drawNetMap(this.x, this.camera.viewW, this.camera.viewH, this.netState());
  }

  /**
   * This frame's light for the scene on screen (light.ts): its facing, outdoors or in, the weather
   * (indoors: the district's, for what the windows show). Sets it for characters and sets to read,
   * and works out the shade bands and the lamps for night shadows.
   */
  private lightHere(W: Weather | null): Light {
    const s = this.def, amb = s.ambient ?? {};
    // an indoor floor of a level (a tunnel, a cellar) is lit as indoors while the player stands on it
    const outdoor = this.scenes.level && levelIndoor(this.scenes.level) ? false : s.outdoor ?? !!(amb.weather || amb.sky);
    const L = lightAt(city.day, city.min, s.facing ?? 180, W ?? this.weatherHere(), outdoor);
    setLight(L);
    return L;
  }

  /** The ground under the player at world x (a ledge they are over, or the street): where their shadow lies. */
  private groundUnder(wx: number, h: number) {
    return Math.max(this.scenes.level ? Math.min(h, levelFloor(this.scenes.level).h) : 0, ...this.platforms.filter((pl) => wx > pl.x && wx < pl.x + pl.w && pl.h <= h + 0.5).map((pl) => pl.h));
  }

  /**
   * The weather a scene has now: its district's (weather.ts). Dawn, before you are deleted, is
   * dry whatever the forecast says ("Rain's late today": the opening is scripted).
   */
  private weatherOf(scene: string): Weather {
    const w = weatherNow(sceneClimate(scene));
    if (!this.openingStory.persona(this.save.flags)?.calmWeather || (w.rain < 0.01 && w.storm < 0.01)) return w;
    return { ...w, kind: w.kind === 'rain' || w.kind === 'storm' ? 'cloudy' : w.kind, rain: 0, storm: 0, wet: Math.min(w.wet, 0.4), wind: Math.min(w.wind, 0.3) };
  }
  private weatherHere() { return this.weatherOf(this.scenes.here); }

  /**
   * The bars follow the mode (render.tsx): walking (arrows; HACK, JMP, ACT, DECK) or hack vision
   * (EXIT, BOARD, LOGIC, UNFOLD), as classes on the page; HACK only once hacking is yours here.
   */
  private syncModeUi() {
    const zh = this.interactionHost, on = zh.visionOn;
    this.controlHints(on);
    const net = this.netOk, ping = net && !this.save.flags[NET_OPENED];
    const key = [on, zh.hackable, zh.logicOpen, zh.unfoldAll, net, ping].join();
    if (key === this.presentation.modeKey) return;
    this.presentation.modeKey = key;
    const html = document.documentElement.classList;
    html.toggle('net-ok', net); html.toggle('net-new', ping);
    html.toggle('hack-ok', zh.hackable); html.toggle('hack-on', on);
    html.toggle('logic-open', zh.logicOpen); html.toggle('unfold-on', zh.unfoldAll);
  }

  /** The list menu beside the lift car is showing (the car's own prompt steps aside), and the player closed it (Esc): it stays shut until they use the panel's keys again or leave the car. */

  /**
   * In a lift car the floors are a list menu beside it (engine/popup.ts 'list', through the scene's host), not a floating
   * prompt: it reflects the panel (engine/level.ts `levelLiftList`: `ride.pick` is its one state), ↑ ↓ move the choice
   * as `levelUp`/`levelDown` do, a row or E sends the car through `levelInteract`; stepping out closes it.
   */
  private syncCarList() {
    const zh = this.zh, lv = this.scenes.level, list = lv && !this.presentation.bubble && !this.levelLocked() && !this.zh.visionOn ? levelLiftList(lv, this.movers) : null;
    const id = list ? 'lift:' + list.id : '';
    const was = this.presentation.carListOn;
    if (!list || !lv) {
      this.presentation.carListOn = false; this.presentation.carListOff = false;
      for (const l of this.presentation.liftIds) zh.closeList(l);
      return;
    }
    this.presentation.liftIds.add(id);
    // the player closed it (Esc, a tap elsewhere): leave it shut
    if (was && !zh.listOpen(id)) this.presentation.carListOff = true;
    if (this.presentation.carListOff || (!zh.listOpen(id) && zh.popupOpen)) { this.presentation.carListOn = false; return; }
    const items = list.rows.map((r) => ({
      key: r.key, label: r.label, cur: r.here,
      tag: r.here ? (r.picked ? 'step out' : 'you are here') : r.called ? 'called' : '',
      point: () => levelPick(lv, r.index),
      run: () => { levelPick(lv, r.index); levelInteract(lv, id, this.p, this.movers); },
    }));
    const sel = Math.max(0, list.rows.findIndex((r) => r.picked));
    zh.list(id, 'LIFT', items, { x: list.x, y: list.h, w: list.w, h: list.tall }, sel, (dir) => { if (dir > 0) levelUp(lv, this.p); else levelDown(lv, this.p); });
    this.presentation.carListOn = zh.listOpen(id);
  }

  /** The last `level-up`/`level-down` pair set on the page (syncLevelArrows). */

  /**
   * Touch's ▲ ▼ (ui/touch-controls.ts) keep their places in a level scene (`html.level-scene`) and show only while
   * ↑ or ↓ does something there (`html.level-up`, `html.level-down`; render.tsx): the rule the keys follow
   * (engine/level.ts `levelArrows`). Elsewhere the bar is as it was.
   */
  private syncLevelArrows() {
    const lv = this.scenes.level, on = this.touch && !!lv && !this.presentation.bubble && !this.levelLocked() && !this.zh.visionOn;
    const a = on ? levelArrows(lv!, this.p) : { up: false, down: false }, scene = this.touch && !!lv, key = [scene, a.up, a.down].join();
    if (key === this.presentation.arrowsKey) return;
    this.presentation.arrowsKey = key;
    const html = document.documentElement.classList;
    html.toggle('level-scene', scene); html.toggle('level-up', a.up); html.toggle('level-down', a.down);
  }

  // ---------- the camera nudge ----------

  /** The camera leaning towards something that reacted off the view: where it leans to, until when (clock frames), where you stood. */

  /** Coming back from a nudge: the camera eases gently until it is on you again. */

  /** When the last nudge started (clock frames), and what has drawn the eye already this visit (`from|line`). */

  private nudged = new Set<string>();

  /**
   * Something said it reacted (`from`, with a line in green or red). If it is off the view but
   * near, the camera leans that way for a moment so you see it happen, keeping you in view; the
   * ping (an edge arrow) already points at anything further. Never during a conversation, the deck
   * or a panel, never while you walk, never with reduced motion; each thing and line once a visit,
   * and not more often than every few seconds.
   */
  private nudgeTo(from: string, text: string, tone?: string) {
    if (tone !== 'ok' && tone !== 'err') return;
    if (this.reduced || this.presentation.bubble || this.term.focused || this.zh.overlayOpen || this.zh.visionOn || this.presentation.mapView || this.presentation.flight || this.presentation.hop || this.presentation.cut || this.p.moving) return;
    const at = this.zh.worldOf(from);
    if (!at || this.levelW <= this.camera.viewW) return;
    const key = from + '|' + text, p = this.p, m = NUDGE_MARGIN;
    if (this.nudged.has(key) || this.timing.clock - this.camera.lastNudge < NUDGE_GAP) return;
    // already in view (with a margin), or too far to show together with you: the ping is enough
    if (at.x > this.camera.cam + m && at.x < this.camera.cam + this.camera.viewW - m) return;
    if (Math.abs(at.x - p.x) > this.camera.viewW - m * 2) return;
    let goal = at.x < this.camera.cam + m ? at.x - m : at.x + m - this.camera.viewW;
    goal = Math.max(p.x + m - this.camera.viewW, Math.min(p.x - m, goal));
    { const [lo, hi] = SceneLifecycle.worldSpan(this.sceneLifecyclePort); goal = Math.max(lo, Math.min(hi - this.camera.viewW, goal)); }
    this.nudged.add(key); this.camera.lastNudge = this.timing.clock;
    this.camera.nudge = { goal, until: this.timing.clock + NUDGE_HOLD, px: p.x };
  }

  /**
   * What hack vision's LOGIC drawer lists: modules, programs and the key chips that do something.
   * Not tokens and not what you carry (Tommi, 2026-10-15): those show where they are used (a price
   * on the prompt, "show the maglev pass" in the brake's popup) and in the deck's CARRY tab.
   */
  private owned(): [string,string] { return ownedSummary(this.save,this.networkContext.keyring,SUDO); }  // ---------- the deck's tabs and the control hints ----------

  /** The current goal as the HUD shows it (the scene's, the opening's, the library's, or the data's next). */
  private goalText(): string | null {
    const zh = this.zh.model.data.goals.length ? this.zh : null;
    return this.def.objective?.(this.save.flags,this.gameplayFor(this.scenes.here)?.state()) ?? this.def.phases?.[this.story]?.goal ?? this.libraryGoal() ?? (zh ? zh.objective() : null);
  }

  /** What the deck's JOBS, CARRY, CONTROLS (and TERM on touch) tabs read (ui/menu.ts). */
  private deckData(): DeckData {
    return {
      jobs: () => {
        const m = this.zh.model;
        return { now: this.goalText(), hint: this.hints.latest, done: m.data.goals.filter((g) => m.goals.has(g.id)).map((g) => g.text) };
      },
      carry: () => {
        const s = this.save;
        return {
          tokens: s.tokens,
          items: Object.entries(s.items).filter(([, n]) => n > 0).map(([id, n]): [string, number] => [ITEMS[id as ItemId] ?? id, n]),
          keys: s.keyring.map((id) => this.networkContext.keyring.get(id)).filter((k) => k?.kind === 'key').map((k) => k!.label),
          modules: ownedModules(s),
          programs: s.programs,
        };
      },
      controls: () => this.controls(),
      ...(this.touch ? { terminal: () => this.openDeck() } : {}),
    };
  }

  /** Every key that is yours now, grouped (the deck's CONTROLS tab). Touch names its buttons instead. */
  private controls() { return controlGroups({touch:this.touch,jump:this.save.jump,levels:!!this.scenes.level,network:this.netOk,hackable:this.zh.hackable}); }
  /**
   * The controls, taught once in the hint lane (what the key bar's labels used to say): walking, then
   * using, then the deck; hack vision's keys the first time it is open. Each stays until you have done it.
   * Touch buttons are labelled, so touch only gets the deck and hack vision.
   */
  private controlHints(vision: boolean) {
    if(!playProfile().guidance.controlHints)return; // Review cases own attention; campaign control lessons stay in the campaign.
    const h = this.hints;
    if (this.p.moving) h.done('ctl.walk');
    if (!this.touch) {
      if (!h.has('ctl.walk')) h.show('ctl.walk', '← → WALK · SHIFT RUN', { sticky: true });
      else if (!h.has('ctl.use')) h.show('ctl.use', 'E USES WHAT SHOWS [E]', { sticky: true });
    }
    if ((this.touch || h.has('ctl.use')) && !h.has('ctl.deck')) h.show('ctl.deck', (this.touch ? 'DECK' : 'ESC') + ' OPENS THE DECK: GOALS, WHAT YOU CARRY, CONTROLS', { sticky: true });
    if (vision) h.show('ctl.vision', this.touch ? 'DRAG PANS · PINCH ZOOMS · EXIT LEAVES' : 'DRAG PANS · WHEEL ZOOMS · 0 RESETS · ESC LEAVES', { sticky: true, first: true });
    else if (h.pending('ctl.vision')) h.done('ctl.vision');
  }

  private ownLine() { const [own, more] = this.owned(); return more ? own + ' · ' + more : own; }

  /** What you own, as a set of words, to see what came (or went) since the last frame. */

  private checkGain() {
    const s = this.save, words = [...ownedModules(s), ...s.programs, ...s.keyring.map((id) => this.networkContext.keyring.get(id)?.label ?? id), ...Object.entries(s.items).filter(([, n]) => n > 0).map(([id]) => ITEMS[id as ItemId] ?? id)];
    const now = words.join('|');
    if (this.presentation.gainWords && now !== this.presentation.gainWords) {
      const before = new Set(this.presentation.gainWords.split('|')), added = words.filter((w) => !before.has(w));
      if (added.length) this.notify('+ ' + added.join(' · '),'success');
    }
    this.presentation.gainWords = now;
  }

  // ---------- the opening (opening.ts) ----------
  // The opening is story data (story/opening.json) plus each scene's `phases` (scene.json): the save's flags pick the phase
  // (story/story-rules.ts holds the pure rules; this loop applies them: gates, cards, triggers, the clock pin, the attention ping).

  private get story(): OpeningState { return this.openingStory.openingState(this.save.flags); }
  /** Who you are in the HUD and your bubbles: a courier while you still exist, then your handle (or "ghost"). */
  private get me() { const fixed = playProfile().player.name; if (fixed !== undefined) return fixed; return this.openingStory.persona(this.save.flags)?.name ?? who(this.save); }
  /** The city clock, after the scene's name in the HUD (" · 21:40"; the opening's times are its pins). */
  private get clockText() { return playProfile().chrome.minimalHud ? '' : ' · ' + city.text; }

  /** When the player last moved or did something (clock frames), for the attention ping. */

  /** Where the attention ping points when it is not a device (world x): the scene's 'goal' speaker. */

  /** A checkpoint gate taking its time (story-rules.ts `GateRule`): when it started, where it stands, and where the player goes once it says ok. */

  /**
   * A card transition (story-rules.ts `CardSpec`; the opening's sleep, or "wait until…" at a bench or the bed): when the fade started,
   * the card (timings, the two clock readings, the label, and the cues that run in the dark `mid`, once: `woke`, and once it is light again `end`).
   */

  /** The story's counters (story-rules.ts `applyCounter`): plain numbers named by the source (the morning's failed tries, when it last happened). The loop's own, cleared with the story's transitions. */

  /** Scratch callbacks belong to this run; disposal never acknowledges or completes them. */
  private cancelStoryTransitions(){this.scenes.hosts?.forEach(h=>h.cancelAcknowledgment?.('dismissed'));this.presentation.bubble=null;this.presentation.beat=null;this.presentation.sleep=null;this.presentation.pendingCut=null;this.presentation.counters={};}

  /** NEW GAME (until the glide lands) and a first launch: the opening, on the train home. */
  private startOpening(destination?: Handoff) {
    this.cancelStoryTransitions();
    this.presentation.counters = {};
    if(!this.runOpeningWorkflow('home'))return;
    this.persistSave();
    const target=destination??this.openingStory.START.start;this.handTo(target.scene,target.entrance);
  }

  /** Sudo's LEVELS: the opening from one of its points (opening.json `OPENING_LEVELS`), its scenes started over. */
  private openingFrom(level: { flags: string[]; reset?: string[]; end?: string }) {
    this.cancelStoryTransitions();
    for(const f of this.openingStory.OPENING_FLAGS)delete this.save.flags[f];
    level.flags.forEach((f) => { this.save.flags[f] = true; });
    for (const scene of level.reset ?? []) this.hostOf(scene as SceneId).reset();
    this.presentation.counters = {};
    this.persistSave();
    const to = this.openingStory.openingResumeDestination(this.save.flags) ?? this.openingStory.START.fallback;
    this.handTo(to.scene,to.entrance);
    if (level.end) StoryTransitions.runCues(this.storyTransitionsPort,this.openingStory.CARDS[level.end].end ?? []);
  }

  /** The Train scene's movers: the ride lives there (world/transport/line.ts reads it). */
  private get ride() { return this.hostOf(this.world.TRANSPORT.boarding.scene as SceneId).model.movers; }

  // ---------- the city clock (clock.ts): when it runs, the opening's pins, waiting ----------

  /** Sudo's city clock bar (transport.ts); null without `?sudo`. */
  private clockBar: ClockBar | null = null;
  /** The footer's timestamp in game mode (DAY 3 · 21:40), and what it and the HUD showed last. */
  private stampEl: HTMLElement;

  // ---------- cutscenes (cutscenes/) ----------
  // While one plays, the scene's update and draw are skipped entirely; any key or tap skips it.

  /** A cutscene a story beat asked for, waiting for the screen to be free. */

  /**
   * Contacts on your deck (contacts.ts): after a story beat, say what came in. The messages stay
   * unread until `msg <contact>` in the deck.
   */
  private inbox() {
    const contacts=this.contacts,news=contacts.unread(this.save.flags);if(!news.length)return;
    const who=[...new Set(news.map(n=>n.contact))],source=contacts.INBOX.announce,t=contacts.INBOX.terminal;
    who.forEach(c=>this.term.print(t.prefix+c.name+t.separator+c.status+t.separator+contacts.messagesOf(c,this.save.flags).length+t.countSuffix+t.commandPrefix+c.id,'ok'));
    if(who.some(c=>c.id===source.contact))this.say(source.speaker,this.touch?source.touchPages:source.pages,this.p.x,source.height);
  }

  /**
   * Play a cutscene, then continue: `then` runs when it ends or is skipped. Without
   * `then`, the game hands over to the cutscene's authored destination. Story triggers
   * use after-handoff so their postlude follows travel, retaining a same-scene native interlude.
   * For a menu's NEW GAME or a story beat: `game.playCutscene('intro', () => …)`.
   */
  playCutscene(id: CutsceneId | string, then?: () => void,continuation:'replace'|'after-handoff'='replace') {
    const scene = isCutsceneId(id)?this.nativeCutscenes[id]:undefined;
    const handoff=()=>{if(!scene)return;const destination=scene.handoff??{scene:scene.next};
      // A story interlude returning to its current scene preserves native runtime state.
      if(continuation==='after-handoff'&&destination.scene===this.scenes.here&&destination.entrance===undefined)return;
      this.handTo(destination.scene,destination.entrance);
    };
    const after=then?(continuation==='after-handoff'?()=>{handoff();then();}:then):handoff;
    if (!scene) { after(); return; }
    this.endCutscene(false);
    this.presentation.bubble = null;
    this.input.keys.clear();
    this.scenes.hosts.forEach((h) => h.closeAll());
    this.term.close();
    this.presentation.cut = new CutscenePlay(scene, { reduced: this.reduced, touch: this.touch });
    this.presentation.cut.prepare(this.x,this.camera.viewW,this.camera.viewH,light());
    this.syncEnginePause();
    this.presentation.cutThen = after;
    document.documentElement.classList.add('cutscene');
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + scene.cards.map((c) => c.text).join(' '));
    this.host.setScene(scene.title);
  }

  private stepCutscene(dt: number) {
    const c = this.presentation.cut!;
    c.prepare(this.x,this.camera.viewW,this.camera.viewH,light());
    c.step((dt / 60) * (this.transport?.rate ?? 1));
    this.transport?.sync();
    const x = this.x;
    x.imageSmoothingEnabled = false;
    c.draw(x, this.camera.viewW, this.camera.viewH, light(), this.camera.k);
    if (c.done) this.endCutscene(true);
  }

  /** Stop the cutscene; `andThen` runs what comes after it (false when the game stops mid-scene). */
  private endCutscene(andThen: boolean) {
    if (!this.presentation.cut) return;
    const then = this.presentation.cutThen;
    this.presentation.cut = null;
    this.presentation.cutThen = null;
    document.documentElement.classList.remove('cutscene');
    this.syncHud();
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + this.placeName);
    if (andThen) then?.();
  }

  /** Sudo's LEVELS: play a cutscene (then its next scene), or arrive in a scene at its spawn. */
  private enterLevel(id: string) {
    if (id === 'title') { this.showTitle(); return; }
    this.endTitle();
    this.presentation.bubble = null;
    const opening = this.openingStory.openingLevel(id);
    if (opening) { this.openingFrom(opening); return; }
    if (isCutsceneId(id)) { this.playCutscene(id); return; }
    this.handTo(startLevel(id,{board:(station,left)=>boardRide(this.hostOf(this.world.TRANSPORT.boarding.scene as SceneId).model,station,left)}) ?? id);
    this.markSeen(this.scenes.here);
    this.persistSave();
  }

  /** Arrive in a scene by id (anything else is Downtown), at its spawn. */
  handTo(id: string, entrance?: string) {
    this.enter(this.hasScene(id) ? id : playProfile().home as SceneId, true, entrance);
  }

  // ---------- a scene's ways out and its life ----------

  /**
   * A scene's ways out as E targets: its doors, stairs and pads (an open border is walked
   * into instead; one its code offers is an engine target). A platform's BOARD is one
   * target at each of the train's doors, only while it stands there with them open.
   */
  private exitTargets(s:SceneDef):Target[] { return exitTargets(s,{model:this.zh.model,flags:this.save.flags,tokens:this.save.tokens,fare:this.world.FARE}); }
  /**
   * A scene's life as E targets: readables, uses, the people who talk, and the animals
   * (cats to pet, pigeons to shoo) and robots. E on one runs `useLife`.
   */
  /** The floor a use or readable is offered on: in a scene with levels, the floor under where it answers (a mezzanine's machine); else the street. */
  private promptFloor(s:SceneDef,x:number,h:number|undefined) { return promptFloor(s,x,h,s.id===this.scenes.here&&this.scenes.level?this.scenes.level.source.floors:s.level?.floors); }  private lifeTargets(s:SceneDef,host=this.zh,owner=this.scenes.here):Target[] { return lifeTargets(s,{model:host.model,flags:this.save.flags,tokens:this.save.tokens,session:this.gameplayFor(owner),floor:(x,h)=>this.promptFloor(s,x,h),rests:city.pinned===null,time:this.timing.t,critters:this.critters,bots:this.botReactions}); }

  /** What a use costs now (0: nothing to pay this time). */
  private usePrice(u:SceneUse,owner=this.scenes.here) { return usePrice(u,this.save.flags,this.gameplayFor(owner)); }

  /** Use an authored scene exit, taxi or map. Physical vehicle transfers belong to the level. */

  /** The scene view, refreshed for this frame. */
  private view(camera:CameraProjection=this.camera): SceneView {
    const v = (this.presentation.sceneView ??= { ...frameView(0),  flags: this.save.flags });
    v.sx=(wx,p=1)=>projectX(wx,camera.cam,p);v.y=h=>camera.gy-h;
    v.t = this.timing.t; v.viewW = camera.viewW; v.viewH = camera.viewH; v.cam = camera.cam; v.gy = camera.gy; v.flags = this.save.flags; v.values = this.save.gameplay; v.level = this.scenes.level ? SceneLifecycle.levelViewOf(this.sceneLifecyclePort,this.scenes.here) : undefined;
    const station=this.world.stationAt(this.scenes.here);
    v.transit=station?{station,...this.metro.stationFrame(station,this.ride)}:undefined;
    return v;
  }

  // ---------- travel: doors, the metro, sky taxis, the city map (city.ts) ----------

  /** Go to a scene, landing at its exit `at` there. */
  private travel(id: SceneId, at?: string) {
    this.presentation.mapView = null;
    this.enter(id, false, at);
  }

  /** The player walked into a border: leave through that edge's exit, if the scene has one, still walking the same way. */
  private walkOff(edge: 'left' | 'right') {
    const e = this.def.exits.find((z) => z.edge === edge && exitVisibility(z,this.save.flags).ok);
    if (!e || !this.hasScene(e.to)) return;
    this.travel(e.to, e.at);
    this.p.face = edge === 'left' ? -1 : 1;
  }

  /** Remember a scene for the city map: `flags['seen:<scene>']`. */
  private markSeen(id: SceneId) {
    this.save.scene = id;
    const f = this.world.seenFlag(id);
    this.save.flags[f] = true;
    this.persistSave();
  }

  /** The taxi answers at its stand; an unavailable anchor falls back to system feedback. */
  private driverReply(pages:string[]){const text='DRIVER: '+pages.join('\n'),taxi=this.def.exits.find(e=>e.action==='taxi');if(taxi)this.zh.react('exit:'+taxi.id,['',text,'err']);else {this.notify(text,'error');sound.denied();}}

  /** E at a taxi stand: the city map to pick a stand, if you can pay. */
  private hailTaxi() {
    if (this.save.tokens < this.world.FARE) {
      this.driverReply(this.world.DRIVER_BROKE);
      return;
    }
    this.presentation.mapView = this.worldMap.openMap('taxi', this.scenes.here, this.scenes.here === this.world.TRANSPORT.boarding.scene ? this.metro.rideStop(this.ride) : null);
    this.input.keys.clear();
    this.syncEnginePause();
    sound.open();
  }

  /** The city map on its own, just to look at (for a menu to call). Esc closes it. */
  showMap() {
    if (!can('map')) return;
    if (!this.timing.running || this.presentation.flight || this.presentation.hop) return;
    this.input.keys.clear();
    this.presentation.bubble = null;
    // the map takes the screen: hack vision closes first
    if (this.zh.visionOn) this.zh.toggleVision();
    this.presentation.mapView = this.worldMap.openMap('view', this.scenes.here, this.scenes.here === this.world.TRANSPORT.boarding.scene ? this.metro.rideStop(this.ride) : null);
    this.syncEnginePause();
  }

  /** True while the city map is open. */
  get mapOpen() { return !!this.presentation.mapView; }

  private mapKey(e: KeyboardEvent) {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.mapAct(this.worldMap.mapKey(this.mapState(), k));
  }

  /** Do what the map asks: close, a sound, quick travel to a place, a taxi to a stand. */
  private mapAct(a: MapAct) {
    switch (a.kind) {
      case 'close': this.presentation.mapView = null; this.canvas.style.cursor = ''; sound.close(); return;
      case 'blip': sound.blip(); return;
      case 'zoom': sound.open(); return;
      case 'back': sound.close(); return;
      case 'denied': sound.denied(); return;
      case 'go': StoryTransitions.quickTravel(this.storyTransitionsPort,a.place); return;
      case 'fly': StoryTransitions.fly(this.storyTransitionsPort,a.stand); return;
    }
  }

  /** The map's state, for drawing it and for deciding where you may go. */
  private mapState(): MapState {
    const m = this.presentation.mapView ?? this.worldMap.openMap('view', this.scenes.here, null);
    return {
      view: m, touch: this.touch, scene: this.scenes.here, reduced: this.reduced,
      // the smallest touch target, 44 CSS px, in view units
      tapMin: (44 * this.canvas.width) / Math.max(1, this.canvas.clientWidth) / this.camera.k,
      avoid: this.mapAvoid(),
      ride: this.scenes.here === this.world.TRANSPORT.boarding.scene ? { from: this.metro.rideStop(this.ride), to: this.metro.rideNext(this.ride), f: this.metro.rideRun(this.ride) } : null,
      seen: (z) => !!this.save.flags[this.world.seenFlag(z)], flag: (f) => !!this.save.flags[f], exitAccess:(scene,id)=>sceneExitAccess(this.hasScene(scene)?this.sceneDefinition(scene).exits.find(e=>e.id===id):undefined,this.save.flags,this.save.keyring), harborOpen: this.world.harborOpen(this.save.flags), tokens: this.save.tokens, t: this.timing.clock,
    };
  }

  /** The phone's ESC button, which stays over the open map, in view units (null when it is not shown). */
  private mapAvoid() {
    const b = document.querySelector<HTMLElement>('#touch button[data-key="Escape"]');
    const br = b?.getBoundingClientRect(), r = this.canvas.getBoundingClientRect();
    if (!br || !br.width || !r.width) return null;
    const f = this.canvas.width / r.width / this.camera.k;
    return { x: (br.left - r.left) * f, y: (br.top - r.top) * f, w: br.width * f, h: br.height * f };
  }

  /** The pointer on the open map (citymap.ts reads it: districts, places, pads, back, outside). */
  private mapPointer(e: PointerEvent, press: boolean) {
    const r = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.camera.k, py = ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.camera.k;
    const { act, pointer } = this.worldMap.mapPointer(this.mapState(), this.camera.viewW, this.camera.viewH, px, py, press, e.pointerType === 'mouse');
    this.canvas.style.cursor = pointer ? 'pointer' : '';
    if (press) e.preventDefault();
    this.mapAct(act);
  }

  // ---------- the net map (netmap.ts, NET.md) ----------

  /** NET is yours: scan.so owned, and hacking yours (not in the opening's locked part). */
  private get netOk() { return capabilityView(this.save,!this.hackLocked(),this.networkContext.net).network; }

  /** A program came (scan.so from the library): saved, and NET shows in hack vision's bar, pinging until used. */
  private grantProgram(id: string,receipt?:FeedbackReceipt) {
    const acquired=!this.save.programs.includes(id);
    if (acquired) this.save.programs.push(id);
    this.persistSave();
    this.syncHud();
    if (id === this.networkContext.net.scanProgram&&acquired) {
      this.flash(this.touch ? 'NET: in hack vision, the net map' : 'NET: N, the net map'); sound.feedback(receipt??mintFeedback(this.scenes.here,'program','success'));
      // This program already announced its acquisition. Advance only that word in the
      // ownership observer so its next pass still reports any other simultaneous gains.
      if(this.presentation.gainWords&&!this.presentation.gainWords.split('|').includes(id))this.presentation.gainWords+='|'+id;
    }
  }

  /**
   * N or NET: the net map, full screen. Opening it is a scan from where you are plugged in (scan.so):
   * the networks you reach go into the save as found, the nodes in reach onto the board as silhouettes.
   */
  showNet() {
    if (!this.timing.running || this.presentation.flight || this.presentation.hop || !this.netOk) return;
    this.input.keys.clear();
    this.presentation.bubble = null;
    this.presentation.mapView = null;
    this.presentation.netBack = this.zh.visionOn;
    if (this.zh.visionOn) this.zh.toggleVision();
    // the map takes the screen: popups, captions and panels go
    this.zh.closeAll();
    const zh = this.zh, reached = zh.model.netsHere();
    // what you reach is found; so is any network with a port standing here (you can see the plug, if not the way in)
    const here = this.networkContext.net.networks.filter((n) => n.from.some((r) => 'port' in r && r.port.startsWith(this.scenes.here + ':'))).map((n) => n.id);
    for (const n of [...reached, ...here]) if (!this.save.nets.includes(n)) this.save.nets.push(n);
    if (zh.model.ports().length || reached.size) zh.typed(() => zh.scanHere());
    this.save.flags[NET_OPENED] = true;
    this.persistSave();
    this.presentation.netView = openNet();
    this.syncEnginePause();
    sound.open();
  }

  private closeNet(back = this.presentation.netBack) {
    this.presentation.netView = null;
    this.canvas.style.cursor = '';
    sound.close();
    if (back && !this.zh.visionOn && this.zh.hackable) this.zh.toggleVision();
  }

  /** A machine's name, from the scene file (or net.json) that has it. */
  private machineName(m: MachineData) {
    for (const s of m.in) {
      const d = s === 'net' ? this.networkContext.net.nodes.find((x) => x.id === m.id) : [...(this.hasScene(s)?this.sceneDefinition(s).data?.devices??[]:[]), ...(this.hasScene(s)?this.sceneDefinition(s).data?.nodes??[]:[])].find((x) => x.id === m.id);
      if (d) return d.name;
    }
    return m.id.toUpperCase();
  }

  /** What the net map draws from: the networks you reach from here, those found, each machine's state from here. */
  private netState(): NetState {
    const zh = this.zh, model = zh.model, reached = model.netsHere();
    const portKeys = new Set(model.ports().map((p) => p.key));
    const plugged = new Set(this.networkContext.net.networks.filter((n) => n.from.some((r) => 'port' in r && portKeys.has(r.port))).map((n) => n.id));
    const state = (m: MachineData, n: NetworkData): MachineState => {
      if (!reached.has(n.id)) return 'out';
      if (!m.in.includes(this.scenes.here) && !m.in.includes('net')) return 'far';
      const d = model.devices.get(m.id);
      if (d && !d.node) return 'here';
      return model.net.get(m.id) === 'connected' ? 'board' : 'reach';
    };
    return {
      view: this.presentation.netView ?? openNet(), scanner: this.networkContext.net.scanProgram, nets: this.networkContext.net.networks, reached, plugged, found: new Set(this.save.nets),
      where: sceneTitle(this.def), ports: [...new Set(model.ports().map((p) => model.devices.get(p.dev)?.name ?? p.dev))],
      controlled: this.save.controlled, name: (m) => this.machineName(m), state, touch: this.touch,
      tapMin: (44 * this.canvas.width) / Math.max(1, this.canvas.clientWidth) / this.camera.k, avoid: this.mapAvoid(), t: this.timing.clock,
    };
  }

  private netKeyDown(e: KeyboardEvent) {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.netAct(netKey(this.netState(), k));
  }

  private netPointerAt(e: PointerEvent, press: boolean) {
    const r = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.camera.k, py = ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.camera.k;
    const { act, pointer } = netPointer(this.netState(), this.camera.viewW, this.camera.viewH, px, py, press, e.pointerType === 'mouse');
    this.canvas.style.cursor = pointer ? 'pointer' : '';
    if (press) e.preventDefault();
    this.netAct(act);
  }

  /** Do what the net map asks: close, or a machine picked (onto the board, or why not). */
  private netAct(a: NetAct) {
    if (a.kind === 'close') { this.closeNet(); return; }
    if (a.kind === 'blip') { sound.blip(); return; }
    if (a.kind !== 'pick') return;
    const name = this.machineName(a.machine);
    if (a.state === 'out') { sound.denied(); this.flash(name + ': out of reach. plug in from ' + a.net.need); return; }
    if (a.state === 'far') {
      sound.denied();
      const place = a.machine.in.filter((s) => this.hasScene(s)).map((s) => sceneTitle(this.sceneDefinition(s as SceneId)))[0] ?? 'another place';
      this.flash(name + ' answers. its board is at ' + place);
      return;
    }
    this.closeNet(false);
    this.zh.plugIn(a.machine.id);
  }

  /** The deck's `scan`: what you reach from where you are plugged in (needs scan.so). */
  private deckScan() {
    const zh = this.zh, reached = zh.model.netsHere();
    for (const n of reached) if (zh.model.canScan && !this.save.nets.includes(n)) this.save.nets.push(n);
    this.persistSave();
    const l = zh.model.scanHere();
    this.term.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : 'dim');
    if (l[2] !== 'err' && reached.size) this.term.print('networks in reach: ' + this.networkContext.net.networks.filter((n) => reached.has(n.id)).map((n) => n.name).join(', '), 'dim');
  }

  /** The deck's `connect <machine>` (by id or name): onto the board, and the deck talks to it from then on. */
  private deckConnect(name: string) {
    const zh = this.zh, want = name.toLowerCase().replace(/\s+/g, '');
    const all = this.networkContext.net.networks.flatMap((n) => n.machines);
    const m = all.find((x) => x.id.toLowerCase() === want || this.machineName(x).toLowerCase().replace(/\s+/g, '') === want);
    const id = m?.id ?? name;
    if (!zh.model.devices.has(id) && !zh.model.nodesHere().includes(id) && !m) { this.term.print('connect: no machine called ' + (name || '?') + ' in reach. try scan.', 'err'); return; }
    zh.typed(() => zh.plugIn(id));
  }

  /** The GOAL after Capsule 7B, until scan.so is yours: the library (Act I: Capsule 7B → the library → Downtown). */
  private libraryGoal(): string | null {
    return goalHint(this.openingStory.GOAL_HINTS, {
      hackLocked: this.hackLocked(), scene: this.scenes.here, programs: this.save.programs,
      goalsDone: (scene) => this.scenes.hosts.get(scene as SceneId)?.model.goals ?? new Set(this.save.scenes[scene]?.goals ?? []),
      goalsLeft: () => this.zh.model.data.goals.some((g) => !this.zh.model.goals.has(g.id)),
    });
  }

  /** The city map when it is open, and the fade of a quick trip (dark in the middle, with where you are going). */
  private drawMap() {
    if (this.presentation.hop) {
      const x = this.x, f = (this.timing.clock - this.presentation.hop.start) / this.world.HOP;
      x.fillStyle = 'rgba(0,0,0,' + Math.min(1, 1.2 - Math.abs(f * 2 - 1) * 1.2) + ')'; x.fillRect(0, 0, this.camera.viewW, this.camera.viewH);
      if (f > 0.3 && f < 0.7) { x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.85)'; x.fillText('> ' + this.presentation.hop.place.name, this.camera.viewW / 2, this.camera.viewH / 2); x.restore(); }
    }
    if (this.presentation.mapView) this.worldMap.drawCityMap(this.x, this.camera.viewW, this.camera.viewH, this.mapState());
  }
}

/**
 * The camera nudge: how long it leans towards an event (clock frames, ~1.6 s), how gently it moves
 * (ease per frame, against the follow's 0.12), the margin kept round the event and the player (world
 * units), and the least time between two nudges (frames, ~5 s).
 */

/** Hack vision zooms out at least this far, even where the scene already fits the view (room over its devices for the circuits). */

/** The least street the view shows across (world units); a squarish window drops a scale step to keep it. */

/** …but never by making the view taller than this (world units). */

/** How often the clock's progress is written to the save while it runs (frames, ~10 s). */

/** A minute of the day as HH:MM (any number of minutes on). */
