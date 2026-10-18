import source from './workshop.json';
import data from '../scenes/sandbox/devices.json';
import type {SceneData} from '../data/types';
import {validateNativeContract} from '../engine/gameplay/native-contract';
import {nativeDeviceData} from '../engine/gameplay/native-bindings';
import {sandboxScene} from '../scenes/sandbox';
import {sandboxComposition} from '../scenes/sandbox/composition';
export const validateWorkshopGameplay=(value:unknown)=>validateNativeContract(value,source,data as unknown as SceneData);
export const WORKSHOP_GAMEPLAY=validateWorkshopGameplay(source);
export function workshopScene(composition=sandboxComposition,gameplay=WORKSHOP_GAMEPLAY){
 const shared=validateWorkshopGameplay(gameplay),base=sandboxScene(composition);
 return{...base,name:'Test Workshop',gameplay:shared,data:nativeDeviceData(base.data!,shared),
  intro:['TEST WORKSHOP. Physical use, dialogue and wires share the same device operations.','The first two benches demonstrate direct use and cables. Read their test cards. H opens hack vision; L offers timers and switches.'],
  exits:base.exits.map(e=>({...e,to:'library',at:'downtown',label:'[E] TEST DESK'})),
  readables:base.readables!.filter(r=>r.id!=='plan'),
  uses:[...base.uses!,{id:'workshop-controls',x:base.readables!.find(r=>r.id==='plan')!.x,label:'[E] WORKSHOP CONTROLS',name:'WORKSHOP CONTROLS',promptH:90,use:()=>({name:'WORKSHOP CONTROLS',pages:[],conversation:'workshop.operator'})}],
 };
}
