import {mountConversationLibrary,type ConversationSelection} from './conversation-library';
import {mountChunkConnections} from './chunk-connections';
import {sequenceCommandTargets} from '../runtime/sequence-commands';
import {compileGameWorld} from '../world/compiled-world';
import {validateWorldCompositions} from '../world/compositions';
import {mountFlowAuthoring} from './flow-authoring';
import {mountVehicleAuthoring} from './vehicle-authoring';
import {backdropAdapters,backdropInspector} from './backdrop-preview';
import {validateBackdrop} from '../world/backdrops';
import {withSharedState} from '../engine/gameplay/shared-state';
import {validateSharedState,validateGameplay} from '../engine/gameplay/validation';
import {validationSnapshot} from './validation-snapshot';
import {mountStoryLogicAuthoring} from './story-logic-authoring';
import {mountGameSettingsAuthoring} from './game-settings-authoring';
import {mountStartingStateAuthoring} from './starting-state-authoring';
import {mountWorldVariableAuthoring} from './world-variable-authoring';
import {validateCompanionGameplay,validateCompanionBindings} from '../engine/gameplay/companion-conversations';
import {pendingOpeningStory} from './pending-opening';
import {pendingNetworkContext,validatePendingNetwork} from './pending-network';
import {mountNetworkAuthoring} from './network-authoring';
import {pendingRegistry,authoringValidationInputs} from './pending-registry';
import {validatePendingFixtures} from './pending-fixtures';
import {createAuthoredScene,removeAuthoredScene,authoredSceneIds,sceneCreationBlocked,scenePlaces} from './scene-catalogue-authoring';
import {type SceneCatalogue} from '../engine/gameplay/scene-catalogue';
import {sceneCatalogueProjection} from './scene-catalogue-projection';
import {mountDeviceAuthoring} from './device-authoring';
import {deviceSceneIds,deviceDocumentId,deviceSourceIdentity,applyDeviceSource} from './device-sources';
import {pendingScene} from './pending-scene';
import {createLineSystem} from '../world/transport/line';
import {validateMetroSource,validateMetroLocks} from '../world/transport/metro-source';
import {validatePendingCity,createPendingCity} from './pending-city';
import {placeFrom,validateZoneGraph} from '../world/zone-graph';
import {zoneName} from './zone-graph-context';
import {validateBotReactions,validateBotGameplay,validateBotConversationBindings} from '../engine/gameplay/bot-conversations';
import {validatePendingRules} from './pending-rules';
import {validateCritterReactions,validateCritterGameplay,validateCritterConversations} from '../engine/gameplay/critter-reactions';
import {mountReviewStationsAuthoring} from './review-stations-authoring';
import {mountPlayProfileAuthoring} from './play-profile-authoring';
import {validatePendingPlayProfiles} from './play-profile-source';
import {manifestDemoScene,validateManifestScene,validateManifestGameplay,validateManifestComposition,validateManifestSources} from '../scenes/demo-manifest';
import {nativeGameplayScene,nativeGameplayScenes} from './native-gameplay-scenes';
import {pendingDestinations} from './pending-destinations';
import {validateDeclaredDestinations} from '../engine/gameplay/declared-scene';
import {gameplayScenes,gameplayScene,authoredDocumentIds} from './gameplay-scenes';

import {mountRegisteredGameplay} from './registered-gameplay';

import {mountSceneAuthoring} from './scene-authoring';


import {validateFixtureMetro,playScenes} from '../world/checkpoints';

import { mountPlayWorkbench } from './play-workbench';

/** Shared browser entry: local protected source editing or public static snapshot/downloads. */

import { art, type ChunkDocument } from '../art';

import {mountComposer} from './app';
import {type ComposerConfig,type EditorDocument,type InspectorSection,type WorkbenchContext,type WorkbenchHandle} from './contracts';
import type { AssetInstance } from '../art/core/composition';
import type { SceneDocument } from '../engine/gameplay/scene-document';

import { createNativePreview } from './native-preview';

import { nativeSceneAdapters,authoredSceneAdapter } from './scene-adapters';
import { PROPOSAL_SCENES, proposalAdapters, proposalLooksOnly, proposalScene } from './proposal-scenes';

import {createSequenceValidationContext,frameTimelineContext} from '../art/core/sequence-context';

import { WEATHER_KINDS } from '../world/weather';

import { SCENES, isSceneId, sceneTitle } from '../scenes';

import { snapshotWorld, validateWorldDocument } from '../world/document';

import {sequenceProgram} from '../art/core/sequence';

import { mountWorldPanel, type WorldPanelSession } from './world-panel';

import { createAssetPreview } from './asset-preview';

import { mountCharacterWorkbench } from './character-workbench';
import type { PlayFixtures } from '../world/checkpoints';
import { mountStyleFrames, type StyleFrameSession } from './style-frames';

import { mountVehicleWorkbench } from './vehicle-workbench';
import { mountBuildingWorkbench } from './building-workbench';



import { mountEventInspector } from './event-inspector';
import { mountBarrierAuthoring } from './barrier-authoring';

import { mountSourceViewer } from './source-viewer';







import { mountSignageWorkbench } from './signage-workbench';
import { applyPeople, validatePeople } from '../art/characters/people-source';
import { validatePresets } from './kit-presets';
import { mountPeopleAuthoring } from './people-authoring';
import { validateStoryboard } from './storyboard';
import {storyboardLinks} from './storyboard-links';
import { mountStoryboard, type StoryboardSession } from './storyboard-workbench';



/** Play context for a proposal: every document as is, except the base scene's composition, which is the proposal's. */
function asProposal(context: WorkbenchContext, p: { id: string; base: string }): WorkbenchContext {
  const swap = (docs: EditorDocument[]) => { const own = docs.find(d => d.id === p.id); return own ? docs.map(d => d.id === p.base ? { ...d, value: { ...(own.value as ChunkDocument), scene: p.base } } : d) : docs; };
  return Object.defineProperty({ ...context }, 'documents', { get: () => swap(context.documents), enumerable: true });
}

async function start() {

  const host = document.getElementById('composer'); if (!host) throw new Error('Missing editor host');

  const publicEditor = document.documentElement.dataset.editorMode === 'public';

  let api: ComposerConfig['api'], documents: EditorDocument[] | undefined;

  let sourceSnapshot: Promise<Record<string, string>> | undefined;

  if (publicEditor) {

    // These stable URLs are rebuilt with the editor; do not reuse another release's cache.
    const response = await fetch('./documents.json', { credentials: 'omit', cache: 'no-store' }); if (!response.ok) throw new Error('Published editor documents are unavailable');

    documents = await response.json() as EditorDocument[];

  } else {

    const response = await fetch('/bootstrap', { credentials: 'omit' }); if (!response.ok) throw new Error('Local editor session is unavailable');

    api = (await response.json() as { api: ComposerConfig['api'] }).api;

  }

  await Promise.all([400, 500, 600, 700].map(weight => document.fonts.load(`${weight} 16px "IBM Plex Mono"`)));

  await document.fonts.ready;

  const initialEnvironment = { cameraX: 0, zoom: 1, day: 1, minute: 720, seed: 3, flags: '{}', state: '{}', weather: 'forecast', hover: '', titleOffset: 7 };
  const styleFrameSession: StyleFrameSession = {}, storyboardSession: StoryboardSession = {};
  const native = createNativePreview({...backdropAdapters,...nativeSceneAdapters,...proposalAdapters,'demo-manifest':{validate:validateManifestComposition,definition:manifestDemoScene,pendingDefinition:(composition,state,options,documents)=>{const gameplay=validateManifestGameplay(documents.get('demo-manifest-gameplay'));return manifestDemoScene(composition,state,options,validateManifestScene(documents.get('demo-manifest-scene'),gameplay),gameplay);}}},(scene,request)=>{if(!request.documents)return scene;const deviceId=deviceDocumentId(request.composition.scene);if(request.documents.has(deviceId))scene=applyDeviceSource(request.composition.scene,scene,request.frame?.composition??request.composition,request.documents.get(deviceId),pendingNetworkContext(request.documents),request.documents.get(deviceSourceIdentity(request.composition.scene).scene) as import('../engine/gameplay/scene-document').SceneDocument);if(!scene.bindWorld)return scene;const city=createPendingCity(request.documents.get('city-source'),request.documents),metro=createLineSystem(city,validateMetroSource(request.documents.get('metro-source')));return scene.bindWorld({city,metro});},(id,request)=>authoredSceneAdapter(id,request.documents));

  const mapSession: WorldPanelSession = {};

  const conversationSelection:ConversationSelection={document:'companion-gameplay',conversation:''};
  const deviceSelection:{scene?:string;device?:string;noun?:string;group?:string}={},wireSelection:{scene?:string}={};
  const playSelection:{fixture?:string;device?:string;scene?:string}={},previewOnly=new Set<string>();

  const manifestSelection:{fixture?:string;device?:string}={};
  const demoSelection:{fixture?:string;device?:string}={};
  const logicSelection:{scene?:string;sourceId?:string;use?:string;fixed?:boolean}={fixed:true},gameplaySelection:{scene?:string;sourceId?:string;fixed?:boolean}={fixed:true};
  // Demo-only variants (Test District) stay in Labs; the scene modes cover the story scenes.
  const logicScenes:string[]=gameplayScenes.filter(s=>!s.id.startsWith('demo')).flatMap(s=>[s.id,s.prefix]),commandScenes:string[]=[...logicScenes,...nativeGameplayScenes.filter(s=>!s.id.startsWith('demo')).map(s=>s.id)];

  mountComposer(host, { registry: art, api, documents, projections:[sceneCatalogueProjection], viewport: { width: 960, height: 540 },
    sceneTree: documents => {
      // The pending city source, so moving a place in World â€º City & travel regroups the picker.
      const city = documents.find(d => d.id === 'city-source')?.value as { DISTRICTS?: { id: string; name: string }[]; PLACES?: { name: string; district: string | null; scenes: string[] }[] } | undefined;
      if (!city?.DISTRICTS || !city.PLACES) return [];
      const placesIn = (district: string | null) => city.PLACES!.filter(p => p.district === district).map(p => ({ label: p.name, scenes: p.scenes }));
      return [...city.DISTRICTS.map(d => ({ label: d.name, places: placesIn(d.id) })), { label: 'Outside the districts', places: placesIn(null) }];
    },
    sceneLabel: scene => proposalScene(scene) ? proposalScene(scene)!.label : isSceneId(scene) ? sceneTitle(SCENES[scene]) : scene.startsWith('sequence-') ? 'Sequence Â· ' + scene.slice('sequence-'.length) : scene,
    sceneDocuments:(scene,documents)=>{try{const entry=gameplayScene(scene,documents);return[entry.prefix+'-scene',entry.gameplayId];}catch{return nativeGameplayScene(scene)?[nativeGameplayScene(scene)!.gameplayId]:[];}},

    worldStates: {
      // Play's starting states are the scene's saved world states. A proposal uses its base scene's.
      list(scene, documents) {
        const fixtures = (documents.find(d => d.id === 'play-fixtures')?.value as PlayFixtures | undefined)?.fixtures ?? [], own = proposalScene(scene)?.base ?? scene;
        return fixtures.filter(f => !scene||f.scene === own).map(f => ({ id: f.id, name: f.name,checkpoint:f, environment: { day: f.day, minute: f.minute, seed: f.seed, weather: f.weather, flags: JSON.stringify(f.flags),tokens:f.tokens } }));
      },
      selected(scene, documents) { const own = proposalScene(scene)?.base ?? scene; if (previewOnly.has(own)) return ''; const ids = this.list(scene, documents).map(s => s.id); return playSelection.fixture && ids.includes(playSelection.fixture) ? playSelection.fixture : ids[0] ?? ''; },
      select(scene, id) { const own = proposalScene(scene)?.base ?? scene; if (id) { previewOnly.delete(own); playSelection.fixture = id; } else previewOnly.add(own); },
      edit(_scene, id, key, value, documents) {
        if (!['day', 'minute', 'seed', 'weather', 'flags'].includes(key)) return undefined;
        const doc = structuredClone(documents.find(d => d.id === 'play-fixtures')!.value as PlayFixtures), fixture = doc.fixtures.find(f => f.id === id); if (!fixture) return undefined;
        if (key === 'flags') fixture.flags = JSON.parse(String(value)); else (fixture as unknown as Record<string, unknown>)[key] = value;
        return { id: 'play-fixtures', value: doc };
      },
    },
    compareWith(scene) {
      const proposal = proposalScene(scene);
      if (proposal) return [{ id: proposal.base, label: `Today Â· ${isSceneId(proposal.base) ? sceneTitle(SCENES[proposal.base]) : proposal.base}` }];
      return PROPOSAL_SCENES.filter(p => p.base === scene).map(p => ({ id: p.id, label: p.label }));
    },
    assetDistricts(documents) {
      const city = documents.find(d => d.id === 'city-source')?.value as { DISTRICTS: { id: string; name: string }[]; PLACES: { district: string; scenes: string[] }[] } | undefined;
      const sceneDistrict = new Map((city?.PLACES ?? []).flatMap(p => p.scenes.map(scene => [scene, p.district] as const)));
      return { list: (city?.DISTRICTS ?? []).map(d => ({ id: d.id, name: d.name })), of: scene => sceneDistrict.get(scene) };
    },
    assetPreview: createAssetPreview(art, native, (canvas, request) => native.render(canvas, request), { showcase: true }),

    // Proposals borrow gameplay from their base; validators below never read proposal artwork.
    // Projected authored.* children are covered by their authored-scenes source owner.
    validationInputs: authoringValidationInputs,
    // Scenes validate against the pending world/state-owners.json, as Save and Play do.
    validatePlacement(composition,documents){
      const snapshot=validationSnapshot(documents),scenes=pendingRegistry(snapshot),scene=scenes[composition.scene];
      // Reuse the world compiler and its registered anchors without rebuilding every scene per pointer sample.
      if(scene)compileGameWorld({...scenes,[composition.scene]:{...scene,artwork:composition}},snapshot);
    },
    validateDocument(document,documents) {return withSharedState(documents.find(d=>d.id==='state-owners')?.value,()=>{
      if(document.id.startsWith('backdrop-')){validateBackdrop(document.value,document.id.slice(9));return;}
      if(document.id==='state-owners'){validateSharedState(document.value);for(const d of documents)if(d.kind==='gameplay'&&d.id!=='state-owners'&&(d.value as {sharedState?:unknown})?.sharedState!==undefined)validateGameplay(d.value);pendingRegistry(validationSnapshot(documents));return;}
      if(document.id==='critter-gameplay'||document.id==='critter-reactions'){const values=validationSnapshot(documents);validateCritterConversations(validateCritterReactions(values.get('critter-reactions')),validateCritterGameplay(values.get('critter-gameplay')));return;}
      if(document.id==='bot-gameplay'||document.id==='bot-reactions'){const values=validationSnapshot(documents);validateBotConversationBindings(validateBotReactions(values.get('bot-reactions')),validateBotGameplay(values.get('bot-gameplay')));pendingRegistry(values);return;}
      if(document.id==='companion-gameplay'){validateCompanionGameplay(document.value);pendingRegistry(validationSnapshot(documents));return;}
      if(document.id==='opening-story'){const values=validationSnapshot(documents);pendingOpeningStory(values);return;}
      if(document.id==='network'){const values=validationSnapshot(documents);validatePendingNetwork(values,pendingRegistry(values));return;}
      if(document.id==='authored-scenes'){pendingRegistry(validationSnapshot(documents));return;}
      if(document.id.startsWith('authored.'))return; // The source owner validates all projected documents and references together.
      if(document.kind==='devices'){const id=deviceSceneIds.find(id=>deviceDocumentId(id)===document.id);if(!id)throw new Error('Unknown device document');pendingScene(id,documents.find(d=>d.id===id)!.value,{devices:document.value,sceneDocument:documents.find(d=>d.id===deviceSourceIdentity(id).scene)!.value,gameplay:documents.find(d=>d.id===deviceSourceIdentity(id).gameplay)!.value,sharedState:documents.find(d=>d.id==='state-owners')?.value},pendingNetworkContext(validationSnapshot(documents)));}
      if(document.kind==='profiles'){if(document.id!=='play-profiles')throw new Error('Unsupported profiles document');validatePendingPlayProfiles(document.value,validationSnapshot(documents));}
      if(document.kind==='presets'){if(document.id!=='kit-presets')throw new Error('Unsupported presets document');validatePresets(document.value,art);}
      if(document.kind==='people'){if(document.id!=='people')throw new Error('Unsupported people document');validatePeople(document.value);}
      if(document.kind==='storyboard'){if(document.id!=='storyboard')throw new Error('Unsupported storyboard document');validateStoryboard(document.value,new Set(documents.filter(d=>d.kind==='composition').map(d=>(d.value as import('../art').ChunkDocument).scene)),storyboardLinks(validationSnapshot(documents)).links);}
      if(document.id==='world-compositions'){validateWorldCompositions(document.value);pendingRegistry(validationSnapshot(documents));return;}
      if(document.id==='zone-graph'){validateZoneGraph(document.value);pendingRegistry(validationSnapshot(documents));return;} // Contextual connections and protected Save validate seams against their chunks.
      if(document.kind==='transport'){if(document.id!=='metro-source')throw new Error('Unsupported transport source');validateMetroLocks(validateMetroSource(document.value),(validationSnapshot(documents).get('city-source') as {LOCKS?:Record<string,unknown>}|undefined)?.LOCKS);}
      if(document.kind==='city')validatePendingCity(document.value,validationSnapshot(documents));
      if(document.kind==='rules')validatePendingRules(document.id,document.value,validationSnapshot(documents));
      if(document.id==='demo-manifest-scene'){const declared=validateManifestSources(documents.find(d=>d.id==='demo-manifest')!.value,document.value,documents.find(d=>d.id==='demo-manifest-gameplay')!.value);validateDeclaredDestinations(declared.scene,pendingDestinations(validationSnapshot(documents)));}

      if(document.kind==='scene'){const s=gameplayScene(document.id),gameplay=s.validateGameplay(documents.find(d=>d.id===s.gameplayId)!.value);if((document.value as import('../engine/gameplay/scene-document').SceneDocument).nativeTargets!==undefined){const values=validationSnapshot(documents),network=pendingNetworkContext(values),scene=pendingRegistry(values)[s.id];s.validateScene(document.value,gameplay,{phase:'assembled',data:scene.data!,network});}else s.validateScene(document.value,gameplay);validateCompanionBindings((document.value as SceneDocument).companion,gameplay,validateCompanionGameplay(documents.find(d=>d.id==='companion-gameplay')!.value));}

      if(document.kind==='fixtures'){if(document.id!=='play-fixtures')throw new Error('Unsupported fixture document');const snapshot=validationSnapshot(documents);validateFixtureMetro(validatePendingFixtures(document.value,snapshot),createPendingCity(snapshot.get('city-source'),snapshot));}


      if (document.kind === 'gameplay') (nativeGameplayScene(document.id)??gameplayScene(document.id)).validateGameplay(document.value);
    });},

    newScene: { places: scenePlaces, blocked: sceneCreationBlocked, create: createAuthoredScene,removable:authoredSceneIds,remove:removeAuthoredScene,presets:[{value:'shuttle',label:'Working shuttle'},{value:'cart',label:'Curve and drop cart'}] },
    workbenches: [
      {id:'conversations',area:'library',label:'Conversations',title:'Conversations · shared and character graphs',authoring:true,documentDependent:true,get primaryDocumentId(){return conversationSelection.document;},selectConversation(document,conversation){conversationSelection.document=document;conversationSelection.conversation=conversation;},mount:(host,context)=>mountConversationLibrary(host,context,conversationSelection,publicEditor)},
      {id:'game-settings',area:'world',label:'Game settings',title:'Launch, player defaults, guidance/time, contacts and ending',authoring:true,documentDependent:true,mount:mountGameSettingsAuthoring},
      {id:'story-logic',area:'library',label:'Story logic',title:'Global story commands, phase policies, cards and triggers',authoring:true,documentDependent:true,primaryDocumentId:'opening-story',mount:mountStoryLogicAuthoring},
      {id:'play-profiles',area:'labs',label:'Test configurations',title:'Run configuration and isolated storage for campaign, Harbor and Test District testing',authoring:true,documentDependent:true,documentIds:['authored-scenes','play-profiles'],primaryDocumentId:'play-profiles',mount:mountPlayProfileAuthoring},
      {id:'world-variables',area:'world',layout:'sections',label:'World variables',title:'Variable declarations, storage bindings, authored uses and checkpoint overrides',authoring:true,documentDependent:true,mount:mountWorldVariableAuthoring},
      {id:'network',area:'world',layout:'sections',label:'Networks',title:'Networks, reach and permissions',authoring:true,documentDependent:true,primaryDocumentId:'network',mount:(host,context)=>mountNetworkAuthoring(host,context,()=>Object.values(pendingRegistry(new Map(context.documents.map(d=>[d.id,d.value])))).flatMap(s=>s.data?[s.data]:[]))},
      {id:'scene-connections',area:'scene',mode:'wiring',label:'Starting cables',title:'Authored scene connections',authoring:true,documentDependent:true,supports:(scene,documents)=>{try{return scene!=='demo-manifest'&&!!gameplayScene(scene,documents);}catch{return false;}},showScene(scene){wireSelection.scene=scene;},unsupported:'This scene has no registered device document yet.',mount:(host,context)=>mountDeviceAuthoring(host,context,wireSelection,true,()=>pendingNetworkContext(new Map(context.documents.map(d=>[d.id,d.value]))))},
      {id:'review-stations',area:'labs',layout:'sections',label:'Review shortcuts',title:'Test District bookmarks, buttons and the remote-device example',authoring:true,documentDependent:true,documentIds:['review-stations'],primaryDocumentId:'review-stations',mount:mountReviewStationsAuthoring},
      {id:'manifest-pilot',area:'labs',label:'Manifest pilot',title:'Declared scene: pending source in private Play',authoring:true,documentDependent:true,mount:(host,context)=>mountPlayWorkbench(host,context,manifestSelection,false,true,'Lab Â· the declared demo scene, built only from its pending manifest source, running in private Play. A test bed for the scene manifest format, not part of the scene workflow.')},
      {id:'scene-logic',area:'scene',mode:'logic',label:'Interactions & story',title:'Scene logic: interactions, objectives, dialogue and presentation',authoring:true,documentDependent:true,documentIds:[...authoredDocumentIds,'authored-scenes','bot-reactions','bot-gameplay','critter-reactions','critter-gameplay','companion','companion-gameplay'],
        supports:(scene,documents)=>{try{gameplayScene(scene,documents);return !scene.startsWith('demo-')||scene==='demo-manifest';}catch{return false;}},showScene(scene,documents){if(logicSelection.scene!==scene)logicSelection.use=undefined;logicSelection.scene=scene;logicSelection.sourceId=gameplayScene(scene,documents).prefix+'-scene';},
        unsupported:'This sceneâ€™s interactions, objectives and dialogue are still defined in code. They become editable once the scene is migrated to scene documents.',
        get primaryDocumentId(){return logicSelection.sourceId??'downtown-scene';},mount:(host,context)=>mountSceneAuthoring(host,context,logicSelection)},
      {id:'gameplay',area:'scene',mode:'logic',label:'Commands & dialogue',title:'Gameplay Â· commands, conditions and conversations',authoring:true,documentDependent:true,documentIds:['authored-scenes',...authoredDocumentIds,...nativeGameplayScenes.map(s=>s.gameplayId)],
        supports:(scene,documents)=>{if(commandScenes.includes(scene))return true;try{return !!gameplayScene(scene,documents);}catch{return false;}},showScene(scene,documents){gameplaySelection.scene=scene;gameplaySelection.sourceId=(nativeGameplayScene(scene)??gameplayScene(scene,documents)).gameplayId;},
        unsupported:'This scene has no gameplay document yet. Its commands are still defined in code.',
        get primaryDocumentId(){return gameplaySelection.sourceId??'downtown-gameplay';},mount:(host,context)=>mountRegisteredGameplay(host,context,gameplaySelection,publicEditor)},
      {id:'device-config',area:'scene',mode:'logic',label:'Devices',title:'Device nouns, verbs, guards and controller parameters',authoring:true,documentDependent:true,supports:(scene,documents)=>{try{return scene!=='demo-manifest'&&!!gameplayScene(scene,documents);}catch{return false;}},showScene(scene){if(deviceSelection.scene!==scene){deviceSelection.device=undefined;deviceSelection.noun=undefined;}deviceSelection.scene=scene;},unsupported:'This scene has no registered device document yet.',mount:(host,context)=>mountDeviceAuthoring(host,context,deviceSelection,false,()=>pendingNetworkContext(new Map(context.documents.map(d=>[d.id,d.value]))))},
      { id: 'events', area: 'scene', mode: 'wiring', label: 'Events', title: 'Scene events and connections Â· read-only', documentDependent: true, mount(panel, context) {
        const graph = document.createElement('section'), source = document.createElement('section'); panel.replaceChildren(graph, source);
        const viewer = mountSourceViewer(source, publicEditor ? { async read(file, signal) {
          if (!sourceSnapshot) sourceSnapshot = fetch('./sources.json', { credentials: 'omit', cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error('Published source snapshot is unavailable'); return response.json() as Promise<Record<string, string>>; }).catch(error => { sourceSnapshot = undefined; throw error; });
          const snapshot = await sourceSnapshot; if (signal.aborted) throw new Error('Source selection changed');
          if (!Object.prototype.hasOwnProperty.call(snapshot, file) || typeof snapshot[file] !== 'string') throw new Error('Source is outside this published inspector snapshot');
          return { file, text: snapshot[file] };
        } } : {}), dispose = mountEventInspector(graph, { documents: context.documents, network:pendingNetworkContext(new Map(context.documents.map(d=>[d.id,d.value]))), initialScene: context.scene,
          onOpenScene(scene, instance) { const doc = context.documents.find(doc => doc.kind === 'composition' && (doc.value as ChunkDocument).scene === scene); if (doc && instance) context.openInstance(doc.id, instance); else context.openScene(scene); },
          onOpenSource: reference => { void viewer.open(reference); },
        }); return () => { dispose(); viewer.dispose(); panel.replaceChildren(); };
      } },
      {id:'play',area:'scene',mode:'play',label:'Play',title:'Play Â· pending scene from a starting state',authoring:true,documentDependent:true,primaryDocumentId:'play-fixtures',
        supports:(scene,documents)=>(playScenes as readonly string[]).includes(scene)||scene==='demo-manifest'||(playScenes as readonly string[]).includes(proposalScene(scene)?.base??'')&&!proposalLooksOnly(scene,documents.find(d=>d.id===scene)?.value)||!!(documents.find(d=>d.id==='authored-scenes')?.value as SceneCatalogue|undefined)?.scenes.some(s=>s.scene.id===scene),showScene(scene){playSelection.scene=scene==='demo-manifest'?'shop':proposalScene(scene)?.base??scene;},
        unsupported:'Play runs scenes whose starting state can be set up in the editor. This scene is not one of them yet; play it in the game build instead. A style frame that takes only its base sceneâ€™s look (its Base scene use piece: look) is previewed, not played.',
        // A proposal plays as its base scene with the proposal's artwork in place of the base composition.
        mount:(host,context)=>mountPlayWorkbench(host,proposalScene(context.scene??'')?asProposal(context,proposalScene(context.scene!)!):context,playSelection,false,context.scene==='demo-manifest')},
      {id:'demo-world',area:'labs',label:'Demo world',title:'Test District: same engine, separate private progress',authoring:true,documentDependent:true,mount:(host,context)=>mountPlayWorkbench(host,context,demoSelection,true,false,'Lab Â· the Test District: a small separate world on the same engine, with its own private progress. Used to try engine features outside the real city.')},
      { id: 'characters', area: 'library', label: 'Characters', title: 'Characters Â· lineups, named looks and saved people settings', authoring: true, documentDependent: true, documentIds: ['people'], primaryDocumentId: 'people', mount(panel, context) { panel.classList.add('character-workbench'); return mountCharacterWorkbench(panel, { people: host => mountPeopleAuthoring(host, context) }); } },

      { id: 'style-frames', area: 'library', beside: true, label: 'Style frames', title: 'Style frames Â· each districtâ€™s card, people mix and scenes Â· read-only', documentDependent: true, mount(panel, context) {
        return mountStyleFrames(panel, context, native.render, initialEnvironment, styleFrameSession, scene => proposalScene(scene)?.label ?? (isSceneId(scene) ? sceneTitle(SCENES[scene]) : scene));
      } },
      { id: 'storyboard', area: 'library', beside: true, label: 'Storyboard', title: 'Storyboard Â· the acts as places in order, each with its scene or style frame', authoring: true, documentDependent: true, documentIds: ['storyboard'], primaryDocumentId: 'storyboard', mount(panel, context) {
        return mountStoryboard(panel, context, native.render, initialEnvironment, storyboardSession, scene => proposalScene(scene)?.label ?? (isSceneId(scene) ? sceneTitle(SCENES[scene]) : scene));
      } },
      { id: 'vehicles', area: 'library', label: 'Vehicles', title: 'Vehicle workbench Â· read-only', mount(panel) { panel.classList.add('vehicle-workbench'); return mountVehicleWorkbench(panel); } },
      { id: 'buildings', area: 'library', label: 'Buildings', title: 'Building kit Â· fronts and rows Â· read-only', mount(panel) { panel.classList.add('vehicle-workbench'); return mountBuildingWorkbench(panel); } },

      { id: 'signage', area: 'library', label: 'Signs & light', title: 'Signs, lighting and architecture Â· read-only', documentDependent: true, mount(panel, context) {

        panel.classList.add('signage-workbench');

        return mountSignageWorkbench(panel, { registry: art, documents: context.documents,

          openUsage: usage => context.openInstance(usage.document, usage.instance), renderNative: native.render, renderSequence: native.render,

        });

      } },



    ],

    preview: { render: (canvas, request) => { if (request.documents?.has('people')) applyPeople(request.documents.get('people')); return native.render(canvas, request); } },

    inspector: (scene, instance, documents) => scene.startsWith('backdrop-') ? (instance?[]:[backdropInspector(scene)]) : inspectorSections(scene, instance, documents),
    // the scenes one seam away (world/zone-graph.json), which the Scene preview draws beside the open one
    joinedScenes(scene, documents) { const source = documents.find(d => d.id === 'zone-graph')?.value; if (source === undefined) return []; let graph; try { graph = compileGameWorld(pendingRegistry(validationSnapshot(documents)),validationSnapshot(documents)); } catch { return []; } const values = validationSnapshot(documents); return [...placeFrom(graph, scene)].filter(([zone]) => zone !== scene).map(([zone]) => ({ zone, label: zoneName(zone, values) })); },

    worldPanel(panel, openScene, documents, scene,context) {

      const compositions = Object.fromEntries(documents.filter(doc => doc.kind === 'composition').map(doc => [doc.id, doc.value as ChunkDocument]));

      const timelines = sequenceProgram(compositions).sequences;

      const snapshot=validationSnapshot(documents),registry=pendingRegistry(snapshot);
      const refs = Object.fromEntries(Object.entries(compositions).filter(([, doc]) => Object.prototype.hasOwnProperty.call(registry, doc.scene)).map(([id, doc]) => [doc.scene, id]));

      const cityModel=createPendingCity(snapshot.get('city-source'),snapshot);
      const world = snapshotWorld(refs, timelines.flatMap(sequence => sequence.handoff ? [{ id: sequence.id, ...sequence.handoff }] : []),cityModel,registry);

      if(context.cityDistrict){mapSession.mode='Districts';mapSession.editing??={expanded:new Map()};mapSession.editing.expanded??=new Map();mapSession.editing.expanded.set('district:'+context.cityDistrict,true);mapSession.editing.expanded.set('district-rendering:'+context.cityDistrict,true);}
      return mountWorldPanel(panel, validateWorldDocument(world, { compositions, sequences: timelines,world:cityModel,scenes:registry }), openScene,context, mapSession, scene,cityModel);

    },

    motionTracks: createSequenceValidationContext(art,{}).motionTracks,clips:createSequenceValidationContext(art,{}).clips, timelineContext: frameTimelineContext,

    commandTargetsFor:documents=>sequenceCommandTargets(pendingRegistry(validationSnapshot(documents))),
    destinationsFor:documents=>pendingDestinations(validationSnapshot(documents)),
    destinations: Object.fromEntries(Object.entries(SCENES).map(([scene, def]) => [scene, def.exits.map(exit => exit.id)])),

    initialEnvironment,

    environmentControls: [

      { key: 'cameraX', label: 'Camera X', kind: 'number', step: 20 }, { key: 'cameraH', label: 'Camera height', kind: 'number', step: 10 },

      { key: 'zoom', label: 'Game camera zoom', kind: 'number', min: .1, max: 8, step: .1 },

      { key: 'minute', label: 'Time of day', kind: 'number', min: 0, max: 1439, step: 10, quick: true, choices: [{ label: 'Morning', value: 480 }, { label: 'Noon', value: 720 }, { label: 'Evening', value: 1110 }, { label: 'Night', value: 1320 }] },
      { key: 'weather', label: 'Weather', kind: 'select', options: ['forecast', ...WEATHER_KINDS], quick: true },
      { key: 'hack', label: 'Hack vision', kind: 'boolean', quick: true, shortcut: 'h' },
      { key: 'inside', label: 'Inside buildings', kind: 'boolean', quick: true, shortcut: 'i' },
      { key: 'roomsAt', label: 'Rooms as the player sees them (floor ids walked, comma-separated, the last where they stand; floor@x for a place on a floor, else its middle; empty: every room open)', kind: 'text' },
      { key: 'minute', label: 'City minute', kind: 'number', min: 0, max: 1439, step: 10 }, { key: 'day', label: 'City day', kind: 'number', min: 1, step: 1 },
      { key: 'seed', label: 'Weather seed', kind: 'number', min: 0, step: 1 }, { key: 'hover', label: 'Hovered device id', kind: 'text' },

      { key: 'flags', label: 'Story flags (JSON)', kind: 'text' }, { key: 'state', label: 'Device state (JSON)', kind: 'text' },

      { key: 'presentation', label: 'Presentation controller (JSON, optional)', kind: 'text' },

      { key: 'titleOffset', label: 'Title clock offset', kind: 'number', min: 0, step: 1 },

    ],

  });

}

/** Which scene-logic entries and devices point at a piece of artwork (see the Scene inspector). */
function artworkLogic(scene: SceneDocument, instance: AssetInstance,targetArtwork?:Readonly<Record<string,string>>) {
  const keys = new Set<string>(), devices = new Set<string>(), prefix: Record<string, string> = { uses: 'use', readables: 'readable', exits: 'exit', rests: 'rest', people: 'person' };
  for (const actor of scene.actors ?? []) if (actor.instance === instance.id) { keys.add('actor:' + actor.id); if (scene.people?.some(p => p.id === actor.target)) keys.add('person:' + actor.target); }
  for (const [group, rows] of Object.entries(scene.manifest ?? {})) if ((prefix[group] || group === 'devices') && rows && typeof rows === 'object') for (const [id, target] of Object.entries(rows as Record<string, unknown>)) if ((typeof target === 'string' ? target : (target as { instance?: string } | undefined)?.instance) === instance.id) {
    if (group === 'devices') devices.add(id); else keys.add(prefix[group] + ':' + id);
  }
  scene.cues?.forEach((cue, i) => { if (cue.target === instance.id) keys.add('cue:' + i); });
  for(const target of scene.nativeTargets??[])if(targetArtwork?.[target.anchor]===instance.id)keys.add('target:'+target.id);
  return { keys: [...keys], devices: [...devices] };
}
/** A selected level barrier's Access tab (barrier-authoring.ts): its rule edits the composition holding it, whatever the scene's logic. */
function barrierSection(scene: string, instance: AssetInstance, documents: readonly EditorDocument[]): InspectorSection[] {
  if (instance.type !== 'level.barrier') return [];
  const holds = (nodes: readonly AssetInstance[]): boolean => nodes.some(n => n.id === instance.id || holds(n.children ?? []));
  const doc = documents.find(d => d.kind === 'composition' && (d.value as ChunkDocument).scene === scene && holds((d.value as ChunkDocument).instances));
  return doc ? [{ id: 'access', label: 'Access', primary: true, title: 'When this barrier opens: its rule, Test the rule, phase rules and checks', mount: (host, context) => mountBarrierAuthoring(host, context, { scene, document: doc.id, instance: instance.id }) }] : [];
}
function inspectorSections(scene: string, instance: AssetInstance | undefined, documents: readonly EditorDocument[]): InspectorSection[] {
  const barrier = instance ? barrierSection(scene, instance, documents) : [];
  const owner=instance?.type==='vehicle.frame'?documents.find(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene===scene):undefined;
  const vehicle:InspectorSection[]=owner?[{id:'vehicle',label:'Vehicle',primary:true,title:'Frame, doors, cars, route and berths',mount:(host,context)=>mountVehicleAuthoring(host,context,owner.id,instance!.id,scene)}]:[];
  const flowOwner=instance?.type==='character.flow'?documents.find(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene===scene):undefined;
  const flows:InspectorSection[]=flowOwner?[{id:'flow',label:'Passengers',primary:true,mount:(host,context)=>mountFlowAuthoring(host,context,flowOwner.id,instance!.id)}]:[];
  return [...flows,...vehicle,...barrier,...(!instance?[{id:'starting-state',label:'Starting state',mount:mountStartingStateAuthoring}]:[]),...(!instance&&!scene.startsWith('sequence-')?[{id:'chunk-connections',label:'Connections',mount:mountChunkConnections}]:[]), ...logicSections(scene, instance, documents)];
}
function logicSections(scene: string, instance: AssetInstance | undefined, documents: readonly EditorDocument[]): InspectorSection[] {
  if(scene==='sequence-opening'||scene==='sequence-title')return instance?[]:[{id:'world-sequence',label:'World sequence',mount(host){const note=document.createElement('p');note.className='muted';note.textContent='Edit timing and camera below. Select visible objects to edit their actual source without leaving the sequence.';host.replaceChildren(note);return()=>host.replaceChildren();}}];
  let entry: ReturnType<typeof gameplayScene> | undefined; try { entry = gameplayScene(scene, documents); } catch { entry = undefined; }
  const editable = !!entry && (!scene.startsWith('demo-') || scene === 'demo-manifest');
  const network = (context: WorkbenchContext) => () => pendingNetworkContext(new Map(context.documents.map(d => [d.id, d.value])));
  const inCode = (text: string): InspectorSection => ({ id: instance ? 'behaviour' : 'scene', label: instance ? 'Behaviour' : 'Scene', mount(host) { const note = document.createElement('p'); note.className = 'muted'; note.textContent = text; host.replaceChildren(note); return (() => host.replaceChildren()) as WorkbenchHandle; } });
  if (!editable || !entry) return [inCode(instance ? 'This sceneâ€™s interactions are still defined in code, so its artwork has no editable behaviour yet.' : 'This sceneâ€™s arrival, goals and interactions are still defined in code. Its artwork can be arranged here.')];
  if (!instance) return [{ id: 'scene', label: 'Scene', title: 'Arrival, environment, goals and story clock', mount: (host, context) => mountSceneAuthoring(host, context, { scene, fixed: true, focus: { groups: ['Scene', 'Objectives'], empty: 'This scene has no scene-wide settings to edit.' } }) }];
  const source = documents.find(d => d.id === entry!.prefix + '-scene')?.value as SceneDocument | undefined;
  let targetArtwork:Readonly<Record<string,string>>|undefined;
  if(source?.nativeTargets?.length)targetArtwork=pendingRegistry(validationSnapshot(documents))[scene]?.nativeTargetBindings?.artwork;
  const linked = source ? artworkLogic(source, instance,targetArtwork) : { keys: [], devices: [] };
  const sections: InspectorSection[] = [{ id: 'behaviour', label: 'Behaviour', title: 'What happens when the player uses, talks to or reads this', mount: (host, context) => mountSceneAuthoring(host, context, { scene, fixed: true, focus: { only: linked.keys, empty: `Nothing the player can do involves ${instance.id} yet. Interactions are bound to artwork under Logic â€º Interactions & story â€º Content & bindings.` } }) }];
  const devices = scene !== 'demo-manifest' && documents.some(d => d.id === deviceDocumentId(scene)) ? linked.devices : [];
  for (const device of devices) sections.push(
    { id: devices.length === 1 ? 'device' : 'device:' + device, label: devices.length === 1 ? 'Device' : 'Device Â· ' + device, title: `${device}: nouns, verbs and parameters`, mount: (host, context) => mountDeviceAuthoring(host, context, { scene, device, focused: true }, false, network(context)) },
    { id: devices.length === 1 ? 'wiring' : 'wiring:' + device, label: devices.length === 1 ? 'Wiring' : 'Wiring Â· ' + device, title: `Starting cables to and from ${device}`, mount: (host, context) => mountDeviceAuthoring(host, context, { scene, device, focused: true }, true, network(context)) });
  return sections;
}

void start().catch(error => { const host = document.getElementById('composer'); if (host) { const message = document.createElement('p'); message.id = 'boot-error'; message.textContent = `Composer could not start: ${error instanceof Error ? error.message : String(error)}`; host.replaceChildren(message); } });
