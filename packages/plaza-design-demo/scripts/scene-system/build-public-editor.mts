/** Static public editor packaging. Build-time Node code; never bundled into the browser. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {buildPlayRuntime} from './build-play-runtime.mts';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {buildEventInspection} from '../../src/ssg/game/authoring/event-inspector-model';
import {SourceReader} from '../../src/ssg/game/authoring/server/source-reader';
import type {LoadedDocument} from '../../src/ssg/game/authoring/server/store';

const demo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const game=path.join(demo,'src/ssg/game');
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');

/** Read only exact allowlisted files. Unlike a writable store, build never recovers journals. */
export function publicEditorSnapshot(){
 const reader=new SourceReader(game,sourceDocuments.map(document=>document.file));
 const documents:LoadedDocument[]=sourceDocuments.map(descriptor=>{
  const raw=reader.read(descriptor.file).text,value:unknown=JSON.parse(raw);
  descriptor.validate(value);
  return{id:descriptor.id,kind:descriptor.kind,revision:sha(raw),value};
 });
 validateSourceDocuments(new Map(documents.map(document=>[document.id,document.value])));
 const inspection=buildEventInspection({documents});
 const files=[...new Set([...sourceDocuments.map(d=>d.file),...[...inspection.nodes,...inspection.edges].map(item=>item.source.file)])].sort();
 const sourceReader=new SourceReader(game,files);
 const sources=Object.fromEntries(files.map(file=>[file,sourceReader.read(file).text]));
 return{documents,sources};
}

/** Adds /editor beside the existing homepage; does not modify any other output. */
export async function buildPublicEditor(outputRoot:string){
 const output=path.join(path.resolve(outputRoot),'editor');
 const {documents,sources}=publicEditorSnapshot();
 fs.mkdirSync(output,{recursive:true});
 const play=await buildPlayRuntime(game,output);
 const result=await build({entryPoints:[path.join(game,'authoring/entry.ts')],outdir:output,entryNames:'app-[hash]',define:{EDITOR_PLAY_ENTRY:JSON.stringify('./'+play.entry)},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',metafile:true,write:false,logLevel:'warning'});
 for(const input of Object.keys(result.metafile!.inputs))if(input.replaceAll('\\','/').includes('/authoring/server/'))throw new Error('Node authoring service unexpectedly reached the public browser bundle: '+input);
 const application=result.outputFiles.find(file=>file.path.endsWith('.js'));
 if(!application||result.outputFiles.length!==1)throw new Error('Expected one self-contained editor browser bundle');
 fs.writeFileSync(application.path,application.contents);
 const appName=path.basename(application.path);
 fs.writeFileSync(path.join(output,'documents.json'),JSON.stringify(documents)+'\n');
 fs.writeFileSync(path.join(output,'sources.json'),JSON.stringify(sources)+'\n');
 const csp="default-src 'none'; script-src 'self'; frame-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' blob: data:; base-uri 'none'; form-action 'none'";
 const faces=[400,500,600,700].map(weight=>`@font-face{font-family:'IBM Plex Mono';src:url('/fonts/ibm-plex-mono-latin-${weight}-normal.woff2') format('woff2');font-weight:${weight};font-display:block}`).join('');
 const html=`<!doctype html><html lang="en" data-editor-mode="public"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>ACCESS DENIED · public editor</title><style>${faces}html,body{margin:0;height:100%;background:#0b1017;color:#e3eaf3}body{display:flex;flex-direction:column}#public-editor-notice{padding:6px 12px;font:11px/1.5 'IBM Plex Mono',monospace;color:#8fa2b9;background:#0b1017;border-bottom:1px solid #263346}#public-editor-notice strong{color:#ffd27a;font-weight:600}@media(max-width:760px){html,body{height:auto;min-height:100%}}#composer{flex:1;min-height:0}#boot-error{padding:20px;font-family:system-ui}</style></head><body><aside id="public-editor-notice" role="note"><strong>Public editor</strong> · Edits stay in this browser and this page does not write repository files or publish the game. Download edits to keep your work.</aside><main id="composer"></main><script type="module" src="./${appName}"></script></body></html>\n`;
 fs.writeFileSync(path.join(output,'index.html'),html);
 const manifest={version:1,play,mode:'public',application:appName,applicationSha256:sha(application.contents),documents:documents.map(({id,kind,revision})=>({id,kind,revision})),sourceFiles:Object.keys(sources)};
 fs.writeFileSync(path.join(output,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return{directory:output,application:appName,documentCount:documents.length,sourceCount:Object.keys(sources).length};
}
