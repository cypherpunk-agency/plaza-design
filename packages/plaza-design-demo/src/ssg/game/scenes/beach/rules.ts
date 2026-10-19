/** Beach operations and workflows are shared source; no native endpoint identity is required. */
import type {SceneRules} from '../../engine/rules';
export const BEACH_RULES:SceneRules={effects:{},needs:{devices:[],state:[{key:'flag',type:'string'},{key:'rented',type:'boolean'},{key:'billing',type:'string'},{key:'billed',type:'number'},{key:'freeDrink',type:'boolean'},{key:'lamps',type:'string'}]}};
