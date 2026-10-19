import {mountOpeningAuthoring} from './opening-authoring';
import {mountSharedGameplay} from './shared-gameplay-authoring';
import {validateCompanionGameplay} from '../engine/gameplay/companion-conversations';
import {pendingOpeningStory} from './pending-opening';
import {pendingNetworkContext,validatePendingNetwork} from './pending-network';
import {mountNetworkAuthoring} from './network-authoring';
import {pendingRegistry} from './pending-registry';
import {validatePendingFixtures} from './pending-fixtures';
import {mountSceneCatalogue} from './scene-catalogue-authoring';
import {declaredScene} from '../engine/gameplay/declared-scene';
import {type SceneCatalogue} from '../engine/gameplay/scene-catalogue';
import {sceneCatalogueProjection} from './scene-catalogue-projection';
import {mountDeviceAuthoring} from './device-authoring';
import {deviceSceneIds,deviceDocumentId,deviceSourceIdentity,applyDeviceSource} from './device-sources';
import {pendingScene} from './pending-scene';
import {createLineSystem} from '../world/transport/line';
import {validateMetroSource} from '../world/transport/metro-source';
import {validatePendingCity,createPendingCity} from './pending-city';
import {mountCityAuthoring} from './city-authoring';
import {validateBotReactions} from '../engine/gameplay/bot-conversations';
import {mountBotReactionAuthoring} from './bot-reaction-authoring';
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

import { mountComposer, type ComposerConfig, type EditorDocument } from './app';

import { createNativePreview } from './native-preview';

import { nativeSceneAdapters } from './scene-adapters';

import { createSequencePreview } from './sequence-preview';

import { WEATHER_KINDS } from '../world/weather';

import { SCENES, isSceneId, sceneTitle } from '../scenes';

import { snapshotWorld, validateWorldDocument } from '../world/document';

import type { TimelineDocument } from '../art/core/timeline';

import { mountWorldPanel, type WorldPanelSession } from './world-panel';

import { createAssetPreview } from './asset-preview';

import { mountCharacterWorkbench } from './character-workbench';

import { mountVehicleWorkbench } from './vehicle-workbench';



import { mountEventInspector } from './event-inspector';

import { mountSourceViewer } from './source-viewer';







import { mountSignageWorkbench } from './signage-workbench';



async function start() {

  const host = document.getElementById('composer'); if (!host) throw new Error('Missing editor host');

  const publicEditor = document.documentElement.dataset.editorMode === 'public';

  let api: ComposerConfig['api'], documents: EditorDocument[] | undefined;

  let sourceSnapshot: Promise<Record<string, string>> | undefined;

  if (publicEditor) {

    const response = await fetch('./documents.json', { credentials: 'omit' }); if (!response.ok) throw new Error('Published editor documents are unavailable');

    documents = await response.json() as EditorDocument[];

  } else {

    const response = await fetch('/bootstrap', { credentials: 'omit' }); if (!response.ok) throw new Error('Local editor session is unavailable');

    api = (await response.json() as { api: ComposerConfig['api'] }).api;

  }

  await Promise.all([400, 500, 600, 700].map(weight => document.fonts.load(`${weight} 16px "IBM Plex Mono"`)));

  await document.fonts.ready;

  const native = createNativePreview({...nativeSceneAdapters,'demo-manifest':{validate:validateManifestComposition,definition:manifestDemoScene,pendingDefinition:(composition,state,options,documents)=>{const gameplay=validateManifestGameplay(documents.get('demo-manifest-gameplay'));return manifestDemoScene(composition,state,options,validateManifestScene(documents.get('demo-manifest-scene'),gameplay),gameplay);}}},(scene,request)=>{if(!request.documents)return scene;const deviceId=deviceDocumentId(request.composition.scene);if(request.documents.has(deviceId))scene=applyDeviceSource(request.composition.scene,scene,request.frame?.composition??request.composition,request.documents.get(deviceId),pendingNetworkContext(request.documents),request.documents.get(deviceSourceIdentity(request.composition.scene).scene) as import('../engine/gameplay/scene-document').SceneDocument);if(!scene.bindWorld)return scene;const city=createPendingCity(request.documents.get('city-source'),request.documents),metro=createLineSystem(city,validateMetroSource(request.documents.get('metro-source')));return scene.bindWorld({city,metro});},(id,request)=>{const catalogue=request.documents?.get('authored-scenes') as SceneCatalogue|undefined,entry=catalogue?.scenes.find(s=>s.scene.id===id);if(!entry)return;return{validate:value=>{const c=art.validate(value);if(c.scene!==id)throw new Error('Authored composition identity');return c;},definition:(composition,_state,options)=>declaredScene(entry.scene,composition,entry.gameplay,options,entry.devices)};}), sequences = createSequencePreview(art);

  const mapSession: WorldPanelSession = {};

  const deviceSelection:{scene?:string;device?:string;noun?:string;group?:string}={},wireSelection:{scene?:string}={};
  const playSelection:{fixture?:string;device?:string;scene?:string}={};

  const manifestSelection:{fixture?:string;device?:string}={};
  const demoSelection:{fixture?:string;device?:string}={};
  const logicSelection:{scene?:string;sourceId?:string;use?:string;fixed?:boolean}={fixed:true},gameplaySelection:{scene?:string;sourceId?:string;fixed?:boolean}={fixed:true};
  // Demo-only variants (Test District) stay in Labs; the scene modes cover the story scenes.
  const logicScenes:string[]=gameplayScenes.filter(s=>!s.id.startsWith('demo')).flatMap(s=>[s.id,s.prefix]),commandScenes:string[]=[...logicScenes,...nativeGameplayScenes.filter(s=>!s.id.startsWith('demo')).map(s=>s.id)];

  mountComposer(host, { registry: art, api, documents, projections:[sceneCatalogueProjection], viewport: { width: 960, height: 540 },
    sceneLabel: scene => isSceneId(scene) ? sceneTitle(SCENES[scene]) : scene.startsWith('sequence-') ? 'Sequence · ' + scene.slice('sequence-'.length) : scene,
    sceneDocuments:(scene,documents)=>{try{const entry=gameplayScene(scene,documents);return[entry.prefix+'-scene',entry.gameplayId,...(scene==='sandbox'?['sandbox-behavior']:[])];}catch{return nativeGameplayScene(scene)?[nativeGameplayScene(scene)!.gameplayId]:[];}},

    assetPreview: createAssetPreview(art, native),

    validateDocument(document,documents) {
      if(document.id==='companion-gameplay'){validateCompanionGameplay(document.value);pendingRegistry(new Map(documents.map(d=>[d.id,d.value])));return;}
      if(document.id==='opening-story'){const values=new Map(documents.map(d=>[d.id,d.value]));pendingOpeningStory(values);return;}
      if(document.id==='network'){const values=new Map(documents.map(d=>[d.id,d.value]));validatePendingNetwork(values,pendingRegistry(values));return;}
      if(document.id==='authored-scenes'){validatePendingSceneCatalogue(document.value,new Map(documents.map(d=>[d.id,d.value])));return;}
      if(document.id.startsWith('authored.'))return; // The source owner validates all projected documents and references together.
      if(document.kind==='devices'||document.kind==='behavior'&&document.id==='sandbox-behavior'){const id=deviceSceneIds.find(id=>deviceDocumentId(id)===document.id);if(!id)throw new Error('Unknown device document');pendingScene(id,documents.find(d=>d.id===id)!.value,{devices:document.value,sceneDocument:documents.find(d=>d.id===deviceSourceIdentity(id).scene)!.value,gameplay:documents.find(d=>d.id===deviceSourceIdentity(id).gameplay)!.value},pendingNetworkContext(new Map(documents.map(d=>[d.id,d.value]))));}
      if(document.kind==='transport'){if(document.id!=='metro-source')throw new Error('Unsupported transport source');validateMetroSource(document.value);}
      if(document.kind==='city')validatePendingCity(document.value,new Map(documents.map(d=>[d.id,d.value])));
      if(document.kind==='conversations'){if(document.id!=='bot-reactions')throw new Error('Unsupported conversation library');validateBotReactions(document.value);}
      if(document.id==='demo-manifest-scene'){const declared=validateManifestSources(documents.find(d=>d.id==='demo-manifest')!.value,document.value,documents.find(d=>d.id==='demo-manifest-gameplay')!.value);validateDeclaredDestinations(declared.scene,pendingDestinations(new Map(documents.map(d=>[d.id,d.value]))));}

      if(document.kind==='scene'){const s=gameplayScene(document.id);s.validateScene(document.value,s.validateGameplay(documents.find(d=>d.id===s.gameplayId)!.value));}

      if(document.kind==='fixtures'){if(document.id!=='play-fixtures')throw new Error('Unsupported fixture document');const snapshot=new Map(documents.map(d=>[d.id,d.value]));validateFixtureMetro(validatePendingFixtures(document.value,snapshot),createPendingCity(snapshot.get('city-source'),snapshot),validateMetroSource(snapshot.get('metro-source')));}


      if (document.kind === 'gameplay') (nativeGameplayScene(document.id)??gameplayScene(document.id)).validateGameplay(document.value);

    },

    workbenches: [
      {id:'opening-story',area:'scene',mode:'logic',label:'Opening story',title:'Opening story and guidance',authoring:true,documentDependent:true,primaryDocumentId:'opening-story',mount:mountOpeningAuthoring},
      {id:'companion-gameplay',area:'library',label:'Companion dialogue',title:'Shared companion conversations',authoring:true,documentDependent:true,primaryDocumentId:'companion-gameplay',mount:(host,context)=>mountSharedGameplay(host,context,'companion-gameplay',validateCompanionGameplay,publicEditor)},
      {id:'network',area:'scene',mode:'logic',label:'Networks',title:'Networks, reach and permissions',authoring:true,documentDependent:true,primaryDocumentId:'network',mount:(host,context)=>mountNetworkAuthoring(host,context,()=>Object.values(pendingRegistry(new Map(context.documents.map(d=>[d.id,d.value])))).flatMap(s=>s.data?[s.data]:[]))},
      {id:'scene-catalogue',area:'library',label:'Scenes',title:'Create and manage authored scenes',authoring:true,documentDependent:true,documentIds:['authored-scenes','play-fixtures','city-source'],primaryDocumentId:'authored-scenes',mount:mountSceneCatalogue},
      {id:'scene-connections',area:'scene',mode:'wiring',label:'Starting cables',title:'Authored scene connections',authoring:true,documentDependent:true,supports:(scene,documents)=>{try{return scene!=='demo-manifest'&&!!gameplayScene(scene,documents);}catch{return false;}},showScene(scene){wireSelection.scene=scene;},unsupported:'This scene has no registered device document yet.',mount:(host,context)=>mountDeviceAuthoring(host,context,wireSelection,true,()=>pendingNetworkContext(new Map(context.documents.map(d=>[d.id,d.value]))))},
      {id:'city-source',area:'library',label:'City & travel',title:'City places, discovery and transport',authoring:true,documentDependent:true,primaryDocumentId:'city-source',mount:mountCityAuthoring},
      {id:'bot-reactions',area:'library',label:'Bot dialogue',title:'Robot reactions · shared conversations',authoring:true,documentDependent:true,documentIds:[...deviceSceneIds.map(deviceDocumentId),'metro-source','city-source','bot-reactions'],mount:mountBotReactionAuthoring},
      {id:'manifest-pilot',area:'labs',label:'Manifest pilot',title:'Declared scene: pending source in private Play',authoring:true,documentDependent:true,mount:(host,context)=>mountPlayWorkbench(host,context,manifestSelection,false,true)},
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
          if (!sourceSnapshot) sourceSnapshot = fetch('./sources.json', { credentials: 'omit' }).then(async response => { if (!response.ok) throw new Error('Published source snapshot is unavailable'); return response.json() as Promise<Record<string, string>>; }).catch(error => { sourceSnapshot = undefined; throw error; });
          const snapshot = await sourceSnapshot; if (signal.aborted) throw new Error('Source selection changed');
          if (!Object.prototype.hasOwnProperty.call(snapshot, file) || typeof snapshot[file] !== 'string') throw new Error('Source is outside this published inspector snapshot');
          return { file, text: snapshot[file] };
        } } : {}), dispose = mountEventInspector(graph, { documents: context.documents, network:pendingNetworkContext(new Map(context.documents.map(d=>[d.id,d.value]))), initialScene: context.scene,
          onOpenScene(scene, instance) { const doc = context.documents.find(doc => doc.kind === 'composition' && (doc.value as Composition).scene === scene); if (doc && instance) context.openInstance(doc.id, instance); else context.openScene(scene); },
          onOpenSource: reference => { void viewer.open(reference); },
        }); return () => { dispose(); viewer.dispose(); panel.replaceChildren(); };
      } },
      {id:'play',area:'scene',mode:'play',label:'Play',title:'Play · pending scene from a starting state',authoring:true,documentDependent:true,primaryDocumentId:'play-fixtures',
        supports:(scene,documents)=>(playScenes as readonly string[]).includes(scene)||scene==='demo-manifest'||!!(documents.find(d=>d.id==='authored-scenes')?.value as SceneCatalogue|undefined)?.scenes.some(s=>s.scene.id===scene),showScene(scene){playSelection.scene=scene==='demo-manifest'?'shop':scene;},
        unsupported:'Play runs scenes whose starting state can be set up in the editor. This scene is not one of them yet; play it in the game build instead.',
        mount:(host,context)=>mountPlayWorkbench(host,context,playSelection,false,context.scene==='demo-manifest')},
      {id:'demo-world',area:'labs',label:'Demo world',title:'Test District: same engine, separate private progress',authoring:true,documentDependent:true,mount:(host,context)=>mountPlayWorkbench(host,context,demoSelection,true)},
      { id: 'characters', area: 'library', label: 'Characters', title: 'Character workbench · read-only', mount(panel) { panel.classList.add('character-workbench'); return mountCharacterWorkbench(panel); } },

      { id: 'vehicles', area: 'library', label: 'Vehicles', title: 'Vehicle workbench · read-only', mount(panel) { panel.classList.add('vehicle-workbench'); return mountVehicleWorkbench(panel); } },

      { id: 'signage', area: 'library', label: 'Signs & light', title: 'Signs, lighting and architecture · read-only', documentDependent: true, mount(panel, context) {

        panel.classList.add('signage-workbench');

        return mountSignageWorkbench(panel, { registry: art, documents: context.documents,

          openUsage: usage => context.openInstance(usage.document, usage.instance), renderNative: native.render, renderSequence: sequences.render,

        });

      } },



    ],

    preview: { render: (canvas, request) => sequences.render(canvas, request) ?? native.render(canvas, request) },

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

    initialEnvironment: { cameraX: 0, zoom: 1, day: 1, minute: 580, seed: 3, flags: '{}', state: '{}', weather: 'forecast', hover: '', titleOffset: 7, sequence: 'glide' },

    environmentControls: [

      { key: 'cameraX', label: 'Camera X', kind: 'number', step: 20 }, { key: 'cameraH', label: 'Camera height', kind: 'number', step: 10 },

      { key: 'zoom', label: 'Zoom', kind: 'number', min: .1, max: 8, step: .1 },

      { key: 'day', label: 'City day', kind: 'number', min: 1, step: 1 }, { key: 'minute', label: 'City minute', kind: 'number', min: 0, max: 1439, step: 10 },

      { key: 'seed', label: 'Weather seed', kind: 'number', min: 0, step: 1 }, { key: 'weather', label: 'Weather', kind: 'select', options: ['forecast', ...WEATHER_KINDS] },

      { key: 'hack', label: 'Hack vision', kind: 'boolean' }, { key: 'hover', label: 'Hovered device id', kind: 'text' },

      { key: 'flags', label: 'Story flags (JSON)', kind: 'text' }, { key: 'state', label: 'Device state (JSON)', kind: 'text' },

      { key: 'presentation', label: 'Presentation controller (JSON, optional)', kind: 'text' },

      { key: 'sequence', label: 'Opening sequence', kind: 'select', options: ['title', 'rise', 'glide'] },

      { key: 'titleOffset', label: 'Title clock offset', kind: 'number', min: 0, step: 1 },

    ],

  });

}

void start().catch(error => { const host = document.getElementById('composer'); if (host) { const message = document.createElement('p'); message.id = 'boot-error'; message.textContent = `Composer could not start: ${error instanceof Error ? error.message : String(error)}`; host.replaceChildren(message); } });
