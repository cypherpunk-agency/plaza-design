import type {GameplayEvent} from './types';
import type {Value} from '../../art/core/composition';
/** Cosmetic event stamps in the same frame units as View.t. Never owns puzzle/save state. */
export interface PresentationCue {event:string;target:string}
export class PresentationSignals {
 private stamps:Record<string,number>;
 constructor(private cues:readonly PresentationCue[],defaults:Readonly<Record<string,number>>){if(Object.values(defaults).some(v=>!Number.isFinite(v))||cues.some(c=>!Object.prototype.hasOwnProperty.call(defaults,c.target)))throw new Error('Invalid registered presentation targets');this.stamps={...defaults};}
 read(target:string){if(!Object.prototype.hasOwnProperty.call(this.stamps,target))throw new Error('Unknown presentation signal '+target);return this.stamps[target];}
 event=(event:Readonly<GameplayEvent>,frame:number)=>{if(!Number.isFinite(frame))return;for(const cue of this.cues)if(cue.event===event.id)this.stamps[cue.target]=frame;};
 capture=():Value=>({...this.stamps});
 restore=(value:Value)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==Object.keys(this.stamps).length||Object.entries(value).some(([k,v])=>!Object.prototype.hasOwnProperty.call(this.stamps,k)||typeof v!=='number'||!Number.isFinite(v)))throw new Error('Invalid presentation signal snapshot');this.stamps={...value} as Record<string,number>;};
}
