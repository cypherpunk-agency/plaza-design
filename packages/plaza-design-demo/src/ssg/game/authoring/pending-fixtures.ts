import {pendingNetworkContext} from './pending-network';
import type {SceneDef} from '../scenes/kit';
import type {PlayFixtureVocabulary} from '../world/checkpoints';
import {validatePlayFixtures,validateFixtureBounds,fixtureStateMetadata} from '../world/checkpoints';
import {pendingRegistry} from './pending-registry';
import {validateWorldCompositions,worldWithMembership} from '../world/compositions';
import {compileGameWorld} from '../world/compiled-world';
import {sequenceProgram} from '../art/core/sequence';
import type {ChunkDocument} from '../art/core/composition';
import {validatePendingPlayProfiles} from './play-profile-source';
/** Same source discovery for checkpoint authoring, reconstruction and private Play. */
export function fixtureSequences(documents:ReadonlyMap<string,unknown>,registry:Readonly<Record<string,SceneDef>>){
 const chunks:Record<string,ChunkDocument>={};for(const scene of Object.values(registry))if(scene.artwork)chunks[scene.artwork.scene]=scene.artwork;
 for(const value of documents.values()){const d=value as ChunkDocument;if(d&&typeof d.scene==='string'&&Array.isArray(d.instances))chunks[d.scene]=d;}
 return{chunks,program:sequenceProgram(chunks)};
}
/** Pending mode always uses current owners; no shipping identifier allowlist is appended. */
export function pendingFixtureVocabulary(documents:ReadonlyMap<string,unknown>,registry?:Readonly<Record<string,SceneDef>>):PlayFixtureVocabulary{
 for(const id of['network','opening-story','city-source'])if(!documents.has(id))throw Error('Pending fixture vocabulary requires '+id);
 registry??=pendingRegistry(documents);
 const authoredSequences=fixtureSequences(documents,registry);
 const opening=documents.get('opening-story')as {OPENING:Record<string,string>;GAMEPLAY:{flags:string[]}},city=documents.get('city-source')as {HARBOR_FLAG:string},network=pendingNetworkContext(documents);
 return{states:fixtureStateMetadata(registry),compositions:documents.has('world-compositions')?validateWorldCompositions(documents.get('world-compositions')):undefined,sequences:Object.fromEntries(authoredSequences.program.sequences.map(s=>{const control=authoredSequences.chunks[s.composition]?.instances.find(n=>n.type==='sequence.world-control')?.props;return[s.id,{duration:s.duration,...(typeof control?.worldComposition==='string'&&control.worldComposition?{composition:control.worldComposition}:{}),...(typeof control?.origin==='string'?{origin:control.origin}:{})}];})),flags:new Set(['arrived','pixel',...Object.values(opening.OPENING),...opening.GAMEPLAY.flags,city.HARBOR_FLAG,...Object.values(registry).flatMap(scene=>[...(scene.gameplay?.flags??[]),...scene.exits.flatMap(e=>[...(e.requires?[e.requires]:[]),...(e.sets?[e.sets]:[])])])]),programs:new Set(network.net.programs.map(p=>p.id)),keyring:new Set(network.keyring.keys())};
}
/** Bounds and identities come from the complete pending registry, including native content rebindings. */
export function validatePendingFixtures(value:unknown,documents:ReadonlyMap<string,unknown>){
 for(const id of['network','opening-story','city-source'])if(!documents.has(id))throw Error('Pending fixture vocabulary requires '+id);
 const registry=pendingRegistry(documents),widths=Object.fromEntries(Object.entries(registry).map(([id,scene])=>[id,scene.width]));
 const fixtures=validateFixtureBounds(validatePlayFixtures(value,false,Object.keys(registry),pendingFixtureVocabulary(documents,registry)),widths);
 if(documents.has('play-profiles')){const pending=new Map(documents);pending.set('play-fixtures',fixtures);validatePendingPlayProfiles(documents.get('play-profiles'),pending);}
 for(const f of fixtures.fixtures)if(f.entrance&&!registry[f.scene]?.exits.some(e=>e.id===f.entrance))throw Error('Checkpoint '+f.id+': unknown starting entrance '+f.entrance);
 for(const fixture of fixtures.fixtures)if(fixture.membership){const pending=new Map(documents);pending.set('world-compositions',worldWithMembership(validateWorldCompositions(documents.get('world-compositions')),fixture.membership));compileGameWorld(registry,pending);}
 return fixtures;
}
