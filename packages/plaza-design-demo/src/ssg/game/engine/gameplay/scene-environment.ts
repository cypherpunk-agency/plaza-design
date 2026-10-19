import type {SceneDef} from '../../scenes/kit';
/** Optional overrides. Omitted fields retain the registered artwork/controller's derived value. */
export type SceneEnvironment=Pick<SceneDef,'ambient'|'facing'|'outdoor'|'horizon'|'shade'|'keepFace'>;
export const sceneEnvironmentKeys=['ambient','facing','outdoor','horizon','shade','keepFace'] as const;
/** These values already have editable geometry owners; do not introduce a second source. */
export const environmentArtworkOwners:Record<string,Partial<Record<'facing'|'horizon'|'shade'|'covers',string>>>={
 capsule:{facing:'blinds · facing'},moth:{facing:'window · facing'},library:{facing:'reading-room windows · facing'},laundromat:{facing:'window · facing'},
 warehouse:{facing:'scene · facing',shade:'wall · height and placement'},stacks:{horizon:'scene · horizon'},
 harbor:{horizon:'horizon-height · placement',shade:'shade0 and shade-gap artwork'},
 harborShift:{horizon:'horizon · placement'},
 metro:{horizon:'horizon · placement',covers:'canopy-shell · under; scene width'},
 harborStation:{horizon:'water · horizon',covers:'canopy-shell · under; scene width'},
};
export function validateSceneEnvironment(value:unknown,scene?:string):SceneEnvironment{
 const fail=():never=>{throw new Error('Invalid scene environment');};
 const object=(v:unknown,keys:readonly string[]):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k)))fail();return v as Record<string,unknown>;};
 const number=(v:unknown,min=-10000,max=10000)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail();};
 const boolean=(v:unknown)=>{if(v!==undefined&&typeof v!=='boolean')fail();};
 const env=object(value,sceneEnvironmentKeys);
 const owners=scene?environmentArtworkOwners[scene]:undefined;
 if(owners)for(const key of ['facing','horizon','shade'] as const)if(owners[key]&&env[key]!==undefined)throw new Error('Environment '+key+' belongs to Layout: '+owners[key]);
 for(const key of ['outdoor','keepFace'])boolean(env[key]);
 if(env.facing!==undefined)number(env.facing,0,360);if(env.horizon!==undefined)number(env.horizon);
 if(env.ambient!==undefined){const ambient=object(env.ambient,['sky','city','street','weather','covers']);for(const key of ['sky','city','street','weather'])boolean(ambient[key]);if(ambient.covers!==undefined){if(owners?.covers)throw new Error('Weather covers belong to Layout: '+owners.covers);if(!Array.isArray(ambient.covers)||ambient.covers.length>64)fail();for(const row of ambient.covers as unknown[]){const c=object(row,['from','to','under']);number(c.from);number(c.to);number(c.under);if(Number(c.from)>=Number(c.to))fail();}}}
 if(env.shade!==undefined){const shade=object(env.shade,['front','back','depth']);if(shade.depth!==undefined)number(shade.depth,0);for(const key of ['front','back'])if(shade[key]!==undefined){const side=object(shade[key],['h','gaps']);number(side.h,0);if(side.gaps!==undefined){if(!Array.isArray(side.gaps)||side.gaps.length>64)fail();for(const pair of side.gaps as unknown[]){if(!Array.isArray(pair)||pair.length!==2)fail();const gap=pair as unknown[];number(gap[0]);number(gap[1]);if(Number(gap[0])>=Number(gap[1]))fail();}}}}
 return structuredClone(value) as SceneEnvironment;
}
export function sceneEnvironment(value:SceneEnvironment|undefined):SceneEnvironment{return value===undefined?{}:validateSceneEnvironment(value);}
