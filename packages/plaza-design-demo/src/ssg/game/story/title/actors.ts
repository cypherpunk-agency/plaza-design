import {prepareCharacter,type Character,type PreparedCharacter} from '../../runtime/characters';
import type{Properties,Composition}from'../../art/core/composition';
import{openingRegistry}from'../../art/sequences/opening/sequence';
import{PEOPLE as COAST,RIDERS_UP}from'../../art/sequences/opening/coast';
import{PEOPLE as TOWN}from'../../art/sequences/opening/town';
import{WAITING}from'../../art/sequences/opening/finale';
import{BOATER}from'../../art/architecture/cutaway';
const actors = new WeakMap<Character, Map<string, Character>>();
export function pieceActor(source: Character, props: Properties | undefined): Character {
  if (!props) return source;
  const changes: Partial<Character> = {};
  if (typeof props.seed === 'number' && props.seed !== (source.seed ?? Math.round(source.x * 7 + 3))) changes.seed = props.seed;
  if (typeof props.act === 'string' && props.act !== (source.act ?? 'stand')) changes.act = props.act as Character['act'];
  if (typeof props.dim === 'number' && props.dim !== (source.dim ?? 0)) changes.dim = props.dim;
  if (typeof props.speed === 'number' && props.speed !== (source.speed ?? 0)) { if (props.speed > 0) changes.speed = props.speed; }
  if (!Object.keys(changes).length) return source;
  let cache = actors.get(source); if (!cache) { cache = new Map(); actors.set(source, cache); }
  const key = JSON.stringify(changes); let actor = cache.get(key); if (!actor) { actor = { ...source, ...changes }; cache.set(key, actor); } return actor;
}

export function openingActorSnapshots(time:number,reduced:boolean,doc?:Composition):Readonly<Record<string,PreparedCharacter>>{const f=reduced?0:time*60,result:Record<string,PreparedCharacter>={};for(const[i,w]of COAST.entries())result['coast.person-'+i]=prepareCharacter(w.c,f);for(const[i,w]of TOWN.entries())result['people.person-'+i]=prepareCharacter(w.c,f);for(const[i,w]of RIDERS_UP.entries())result['escalator.'+i]=prepareCharacter(w,f);for(const[i,w]of WAITING.entries())result['line0.'+i]=prepareCharacter(w.c,f);result.canal=prepareCharacter(BOATER,f);const walk=(rows:Composition['instances'])=>rows.forEach(row=>{let source:Character|undefined;if(row.type.startsWith('sequence.opening.coast-mid.person-'))source=COAST[Number(row.type.split('person-')[1])]?.c;if(row.type.startsWith('sequence.opening.people.person-'))source=TOWN[Number(row.type.split('person-')[1])]?.c;if(source)result[row.id]=prepareCharacter(pieceActor(source,openingRegistry.properties(row.type,row.props)),f);walk(row.children??[]);});if(doc)walk(doc.instances);return result;}
