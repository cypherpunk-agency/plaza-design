import {provide} from '../binding-keys';
import type {Value} from '../../../art/core/composition';
/** Rendering reads the model's prepared people; it never boards or advances them. */
export const flowProvider=provide(['<instance:character.flow>.people'],ctx=>Object.fromEntries(ctx.rows.filter(r=>r.element.type==='character.flow').map(r=>[r.instance.id+'.people',(ctx.engine?.m.people.pictures[r.instance.id]??[]) as unknown as Value])));
