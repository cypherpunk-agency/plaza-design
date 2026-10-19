import {validateNativeContract} from './native-contract';
import {protectActorIdentity} from './actors';
import {nativeDialogue} from './native-dialogue';
import type {SceneData} from '../../data/types';
/** Common validation for source content whose placements still use a registered composition. */
import {validateSceneDocument,type SceneDocument} from './scene-document';
import {validateGameplay} from './validation';
import type {GameplayDefinition} from './types';
import type {NativeTargetValidationContext,NativeTargetValidator} from './native-targets';
type ContentContractOptions=Omit<NonNullable<Parameters<typeof validateSceneDocument>[2]>,'nativeTargets'> & {nativeTargets?:NativeTargetValidator};
export function contentContract(source:unknown,gameplay:unknown,options:ContentContractOptions={}){
 const baseline=source as SceneDocument,initial=validateGameplay(gameplay);
 const groups=['uses','readables','rests','exits'] as const;
 const validate=(value:unknown,g:GameplayDefinition=initial,context?:NativeTargetValidationContext)=>{
  const scopedOptions=options.nativeTargets?{...options,nativeTargets:(doc:SceneDocument,gameplay?:GameplayDefinition)=>options.nativeTargets!(doc,gameplay,context)}:options;
  const doc=validateSceneDocument(value,validateGameplay(g),scopedOptions);
  if(doc.id!==baseline.id)throw new Error('Scene content source identity must remain '+baseline.id);
  if(options.actors){if(!doc.actors||!baseline.actors)throw new Error('Registered actors require source definitions');protectActorIdentity(doc.actors,baseline.actors,{reorder:true,entities:true});for(const person of doc.people??[])if(!doc.actors.some(a=>a.target===person.id))throw new Error('Dialogue requires its actor: '+person.id);}
  if(options.manifest){if(!doc.manifest||doc.manifest.people!==undefined)throw new Error('Registered manifest requires ordinary bindings; actors own people placement');for(const group of groups)if(Object.keys(doc.manifest[group]??{}).sort().join()!==(doc[group]??[]).map(r=>r.id).sort().join())throw new Error('Manifest must bind every '+group+' entry');}
  for(const key of ['uses','readables','people','exits','rests','nativeTargets'] as const)
   if(!(options.manifest&&(groups as readonly string[]).includes(key))&&!(options.actors&&key==='people')&&!(options.nativeTargets&&key==='nativeTargets'))
   if(JSON.stringify(doc[key]?.map(r=>r.id))!==JSON.stringify(baseline[key]?.map(r=>r.id)))throw new Error('Scene '+doc.id+' placement bindings require migration before adding/removing '+key);
  return doc;
 };
 return {scene:validate(source),gameplay:initial,validateScene:validate,validateGameplay,nativeTargetBindings:options.nativeTargets?.bindings,presentationTargets:options.presentationTargets?Object.freeze([...options.presentationTargets]):undefined};
}

/** Shared editable content backed by existing saved native state and declared device conversations. */
export function nativeContentContract(source:unknown,gameplay:unknown,data:SceneData,dialogues:string[],options:ContentContractOptions={},nativeOptions:{derived?:readonly string[];textOnlyDialogues?:readonly string[]}={}){
 const contract=contentContract(source,gameplay,options);
 const validateGameplay=(value:unknown)=>{const d=validateNativeContract(value,gameplay,data,{allowNewContent:true,allowNewVocabulary:true,allowBindingEdits:true,nativeDerived:nativeOptions.derived});for(const id of dialogues)nativeDialogue(d,id,{},undefined,{entryActions:!nativeOptions.textOnlyDialogues?.includes(id)});return d;};
 return {...contract,gameplay:validateGameplay(gameplay),validateGameplay,
  validateScene:(value:unknown,g:GameplayDefinition=contract.gameplay,context?:NativeTargetValidationContext)=>contract.validateScene(value,validateGameplay(g),context)};
}
