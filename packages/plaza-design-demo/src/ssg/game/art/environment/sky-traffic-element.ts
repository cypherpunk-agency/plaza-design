/** One selectable sky generator. Its particles are typed settings, not scene instances. */
import type {AssetDefinition,Properties,Value} from '../core/composition';
import {numericFields,semantic,appearanceBoolean,appearanceChoice,appearanceStructure,choiceField} from '../core/fields';
import {createSkyShips,drawSkyShips,type Ship} from './sky-ships';
import {AIR_EXTENT,spriteShipRows} from '../vehicles/air-traffic';
import {screenBounds} from '../assemblies/static-bounds';
const num=numericFields({min:-1e6,max:1e6,step:.01});
const position=(label:string,value:number)=>semantic(num(label,value),{group:'Shape / Area',quantity:'position',unit:'render pixels',space:'screen'});
const n=(p:Readonly<Properties>,key:string)=>Number(p[key]);
const nativeShip=(p:Readonly<Properties>):Ship=>({kind:p.kind as Ship['kind'],ps:n(p,'pixelSize'),y:n(p,'screenY'),speed:n(p,'velocityX')/60,offset:n(p,'startOffset'),flip:p.direction===-1,depth:n(p,'parallax')});
const particleFields={
 kind:appearanceChoice(choiceField('Craft',['spinner','freighter','skydrone'],'spinner')),
 pixelSize:appearanceChoice(choiceField('Sprite pixel size',[1,2],1)),screenY:position('Y from camera top',60),
 velocityX:semantic(num('Speed',6,0,6000),{group:'Motion',quantity:'speed',unit:'render pixels / second',space:'screen'}),
 startOffset:semantic(num('Start offset',0),{group:'Motion',quantity:'length',unit:'render pixels',space:'screen'}),
 direction:semantic(choiceField('Direction',[1,-1],1),{group:'Motion',quantity:'choice',unit:'choice'}),
 parallax:semantic(num('Camera parallax',.4,0,1),{group:'Depth',quantity:'factor',unit:'factor'})
};
const defaults=createSkyShips().map(s=>({kind:s.kind,pixelSize:s.ps,screenY:s.y,velocityX:s.speed*60,startOffset:s.offset,direction:s.flip?-1:1,parallax:s.depth}));
const hidden=(p:Properties,sequence:unknown)=>sequence&&!p.inSequences?'Disabled in camera sequences':undefined;
export const skyTrafficElement:AssetDefinition={
 type:'environment.sky-traffic',version:1,label:'Distant sky traffic',category:'Atmosphere',libraryUse:'reusable',coordinates:'world',framePhase:'sky',selection:'region',parts:['backdrop'],
 fields:{minX:position('Route start X',-130),maxX:position('Route end X',2870),inSequences:appearanceBoolean({kind:'boolean',label:'Also draw in camera sequences',default:false}),
  ships:appearanceStructure({kind:'json',label:'Craft in this generator',default:defaults as Value,editor:{kind:'list',item:particleFields,addLabel:'Add craft'},validate(v){if(!Array.isArray(v)||v.length>128||v.some(row=>!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==Object.keys(particleFields).length||Object.keys(row).some(key=>!Object.keys(particleFields).includes(key))))throw Error('Sky traffic: expected at most 128 typed craft settings');}})
 },
 validateProperties(p){if(n(p,'maxX')<=n(p,'minX'))throw Error('Route end must be after route start.');},
 spatial:{fields:['minX','maxX'],handles(p,c){const rows=p.ships as Properties[];if(!rows.length)return[];const camera=c?.view.skyCam??c?.view.cam??0,shifts=rows.map(s=>camera*n(s,'parallax'));return[
  {id:'start',label:'Generator route start',fields:['minX'],space:'screen',point:{x:n(p,'minX')-Math.max(...shifts),h:-Math.min(...rows.map(s=>n(s,'screenY')))},cursor:'ew-resize',edit:d=>({props:{minX:n(p,'minX')+d.x}})},
  {id:'end',label:'Generator route end',fields:['maxX'],space:'screen',point:{x:n(p,'maxX')-Math.min(...shifts),h:-Math.min(...rows.map(s=>n(s,'screenY')))},cursor:'ew-resize',edit:d=>({props:{maxX:n(p,'maxX')+d.x}})}
 ];}},
 hiddenReason:(p,_s,c)=>hidden(p,c.view.sequence),
 bounds(p,_s,c){
  const rows=p.ships as Properties[];if(!rows.length||c&&hidden(p,c.view.sequence))return{x:0,h:0,w:0,tall:0};
  const regions=rows.map(row=>{const s=nativeShip(row),e=AIR_EXTENT[s.kind],sc=s.ps/9,bottom=s.y+10,origin=n(p,'minX')-(c?(c.view.skyCam??c.view.cam)*s.depth:0),beam=s.kind==='skydrone'&&s.ps>1;return{left:origin+Math.min(e.x0*sc,beam?-26:0)-1,right:origin+n(p,'maxX')-n(p,'minX')+Math.max(e.x1*sc,beam?26:0)+1,top:bottom-spriteShipRows(s.kind)*s.ps/2-e.top*sc-1,bottom:bottom-spriteShipRows(s.kind)*s.ps/2+e.bottom*sc+1+(beam?80:0)};});
  const left=Math.min(...regions.map(r=>r.left)),top=Math.min(...regions.map(r=>r.top)),width=Math.max(...regions.map(r=>r.right))-left,height=Math.max(...regions.map(r=>r.bottom))-top;
  return screenBounds(c,{x:left+(c?.placement.x??0),y:top-(c?.placement.h??0),w:width,h:height},{x:left,h:-top,w:width,tall:height});
 },
 anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
 draw(ctx,v,p,_s,_pass,at){if(hidden(p,v.sequence))return;ctx.save();try{ctx.translate(at.x,-at.h);drawSkyShips(ctx,v,(p.ships as Properties[]).map(nativeShip),{from:n(p,'minX'),length:n(p,'maxX')-n(p,'minX')});}finally{ctx.restore();}}
};
