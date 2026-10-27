import {streetSpriteKinds,riderKinds,type ActorPresentation,type StreetSpritePresentation,type RiderPresentation} from '../../art/characters/presentation';

import {actorBindingController,actorPoseSource} from './native-actor-bindings';
import type {AssetInstance} from '../../art/core/composition';
/** Existing Character presenters retained for the migrated interior scenes. */
export function validateActorPresentationNode(scene:string,node:AssetInstance){const c=actorBindingController(scene);if(!c||node.type!==c.element)return false;if(typeof node.props.actor!=='string'||!/^[-a-zA-Z0-9_.]{1,96}$/.test(node.props.actor)||node.bindings?.pose!==actorPoseSource(scene,node.props.actor)||Object.keys(node.bindings).some(k=>k!=='pose'))throw new Error(node.id+': invalid actor presentation binding');return true;}

export function validateActorPresentation(value:unknown):asserts value is ActorPresentation{
 const fail=():never=>{throw new Error('Invalid rider presentation');},object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail();return v as Record<string,unknown>;},p=object(value);
 if(p.kind==='streetSprite'){if(Object.keys(p).some(k=>!['kind','sprite','flip'].includes(k))||!streetSpriteKinds.includes(p.sprite as StreetSpritePresentation['sprite'])||p.flip!==undefined&&typeof p.flip!=='boolean')fail();return;}
 if(Object.keys(p).some(k=>!['kind','rider','sit','flip','phase','regular'].includes(k))||p.kind!=='rider'||!riderKinds.includes(p.rider as RiderPresentation['rider']))fail();
 for(const key of ['sit','flip','regular'])if(p[key]!==undefined&&typeof p[key]!=='boolean')fail();
 if(p.phase!==undefined&&(typeof p.phase!=='number'||!Number.isFinite(p.phase)||p.phase<0||p.phase>1000000))fail();
}
