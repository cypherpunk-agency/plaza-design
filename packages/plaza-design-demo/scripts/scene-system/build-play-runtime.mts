/** Trusted static game entry and exactly the shipping stylesheet. No source service code. */
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {demoStyles} from '../../src/ssg/render';
export async function buildPlayRuntime(game:string,output:string) {
  const result=await build({entryPoints:[path.join(game,'authoring/play-frame.ts')],outdir:output,entryNames:'play-[hash]',bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'none',write:false,metafile:true});
  for(const input of Object.keys(result.metafile!.inputs))if(input.replaceAll('\\','/').includes('/authoring/server/'))throw new Error('Source service reached Play runtime');
  const script=result.outputFiles[0];fs.writeFileSync(script.path,script.contents);
  const core=await build({entryPoints:[path.resolve(game,'../../../../plaza-design-core/plaza.css')],bundle:true,write:false,loader:{'.woff2':'dataurl'},logLevel:'warning'});
  const css=core.outputFiles.find(file=>file.path.endsWith('.css')||file.path==='<stdout>')!.text.replace(/@font-face\s*\{[^}]*\}/g,'')+'\n'+demoStyles;
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; font-src data:; connect-src 'none'; img-src data:; form-action 'none'"><style>${css}
html,body{margin:0;width:100%;height:100%;background:#000}.demo-window{position:relative!important;inset:auto!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important}#input-host{position:absolute;bottom:0}</style></head><body><script src="./${path.basename(script.path)}"></script></body></html>`;
  const entry=`play-${createHash('sha256').update(html).digest('hex').slice(0,16)}.html`;
  fs.writeFileSync(path.join(output,entry),html);
  return {entry,script:path.basename(script.path),scriptSha256:createHash('sha256').update(script.contents).digest('hex')};
}
