import {validateWorldCompositions} from '../world/compositions';
import {validateZoneGraph} from '../world/zone-graph';
import {backdropDocuments} from '../world/backdrops';
import {useSharedState} from '../engine/gameplay/shared-state';
import {pendingFixtureVocabulary} from './pending-fixtures';
import {pendingOpeningStory} from './pending-opening';
import {validateCompanionGameplay} from '../engine/gameplay/companion-conversations';
import {validatePendingNetwork} from './pending-network';
import {art,type ChunkDocument} from '../art';
import {createRuntimeSequenceDocuments} from '../story/sequence-documents';
import {createSequenceValidationContext} from '../art/core/sequence-context';
import {pendingDestinations} from './pending-destinations';
import {pendingRegistry,pendingTestDistrict} from './pending-registry';
import {validateMetroSource} from '../world/transport/metro-source';
import {createCityModel} from '../world/city';
import {validateBotReactions,validateBotGameplay} from '../engine/gameplay/bot-conversations';
import {validateCompanionSource} from '../engine/gameplay/companion-source';
import {validateCritterReactions,validateCritterGameplay} from '../engine/gameplay/critter-reactions';
import {validateReviewStations} from '../demo/review-stations';
import {pendingScene} from './pending-scene';

import {manifestDemoScene,validateManifestScene,validateManifestGameplay,validateManifestComposition} from '../scenes/demo-manifest';

import {demoContent} from '../demo';
import { touchControls } from '../ui/touch-controls';
/** Trusted entry, executed only in a disposable opaque-origin sandbox. */
import { Game } from '../runtime/game';
import { EDITOR_PLAY } from '../runtime/mode';
import { installPlayProfiles, saveKey, SHIPPED_PROFILES } from '../runtime/play-profile';
import { validatePlayProfiles } from '../runtime/play-profiles';
import { applyProfileChrome } from '../runtime/profile-chrome';
import { gameStorage, capturePrivateStorage, restorePrivateStorage } from '../runtime/storage';
import { takeResume } from '../runtime/slots';
import {validatePlayFixtures} from '../world/checkpoints';
import {reconstructCheckpoint} from './checkpoint';
import {validateFrameViewport} from '../runtime/frame';

import {setOverride} from '../world/weather';

if (!EDITOR_PLAY) throw new Error('Editor play requires its dedicated frame');
let game: Game | undefined, started = false;
const send = (type: string, value?: unknown) => parent.postMessage({channel:'editor-play',type,value}, '*');
window.addEventListener('editor-runtime-reload', () => {
  const resumed=takeResume(),hasSave=!!gameStorage.getItem(saveKey());
  if(!resumed&&hasSave)game?.checkpoint();
  send('restart',{memory:capturePrivateStorage()});
});
window.addEventListener('message', async event => {
  if (event.source !== parent || event.data?.channel !== 'editor-play' || event.data.type !== 'start' || started) return;
  started = true;
  try {
    const {sourceDocuments,deviceSource,metroSource,citySource,botReactions,fixture,composition,gameplay,sceneDocument,memory,fonts,district,manifest,profile,viewport:viewportInput,camera} = event.data.value;
    const viewport=viewportInput===undefined?undefined:validateFrameViewport(viewportInput);
    if(camera&&(!viewport||typeof camera.scene!=='string'||!Number.isFinite(camera.x)||!Number.isFinite(camera.h)))throw Error('Invalid initial preview camera');
    const pendingProfiles=sourceDocuments?.find((d:{id:string})=>d.id==='play-profiles');
    const pendingStarts=sourceDocuments?.find((d:{id:string})=>d.id==='play-fixtures')?.value;
    installPlayProfiles(pendingProfiles?validatePlayProfiles(pendingProfiles.value,{checkpoints:pendingStarts?.fixtures}):SHIPPED_PROFILES,!!district||!!manifest,pendingStarts,profile);
    const sequenceValues=sourceDocuments?new Map<string,unknown>(sourceDocuments.map((d:{id:string;value:unknown})=>[d.id,d.value])):undefined;
    if(sequenceValues?.has('state-owners'))useSharedState(sequenceValues.get('state-owners'));
    const sequences=sequenceValues?createRuntimeSequenceDocuments(sequenceValues,createSequenceValidationContext(art,Object.fromEntries([...sequenceValues].filter(([id])=>['sequence-title','sequence-opening','sequence-intro','sequence-act2','sequence-taxi'].includes(id))) as Record<string,ChunkDocument>,pendingDestinations(sequenceValues))):undefined;
    const registry=sourceDocuments?pendingRegistry(new Map(sourceDocuments.map((d:{id:string;value:unknown})=>[d.id,d.value]))):undefined;
    const districtContent=district&&sequenceValues&&registry?pendingTestDistrict(sequenceValues,registry):undefined;
    const playRegistry=districtContent??registry;
    const fixtureVocabulary=sequenceValues&&playRegistry?pendingFixtureVocabulary(sequenceValues,playRegistry):undefined;
    const f=validatePlayFixtures({version:1,fixtures:[fixture]},true,Object.keys(playRegistry??{}),fixtureVocabulary).fixtures[0];
    if(districtContent&&!Object.prototype.hasOwnProperty.call(districtContent,f.scene))throw new Error('Demo entry outside district');
    if(manifest&&f.scene!=='shop')throw new Error('Invalid manifest pilot role');
    const scene=manifest?manifestDemoScene(validateManifestComposition(composition),{},{},validateManifestScene(sceneDocument,validateManifestGameplay(gameplay)),validateManifestGameplay(gameplay)):districtContent?.[f.scene as keyof ReturnType<typeof demoContent>]??registry?.[f.scene]??pendingScene(f.scene,composition,{gameplay,sceneDocument,devices:deviceSource});
    if(f.spawn!==null&&f.spawn>scene.width-12)throw new Error('Starting X is outside the scene');
    if(f.weather!=='forecast')setOverride('city',f.weather);
    for(const font of fonts ?? []) { const face=new FontFace('IBM Plex Mono',font.bytes,{weight:String(font.weight)});await face.load();document.fonts.add(face); }
    await Promise.all([400,500,600,700].map(weight=>document.fonts.load(`${weight} 16px "IBM Plex Mono"`)));
    await document.fonts.ready;
    if(memory)restorePrivateStorage(memory);
    const freshStart=!gameStorage.getItem(saveKey());
    const checkpoint=freshStart&&sequenceValues&&playRegistry?reconstructCheckpoint(f,sequenceValues,playRegistry):undefined;
    if(freshStart){if(!checkpoint)throw Error('Checkpoint requires pending source documents');gameStorage.setItem(saveKey(),JSON.stringify(checkpoint.save));}
    document.documentElement.classList.add('game-mode');applyProfileChrome(document.documentElement);
    document.body.innerHTML='<section class="demo-window"><header hidden></header><footer hidden></footer><div id="input-host"></div></section>';
    const windowEl=document.querySelector<HTMLElement>('.demo-window')!;
    game=new Game({windowEl,viewport,initialCamera:camera,header:windowEl.querySelector('header')!,footer:windowEl.querySelector('footer')!,inputHost:document.getElementById('input-host')!,onExit:()=>send('quit'),setNodes:()=>{},setScene:()=>{}},districtContent??{...registry,[f.scene]:scene},f.clock,botReactions===undefined?undefined:validateBotReactions(botReactions),citySource===undefined?undefined:createCityModel(citySource,registry?{scenes:registry}:undefined),metroSource===undefined?undefined:validateMetroSource(metroSource),freshStart?f.metro:undefined,{checkpointVocabulary:fixtureVocabulary,sequences,critterGameplay:sequenceValues?.has('critter-gameplay')?validateCritterGameplay(sequenceValues.get('critter-gameplay')):undefined,botGameplay:sequenceValues?.has('bot-gameplay')?validateBotGameplay(sequenceValues.get('bot-gameplay')):undefined,backdrops:backdropDocuments(sequenceValues),network:sequenceValues&&registry?validatePendingNetwork(sequenceValues,registry):undefined,companionGameplay:sequenceValues?.has('companion-gameplay')?validateCompanionGameplay(sequenceValues.get('companion-gameplay')):undefined,companion:sequenceValues?.has('companion')?validateCompanionSource(sequenceValues.get('companion'),sequenceValues.has('companion-gameplay')?validateCompanionGameplay(sequenceValues.get('companion-gameplay')):undefined):undefined,critters:sequenceValues?.has('critter-reactions')?validateCritterReactions(sequenceValues.get('critter-reactions')):undefined,reviewStations:sequenceValues?.has('review-stations')?validateReviewStations(sequenceValues.get('review-stations')):undefined,worldCompositions:sequenceValues?.has('world-compositions')?validateWorldCompositions(sequenceValues.get('world-compositions')):undefined,zoneGraph:sequenceValues?.has('zone-graph')?validateZoneGraph(sequenceValues.get('zone-graph')):undefined,openingStory:sequenceValues?.has('opening-story')?pendingOpeningStory(sequenceValues,registry!):undefined});
    if(matchMedia('(pointer: coarse)').matches){document.documentElement.classList.add('touch');touchControls(windowEl);}
    game.start(f.scene,false,freshStart?f.spawn??undefined:undefined,freshStart?f.entrance:undefined);
    if(checkpoint?.sequence)game.startCheckpointDirection(checkpoint.sequence);
    send('running',game.inspect());
    setInterval(()=>send('state',game!.inspect()),250);
  } catch(error) { send('error',error instanceof Error?error.message:String(error)); }
});
send('ready');
