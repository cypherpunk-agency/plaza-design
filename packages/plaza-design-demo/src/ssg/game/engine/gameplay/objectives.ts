import type {GameplayReadContext} from './queries';
import type {Condition,GameplayState} from './types';
import {matches} from './validation';

/** Ordered authored stages: the first eligible row owns both wording and attention. */
export interface ObjectiveDefinition {id:string;text:string;when?:Condition;target?:string;gentle?:boolean}
export function currentObjective<T extends ObjectiveDefinition>(rows:readonly T[],state:GameplayState,context?:GameplayReadContext):T|undefined {
  return rows.find(row=>matches(row.when,state,context));
}
export function objectiveAttention(row:ObjectiveDefinition|undefined,positions:Readonly<Record<string,number>>){
  if(!row?.target)return null;
  const x=positions[row.target];
  if(!Number.isFinite(x))return null;
  return {x,...(row.gentle?{gentle:true}:{})};
}
