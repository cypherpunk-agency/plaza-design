/** Source-authored switches for the single renderer. No runtime state or independent evaluator. */
export const RENDER_PASSES = ['sky','weather','casters','actors','shade','grade','lights','prompts','bubbles','vision'] as const;
export type RenderPass = typeof RENDER_PASSES[number];
export type RenderSettings = Partial<Record<RenderPass, boolean>>;
export type RenderSource={kind:'default'}|{kind:'district'|'chunk'|'composition'|'group'|'sequence';id:string}|{kind:'member';composition:string;member:string;child?:string}|{kind:'sequence-member';id:string;chunk:string}|{kind:'unavailable'};
export interface RenderSettingsLayer {source:RenderSource;settings?:RenderSettings}
export type RenderLimits=Partial<Record<RenderPass,string>>;
export interface ResolvedRenderSettings {values:Record<RenderPass,boolean>;sources:Record<RenderPass,RenderSource>;limits:RenderLimits}
export function renderSourceLabel(source:RenderSource):string {
 if(source.kind==='default')return 'Shared default';if(source.kind==='unavailable')return 'Unavailable in this picture';
 if(source.kind==='member')return 'Member '+source.composition+'/'+source.member+(source.child?'/'+source.child:'');
 if(source.kind==='sequence-member')return 'Sequence '+source.id+' / '+source.chunk;
 return source.kind[0].toUpperCase()+source.kind.slice(1)+' '+source.id;
}
/** An asset-only picture has no SceneModel/world pass inputs. This is a capability, not a preset. */
export const assetPictureLimits:RenderLimits=Object.fromEntries(RENDER_PASSES.map(pass=>[pass,'This picture draws registered assets directly; it has no world '+pass+' pass inputs.']));
export function validateRenderSettings(value:unknown):RenderSettings {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Rendering settings require an object');
 for(const [key,v] of Object.entries(value))if(!RENDER_PASSES.includes(key as RenderPass)||typeof v!=='boolean')throw Error('Unknown rendering switch or non-boolean value: '+key);
 return {...value} as RenderSettings;
}
/** Ordered layers deliberately distinguish absent, false and true. Reset deletes the authored key. */
export function resolveRenderSettings(layers:readonly RenderSettingsLayer[],limits:RenderLimits={}):ResolvedRenderSettings {
 const values=Object.fromEntries(RENDER_PASSES.map(key=>[key,true])) as Record<RenderPass,boolean>;
 const sources=Object.fromEntries(RENDER_PASSES.map(key=>[key,{kind:'default' as const}])) as Record<RenderPass,RenderSource>;
 for(const layer of layers)for(const key of RENDER_PASSES)if(layer.settings?.[key]!==undefined){values[key]=layer.settings[key]!;sources[key]=layer.source;}
 for(const key of RENDER_PASSES)if(limits[key]){values[key]=false;sources[key]={kind:'unavailable'};}
 return {values,sources,limits};
}
