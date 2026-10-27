import {pendingRegistry} from './pending-registry';
import {fixtureSequences} from './pending-fixtures';
import {validateWorldCompositions} from '../world/compositions';
import {transitionKey,type StoryboardLinks,type StoryTransition} from './storyboard';
import type {PlayFixtures} from '../world/checkpoints';

/** Read actual compiled gameplay definitions; storyboard references never execute or copy their rules. */
export function storyboardLinks(documents:ReadonlyMap<string,unknown>){
 const registry=pendingRegistry(documents),transitions:{reference:StoryTransition;command:string;detail:string}[]=[];
 for(const [scene,definition]of Object.entries(registry)){
  for(const [id,command]of Object.entries(definition.gameplay?.commands??{}))transitions.push({reference:{scene,kind:'command',id},command:id,detail:command.sources.join(', ')+' · '+command.actions.length+' actions'});
  for(const [id,trigger]of Object.entries(definition.gameplay?.native?.triggers??{}))transitions.push({reference:{scene,kind:'trigger',id},command:trigger.command,detail:(trigger.phase??'afterNative')+(trigger.once?' · once':'')+(trigger.edge?' · '+trigger.edge:'')});
 }
 const compositions=validateWorldCompositions(documents.get('world-compositions')),fixtures=(documents.get('play-fixtures') as PlayFixtures).fixtures,sequences=fixtureSequences(documents,registry).program.sequences;
 const links:StoryboardLinks={compositions:new Set(Object.keys(compositions.compositions)),checkpoints:new Map(fixtures.map(f=>[f.id,f])),sequences:new Set(sequences.map(s=>s.id)),transitions:new Set(transitions.map(t=>transitionKey(t.reference)))};
 return{links,compositions,fixtures,sequences,transitions};
}
