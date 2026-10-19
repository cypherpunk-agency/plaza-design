import type {GameplayDefinition,NativeSay} from './types';
import type {GameplaySession} from './session';
import type {SceneModel,Ctx} from '../model';
import {lineReferenceQuery,lineValue} from './queries';

const fail=(message:string):never=>{throw Error('Invalid native text source: '+message);};
const own=(value:object,key:string)=>Object.prototype.hasOwnProperty.call(value,key);
export function validateNativeSayShape(value:unknown,definition:GameplayDefinition){
 if(value===null)return;
 if(Array.isArray(value)){if(!lineValue(value))fail('line');return;}
 if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==1||!own(value,'text'))fail('one text source required');
 const text=(value as {text:unknown}).text;
 if(typeof text==='string'){if(!text.trim()||text.length>128||['__proto__','constructor','prototype'].includes(text))fail('line key');return;}
 if(!text||typeof text!=='object'||Array.isArray(text)||Object.getPrototypeOf(text)!==Object.prototype||Object.keys(text).length!==1||!own(text,'query')||typeof (text as any).query!=='string'||!lineReferenceQuery(definition,(text as any).query))fail('line-reference query required');
}
export function validateNativeSaySources(value:NativeSay,texts:SceneModel['texts']){if(value!==null&&!Array.isArray(value)&&typeof value.text==='string'&&!lineValue(texts[value.text]))fail('line key '+value.text);}
/** Resolve only the source key before dispatch. Missing context never commits an action. */
export function nativeSayKey(value:Exclude<NativeSay,null|unknown[]>,session:GameplaySession,model:SceneModel):string|undefined{
 const key=typeof value.text==='string'?value.text:session.query(value.text.query);
 return typeof key==='string'&&own(model.texts,key)&&lineValue(model.texts[key])?key:undefined;
}
/** Native formatting receives the real noun/verb/signal context after the commit. */
export function nativeSourceLine(key:string,model:SceneModel,context:Ctx){return model.lineFor(key,context);}
