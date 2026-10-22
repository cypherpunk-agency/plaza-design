import {withSharedState} from '../engine/gameplay/shared-state';
import {validateSharedState,validateGameplay} from '../engine/gameplay/validation';
import {validationSnapshot} from './validation-snapshot';
import {mountOpeningAuthoring} from './opening-authoring';
import {mountSharedGameplay} from './shared-gameplay-authoring';
import {validateCompanionGameplay} from '../engine/gameplay/companion-conversations';
import {pendingOpeningStory} from './pending-opening';
import {pendingNetworkContext,validatePendingNetwork} from './pending-network';
import {mountNetworkAuthoring} from './network-authoring';
import {pendingRegistry} from './pending-registry';
import {validatePendingFixtures} from './pending-fixtures';
import {createAuthoredScene,mountSceneCatalogue,sceneCreationBlocked,scenePlaces} from './scene-catalogue-authoring';
import {mountDistrictAuthoring} from './district-authoring';
import {declaredScene} from '../engine/gameplay/declared-scene';
import {type SceneCatalogue} from '../engine/gameplay/scene-catalogue';
import {sceneCatalogueProjection} from './scene-catalogue-projection';
import {mountDeviceAuthoring} from './device-authoring';
import {deviceSceneIds,deviceDocumentId,deviceSourceIdentity,applyDeviceSource} from './device-sources';
import {pendingScene} from './pending-scene';
import {createLineSystem} from '../world/transport/line';
import {validateMetroSource,validateMetroLocks} from '../world/transport/metro-source';
import {validatePendingCity,createPendingCity} from './pending-city';
import {mountCityAuthoring} from './city-authoring';
import {mountZoneGraphAuthoring} from './zone-graph-authoring';
import {placeFrom,validateZoneGraph} from '../world/zone-graph';
import {zoneName} from './zone-graph-context';
import {validateBotReactions} from '../engine/gameplay/bot-conversations';
import {validatePendingRules} from './pending-rules';
import {mountCompanionSourceAuthoring} from './companion-source-authoring';
import {mountCritterReactionAuthoring} from './critter-reaction-authoring';
import {mountReviewStationsAuthoring} from './review-stations-authoring';
import {mountBotReactionAuthoring} from './bot-reaction-authoring';
import {mountPlayProfileAuthoring} from './play-profile-authoring';
import {validatePendingPlayProfiles} from './play-profile-source';
import {manifestDemoScene,validateManifestScene,validateManifestGameplay,validateManifestComposition,validateManifestSources} from '../scenes/demo-manifest';
import {nativeGameplayScene,nativeGameplayScenes} from './native-gameplay-scenes';
import {pendingDestinations,validatePendingSceneCatalogue} from './pending-destinations';
import {validateDeclaredDestinations} from '../engine/gameplay/declared-scene';
import {gameplayScenes,gameplayScene,authoredDocumentIds} from './gameplay-scenes';

import {mountRegisteredGameplay} from './registered-gameplay';

import {mountSceneAuthoring} from './scene-authoring';


import {validateFixtureMetro,playScenes} from './play-fixtures';

import { mountPlayWorkbench } from './play-workbench';

/** Shared browser entry: local protected source editing or public static snapshot/downloads. */

import { art, type Composition } from '../art';

import { mountComposer, type ComposerConfig, type EditorDocument, type InspectorSection, type WorkbenchContext, type WorkbenchHandle } from './app';
import type { Instance } from '../art/core/composition';
import type { SceneDocument } from '../engine/gameplay/scene-document';

import { createNativePreview } from './native-preview';

import { nativeSceneAdapters } from './scene-adapters';
import { PROPOSAL_SCENES, proposalAdapters, proposalLooksOnly, proposalScene } from './proposal-scenes';

import { createSequencePreview } from './sequence-preview';

import { WEATHER_KINDS } from '../world/weather';

import { SCENES, isSceneId, sceneTitle } from '../scenes';

import { snapshotWorld, validateWorldDocument } from '../world/document';

import type { TimelineDocument } from '../art/core/timeline';

import { mountWorldPanel, type WorldPanelSession } from './world-panel';

import { createAssetPreview } from './asset-preview';

import { mountCharacterWorkbench } from './character-workbench';
import type { PlayFixtures } from './play-fixtures';
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
import { mountStoryboard, type StoryboardSession } from './storyboard-workbench';



/** Play context for a proposal: every document as is, except the base scene's composition, which is the proposal's. */
function asProposal(context: WorkbenchContext, p: { id: string; base: string }): WorkbenchContext {
  const swap = (docs: EditorDocument[]) => { const own = docs.find(d => d.id === p.id); return own ? docs.map(d => d.id === p.base ? { ...d, value: { ...(own.value as Composition), scene: p.base } } : d) : docs; };
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

  const initialEnvironment = { cameraX: 0, zoom: 1, day: 1, minute: 720, seed: 3, flags: '{}', state: '{}', weather: 'forecast', hover: '', titleOffset: 7, sequence: 'glide' };
  const styleFrameSession: StyleFrameSession = {}, storyboardSession: StoryboardSession = {};
  const native = createNativePreview({...nativeSceneAdapters,...proposalAdapters,'demo-manifest':{validate:validateManifestComposition,definition:manifestDemoScene,pendingDefinition:(composition,state,options,documents)=>{const gameplay=validateManifestGameplay(documents.get('demo-manifest-gameplay'));return manifestDemoScene(composition,state,options,validateManifestScene(documents.get('demo-manifest-scene'),gameplay),gameplay);}}},(scene,request)=>{if(!request.documents)return scene;const deviceId=deviceDocumentId(request.composition.scene);if(request.documents.has(deviceId))scene=applyDeviceSource(request.composition.scene,scene,request.frame?.composition??request.composition,request.documents.get(deviceId),pendingNetworkContext(request.documents),request.documents.get(deviceSourceIdentity(request.composition.scene).scene) as import('../engine/gameplay/scene-document').SceneDocument);if(!scene.bindWorld)return scene;const city=createPendingCity(request.documents.get('city-source'),request.documents),metro=createLineSystem(city,validateMetroSource(request.documents.get('metro-source')));return scene.bindWorld({city,metro});},(id,request)=>{const catalogue=request.documents?.get('authored-scenes') as SceneCatalogue|undefined,entry=catalogue?.scenes.find(s=>s.scene.id===id);if(!entry)return;return{validate:value=>{const c=art.validate(value);if(c.scene!==id)throw new Error('Authored composition identity');return c;},definition:(composition,_state,options)=>declaredScene(entry.scene,composition,entry.gameplay,options,entry.devices)};}), sequences = createSequencePreview(art);

  const mapSession: WorldPanelSession = {};

  const deviceSelection:{scene?:string;device?:string;noun?:string;group?:string}={},wireSelection:{scene?:string}={};
  const playSelection:{fixture?:string;device?:string;scene?:string}={},previewOnly=new Set<string>();

  const manifestSelection:{fixture?:string;device?:string}={};
  const demoSelection:{fixture?:string;device?:string}={};
  const logicSelection:{scene?:string;sourceId?:string;use?:string;fixed?:boolean}={fixed:true},gameplaySelection:{scene?:string;sourceId?:string;fixed?:boolean}={fixed:true};
  // Demo-only variants (Test District) stay in Labs; the scene modes cover the story scenes.
  const logicScenes:string[]=gameplayScenes.filter(s=>!s.id.startsWith('demo')).flatMap(s=>[s.id,s.prefix]),commandScenes:string[]=[...logicScenes,...nativeGameplayScenes.filter(s=>!s.id.startsWith('demo')).map(s=>s.id)];

  mountComposer(host, { registry: art, api, documents, projections:[sceneCatalogueProjection], viewport: { width: 960, height: 540 },
    sceneTree: documents => {
      // The pending city source, so moving a place in World › City & travel regroups the picker.
      const city = documents.find(d => d.id === 'city-source')?.value as { DISTRICTS?: { id: string; name: string }[]; PLACES?: { name: string; district: string | null; scenes: string[] }[] } | undefined;
      if (!city?.DISTRICTS || !city.PLACES) return [];
      const placesIn = (district: string | null) => city.PLACES!.filter(p => p.district === district).map(p => ({ label: p.name, scenes: p.scenes }));
      return [...city.DISTRICTS.map(d => ({ label: d.name, places: placesIn(d.id) })), { label: 'Outside the districts', places: placesIn(null) }];
    },
    sceneLabel: scene => proposalScene(scene) ? proposalScene(scene)!.label : isSceneId(scene) ? sceneTitle(SCENES[scene]) : scene.startsWith('sequence-') ? 'Sequence · ' + scene.slice('sequence-'.length) : scene,
    sceneDocuments:(scene,documents)=>{try{const entry=gameplayScene(scene,documents);return[entry.prefix+'-scene',entry.gameplayId];}catch{return nativeGameplayScene(scene)?[nativeGameplayScene(scene)!.gameplayId]:[];}},

    worldStates: {
      // Play's starting states are the scene's saved world states. A proposal uses its base scene's.
      list(scene, documents) {
        const fixtures = (documents.find(d => d.id === 'play-fixtures')?.value as PlayFixtures | undefined)?.fixtures ?? [], own = proposalScene(scene)?.base ?? scene;
        return fixtures.filter(f => f.scene === own).map(f => ({ id: f.id, name: f.name, environment: { day: f.day, minute: f.minute, seed: f.seed, weather: f.weather, flags: JSON.stringify(f.flags) } }));
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
      if (proposal) return [{ id: proposal.base, label: `Today · ${isSceneId(proposal.base) ? sceneTitle(SCENES[proposal.base]) : proposal.base}` }];
      return PROPOSAL_SCENES.filter(p => p.base === scene).map(p => ({ id: p.id, label: p.label }));
    },
    assetDistricts(documents) {
      const city = documents.find(d => d.id === 'city-source')?.value as { DISTRICTS: { id: string; name: string }[]; PLACES: { district: string; scenes: string[] }[] } | undefined;
      const sceneDistrict = new Map((city?.PLACES ?? []).flatMap(p => p.scenes.map(scene => [scene, p.district] as const)));
      return { list: (city?.DISTRICTS ?? []).map(d => ({ id: d.id, name: d.name })), of: scene => sceneDistrict.get(scene) };
    },
    assetPreview: createAssetPreview(art, native, (canvas, request) => sequences.render(canvas, request), { showcase: true }),

    // Proposals borrow gameplay from their base; validators below never read proposal artwork.
    // Projected authored.* children are covered by their authored-scenes source owner.
    validationInputs: documents => documents.filter(d => !proposalScene(d.id) && !d.id.startsWith('authored.')).flatMap(d => [d.id, d.kind, d.value]),
    // Scenes validate against the pending world/state-owners.json, as Save and Play do.
    validateDocument(document,documents) {return withSharedState(documents.find(d=>d.id==='state-owners')?.value,()=>{
      if(document.id==='state-owners'){validateSharedState(document.value);for(const d of documents)if(d.kind==='gameplay'&&d.id!=='state-owners'&&(d.value as {sharedState?:unknown})?.sharedState!==undefined)validateGameplay(d.value);pendingRegistry(validationSnapshot(documents));return;}
      if(document.id==='companion-gameplay'){validateCompanionGameplay(document.value);pendingRegistry(validationSnapshot(documents));return;}
      if(document.id==='opening-story'){const values=validationSnapshot(documents);pendingOpeningStory(values);return;}
      if(document.id==='network'){const values=validationSnapshot(documents);validatePendingNetwork(values,pendingRegistry(values));return;}
      if(document.id==='authored-scenes'){validatePendingSceneCatalogue(document.value,validationSnapshot(documents));return;}
      if(document.id.startsWith('authored.'))return; // The source owner validates all projected documents and references together.
      if(document.kind==='devices'){const id=deviceSceneIds.find(id=>deviceDocumentId(id)===document.id);if(!id)throw new Error('Unknown device document');pendingScene(id,documents.find(d=>d.id===id)!.value,{devices:document.value,sceneDocument:documents.find(d=>d.id===deviceSourceIdentity(id).scene)!.value,gameplay:documents.find(d=>d.id===deviceSourceIdentity(id).gameplay)!.value},pendingNetworkContext(validationSnapshot(documents)));}
      if(document.kind==='profiles'){if(document.id!=='play-profiles')throw new Error('Unsupported profiles document');validatePendingPlayProfiles(document.value,validationSnapshot(documents));}
      if(document.kind==='presets'){if(document.id!=='kit-presets')throw new Error('Unsupported presets document');validatePresets(document.value,art);}
      if(document.kind==='people'){if(document.id!=='people')throw new Error('Unsupported people document');validatePeople(document.value);}
      if(document.kind==='storyboard'){if(document.id!=='storyboard')throw new Error('Unsupported storyboard document');validateStoryboard(document.value,new Set(documents.filter(d=>d.kind==='composition').map(d=>d.id)));}
      if(document.id==='zone-graph'){validateZoneGraph(document.value);return;} // its seams against the zones: listed in World › Zones, enforced on Save
      if(document.kind==='transport'){if(document.id!=='metro-source')throw new Error('Unsupported transport source');validateMetroLocks(validateMetroSource(document.value),(validationSnapshot(documents).get('city-source') as {LOCKS?:Record<string,unknown>}|undefined)?.LOCKS);}
      if(document.kind==='city')validatePendingCity(document.value,validationSnapshot(documents));
      if(document.kind==='rules')validatePendingRules(document.id,document.value,validationSnapshot(documents));
      if(document.kind==='conversations'){if(document.id!=='bot-reactions')throw new Error('Unsupported conversation library');validateBotReactions(document.value);}
      if(document.id==='demo-manifest-scene'){const declared=validateManifestSources(documents.find(d=>d.id==='demo-manifest')!.value,document.value,documents.find(d=>d.id==='demo-manifest-gameplay')!.value);validateDeclaredDestinations(declared.scene,pendingDestinations(validationSnapshot(documents)));}

      if(document.kind==='scene'){const s=gameplayScene(document.id),gameplay=s.validateGameplay(documents.find(d=>d.id===s.gameplayId)!.value);if((document.value as import('../engine/gameplay/scene-document').SceneDocument).nativeTargets!==undefined){const values=validationSnapshot(documents),identity=deviceSourceIdentity(s.id),network=pendingNetworkContext(values),scene=pendingScene(s.id,values.get(identity.composition),{sceneDocument:document.value,gameplay,devices:values.get(identity.devices)},network);s.validateScene(document.value,gameplay,{phase:'assembled',data:scene.data!,network});}else s.validateScene(document.value,gameplay);}

      if(document.kind==='fixtures'){if(document.id!=='play-fixtures')throw new Error('Unsupported fixture document');const snapshot=validationSnapshot(documents);validateFixtureMetro(validatePendingFixtures(document.value,snapshot),createPendingCity(snapshot.get('city-source'),snapshot));}


      if (document.kind === 'gameplay') (nativeGameplayScene(document.id)??gameplayScene(document.id)).validateGameplay(document.value);
    });},

    newScene: { places: scenePlaces, blocked: sceneCreationBlocked, create: createAuthoredScene },
    workbenches: [
      {id:'opening-story',area:'world',label:'Game opening',title:'How a new game starts: the story\'s phases, cards, triggers, each scene\'s part in them, contacts and the end card',authoring:true,documentDependent:true,documentIds:['opening-story','contacts','end-card'],primaryDocumentId:'opening-story',mount:mountOpeningAuthoring},
      {id:'play-profiles',area:'world',label:'Play profiles',title:'Ways of playing: the full game, the harbor shift and the Test District',authoring:true,documentDependent:true,documentIds:['authored-scenes','play-profiles'],primaryDocumentId:'play-profiles',mount:mountPlayProfileAuthoring},
      {id:'state-owners',area:'world',layout:'sections',label:'Shared state',title:'State owners shared by several scenes (the night shift): declared once, used through each scene\'s gameplay',authoring:true,documentDependent:true,primaryDocumentId:'state-owners',mount:(host,context)=>mountSharedGameplay(host,context,'state-owners',validateSharedState,publicEditor)},
      {id:'companion-gameplay',area:'world',layout:'sections',label:'Companion dialogue',title:'Shared companion conversations',authoring:true,documentDependent:true,primaryDocumentId:'companion-gameplay',mount:(host,context)=>mountSharedGameplay(host,context,'companion-gameplay',validateCompanionGameplay,publicEditor)},
      {id:'network',area:'world',layout:'sections',label:'Networks',title:'Networks, reach and permissions',authoring:true,documentDependent:true,primaryDocumentId:'network',mount:(host,context)=>mountNetworkAuthoring(host,context,()=>Object.values(pendingRegistry(new Map(context.documents.map(d=>[d.id,d.value])))).flatMap(s=>s.data?[s.data]:[]))},
      {id:'scene-catalogue',area:'world',label:'Scenes',title:'Create and manage authored scenes',authoring:true,documentDependent:true,documentIds:['authored-scenes','play-fixtures','city-source'],primaryDocumentId:'authored-scenes',mount:mountSceneCatalogue},
      {id:'scene-connections',area:'scene',mode:'wiring',label:'Starting cables',title:'Authored scene connections',authoring:true,documentDependent:true,supports:(scene,documents)=>{try{return scene!=='demo-manifest'&&!!gameplayScene(scene,documents);}catch{return false;}},showScene(scene){wireSelection.scene=scene;},unsupported:'This scene has no registered device document yet.',mount:(host,context)=>mountDeviceAuthoring(host,context,wireSelection,true,()=>pendingNetworkContext(new Map(context.documents.map(d=>[d.id,d.value]))))},
      {id:'districts',area:'world',label:'Districts',title:'Districts · create, rename, place on the map and remove',authoring:true,documentDependent:true,documentIds:['city-source'],primaryDocumentId:'city-source',layout:'sections',mount:mountDistrictAuthoring},
      {id:'city-source',area:'world',layout:'sections',label:'City & travel',title:'City places, discovery and transport',authoring:true,documentDependent:true,primaryDocumentId:'city-source',mount:mountCityAuthoring},
      {id:'companion',area:'world',layout:'sections',label:'Companion',title:'The companion: look, unlock flag, follow modes, speaker and greeting',authoring:true,documentDependent:true,documentIds:['companion','companion-gameplay'],primaryDocumentId:'companion',mount:mountCompanionSourceAuthoring},
      {id:'critter-reactions',area:'world',label:'Critter dialogue',title:'Cat and pigeon reactions',authoring:true,documentDependent:true,documentIds:['critter-reactions'],primaryDocumentId:'critter-reactions',mount:mountCritterReactionAuthoring},
      {id:'zone-graph',area:'world',label:'Zones',title:'Zones and seams: which scenes join with no cut, and where each lies from the other',authoring:true,documentDependent:true,primaryDocumentId:'zone-graph',mount:mountZoneGraphAuthoring},
      {id:'review-stations',area:'world',layout:'sections',label:'Review stations',title:'Review navigator: bookmarks, buttons and the remote-device example',authoring:true,documentDependent:true,documentIds:['review-stations'],primaryDocumentId:'review-stations',mount:mountReviewStationsAuthoring},
      {id:'bot-reactions',area:'world',label:'Bot dialogue',title:'Robot reactions · shared conversations',authoring:true,documentDependent:true,documentIds:[...deviceSceneIds.map(deviceDocumentId),'metro-source','city-source','bot-reactions'],mount:mountBotReactionAuthoring},
      {id:'manifest-pilot',area:'labs',label:'Manifest pilot',title:'Declared scene: pending source in private Play',authoring:true,documentDependent:true,mount:(host,context)=>mountPlayWorkbench(host,context,manifestSelection,false,true,'Lab · the declared demo scene, built only from its pending manifest source, running in private Play. A test bed for the scene manifest format, not part of the scene workflow.')},
      {id:'scene-logic',area:'scene',mode:'logic',label:'Interactions & story',title:'Scene logic: interactions, objectives, dialogue and presentation',authoring:true,documentDependent:true,documentIds:[...authoredDocumentIds,'authored-scenes'],
        supports:(scene,documents)=>{try{gameplayScene(scene,documents);return !scene.startsWith('demo-')||scene==='demo-manifest';}catch{return false;}},showScene(scene,documents){if(logicSelection.scene!==scene)logicSelection.use=undefined;logicSelection.scene=scene;logicSelection.sourceId=gameplayScene(scene,documents).prefix+'-scene';},
        unsupported:'This scene’s interactions, objectives and dialogue are still defined in code. They become editable once the scene is migrated to scene documents.',
        get primaryDocumentId(){return logicSelection.sourceId??'harbor-shift-scene';},mount:(host,context)=>mountSceneAuthoring(host,context,logicSelection)},
      {id:'gameplay',area:'scene',mode:'logic',label:'Commands & dialogue',title:'Gameplay · commands, conditions and conversations',authoring:true,documentDependent:true,documentIds:['authored-scenes',...authoredDocumentIds,...nativeGameplayScenes.map(s=>s.gameplayId)],
        supports:(scene,documents)=>{if(commandScenes.includes(scene))return true;try{return !!gameplayScene(scene,documents);}catch{return false;}},showScene(scene,documents){gameplaySelection.scene=scene;gameplaySelection.sourceId=(nativeGameplayScene(scene)??gameplayScene(scene,documents)).gameplayId;},
        unsupported:'This scene has no gameplay document yet. Its commands are still defined in code.',
        get primaryDocumentId(){return gameplaySelection.sourceId??'harbor-shift-gameplay';},mount:(host,context)=>mountRegisteredGameplay(host,context,gameplaySelection,publicEditor)},
      {id:'device-config',area:'scene',mode:'logic',label:'Devices',title:'Device nouns, verbs, guards and controller parameters',authoring:true,documentDependent:true,supports:(scene,documents)=>{try{return scene!=='demo-manifest'&&!!gameplayScene(scene,documents);}catch{return false;}},showScene(scene){if(deviceSelection.scene!==scene){deviceSelection.device=undefined;deviceSelection.noun=undefined;}deviceSelection.scene=scene;},unsupported:'This scene has no registered device document yet.',mount:(host,context)=>mountDeviceAuthoring(host,context,deviceSelection,false,()=>pendingNetworkContext(new Map(context.documents.map(d=>[d.id,d.value]))))},
      { id: 'events', area: 'scene', mode: 'wiring', label: 'Events', title: 'Scene events and connections · read-only', documentDependent: true, mount(panel, context) {
        const graph = document.createElement('section'), source = document.createElement('section'); panel.replaceChildren(graph, source);
        const viewer = mountSourceViewer(source, publicEditor ? { async read(file, signal) {
          if (!sourceSnapshot) sourceSnapshot = fetch('./sources.json', { credentials: 'omit', cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error('Published source snapshot is unavailable'); return response.json() as Promise<Record<string, string>>; }).catch(error => { sourceSnapshot = undefined; throw error; });
          const snapshot = await sourceSnapshot; if (signal.aborted) throw new Error('Source selection changed');
          if (!Object.prototype.hasOwnProperty.call(snapshot, file) || typeof snapshot[file] !== 'string') throw new Error('Source is outside this published inspector snapshot');
          return { file, text: snapshot[file] };
        } } : {}), dispose = mountEventInspector(graph, { documents: context.documents, network:pendingNetworkContext(new Map(context.documents.map(d=>[d.id,d.value]))), initialScene: context.scene,
          onOpenScene(scene, instance) { const doc = context.documents.find(doc => doc.kind === 'composition' && (doc.value as Composition).scene === scene); if (doc && instance) context.openInstance(doc.id, instance); else context.openScene(scene); },
          onOpenSource: reference => { void viewer.open(reference); },
        }); return () => { dispose(); viewer.dispose(); panel.replaceChildren(); };
      } },
      {id:'play',area:'scene',mode:'play',label:'Play',title:'Play · pending scene from a starting state',authoring:true,documentDependent:true,primaryDocumentId:'play-fixtures',
        supports:(scene,documents)=>(playScenes as readonly string[]).includes(scene)||scene==='demo-manifest'||(playScenes as readonly string[]).includes(proposalScene(scene)?.base??'')&&!proposalLooksOnly(scene,documents.find(d=>d.id===scene)?.value)||!!(documents.find(d=>d.id==='authored-scenes')?.value as SceneCatalogue|undefined)?.scenes.some(s=>s.scene.id===scene),showScene(scene){playSelection.scene=scene==='demo-manifest'?'shop':proposalScene(scene)?.base??scene;},
        unsupported:'Play runs scenes whose starting state can be set up in the editor. This scene is not one of them yet; play it in the game build instead. A style frame that takes only its base scene’s look (its Base scene use piece: look) is previewed, not played.',
        // A proposal plays as its base scene with the proposal's artwork in place of the base composition.
        mount:(host,context)=>mountPlayWorkbench(host,proposalScene(context.scene??'')?asProposal(context,proposalScene(context.scene!)!):context,playSelection,false,context.scene==='demo-manifest')},
      {id:'demo-world',area:'labs',label:'Demo world',title:'Test District: same engine, separate private progress',authoring:true,documentDependent:true,mount:(host,context)=>mountPlayWorkbench(host,context,demoSelection,true,false,'Lab · the Test District: a small separate world on the same engine, with its own private progress. Used to try engine features outside the real city.')},
      { id: 'characters', area: 'library', label: 'Characters', title: 'Characters · lineups, named looks and saved people settings', authoring: true, documentDependent: true, documentIds: ['people'], primaryDocumentId: 'people', mount(panel, context) { panel.classList.add('character-workbench'); return mountCharacterWorkbench(panel, { people: host => mountPeopleAuthoring(host, context) }); } },

      { id: 'style-frames', area: 'library', beside: true, label: 'Style frames', title: 'Style frames · each district’s card, people mix and scenes · read-only', documentDependent: true, mount(panel, context) {
        return mountStyleFrames(panel, context, native.render, initialEnvironment, styleFrameSession, scene => proposalScene(scene)?.label ?? (isSceneId(scene) ? sceneTitle(SCENES[scene]) : scene));
      } },
      { id: 'storyboard', area: 'library', beside: true, label: 'Storyboard', title: 'Storyboard · the acts as places in order, each with its scene or style frame', authoring: true, documentDependent: true, documentIds: ['storyboard'], primaryDocumentId: 'storyboard', mount(panel, context) {
        return mountStoryboard(panel, context, native.render, initialEnvironment, storyboardSession, scene => proposalScene(scene)?.label ?? (isSceneId(scene) ? sceneTitle(SCENES[scene]) : scene));
      } },
      { id: 'vehicles', area: 'library', label: 'Vehicles', title: 'Vehicle workbench · read-only', mount(panel) { panel.classList.add('vehicle-workbench'); return mountVehicleWorkbench(panel); } },
      { id: 'buildings', area: 'library', label: 'Buildings', title: 'Building kit · fronts and rows · read-only', mount(panel) { panel.classList.add('vehicle-workbench'); return mountBuildingWorkbench(panel); } },

      { id: 'signage', area: 'library', label: 'Signs & light', title: 'Signs, lighting and architecture · read-only', documentDependent: true, mount(panel, context) {

        panel.classList.add('signage-workbench');

        return mountSignageWorkbench(panel, { registry: art, documents: context.documents,

          openUsage: usage => context.openInstance(usage.document, usage.instance), renderNative: native.render, renderSequence: sequences.render,

        });

      } },



    ],

    preview: { render: (canvas, request) => { if (request.documents?.has('people')) applyPeople(request.documents.get('people')); return sequences.render(canvas, request) ?? native.render(canvas, request); } },

    inspector: (scene, instance, documents) => inspectorSections(scene, instance, documents),
    // the scenes one seam away (world/zone-graph.json), which the Scene preview draws beside the open one
    joinedScenes(scene, documents) { const source = documents.find(d => d.id === 'zone-graph')?.value; if (source === undefined) return []; let graph; try { graph = validateZoneGraph(source); } catch { return []; } const values = new Map(documents.map(d => [d.id, d.value])); return [...placeFrom(graph, scene)].filter(([zone]) => zone !== scene).map(([zone]) => ({ zone, label: zoneName(zone, values) })); },

    worldPanel(panel, openScene, documents, scene) {

      const compositions = Object.fromEntries(documents.filter(doc => doc.kind === 'composition').map(doc => [doc.id, doc.value as Composition]));

      const timelines = documents.filter(doc => doc.kind === 'timeline').flatMap(doc => (doc.value as TimelineDocument).sequences);

      const snapshot=new Map(documents.map(d=>[d.id,d.value])),registry=pendingRegistry(snapshot);
      const refs = Object.fromEntries(Object.entries(compositions).filter(([, doc]) => Object.prototype.hasOwnProperty.call(registry, doc.scene)).map(([id, doc]) => [doc.scene, id]));

      const cityModel=createPendingCity(snapshot.get('city-source'),snapshot);
      const world = snapshotWorld(refs, timelines.flatMap(sequence => sequence.handoff ? [{ id: sequence.id, ...sequence.handoff }] : []),cityModel,registry);

      return mountWorldPanel(panel, validateWorldDocument(world, { compositions, sequences: timelines,world:cityModel,scenes:registry }), openScene, mapSession, scene,cityModel);

    },

    motionTracks: sequences.motionTracks,clips:sequences.clips, timelineContext: sequences.timelineContext,

    destinationsFor:documents=>pendingDestinations(new Map(documents.map(d=>[d.id,d.value]))),
    destinations: Object.fromEntries(Object.entries(SCENES).map(([scene, def]) => [scene, def.exits.map(exit => exit.id)])),

    initialEnvironment,

    environmentControls: [

      { key: 'cameraX', label: 'Camera X', kind: 'number', step: 20 }, { key: 'cameraH', label: 'Camera height', kind: 'number', step: 10 },

      { key: 'zoom', label: 'Zoom', kind: 'number', min: .1, max: 8, step: .1 },

      { key: 'minute', label: 'Time of day', kind: 'number', min: 0, max: 1439, step: 10, quick: true, choices: [{ label: 'Morning', value: 480 }, { label: 'Noon', value: 720 }, { label: 'Evening', value: 1110 }, { label: 'Night', value: 1320 }] },
      { key: 'weather', label: 'Weather', kind: 'select', options: ['forecast', ...WEATHER_KINDS], quick: true },
      { key: 'hack', label: 'Hack vision', kind: 'boolean', quick: true, shortcut: 'h' },
      { key: 'inside', label: 'Inside buildings', kind: 'boolean', quick: true, shortcut: 'i' },
      { key: 'roomsAt', label: 'Rooms as the player sees them (floor ids walked, comma-separated, the last where they stand; floor@x for a place on a floor, else its middle; empty: every room open)', kind: 'text' },
      { key: 'minute', label: 'City minute', kind: 'number', min: 0, max: 1439, step: 10 }, { key: 'day', label: 'City day', kind: 'number', min: 1, step: 1 },
      { key: 'seed', label: 'Weather seed', kind: 'number', min: 0, step: 1 }, { key: 'hover', label: 'Hovered device id', kind: 'text' },

      { key: 'flags', label: 'Story flags (JSON)', kind: 'text' }, { key: 'state', label: 'Device state (JSON)', kind: 'text' },

      { key: 'presentation', label: 'Presentation controller (JSON, optional)', kind: 'text' },

      { key: 'sequence', label: 'Opening sequence', kind: 'select', options: ['title', 'rise', 'glide'] },

      { key: 'titleOffset', label: 'Title clock offset', kind: 'number', min: 0, step: 1 },

    ],

  });

}

/** Which scene-logic entries and devices point at a piece of artwork (see the Scene inspector). */
function artworkLogic(scene: SceneDocument, instance: Instance) {
  const keys = new Set<string>(), devices = new Set<string>(), prefix: Record<string, string> = { uses: 'use', readables: 'readable', exits: 'exit', rests: 'rest', people: 'person' };
  for (const value of Object.values(instance.bindings ?? {})) {
    const [kind, id] = typeof value === 'string' ? value.split('.') : [];
    if (kind === 'actor' && id) { keys.add('actor:' + id); if (scene.people?.some(p => p.id === id)) keys.add('person:' + id); }
    if (kind === 'device' && id) devices.add(id);
  }
  for (const actor of scene.actors ?? []) if (actor.instance === instance.id) { keys.add('actor:' + actor.id); if (scene.people?.some(p => p.id === actor.id)) keys.add('person:' + actor.id); }
  for (const [group, rows] of Object.entries(scene.manifest ?? {})) if ((prefix[group] || group === 'devices') && rows && typeof rows === 'object') for (const [id, target] of Object.entries(rows as Record<string, unknown>)) if ((typeof target === 'string' ? target : (target as { instance?: string } | undefined)?.instance) === instance.id) {
    if (group === 'devices') devices.add(id); else keys.add(prefix[group] + ':' + id);
  }
  scene.cues?.forEach((cue, i) => { if (cue.target === instance.id) keys.add('cue:' + i); });
  return { keys: [...keys], devices: [...devices] };
}
/** A selected level barrier's Access tab (barrier-authoring.ts): its rule edits the composition holding it, whatever the scene's logic. */
function barrierSection(scene: string, instance: Instance, documents: readonly EditorDocument[]): InspectorSection[] {
  if (instance.type !== 'level.barrier') return [];
  const holds = (nodes: readonly Instance[]): boolean => nodes.some(n => n.id === instance.id || holds(n.children ?? []));
  const doc = documents.find(d => d.kind === 'composition' && (d.value as Composition).scene === scene && holds((d.value as Composition).instances));
  return doc ? [{ id: 'access', label: 'Access', primary: true, title: 'When this barrier opens: its rule, Test the rule, phase rules and checks', mount: (host, context) => mountBarrierAuthoring(host, context, { scene, document: doc.id, instance: instance.id }) }] : [];
}
function inspectorSections(scene: string, instance: Instance | undefined, documents: readonly EditorDocument[]): InspectorSection[] {
  const barrier = instance ? barrierSection(scene, instance, documents) : [];
  return [...barrier, ...logicSections(scene, instance, documents)];
}
function logicSections(scene: string, instance: Instance | undefined, documents: readonly EditorDocument[]): InspectorSection[] {
  let entry: ReturnType<typeof gameplayScene> | undefined; try { entry = gameplayScene(scene, documents); } catch { entry = undefined; }
  const editable = !!entry && (!scene.startsWith('demo-') || scene === 'demo-manifest');
  const network = (context: WorkbenchContext) => () => pendingNetworkContext(new Map(context.documents.map(d => [d.id, d.value])));
  const inCode = (text: string): InspectorSection => ({ id: instance ? 'behaviour' : 'scene', label: instance ? 'Behaviour' : 'Scene', mount(host) { const note = document.createElement('p'); note.className = 'muted'; note.textContent = text; host.replaceChildren(note); return (() => host.replaceChildren()) as WorkbenchHandle; } });
  if (!editable || !entry) return [inCode(instance ? 'This scene’s interactions are still defined in code, so its artwork has no editable behaviour yet.' : 'This scene’s arrival, goals and interactions are still defined in code. Its artwork can be arranged here.')];
  if (!instance) return [{ id: 'scene', label: 'Scene', title: 'Arrival, environment, goals and story clock', mount: (host, context) => mountSceneAuthoring(host, context, { scene, fixed: true, focus: { groups: ['Scene', 'Objectives'], empty: 'This scene has no scene-wide settings to edit.' } }) }];
  const source = documents.find(d => d.id === entry!.prefix + '-scene')?.value as SceneDocument | undefined;
  const linked = source ? artworkLogic(source, instance) : { keys: [], devices: [] };
  const sections: InspectorSection[] = [{ id: 'behaviour', label: 'Behaviour', title: 'What happens when the player uses, talks to or reads this', mount: (host, context) => mountSceneAuthoring(host, context, { scene, fixed: true, focus: { only: linked.keys, empty: `Nothing the player can do involves ${instance.id} yet. Interactions are bound to artwork under Logic › Interactions & story › Content & bindings.` } }) }];
  const devices = scene !== 'demo-manifest' && documents.some(d => d.id === deviceDocumentId(scene)) ? linked.devices : [];
  for (const device of devices) sections.push(
    { id: devices.length === 1 ? 'device' : 'device:' + device, label: devices.length === 1 ? 'Device' : 'Device · ' + device, title: `${device}: nouns, verbs and parameters`, mount: (host, context) => mountDeviceAuthoring(host, context, { scene, device, focused: true }, false, network(context)) },
    { id: devices.length === 1 ? 'wiring' : 'wiring:' + device, label: devices.length === 1 ? 'Wiring' : 'Wiring · ' + device, title: `Starting cables to and from ${device}`, mount: (host, context) => mountDeviceAuthoring(host, context, { scene, device, focused: true }, true, network(context)) });
  return sections;
}

void start().catch(error => { const host = document.getElementById('composer'); if (host) { const message = document.createElement('p'); message.id = 'boot-error'; message.textContent = `Composer could not start: ${error instanceof Error ? error.message : String(error)}`; host.replaceChildren(message); } });
