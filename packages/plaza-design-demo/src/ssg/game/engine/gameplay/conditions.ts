import type {Condition,GameplayDefinition} from './types';
import {sourceGameplay} from './shared-state';
import {validateGameplay} from './validation';
/** Metadata conditions use exactly the gameplay vocabulary and validator. No second evaluator. */
export function validateGameplayCondition(condition:unknown,definition:GameplayDefinition,sharedState?:unknown):asserts condition is Condition|undefined{
 if(condition===undefined)return;
 const own=sourceGameplay(definition);
 validateGameplay({version:1,flags:definition.flags,items:definition.items,...(own.state?{state:own.state}:{}),...(definition.sharedState?{sharedState:definition.sharedState}:{}),...(definition.queries?{queries:definition.queries}:{}),...(definition.stateReads?{stateReads:definition.stateReads}:{}),events:[],commands:{check:{sources:['interaction'],when:condition,actions:[]}},reactions:[],conversations:{}},sharedState);
}
