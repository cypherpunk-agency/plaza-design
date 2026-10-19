import {gameSourceIdentity} from './source-identity.mts';
/** Trusted static game entry and exactly the shipping stylesheet. No source service code. */
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {demoStyles} from '../../src/ssg/render';
/** Runs before CSS and external script fetches, under one exact CSP script hash. */
export const playStartupBootstrap=`(()=>{if(parent===window||!window.name.startsWith('access-denied-editor-play')||window.__accessDeniedEditorPlayBoot)return;const report=(stage,detail)=>parent.postMessage({channel:'editor-play',type:'startup',value:{stage,...(detail?{detail:String(detail).slice(0,2000)}:{})}},'*');const fail=value=>parent.postMessage({channel:'editor-play',type:'error',value:String(value).slice(0,2000)},'*');Object.defineProperty(window,'__accessDeniedEditorPlayBoot',{value:{evaluating:()=>report('runtime-evaluating')}});report('parser-started');document.addEventListener('DOMContentLoaded',()=>report('document-parsed'),{once:true});window.addEventListener('load',event=>{if(event.target?.id==='editor-play-runtime')report('runtime-script-loaded');},true);window.addEventListener('securitypolicyviolation',event=>{const detail=event.effectiveDirective+': '+event.blockedURI;report('csp-violation',detail);if(event.effectiveDirective.startsWith('script-src'))fail('Play script blocked by CSP: '+detail);});window.addEventListener('error',event=>{if(event.target?.id==='editor-play-runtime'){report('runtime-script-error');fail('The Play runtime script failed to load.');}else if(event.error||event.message){const detail=event.error?.message??event.message;report('runtime-error',detail);fail(detail);}},true);window.addEventListener('unhandledrejection',event=>{const detail=event.reason?.message??event.reason??'Unhandled Play runtime rejection';report('runtime-rejection',detail);fail(detail);});})();`;
/** Guard the complete IIFE, not merely the diagnostic banner, against duplicate execution. */
export const playStartupRuntimeBanner=`(()=>{if(parent===window||!window.name.startsWith('access-denied-editor-play')||window.__accessDeniedEditorPlayRuntime)return;Object.defineProperty(window,'__accessDeniedEditorPlayRuntime',{value:true});const boot=window.__accessDeniedEditorPlayBoot;if(boot)boot.evaluating();else{const send=(type,value)=>parent.postMessage({channel:'editor-play',type,value},'*');send('startup',{stage:'runtime-evaluating',detail:'HTML startup probe was not observed in this frame.'});window.addEventListener('error',e=>send('error',String(e.error?.message??e.message??'Game runtime failed').slice(0,2000)));window.addEventListener('unhandledrejection',e=>send('error',String(e.reason?.message??e.reason??'Game runtime failed').slice(0,2000)));}
`;
export const playStartupRuntimeFooter='})();';
export async function buildPlayRuntime(game:string,output:string) {
  const result=await build({banner:{js:playStartupRuntimeBanner},footer:{js:playStartupRuntimeFooter},entryPoints:[path.join(game,'authoring/play-frame.ts')],outdir:output,entryNames:'play-[hash]',bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'none',write:false,metafile:true});
  for(const input of Object.keys(result.metafile!.inputs))if(input.replaceAll('\\','/').includes('/authoring/server/'))throw new Error('Source service reached Play runtime');
  const script=result.outputFiles[0];fs.writeFileSync(script.path,script.contents);
  const core=await build({entryPoints:[path.resolve(game,'../../../../plaza-design-core/plaza.css')],bundle:true,write:false,loader:{'.woff2':'dataurl'},logLevel:'warning'});
  const css=core.outputFiles.find(file=>file.path.endsWith('.css')||file.path==='<stdout>')!.text.replace(/@font-face\s*\{[^}]*\}/g,'')+'\n'+demoStyles;
  const bootstrapHash=createHash('sha256').update(playStartupBootstrap,'utf8').digest('base64');
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="game-source" content="${gameSourceIdentity(game)}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'sha256-${bootstrapHash}'; style-src 'unsafe-inline'; font-src data:; connect-src 'none'; img-src data:; form-action 'none'"><script>${playStartupBootstrap}</script><style>${css}
html,body{margin:0;width:100%;height:100%;background:#000}.demo-window{position:relative!important;inset:auto!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important}#input-host{position:absolute;bottom:0}</style></head><body><script id="editor-play-runtime" src="./${path.basename(script.path)}"></script></body></html>`;
  const entry=`play-${createHash('sha256').update(html).digest('hex').slice(0,16)}.html`;
  fs.writeFileSync(path.join(output,entry),html);
  return {entry,script:path.basename(script.path),scriptSha256:createHash('sha256').update(script.contents).digest('hex')};
}
