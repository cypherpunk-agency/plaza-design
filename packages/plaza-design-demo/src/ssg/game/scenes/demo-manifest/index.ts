import composition from './composition.json';
import scene from './scene.json';
import gameplay from './gameplay.json';
import {art,type Composition,type Environment} from '../../art';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
import {declaredScene,validateDeclaredScene} from '../../engine/gameplay/declared-scene';
import type {GameplayDefinition} from '../../engine/gameplay/types';
export const validateManifestGameplay=(value:unknown)=>validateNativeContract(value,gameplay);
export const MANIFEST_GAMEPLAY=validateManifestGameplay(gameplay);
export function validateManifestScene(value:unknown,g:GameplayDefinition=MANIFEST_GAMEPLAY){const d=validateSceneDocument(value,g,{manifest:true});if(d.id!=='shop'||!d.manifest)throw new Error('Manifest pilot retains its isolated shop role');return d;}
export const MANIFEST_SCENE=validateManifestScene(scene);
export function validateManifestComposition(value:unknown){const d=art.validate(value);if(d.scene!=='demo-manifest')throw new Error('Manifest composition identity');return d;}
export const MANIFEST_COMPOSITION=validateManifestComposition(composition);
export const validateManifestSources=(c:unknown,s:unknown,g:unknown)=>validateDeclaredScene(validateManifestScene(s,validateManifestGameplay(g)),validateManifestComposition(c),validateManifestGameplay(g));
export function manifestDemoScene(c:Composition=MANIFEST_COMPOSITION,_state:Environment['state']={},options:Partial<Environment>={},s=MANIFEST_SCENE,g=MANIFEST_GAMEPLAY){return declaredScene(validateManifestScene(s,g),validateManifestComposition(c),validateManifestGameplay(g),options);}
