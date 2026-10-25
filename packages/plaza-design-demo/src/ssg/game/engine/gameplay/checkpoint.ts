import type {GameplayDefinition,GameplayState,StateValue} from './types';
import {GameplaySession} from './session';
import {validateCheckpointOwner,validateCheckpointShape} from './checkpoint-source';
import {validateGameplay} from './validation';
import {stateAddress,stateValue,setStateValue} from './state';
/** Compile once per model; every invocation evaluates only a private copied common-state block. */
export function compileCheckpoint(source:GameplayDefinition,owner:string){if(!source.checkpoint?.length)return undefined;validateCheckpointOwner(source,owner);
 const declarations=Object.fromEntries(Object.entries(source.state??{}).filter(([,d])=>d.owner===owner).map(([id,d])=>[id,{...d,lifetime:'save' as const}]));
 const base={version:1 as const,flags:[],items:[],events:[],state:declarations,reactions:[],conversations:{}};
 validateCheckpointShape(source,when=>{validateGameplay({...base,commands:{check:{sources:['system'],when,actions:[]}}});});
 const commands=Object.fromEntries(source.checkpoint.map(row=>[row.command,source.commands[row.command]]));let current:GameplayState={flags:{},items:{},tokens:0};const session=new GameplaySession({...base,commands},{read:()=>current,write:next=>{current=next;}});
 const rows=structuredClone(source.checkpoint);
 return {settle(state:Readonly<Record<string,StateValue>>){current={flags:{},items:{},tokens:0,values:{}};for(const id of Object.keys(declarations)){const key=stateAddress(id)[1];if(key in state)setStateValue(current.values!,id,state[key],source);}try{for(const row of rows)if(session.matches(row.when)){const result=session.dispatch(row.command,'system');if(!result.ok)throw Error('Checkpoint refused '+row.command+': '+result.reason);}return {...state,...Object.fromEntries(Object.keys(declarations).map(id=>[stateAddress(id)[1],stateValue(current.values,id,source)!]))};}finally{current={flags:{},items:{},tokens:0};}}};
}
