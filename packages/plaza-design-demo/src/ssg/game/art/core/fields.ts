/** Semantic authoring metadata belongs to each Field, alongside its existing schema. */
import type {Field,Value,FieldEditor} from './composition';
export const PROPERTY_GROUPS=['Transform','Shape / Area','Generation','Appearance','Motion','Depth','Visibility & Drawing'] as const;
export type PropertyGroup=typeof PROPERTY_GROUPS[number];
export type Quantity='length'|'position'|'speed'|'duration'|'angle'|'frequency'|'factor'|'ratio'|'count'|'index'|'seed'|'color'|'text'|'choice'|'boolean'|'reference'|'structured'|'time-of-day'|'native';
export type CoordinateSpace='world'|'local'|'camera'|'screen'|'artwork'|'none';
/** Authoring and sequence keys use the same scalar domain. Integer quantities are discrete. */
export const fieldIsContinuous=(field:Field)=>field.kind==='number'&&field.semantics?.unit!=='integer';
export function fieldValueValid(field:Field,value:Value):boolean{
 return field.kind==='json'?true:field.kind==='number'?typeof value==='number'&&Number.isFinite(value)
  &&(field.semantics?.unit!=='integer'||Number.isInteger(value))
  &&(field.min===undefined||value>=field.min)&&(field.max===undefined||value<=field.max)
  :field.kind==='boolean'?typeof value==='boolean':field.kind==='select'?!!field.options?.includes(value as string|number)
  :typeof value==='string'&&(field.kind!=='color'||/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value));
}
export interface FieldSemantics {group:PropertyGroup;quantity:Quantity;unit:string;space?:CoordinateSpace;description?:string}
/** A semantic declaration replaces the earlier display-only unit hint. Authored fields have
 * one unit authority; raw/prepared fields may still use the generic Field display hint. */
export function semantic(field:Field,semantics:FieldSemantics):Field{const {unit,...schema}=field;return {...schema,semantics};}
/** A schema factory for library families with established ranges. Semantics remain explicit
 * on each authored field; this only replaces duplicated raw schema construction. */
export function numericFields(defaults:{value?:number;min?:number;max?:number;step?:number;unit?:string;animatable?:boolean}={}){
 return(label:string,value=defaults.value,min=defaults.min,max=defaults.max,step=defaults.step,unit=defaults.unit):Field=>({kind:'number',label,default:value as number,...(min!==undefined?{min}:{}),...(max!==undefined?{max}:{}),...(step!==undefined?{step}:{}),...(unit?{unit}:{}),...(defaults.animatable!==undefined?{animatable:defaults.animatable}:{})});
}
export const textField=(label:string,value=''):Field=>({kind:'string',label,default:value});
export const colorField=(label:string,value:string):Field=>({kind:'color',label,default:value});
export const booleanField=(label:string,value=false):Field=>({kind:'boolean',label,default:value});
export const choiceField=(label:string,options:readonly(string|number)[],value=options[0]):Field=>({kind:'select',label,default:value,options:[...options]});
export const arrayEditor=(field:Field,item:Field,options:Omit<Extract<FieldEditor,{kind:'array'}>,'kind'|'item'>={}):Field=>({...field,editor:{kind:'array',item,...options}});
export const tupleEditor=(field:Field,items:Field[],empty?:string):Field=>({...field,editor:{kind:'tuple',items,...(empty?{empty}:{})}});
export const contextualEditor=(field:Field,section:string,label:string):Field=>({...field,editor:{kind:'contextual',section,label}});
export const textLinesEditor=(field:Field,label='Line'):Field=>arrayEditor(field,appearanceText(textField(label)));
export const positionListEditor=(field:Field,label='X'):Field=>arrayEditor(field,shapePosition(numericFields({value:0,step:1})(label)));
export function textPagesEditor(field:Field):Field{
 const page=appearanceStructure({kind:'json',label:'Page',default:[''],validate:v=>{if(!Array.isArray(v)||v.some(s=>typeof s!=='string'))throw Error('A page contains text lines');}});
 return arrayEditor(field,textLinesEditor(page));
}
export function tupleArrayEditor(field:Field,label:string,items:Field[]):Field{
 const row=semantic({kind:'json',label,default:items.map(f=>structuredClone(f.default)),validate:v=>{if(!Array.isArray(v)||v.length!==items.length)throw Error(label+': incorrect number of components');}},{group:field.semantics?.group??'Shape / Area',quantity:'structured',unit:'structured'});
 return arrayEditor(field,tupleEditor(row,items));
}
/** Existing raw fixture fields may lack semantics; game fields use the declared semantic unit. */
export const fieldUnit=(field:Field)=>field.kind==='number'?field.semantics?.unit??field.unit:field.unit;
export const shapeLength=(field:Field)=>semantic(field,{group:'Shape / Area',quantity:'length',unit:'world units',space:'local'});
export const shapePosition=(field:Field)=>semantic(field,{group:'Shape / Area',quantity:'position',unit:'world units',space:'local'});
export const generationSeed=(field:Field)=>semantic(field,{group:'Generation',quantity:'seed',unit:'integer'});
export const generationCount=(field:Field)=>semantic(field,{group:'Generation',quantity:'count',unit:'integer'});
export const depthFactor=(field:Field)=>semantic(field,{group:'Depth',quantity:'factor',unit:'factor'});
export const appearanceChoice=(field:Field)=>semantic(field,{group:'Appearance',quantity:'choice',unit:'choice'});
export const appearanceText=(field:Field)=>semantic(field,{group:'Appearance',quantity:'text',unit:'text'});
export const appearanceColor=(field:Field,unit='color')=>semantic(field,{group:'Appearance',quantity:'color',unit});
export const appearanceBoolean=(field:Field)=>semantic(field,{group:'Appearance',quantity:'boolean',unit:'boolean'});
export const appearanceRatio=(field:Field)=>semantic(field,{group:'Appearance',quantity:'ratio',unit:'ratio'});
export const appearanceStructure=(field:Field)=>semantic(field,{group:'Appearance',quantity:'structured',unit:'structured'});
export function optionalColor(label:string,value=''):Field{
 return semantic({kind:'string',label,default:value,editor:{kind:'colour',empty:'Use the asset’s own color'},animatable:true,validate(v){if(typeof v!=='string'||v!==''&&!/^#[\da-f]{6}$/i.test(v))throw Error(label+': expected #rrggbb or the asset’s own color');}},{group:'Appearance',quantity:'color',unit:'CSS color'});
}
export function distance(label:string,value:number,options:{min?:number;max?:number;step?:number;group?:PropertyGroup;space?:CoordinateSpace}={}):Field{
 const{group='Shape / Area',space='local',...range}=options;
 return semantic({kind:'number',label,default:value,step:1,unit:'world units',...range},{group,quantity:'length',unit:'world units',space});
}
export function seconds(label:string,value:number,range:{min?:number;max?:number;step?:number}={}):Field{
 return semantic({kind:'number',label,default:value,...range},{group:'Motion',quantity:'duration',unit:'seconds'});
}
export function degrees(label:string,value:number,options:{min?:number;max?:number;step?:number;group?:PropertyGroup}={}):Field{
 const{group='Transform',...range}=options;return semantic({kind:'number',label,default:value,...range},{group,quantity:'angle',unit:'degrees'});
}
export function velocity(label:string,value:number,range:{min?:number;max?:number;step?:number}={}):Field{
 return semantic({kind:'number',label,default:value,...range},{group:'Motion',quantity:'speed',unit:'world units / second',space:'local'});
}
export function count(label:string,value:number,min=0,max=1000):Field{return semantic({kind:'number',label,default:value,min,max,step:1},{group:'Generation',quantity:'count',unit:'integer'});}
export function validateFieldSemantics(field:Field,path:string,required=false):void{
 if(required&&field.kind==='json'&&!field.editor)throw Error(path+': structured authored values require typed or contextual controls');
 if(field.editor?.kind==='contextual'&&(!field.editor.section.trim()||!field.editor.label.trim()))throw Error(path+': contextual controls require a section and label');
 if(field.editor?.kind==='tuple'&&!field.editor.items.length)throw Error(path+': tuple controls require components');
 if(required&&field.unit!==undefined)throw Error(path+': authored unit belongs only in semantics.unit');
 if(required&&field.kind==='json'&&field.animatable)throw Error(path+': structured configuration does not support individual nested keyframes');
 const s=field.semantics;
 if(!s){if(required)throw Error(path+': missing semantic property contract');}
 else{
  if(!PROPERTY_GROUPS.includes(s.group)||!s.unit.trim())throw Error(path+': invalid property group/unit');
  if(required&&(s.quantity==='native'||['native units/frame','frames','radians','native time','native angle','native frequency','ms','units','units/s','h'].includes(s.unit)))throw Error(path+': authored properties require canonical seconds, degrees and per-second units; convert only at the native boundary');
  if(!['length','position','speed','duration','angle','frequency','factor','ratio','count','index','seed','color','text','choice','boolean','reference','structured','time-of-day','native'].includes(s.quantity))throw Error(path+': invalid semantic quantity');
  if(s.space!==undefined&&!['world','local','camera','screen','artwork','none'].includes(s.space))throw Error(path+': invalid coordinate space');
  if(['length','position','speed'].includes(s.quantity)&&(!s.space||s.space==='none'))throw Error(path+': spatial quantities require an explicit coordinate space');
  if(['length','position','speed','duration','angle','frequency','factor','ratio','count','index','seed','time-of-day'].includes(s.quantity)&&field.kind!=='number')throw Error(path+': numeric quantity requires a numeric field');
  if(s.quantity==='color'&&!['color','string','json'].includes(field.kind))throw Error(path+': incompatible color field');
  if(s.quantity==='structured'&&field.kind!=='json')throw Error(path+': structured quantity requires structured schema');
  const dimensionalUnits:Partial<Record<Quantity,readonly string[]>>={
   length:['world units','units','artwork pixels','render pixels'],position:['world units','units','artwork pixels','render pixels'],
   speed:['world units / second','native units/frame','units/s','render pixels / second'],duration:['seconds','frames','ms','native time'],
   angle:['degrees','radians','native angle'],frequency:['cycles / second','per second','native frequency'],
   count:['integer'],index:['integer'],seed:['integer'],ratio:['ratio'],factor:['factor','world units / metre'],'time-of-day':['city hours','h']
  };
  if(dimensionalUnits[s.quantity]&&!dimensionalUnits[s.quantity]!.includes(s.unit))throw Error(path+': unit '+s.unit+' is incompatible with '+s.quantity);
 }
 if(field.editor?.kind==='list')for(const[key,child]of Object.entries(field.editor.item))validateFieldSemantics(child,path+'[].'+key,required);
 if(field.editor?.kind==='array')validateFieldSemantics(field.editor.item,path+'[]',required);
 if(field.editor?.kind==='tuple')field.editor.items.forEach((child,i)=>validateFieldSemantics(child,path+'['+i+']',required));
}
