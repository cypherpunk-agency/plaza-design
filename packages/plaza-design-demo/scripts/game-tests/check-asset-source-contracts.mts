/** Current authored coverage through the production source validators, not migration aliases. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {validatePresets} from '../../src/ssg/game/authoring/kit-presets';
import {buildEventInspection} from '../../src/ssg/game/authoring/event-inspector-model';
const root=new URL('../../src/ssg/game/',import.meta.url);
const documents=new Map(sourceDocuments.map(d=>[d.id,JSON.parse(fs.readFileSync(new URL(d.file,root),'utf8'))]));
assert.equal(documents.size,sourceDocuments.length,'Source document identities must be unique');
validateSourceDocuments(documents);
const presets=validatePresets(documents.get('kit-presets'),art);
const files=new Set(sourceDocuments.map(d=>d.file));
const inspection=buildEventInspection({documents:sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'current-audit',value:documents.get(d.id)}))});
const sourceReferences=new Set([...files,...[...inspection.nodes,...inspection.edges].map(item=>item.source.file)]);
for(const file of sourceReferences)assert(fs.statSync(new URL(file,root)).isFile(),'Missing inspected source '+file);
let compositions=0,instances=0,explicitProperties=0,boundInputs=0,presetChildren=0;
const targets:Record<string,number>={},types=new Set<string>();
function inspect(value:unknown,inPreset=false){
 if(!value||typeof value!=='object')return;
 if(Array.isArray(value)){value.forEach(v=>inspect(v,inPreset));return;}
 const o=value as Record<string,any>;
 if(Array.isArray(o.instances)&&typeof o.scene==='string')compositions++;
 if(typeof o.kit==='string'&&o.props)inPreset=true;
 if(typeof o.type==='string'&&o.props&&o.placement){
  // This invokes the same strict property/default admission used when adding an asset.
  art.properties(o.type,o.props);types.add(o.type);instances++;
  explicitProperties+=Object.keys(o.props).length;boundInputs+=Object.keys(o.bindings??{}).length;
  if(inPreset)presetChildren++;
 }
 if(o.target&&typeof o.target==='object'&&typeof o.target.kind==='string')targets[o.target.kind]=(targets[o.target.kind]??0)+1;
 for(const child of Object.values(o))inspect(child,inPreset);
}
// Read each allowlisted file once; descriptors can deliberately project the same source.
for(const file of files)inspect(JSON.parse(fs.readFileSync(new URL(file,root),'utf8')));
console.log(JSON.stringify({result:'PASS',documents:documents.size,sourceFiles:files.size,sourceReferences:sourceReferences.size,inspectionOnlyFiles:[...sourceReferences].filter(file=>!files.has(file)),compositions,instances,usedAssetTypes:types.size,registeredAssetTypes:art.catalog().length,explicitProperties,boundInputs,presets:presets.presets.length,presetChildren,sequenceTargets:targets,validation:'Production complete-source, composition, preset, binding and sequence validators; strict current asset properties',sourceRoot:fileURLToPath(root)}));
