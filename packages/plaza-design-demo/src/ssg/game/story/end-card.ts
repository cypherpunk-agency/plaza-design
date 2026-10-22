/**
 * The END presentation's words (story/end-card.json; editor: World › Opening › End card). A handoff with `presentation: "end"`
 * (docs/reference/END-HANDOFF-PRESENTATION.md) opens the transient END card; this document is what the card says. It holds no state:
 * the game draws `endCardText(...)` over the world while the presentation is up, and the card never reappears from a saved flag.
 *
 * Tokens in a line: `{controlled}` (how many nodes answer to the player) and `{handle}` (the player's handle).
 */
import baseline from './end-card.json';
import {fail,fields,text,list} from './story-shapes';
export interface EndCardSource {version:1;END:{title:string;lines:string[];prompt:string}}
const TOKENS=['controlled','handle'];
export function validateEndCard(value:unknown):EndCardSource{
 const d=fields(value,'root',['version','END']);if(d.version!==1)fail('version','version 1 required');
 const e=fields(d.END,'END',['title','lines','prompt']);text(e.title,'END/title');text(e.prompt,'END/prompt');
 const lines=list(e.lines,'END/lines',8);if(!lines.length)fail('END/lines','at least one line required');
 for(const[i,l]of lines.entries()){text(l,'END/lines/'+i);for(const m of String(l).matchAll(/\{([^{}]*)\}/g))if(!TOKENS.includes(m[1]))fail('END/lines/'+i,'unknown token {'+m[1]+'}');}
 return structuredClone(d) as EndCardSource;
}
/** The card's title, lines (tokens filled) and prompt for this player. */
export function endCardText(source:EndCardSource,who:{controlled:number;handle:string}){
 const fill=(line:string)=>line.replace(/\{controlled\}/g,String(who.controlled)).replace(/\{handle\}/g,who.handle);
 return{title:source.END.title,lines:source.END.lines.map(fill),prompt:source.END.prompt};
}
export const END_CARD=validateEndCard(baseline);
