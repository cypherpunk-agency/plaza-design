import type {GameplayDefinition,StateValue} from '../engine/gameplay/types';
import {numericScalarRead,stringScalarRead,stateReadIds,type ScalarRead} from '../engine/gameplay/queries';
import type {TypedForm} from './typed-form';

/** Literal editing keeps its existing controls; reads use the shared scalar vocabulary. */
export function renderActionValue(parent:HTMLElement,name:string,value:StateValue|ScalarRead,doc:GameplayDefinition,form:TypedForm,edit:(value:StateValue|ScalarRead)=>void,options:{initial:StateValue;numeric?:boolean;string?:boolean;literal:(value:StateValue,edit:(value:StateValue)=>void)=>void}){
 const expression=value!==null&&typeof value==='object'?value:undefined;
 const kind=expression?'state'in expression?'state':'query'in expression?'query':'literal':'literal';
 const states=stateReadIds(doc).filter(id=>(!options.numeric||numericScalarRead({state:id},doc))&&(!options.string||stringScalarRead({state:id},doc))),queries=Object.keys(doc.queries??{}).filter(id=>(!options.numeric||numericScalarRead({query:id},doc))&&(!options.string||stringScalarRead({query:id},doc)));
 form.select(parent,name+' source',['literal',...(states.length?['state']:[]),...(queries.length?['query']:[])],kind,kind=>edit(kind==='state'?{state:states[0]}:kind==='query'?{query:queries[0]}:options.initial));
 if(expression&&'state'in expression)form.select(parent,name+' read state',states,expression.state,state=>edit({state}));
 else if(expression&&'query'in expression)form.select(parent,name+' read query',queries,expression.query,query=>edit({query}));
 else options.literal(expression&&'literal'in expression?expression.literal:value as StateValue,edit);
}
