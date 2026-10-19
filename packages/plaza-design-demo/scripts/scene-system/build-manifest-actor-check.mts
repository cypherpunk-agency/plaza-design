import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';
import {gameSourceIdentity} from './source-identity.mts';
const game=path.resolve('src/ssg/game'),out=path.resolve('dist-homepage/editor');fs.mkdirSync(out,{recursive:true});
const source=`
import {declaredScene} from ${JSON.stringify(path.join(game,'engine/gameplay/declared-scene.ts'))};
import {drawCharacter} from ${JSON.stringify(path.join(game,'runtime/characters.ts'))};
import {residentKinds} from ${JSON.stringify(path.join(game,'art/characters/resident.ts'))};
import {frameView} from ${JSON.stringify(path.join(game,'art/core/view.ts'))};
import {drawReviewRoom} from ${JSON.stringify(path.join(game,'art/assemblies/review-room.ts'))};
const rows=[],g={version:1,flags:[],items:[],commands:{},events:[],reactions:[],conversations:{}};
for(const kind of residentKinds)for(const act of ['stand','sit','phone','glitch'])for(const h of [0,20]){
 const c={version:1,scene:'authored-actors',instances:[{id:'spawn',type:'assembly.group',props:{},placement:{x:24,h:0},order:0,pass:'backdrop'},{id:'actor',type:'character.resident',props:{kind,act,seed:23,ps:3,dim:1},placement:{x:100,h},order:1,pass:'people'}]};
 const d={version:1,id:'authored-actors',name:'Actor fixture',intro:[],uses:[],people:[{id:'resident',name:'Resident',talk:[['Hello.']]}],manifest:{version:1,width:320,spawn:'spawn',uses:{},people:{resident:'actor'}}};
 const scene=declaredScene(d,c,g),native={x:100,h,seed:23,act,ps:3,dim:1,...(kind==='human'?{}:{look:kind})};
 for(const t of [0,120,581]){const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=320;a.height=b.height=180;const v={...frameView(t),sx:x=>x,y:h=>150-h,gy:150};let different=0,error=null;
 try{drawReviewRoom(a.getContext('2d'),v);drawCharacter(a.getContext('2d'),v,native);scene.drawBackdrop(b.getContext('2d'),v);
 const x=a.getContext('2d').getImageData(0,0,320,180).data,y=b.getContext('2d').getImageData(0,0,320,180).data;for(let i=0;i<x.length;i+=4)if(x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2]||x[i+3]!==y[i+3])different++;
 }catch(e){error=String(e);}rows.push({kind,act,h,t,different,error});}
}
const result={source:${JSON.stringify(gameSourceIdentity(game))},status:rows.every(r=>!r.error&&!r.different)?'PASS':'FAIL',cases:rows.length,rows};document.getElementById('result').textContent=JSON.stringify(result);`;
await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'manifest-actors.ts',loader:'ts'},outfile:path.join(out,'manifest-actors.js'),bundle:true,platform:'browser',format:'iife',target:'es2022',logLevel:'warning'});
fs.writeFileSync(path.join(out,'manifest-actors.html'),'<!doctype html><title>Authored actor parity</title><pre id="result" role="status">RUNNING</pre><script src="./manifest-actors.js"></script>');
console.log('Built authored actor pixel comparison fixture.');
