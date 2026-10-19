import type {Value} from './types';
/** Scalar inputs actually read by registered algorithms or native presentation. */
export type StateRequirement=string|{key:string;type:'boolean'|'number'|'string'};
export const stateRequirement=(role:StateRequirement)=>typeof role==='string'?{key:role}:role;
export function stateRequirementProblems(roles:readonly StateRequirement[],values:Readonly<Record<string,Value>>,scene:string,declarations?:Readonly<Record<string,{owner:string;type:string;nullable?:boolean}>>):string[]{
 const errors:string[]=[];for(const raw of roles){const role=stateRequirement(raw),value=values[role.key];if(!Object.prototype.hasOwnProperty.call(values,role.key)){errors.push(`missing "${role.key}" (the code needs a starting value)`);continue;}if('type'in role){if(typeof value!==role.type||typeof value==='number'&&!Number.isFinite(value))errors.push(`primitive state "${role.key}" requires ${role.type}`);if(declarations){const d=declarations[scene+'.'+role.key];if(!d||d.owner!==scene||d.nullable===true||d.type!==role.type&&!(role.type==='string'&&d.type==='enum'))errors.push(`primitive declaration "${scene}.${role.key}" requires nonnullable ${role.type}`);}}}return errors;
}
