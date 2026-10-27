import {validateCompanionSource,type CompanionSource} from '../engine/gameplay/companion-source';
import {COMPANION_GAMEPLAY} from '../engine/gameplay/companion-conversations';
import {validateCritterReactions} from '../engine/gameplay/critter-reactions';
import {validateReviewStations} from '../demo/review-stations';
import {validateContacts} from '../story/contacts';
import {validateEndCard} from '../story/end-card';
import type {GameplayDefinition} from '../engine/gameplay/types';
/**
 * Game rules documents the loop reads (companion, critter reactions, review stations): one place for the
 * validation that needs the other pending documents. Each is also a registered source document.
 */
/** The companion's default pet conversations must exist in the (pending) shared companion library. */
export function validatePendingCompanion(value:unknown,documents:ReadonlyMap<string,unknown>):CompanionSource{
 const library=(documents.get('companion-gameplay') as GameplayDefinition|undefined)??COMPANION_GAMEPLAY,d=validateCompanionSource(value,library),c=d.pet.conversations;
 for(const id of [...c.sleep,c.sun,c.moving,...c.idle])if(!Object.prototype.hasOwnProperty.call(library.conversations,id))throw new Error('Invalid companion: pet conversation '+id+' is not in the shared companion library');
 return d;
}
/** Validate one rules document by its registered identity. */
export function validatePendingRules(id:string,value:unknown,documents:ReadonlyMap<string,unknown>):void{
 if(id==='companion')validatePendingCompanion(value,documents);
 else if(id==='critter-reactions')validateCritterReactions(value);
 else if(id==='review-stations')validateReviewStations(value);
 else if(id==='contacts')validateContacts(value);
 else if(id==='end-card')validateEndCard(value);
 else throw new Error('Unsupported rules document '+id);
}
