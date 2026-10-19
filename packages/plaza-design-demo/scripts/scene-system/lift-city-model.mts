/** One-time lexical lift: definitions keep their original function bodies in a per-world closure. */
import fs from 'node:fs';import ts from 'typescript';
const file='src/ssg/game/world/city.ts',source=fs.readFileSync(file,'utf8');if(source.includes('export function createCityModel'))throw new Error('City model already lifted');const data=JSON.parse(fs.readFileSync('src/ssg/game/world/city.json','utf8')),keys=new Set(Object.keys(data).filter(k=>k!=='version')),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const types:string[]=[],body:string[]=[],imports:string[]=[],exports:string[]=[];
for(const statement of sf.statements){if(ts.isImportDeclaration(statement)){imports.push(statement.getFullText(sf));continue;}if(ts.isInterfaceDeclaration(statement)||ts.isTypeAliasDeclaration(statement)){let text=statement.getFullText(sf);if(ts.isTypeAliasDeclaration(statement)&&statement.name.text==='DistrictId')text='\nexport type DistrictId = '+data.DISTRICTS.map((d:any)=>JSON.stringify(d.id)).join(' | ')+';';if(ts.isTypeAliasDeclaration(statement)&&statement.name.text==='PlaceId')text='\nexport type PlaceId = string;';if(ts.isInterfaceDeclaration(statement)&&statement.name.text==='District')text=text.replace('id: string;','id: DistrictId;');types.push(text);continue;}
 const exported=statement.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);const edits:{start:number;end:number;text:string}[]=[];
 if(exported){const token=statement.modifiers!.find(m=>m.kind===ts.SyntaxKind.ExportKeyword)!;edits.push({start:token.getStart(sf),end:token.end,text:''});}
 if(ts.isVariableStatement(statement)){
  if(statement.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&d.name.text==='PLACE_DATA'))continue;
  for(const d of statement.declarationList.declarations){if(!ts.isIdentifier(d.name))throw new Error('Unexpected declaration');const name=d.name.text;if(exported)exports.push(name);if(keys.has(name)||name==='SCENE_PLACE'){if(!d.initializer)throw new Error('Initializer required');edits.push({start:d.initializer.getStart(sf),end:d.initializer.end,text:name==='SCENE_PLACE'?"Object.fromEntries(data.PLACES.flatMap(p=>p.scenes.map(scene=>[scene,p.id]))) as Record<SceneId,PlaceId>":'data.'+name});}}
 }else if(ts.isFunctionDeclaration(statement)&&exported)exports.push(statement.name!.text);
 let text=statement.getFullText(sf),start=statement.getFullStart();for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start-start)+edit.text+text.slice(edit.end-start);body.push(text);
}
const iface=`
/** Authored world values; scene exits remain owned by their scene documents. */
export interface CitySource {
 version:1;DISTRICTS:District[];PLACES:Place[];START_SCENE:SceneId;
 LINE:Station[];STATIONS:Record<Station,{name:string;scene:SceneId;up:SceneId}>;
 HARBOR_FLAG:string;SIDING_OUT:string[];DRIVER_HARBOR:string[];
 STAND_IDS:Stand[];STANDS:Record<Stand,{name:string;scene:SceneId}>;FARE:number;HOP:number;DRIVER_BROKE:string[];
 MAP_W:number;MAP_H:number;DISTRICT_MAP:Record<DistrictId,DistrictPlan>;PLACE_MAP:Partial<Record<PlaceId,[number,number]>>;
 STATION_MAP:Record<Station,[number,number]>;PAD_MAP:Record<Stand,[number,number]>;LOOP_MAP:[number,number][];
 LINES_PLANNED:MapLine[];LINKS:MapLink[];DISTRICT_REVEAL:Record<DistrictId,{near:DistrictId[];landmark?:boolean}>;PLACE_IN_VIEW:Partial<Record<PlaceId,SceneId[]>>;
}
`;
fs.writeFileSync(file,`import citySource from './city.json';\n${imports.join('\n')}\n${types.join('\n')}\n${iface}\n/** Independent world registries; default consumers keep the established named API. */\nexport function createCityModel(input:CitySource){\n const data=structuredClone(input);\n${body.join('\n')}\n return {${exports.join(',')}};\n}\nexport type CityModel=ReturnType<typeof createCityModel>;\nconst shippingCity=createCityModel(citySource as unknown as CitySource);\nexport const {${exports.join(',')}}=shippingCity;\n`);console.log('Lifted '+exports.length+' world exports with unchanged function bodies');
