import fs from 'node:fs';
import {SCENES} from '../../src/ssg/game/scenes';
const rows=Object.entries(SCENES).flatMap(([scene,d])=>[
 ...(d.people??[]).filter(p=>p.talk||p.lines).map((p,i)=>({kind:'npc',scene,id:p.id??'actor-'+i,status:p.conversation?'migrated':'legacy-adapter',source:p.conversation?'scenes/'+scene+'/scene.json':'scenes/'+scene+'/index.ts',weatherTimeVariants:!!p.lines})),
 ...Object.entries(d.data?.dialogue??{}).map(([id,c])=>({kind:'device',scene,id,status:scene==='library'?'migrated':'legacy-adapter',source:scene==='library'?'scenes/library/gameplay.json':'scenes/'+scene+'/devices.json',nodeEntryEffects:Object.values(c.nodes).flat().filter(n=>n.do?.length).length,freeText:!!c.free})),
 ...Object.keys(d.gameplay?.conversations??{}).filter(id=>!id.startsWith('talk.')&&scene==='harborShift').map(id=>({kind:'shared',scene,id,status:'migrated',source:'scenes/harbor-shift/gameplay.json'}))
]);
fs.writeFileSync('src/ssg/game/docs/reference/CONVERSATION-MIGRATION.json',JSON.stringify({version:1,scope:'ENG-03',note:'Finite scoped migration; remaining legacy adapters are explicit, not claimed converted. Unconverted scene packages retain native behavior.',genericBotReaction:'legacy-adapter: runtime/characters.ts botReact',rows},null,2)+'\n');
console.log(rows.reduce((n,r)=>{n[r.status]=(n[r.status]??0)+1;return n;},{} as Record<string,number>));
