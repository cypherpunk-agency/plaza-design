/** Ordinary content binds to the same composition instances that supply its artwork. */
export const manifestGroups=['uses','people','readables','rests','exits'] as const;
export type ManifestGroup=typeof manifestGroups[number];
export type ManifestTarget=string|{instance:string;anchor?:string;x?:number;h?:number;promptH?:number;responseH?:number;responseAboveFloor?:true;promptAboveFloor?:true};
export type ManifestWidth=number|{instance:string;property:string};
export interface SceneManifest {artwork?:Record<string,string>;devices?:Record<string,ManifestTarget>;version:1;width:ManifestWidth;spawn:ManifestTarget;uses:Record<string,ManifestTarget>;people?:Record<string,ManifestTarget>;readables?:Record<string,ManifestTarget>;rests?:Record<string,ManifestTarget>;exits?:Record<string,ManifestTarget>}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const id=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
export const targetInstance=(target:ManifestTarget)=>typeof target==='string'?target:target.instance;
export function validateManifestTarget(target:unknown):asserts target is ManifestTarget{
 if(typeof target==='string'){if(!id(target))throw new Error('Invalid manifest instance');return;}
 if(!object(target)||!id(target.instance)||Object.keys(target).some(k=>!['instance','anchor','x','h','promptH','responseH','responseAboveFloor','promptAboveFloor'].includes(k))||target.anchor!==undefined&&!id(target.anchor))throw new Error('Invalid manifest binding');
 if(target.promptAboveFloor!==undefined&&(target.promptAboveFloor!==true||target.promptH===undefined))throw new Error('Elevated prompt requires its height override');
 if(target.responseAboveFloor!==undefined&&(target.responseAboveFloor!==true||target.responseH===undefined))throw new Error('Elevated response requires its height override');
 for(const key of ['x','h','promptH','responseH'])if(target[key]!==undefined&&(typeof target[key]!=='number'||!Number.isFinite(target[key])||Math.abs(Number(target[key]))>10000))throw new Error('Invalid manifest offset');
}
export function validateManifest(value:unknown):SceneManifest{
 if(!object(value))throw new Error('Manifest must be a plain object');const m=value as unknown as SceneManifest;
 if(Object.keys(m).some(k=>!['version','width','spawn','devices','artwork',...manifestGroups].includes(k))||m.version!==1)throw new Error('Invalid scene manifest header');
 if(typeof m.width==='number'){if(!Number.isFinite(m.width)||m.width<240||m.width>10000)throw new Error('Invalid manifest width');}
 else if(!object(m.width)||Object.keys(m.width).sort().join()!=='instance,property'||!id(m.width.instance)||!id(m.width.property))throw new Error('Invalid manifest width binding');
 if(m.artwork!==undefined&&(!object(m.artwork)||Object.keys(m.artwork).length>128||Object.entries(m.artwork).some(([role,ref])=>!id(role)||!id(ref))))throw Error('Invalid manifest artwork roles');
 validateManifestTarget(m.spawn);
 for(const group of manifestGroups){const bindings=m[group];if(bindings===undefined&&group!=='uses')continue;
 if(!object(bindings)||Object.keys(bindings).length>32)throw new Error('Invalid manifest '+group+' bindings');
 for(const[key,target]of Object.entries(bindings)){if(!id(key))throw new Error('Invalid manifest content ID');validateManifestTarget(target);}}
 if(m.devices!==undefined){if(!object(m.devices)||Object.keys(m.devices).length>128)throw Error('Invalid manifest device bindings');for(const[key,target]of Object.entries(m.devices)){if(!id(key))throw Error('Invalid device binding ID');validateManifestTarget(target);if(typeof target!=='string'&&Object.keys(target).some(k=>!['instance','anchor','x','h'].includes(k)))throw Error('Device binding has no text-height properties');}}
 return structuredClone(m);
}
