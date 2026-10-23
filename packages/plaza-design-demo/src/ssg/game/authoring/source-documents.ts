import {validateSequence} from '../art/core/sequence';
import {sequencePlacements} from '../world/zone-graph';
import {withSharedState} from '../engine/gameplay/shared-state';
import {BACKDROP_SOURCES,backdropDocumentId,validateBackdrop} from '../world/backdrops';
import {validateSharedState} from '../engine/gameplay/validation';
import {validateStateReadReferences} from '../engine/gameplay/state-reads';
import type {GameplayDefinition} from '../engine/gameplay/types';
import {pendingOpeningStory} from './pending-opening';
import {validateCompanionGameplay} from '../engine/gameplay/companion-conversations';
import {validateOpeningSource} from '../story/opening-source';
import {validateContacts} from '../story/contacts';
import {validateEndCard} from '../story/end-card';
import {pendingRegistry} from './pending-registry';
import {pendingNetworkContext,validatePendingNetwork} from './pending-network';
import {validateNetworkShape} from './network-source';
import {createRuntimeSequenceDocuments} from '../story/sequence-documents';
import {validatePendingFixtures} from './pending-fixtures';
import {deviceSceneIds,deviceDocumentId,deviceSourceIdentity,validateDeviceSource} from './device-sources';
import {pendingDestinations,validatePendingSceneCatalogue} from './pending-destinations';
import {pendingScene} from './pending-scene';
import {validateFixtureMetro} from './play-fixtures';
import {validateMetroSource,validateMetroLocks} from '../world/transport/metro-source';
import {validatePendingCity,createPendingCity} from './pending-city';
import {validateBotReactions} from '../engine/gameplay/bot-conversations';
import {validateCompanionSource} from '../engine/gameplay/companion-source';
import {validateCritterReactions} from '../engine/gameplay/critter-reactions';
import {validateReviewStations} from '../demo/review-stations';
import {validatePendingCompanion} from './pending-rules';
import {validateManifestComposition,validateManifestSources} from '../scenes/demo-manifest';
import {validateDeclaredDestinations} from '../engine/gameplay/declared-scene';
import {nativeGameplayScenes} from './native-gameplay-scenes';
import {gameplayScenes} from './gameplay-scenes';
import {validatePlayFixtures} from './play-fixtures';
import {validatePeople} from '../art/characters/people-source';
import {validatePresets} from './kit-presets';
import {validateStoryboard} from './storyboard';
import {validatePendingPlayProfiles} from './play-profile-source';
import {validatePlayProfiles} from '../runtime/play-profiles';
import {validateZoneGraph,worldProblems} from '../world/zone-graph';
import {zoneInfo,zonePieces} from './zone-graph-context';
/** Explicit source allowlist shared by the local launcher and focused save checks. */
import { art, type Composition } from '../art';
import { NATIVE_SCENES } from '../scenes';
import {validateSceneCatalogue} from '../engine/gameplay/scene-catalogue';
import { nativeSceneAdapters } from './scene-adapters';
import { PROPOSAL_SCENES, validateProposal } from './proposal-scenes';
import { createSequenceValidationContext } from '../art/core/sequence-context';
import type { DocumentDescriptor } from './server/store';
import { preserveBoundIdentity } from './bound-identity';


const scenes = Object.keys(nativeSceneAdapters);
const sequenceFiles = {
  'sequence-title': 'story/title/title.composition.json',
  'sequence-opening': 'story/title/composition.json',
  'sequence-intro': 'story/cutscenes/intro.composition.json',
  'sequence-act2': 'story/cutscenes/act2.composition.json',
  'sequence-taxi': 'story/cutscenes/taxi.composition.json',
};

const sceneComposition = (scene: string, value: unknown) => {
  const doc = nativeSceneAdapters[scene].validate(value);
  if (doc.scene !== scene) throw new Error(`Scene identity must remain ${scene}`);
  return doc;
};
const validatePendingSceneContent=(registration:(typeof gameplayScenes)[number],value:unknown,documents:ReadonlyMap<string,unknown>)=>{
 const gameplay=registration.validateGameplay(documents.get(registration.gameplayId));
 if((value as import('../engine/gameplay/scene-document').SceneDocument)?.nativeTargets===undefined)return registration.validateScene(value,gameplay);
 const identity=deviceSourceIdentity(registration.id),network=pendingNetworkContext(documents),scene=pendingScene(registration.id,documents.get(identity.composition),{sceneDocument:value,gameplay,devices:documents.get(identity.devices)},network);
 return registration.validateScene(value,gameplay,{phase:'assembled',data:scene.data!,network});
};
export const sourceDocuments: DocumentDescriptor[] = [
  {id:'companion-gameplay',file:'engine/gameplay/companion-gameplay.json',kind:'gameplay',validate:validateCompanionGameplay},
  // world-level state owners (shift.*): declared once, used by scenes through gameplay sharedState
  {id:'state-owners',file:'world/state-owners.json',kind:'gameplay',validate:validateSharedState},
  {id:'opening-story',file:'story/opening.json',kind:'gameplay',validate:validateOpeningSource,validateContext:(value,documents)=>pendingOpeningStory(new Map([...documents,['opening-story',value]])).source},
  {id:'network',file:'data/net.json',kind:'devices',validate:validateNetworkShape,validateContext:(value,documents)=>validatePendingNetwork(new Map([...documents,['network',value]]),pendingRegistry(new Map([...documents,['network',value]])))},
  {id:'authored-scenes',file:'scenes/authored.json',kind:'scene',validate:value=>validateSceneCatalogue(value,NATIVE_SCENES),validateContext:validatePendingSceneCatalogue},
  ...deviceSceneIds.map(id=>({id:deviceDocumentId(id),file:deviceSourceIdentity(id).file!,kind:'devices' as const,validate:(value:unknown)=>validateDeviceSource(id,value),validateContext:(value:unknown,documents:ReadonlyMap<string,unknown>)=>pendingScene(id,documents.get(id),{devices:value,sceneDocument:documents.get(deviceSourceIdentity(id).scene),gameplay:documents.get(deviceSourceIdentity(id).gameplay)},pendingNetworkContext(documents)).data})),
  {id:'play-profiles',file:'runtime/play-profiles.json',kind:'profiles',validate:validatePlayProfiles,validateContext:validatePendingPlayProfiles},
  {id:'kit-presets',file:'art/presets/kit-presets.json',kind:'presets',validate:value=>validatePresets(value,art)},
  {id:'people',file:'art/characters/people.json',kind:'people',validate:validatePeople},
  // Beats' scenes must be composition documents: real scenes or style-frame proposals.
  {id:'storyboard',file:'authoring/storyboard.json',kind:'storyboard',validate:value=>validateStoryboard(value),validateContext:(value,documents)=>validateStoryboard(value,new Set([
    ...sourceDocuments.filter(d=>d.kind==='composition'&&documents.has(d.id)).map(d=>(documents.get(d.id) as Composition).scene),
    ...((documents.get('authored-scenes') as import('../engine/gameplay/scene-catalogue').SceneCatalogue|undefined)?.scenes??[]).map(s=>s.scene.id),
  ]))},
  {id:'metro-source',file:'world/transport/metro.json',kind:'transport',validate:validateMetroSource,validateContext:(value,documents)=>{validateMetroLocks(validateMetroSource(value),(documents.get('city-source') as {LOCKS?:Record<string,unknown>}|undefined)?.LOCKS);}},
  {id:'city-source',file:'world/city.json',kind:'city',validate:validatePendingCity,validateContext:validatePendingCity},
  // the seams that join zones with no cut (world/zone-graph.ts); checked against the scenes that exist and their level pieces
  {id:'zone-graph',file:'world/zone-graph.json',kind:'transport',validate:validateZoneGraph,validateContext:(value,documents)=>{const problems=worldProblems(validateZoneGraph(value),zoneInfo(documents),zonePieces(documents));if(problems.length)throw new Error(problems.join('; '));}},
  {id:'bot-reactions',file:'engine/gameplay/bot-reactions.json',kind:'conversations',validate:validateBotReactions},
  {id:'companion',file:'engine/gameplay/companion.json',kind:'rules',validate:validateCompanionSource,validateContext:validatePendingCompanion},
  {id:'critter-reactions',file:'engine/gameplay/critter-reactions.json',kind:'rules',validate:validateCritterReactions},
  {id:'review-stations',file:'demo/review-stations.json',kind:'rules',validate:validateReviewStations},
  {id:'contacts',file:'data/contacts.json',kind:'rules',validate:validateContacts},
  {id:'end-card',file:'story/end-card.json',kind:'rules',validate:validateEndCard},
  ...nativeGameplayScenes.filter(s=>!gameplayScenes.some(g=>g.gameplayId===s.gameplayId)).map(s=>({id:s.gameplayId,file:s.file,kind:'gameplay' as const,validate:s.validateGameplay})),
  ...Array.from(new Map(gameplayScenes.flatMap(s=>[{id:s.prefix+'-scene',file:'scenes/'+s.prefix+'/scene.json',kind:'scene' as const,validate:s.validateScene,validateContext:(value:unknown,documents:ReadonlyMap<string,unknown>)=>validatePendingSceneContent(s,value,documents)},{id:s.gameplayId,file:'scenes/'+s.gameplayId.replace(/-gameplay$/,'')+'/gameplay.json',kind:'gameplay' as const,validate:s.validateGameplay}]).map(d=>[d.id,d])).values()),
  {id:'play-fixtures',file:'authoring/play-fixtures.json',kind:'fixtures',validate:validatePlayFixtures,validateContext:(value,documents)=>validateFixtureMetro(validatePendingFixtures(value,documents),createPendingCity(documents.get('city-source'),documents))},
  ...scenes.map(scene => ({ id: scene, file: `scenes/${scene}/composition.json`, kind: 'composition' as const, validate: (value: unknown) => sceneComposition(scene, value), validateUpdate: (before:unknown,after:unknown)=>preserveBoundIdentity(before,after,art) })),
  ...Object.entries(BACKDROP_SOURCES).map(([id,source])=>({id:backdropDocumentId(id),file:source.file,kind:'composition' as const,validate:(value:unknown)=>validateBackdrop(value,id)})),
  ...Object.entries(sequenceFiles).map(([id, file]) => ({ id, file, kind: 'composition' as const, validateUpdate: (before:unknown,after:unknown)=>preserveBoundIdentity(before,after,art), validate(value: unknown) { const doc = art.validate(value); if (doc.scene !== id) throw new Error(`Sequence identity must remain ${id}`); return doc; } })),
  {id:'demo-manifest',file:'scenes/demo-manifest/composition.json',kind:'composition',validate:validateManifestComposition},
  ...PROPOSAL_SCENES.map(p => ({ id: p.id, file: p.file, kind: 'composition' as const, validate: (value: unknown) => validateProposal(p.id, value) })),
];
/** Every grouped save validates the complete prospective source set before any replacement. */
export function validateSourceDocuments(documents: ReadonlyMap<string, unknown>) {
  // every scene validates against the pending state owners, not the shipped ones
  return withSharedState(documents.get('state-owners'),()=>validateAll(documents));
}
function validateAll(documents: ReadonlyMap<string, unknown>) {
  const declared=validateManifestSources(documents.get('demo-manifest'),documents.get('demo-manifest-scene'),documents.get('demo-manifest-gameplay'));
  validateDeclaredDestinations(declared.scene,pendingDestinations(documents));
  const compositions: Record<string, Composition> = {};
  for (const descriptor of sourceDocuments) {
    if (!documents.has(descriptor.id)) throw new Error(`Missing source document: ${descriptor.id}`);
    if(descriptor.validateContext)descriptor.validateContext(documents.get(descriptor.id),documents);else descriptor.validate(documents.get(descriptor.id));
    if (descriptor.kind === 'composition') compositions[descriptor.id] = documents.get(descriptor.id) as Composition;
  }
  for(const s of gameplayScenes)validatePendingSceneContent(s,documents.get(s.prefix+'-scene'),documents);
  const scenes=pendingRegistry(documents);
  for(const scene of Object.values(scenes)){const ref=scene.backdrop;if(ref&&!documents.has(backdropDocumentId(ref.id)))throw new Error('Unknown backdrop '+ref.id+' in '+scene.id);}
  for(const seam of validateZoneGraph(documents.get('zone-graph')).seams){const a=scenes[seam.a.zone]?.backdrop,b=scenes[seam.b.zone]?.backdrop;if(a&&b&&a.id===b.id&&(Math.abs(b.x-a.x-seam.dx)>0.001||Math.abs((b.h??0)-(a.h??0)-seam.dh)>0.001))throw new Error('Backdrop origins disagree across seam '+seam.id);}
  for(const composition of Object.values(compositions))for(const row of composition.instances)if(row.type==='sequence.world-control'){const props=art.properties(row.type,row.props);sequencePlacements(validateZoneGraph(documents.get('zone-graph')),String(props.origin),props.zones as string[],scenes);}
  validateFixtureMetro(validatePendingFixtures(documents.get('play-fixtures'),documents),createPendingCity(documents.get('city-source'),documents));
  const definitions:GameplayDefinition[]=[];for(const value of documents.values()){const d=value as any;if(d?.version===1&&Array.isArray(d.flags)&&d.commands&&d.conversations)definitions.push(d);if(d?.GAMEPLAY)definitions.push(d.GAMEPLAY);for(const entry of Array.isArray(d?.scenes)?d.scenes:[])if(entry?.gameplay)definitions.push(entry.gameplay);}validateStateReadReferences(definitions);
  const context = createSequenceValidationContext(art, compositions, pendingDestinations(documents));
  for (const id of Object.keys(sequenceFiles)) validateSequence(compositions[id],context);
  createRuntimeSequenceDocuments(documents,context);
  for (const id of documents.keys()) if (!sourceDocuments.some(d => d.id === id)) throw new Error(`Unknown source document: ${id}`);
}
