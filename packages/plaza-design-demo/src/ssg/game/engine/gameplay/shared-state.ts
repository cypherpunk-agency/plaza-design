import source from '../../world/state-owners.json';
import type {GameplayDefinition,StateDeclaration} from './types';
/**
 * World-level state owners (world/state-owners.json): owners that belong to no single scene, such as
 * the harbor night shift (`shift.*`) that spans several zones. The document declares each key once;
 * a scene's gameplay opts in with `sharedState: ["shift"]` and then reads and writes those keys like
 * its own. Values still live in the one common root, Save.gameplay[owner][localKey]; this module only
 * says which declarations a gameplay definition sees. It never stores values.
 *
 * Validation sees the active document: the shipped one, or a pending one inside withSharedState
 * (prospective editor validation and private Play). It is a synchronous scope, not a second store.
 */
export type SharedStateSource=Pick<GameplayDefinition,'state'>;
let active:unknown=source;
export const SHIPPED_SHARED_STATE:unknown=source;
export function activeSharedState(){return active;}
/** Run fn with a pending state-owners document; undefined keeps the current one. */
export function withSharedState<T>(document:unknown,fn:()=>T):T{if(document===undefined)return fn();const previous=active;active=document;try{return fn();}finally{active=previous;}}
/** A private Play realm runs only pending source: its document becomes the realm's active one. */
export function useSharedState(document:unknown){if(document!==undefined)active=document;}
/** Owner names the document declares. */
export function sharedStateOwners(document:SharedStateSource):Set<string>{return new Set(Object.values(document.state??{}).map(d=>d.owner));}
/** The declarations of the owners a definition lists. */
export function sharedDeclarations(document:SharedStateSource,owners:readonly string[]):Record<string,StateDeclaration>{return Object.fromEntries(Object.entries(document.state??{}).filter(([,d])=>owners.includes(d.owner)));}
/**
 * Compiled definitions carry the shared declarations in `state` so every engine reader (session,
 * save lifetimes, pickers) sees them. Source keeps only the `sharedState` reference: editors write
 * this form back, so a scene never holds a copy of the world document's declarations.
 */
export function sourceGameplay<T extends GameplayDefinition>(definition:T):T{
 if(!definition.sharedState?.length)return definition;
 const owners=new Set(definition.sharedState),state=Object.fromEntries(Object.entries(definition.state??{}).filter(([,d])=>!owners.has(d.owner)));
 const copy={...definition};if(Object.keys(state).length)copy.state=state;else delete copy.state;return copy;
}
