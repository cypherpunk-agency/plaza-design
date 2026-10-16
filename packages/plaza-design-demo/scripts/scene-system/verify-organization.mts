/** Focused migration check against the recoverable pre-organization checkpoint. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
const root=path.resolve('../..'), game=path.join(root,'packages/plaza-design-demo/src/ssg/game');
const original=path.join(root,'.scene-system/checkpoints/S3-shared-library-pixel-verified/source/ssg/game');
const evidence=path.join(root,'.scene-system/evidence');
const moves: {from:string;to:string}[]=JSON.parse(fs.readFileSync(path.join(evidence,'S3b-module-moves.json'),'utf8'));
const printer=ts.createPrinter({removeComments:true});
function parse(file:string){return ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);}
function content(file:string){const sf=parse(file);return sf.statements.filter(n=>!ts.isImportDeclaration(n)&&!ts.isExportDeclaration(n)&&!(ts.isInterfaceDeclaration(n)&&['Player','DowntownSave'].includes(n.name.text))).map(n=>printer.printNode(ts.EmitHint.Unspecified,n,sf)).join('\n').replace(/\bDowntownSave\b/g,'PlayerState').replace(/\bPlayer\b/g,'PlayerServices');}
for(const m of moves){assert.ok(!fs.existsSync(path.join(game,m.from)),`Old implementation remains: ${m.from}`);if(m.from.endsWith('.json'))assert.equal(fs.readFileSync(path.join(original,m.from),'utf8'),fs.readFileSync(path.join(game,m.to),'utf8'),`Device data changed: ${m.from}`);else assert.equal(content(path.join(original,m.from)),content(path.join(game,m.to)),`Non-import code changed: ${m.from}`);}
const symbolMap:Record<string,string>=JSON.parse(fs.readFileSync(path.join(evidence,'S3b-level-symbol-map.json'),'utf8'));
function declarations(file:string){const sf=parse(file),found=new Map<string,string>();for(const n of sf.statements){if(ts.isImportDeclaration(n)||ts.isExportDeclaration(n))continue;const names=ts.isVariableStatement(n)?n.declarationList.declarations.map(d=>d.name.getText(sf)):'name'in n&&n.name?[n.name.getText(sf)]:[];for(const name of names)found.set(name,printer.printNode(ts.EmitHint.Unspecified,n,sf));}return found;}
const old=declarations(path.join(original,'level.ts'));
for(const [name,file]of Object.entries(symbolMap))assert.equal(declarations(path.join(game,file)).get(name),old.get(name),`Split declaration changed: ${name}`);
assert.ok(!fs.existsSync(path.join(game,'level.ts')));
const report={movedModules:moves.length,splitDeclarations:Object.keys(symbolMap).length,nonImportCodeChanges:0,deviceDataChanges:0,legacyImplementations:0,neutralServices:'runtime/player.ts',note:'Declaration/body equivalence supplements render parity and builds; it is not a campaign playthrough.'};
fs.writeFileSync(path.join(evidence,'S3b-code-equivalence.json'),JSON.stringify(report,null,2));
console.log(report);
