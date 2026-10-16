/** Add read-only pixel exposure to the exact reproducible original bundle; never rebuild its imports. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import ts from 'typescript';
const root=path.resolve('.'),archive=process.argv[2];
if(!archive)throw new Error('Usage: node instrument-original-capture.mjs <immutable-original-fixture-directory>');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const input=path.join(archive,'baseline.js'),original=fs.readFileSync(input,'utf8');
const expected='15073a211f4ae6d3e78f29b31229abcdf0fe5c99be55e0f61d60d820f32d8832';
if(sha(original)!==expected)throw new Error('Original compiled bundle changed; expected '+expected);
const sf=ts.createSourceFile(input,original,ts.ScriptTarget.Latest,true),edits=[];
for(const n of sf.statements){
 if(ts.isFunctionDeclaration(n)&&n.body&&/^hash\d*$/.test(n.name?.text??'')){
  for(const line of n.body.statements)if(ts.isVariableStatement(line)&&line.getText(sf).includes('g.x.getImageData(0, 0, g.canvas.width, g.canvas.height).data'))edits.push({at:line.end,text:'\n  window.__g5OriginalCapture = { width:g.canvas.width, height:g.canvas.height, rgba:pixels };',kind:'retain exact existing hash readback'});
 }
 if(ts.isExpressionStatement(n)&&ts.isBinaryExpression(n.expression)&&n.expression.left.getText(sf)==='window.fixture')edits.push({at:n.end,text:'\nwindow.fixture.snapshot = () => { if(!window.__g5OriginalCapture) throw new Error("Render first"); return window.__g5OriginalCapture; };',kind:'expose captured array without another canvas read'});
}
if(edits.length!==2)throw new Error('Expected exactly one original hash readback and fixture assignment');
let instrumented=original;for(const edit of edits.sort((a,b)=>b.at-a.at))instrumented=instrumented.slice(0,edit.at)+edit.text+instrumented.slice(edit.at);
let recovered=instrumented;for(const edit of [...edits].sort((a,b)=>a.at-b.at))recovered=recovered.slice(0,edit.at)+recovered.slice(edit.at+edit.text.length);
if(recovered!==original)throw new Error('Instrumentation changes more than the two explicit capture insertions');
const output=path.join(root,'.scene-system/fixture');fs.mkdirSync(output,{recursive:true});
const name='baseline-original-capture';fs.writeFileSync(path.join(output,name+'.js'),instrumented);
const html=fs.readFileSync(path.join(archive,'baseline.html'),'utf8');if(!html.includes('src="/baseline.js"'))throw new Error('Unexpected original HTML entry');
fs.writeFileSync(path.join(output,name+'.html'),html.replace('src="/baseline.js"',`src="/${name}.js"`));
const proof={originalFile:input,originalSHA256:expected,instrumentedFile:name+'.js',instrumentedSHA256:sha(instrumented),insertions:edits.map(e=>({originalOffset:e.at,kind:e.kind,text:e.text})),exactOriginalRecoveredByRemovingInsertions:sha(recovered)===expected,renderingImportsInitializationAndReadbackScheduleUnchanged:true};
fs.mkdirSync(path.join(root,'.scene-system/evidence'),{recursive:true});fs.writeFileSync(path.join(root,'.scene-system/evidence/G5-original-bundle-capture-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
