import type {Save} from './save';

/** Already-resolved starting inputs. Profile/checkpoint selection and clock policy belong to
 * callers; constructing a save neither samples randomness nor reads another source or store. */
export type InitialSave=Pick<Save,'handle'|'tokens'|'modules'|'keyring'|'programs'|'items'|'flags'|'clock'>&Partial<Pick<Save,'scene'|'gameplay'|'worldMembership'>>;
export function createInitialSave(initial:InitialSave):Save{
 return {jump:false,controlled:[],nets:[],scenes:{},...structuredClone(initial)};
}
