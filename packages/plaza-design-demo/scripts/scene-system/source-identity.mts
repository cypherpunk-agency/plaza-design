import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
/** Includes uncommitted and newly created source files, without reading credentials or Git internals. */
export function gameSourceIdentity(game:string){
 const hash=createHash('sha256');
 function visit(folder:string){for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(folder,entry.name);if(entry.isDirectory())visit(file);else if(/\.(ts|tsx|json)$/.test(entry.name)){hash.update(path.relative(game,file).replaceAll('\\','/'));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}}}
 visit(game);return 'sha256:'+hash.digest('hex');
}
