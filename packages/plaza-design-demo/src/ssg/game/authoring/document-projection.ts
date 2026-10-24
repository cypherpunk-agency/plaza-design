import type {EditorDocument} from './contracts';
/** Logical editor documents can share a single atomic, allowlisted source owner. */
export interface DocumentProjection {
 sourceId:string;
 children(source:EditorDocument):EditorDocument[];
 replace(source:unknown,childId:string,value:unknown):unknown;
}
