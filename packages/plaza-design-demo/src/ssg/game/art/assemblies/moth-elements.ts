import {booleanField,textField} from '../core/fields';
import {numericFields} from '../core/fields';
import {rectangleControls,fixedGeometry} from '../core/spatial';
import {appearanceBoolean,appearanceChoice,semantic,shapeLength} from '../core/fields';
/** Moth's apartment catalogue: editable furnishings, devices and independent rig components. */
import { createMothInteriorArtwork, type ArtworkInputs, type MothLayout, type MothVisualState } from './moth-interior';
import type { Anchor, Bounds, AssetDefinition, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
const fixedNativeGeometry=fixedGeometry("This moth component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");
const num = numericFields({min:-10000,max:10000,step:1});
const bool = booleanField;
const text = textField;
const n = (p: Properties, key: string) => Number(p[key]);
const origin: Anchor = { x: 0, h: 0, role: 'origin' };
const raised = (v: View, h: number): View => h === 0 ? v : ({ ...v, gy: v.gy - h, y: height => v.y(height + h) });
export const mothVisualFields: Record<string, Field> = { hover: text('Hovered device'), playing: bool('Record playing'), nextMs: num('Next record beat in ms', 0, 0), fed: bool('Sprat fed'), wet: bool('Fern watered'), fresh: bool('Unread message'), deskHeight: num('Desk surface height', 28) };
function layout(): MothLayout { return { mail: 0, board: { x: 0, y: 0, w: 44, h: 34 }, rod: 0, guitar: 0, turntable: 0, desk: { x0: 0, x1: 76, h: 28 }, tank: { x: 0, w: 46, base: 22, h: 24 }, window: { x0: 0, x1: 74, h0: 42, h1: 100 }, pot: 0, phone: 0, sofa: { x0: 0, x1: 64 } }; }
function kernel(L = layout(), extra: Partial<Omit<ArtworkInputs, 'L'>> = {}) {
  return createMothInteriorArtwork({ L, MOTH_W: 660, MOTH_FACING: 270, MOTH_DOOR_X: 0, ...extra });
}

type Draw = (ctx: CanvasRenderingContext2D, view: View, props: Properties, state: Properties, at: Required<Placement>) => void;
function element(id: string, label: string, category: string, fields: Record<string, Field>, bounds: (props: Properties) => Bounds, draw: Draw, anchors: (props: Properties) => Record<string, Anchor> = () => ({ origin })): AssetDefinition {
  // Room-frame paintings and desk-relative cable/signal pieces retain their source context.
  return { type: 'moth.' + id, bindingIdentity:'presentation', version: 1, label, category, coordinates: 'world', libraryUse:!['marker','neighbors','shell','desk-signal'].includes(id)?'reusable':undefined, fields, visualFields: mothVisualFields, parts: ['backdrop'], bounds, anchors, draw: (x,v,p,s,_pass,at) => draw(x,v,p,s,at) };
}
const visual = (state: Properties) => state as unknown as MothVisualState;
const box = (w: number, h: number, x = 0): Bounds => ({ x, h, w, tall: h });
function deskAt(x: number, width: number, height: number) { const L = layout(); L.desk = { x0: x, x1: x + width, h: height }; return L; }
const width = { width: shapeLength(num('Width', 76, 1)) };
export const mothElements: AssetDefinition[] = [
  { ...({...element('marker','Moth gameplay marker','markers',{ role: semantic(text('Role'),{"group":"Appearance","quantity":"reference","unit":"identifier"}) },() => box(8,8,-4),() => {}),spatial:fixedNativeGeometry}), visualFields: {}, parts: [] },
  ({...element('neighbors','Tenement neighbors','architecture',{ width:shapeLength(num('Room gap width',660,1)),height:shapeLength(num('Ceiling',112,1)) },p=>box(n(p,'width'),n(p, 'height')),(x,v,p,_s,at)=>kernel(undefined,{MOTH_W:n(p,'width'),ceiling:n(p, 'height')}).drawBuilding(x,{...raised(v,at.h),sx:wx=>v.sx(at.x+wx)})), spatial:rectangleControls({width:'width',height:'height'})}),
  ({...element('shell','Old tenement walls, bulb and floor','architecture',{ width:shapeLength(num('Width',660,16)),height:shapeLength(num('Ceiling',112,1)) },p=>box(n(p,'width'),n(p, 'height')+12),(x,v,p,s,at)=>kernel(undefined,{MOTH_W:n(p,'width'),ceiling:n(p, 'height'),originX:at.x}).drawShell(x,raised(v,at.h),visual(s))), spatial:rectangleControls({width:'width',height:'height'})}),
  ({...element('window','Street-facing window','architecture',{width:shapeLength(num('Width',74,1)),height:shapeLength(num('Height',58,1)),bearing:semantic(num('Compass bearing',270,0),{"group":"Transform","quantity":"angle","unit":"degrees"})},p=>({x:-5,h:n(p,'height')+3,w:n(p,'width')+10,tall:n(p,'height')+6}),(x,v,p,s,at)=>{const L=layout();L.window={x0:at.x,x1:at.x+n(p,'width'),h0:at.h,h1:at.h+n(p,'height')};kernel(L,{MOTH_FACING:n(p,'bearing')}).drawWindow(x,v,visual(s));}), spatial:rectangleControls({width:'width',height:'height'})}),
  ({...element('string-lights','Moth string lights','electronics',{},()=>box(266,8),(x,v,_p,s,at)=>kernel(undefined,{lightsX:at.x,ceiling:at.h+6}).drawStringLights(x,v,visual(s))),spatial:fixedNativeGeometry}),
  ({...element('resident-panel','Resident status panel','electronics',{},()=>({x:-30,h:48,w:60,tall:66}),(x,v,_p,s,at)=>kernel(undefined,{panelX:at.x}).drawResidentPanel(x,raised(v,at.h-64),visual(s))),spatial:fixedNativeGeometry}),
  ({...element('calendar','Marked wall calendar','props',{},()=>({x:0,h:0,w:15,tall:20}),(x,v,_p,s,at)=>kernel(undefined,{calendarX:at.x}).drawCalendar(x,raised(v,at.h-88),visual(s))),spatial:fixedNativeGeometry}),
  ({...element('books','Books and shelf','furniture',{},()=>box(44,14),(x,v,_p,s,at)=>kernel(undefined,{booksX:at.x}).drawBooks(x,raised(v,at.h-66),visual(s))),spatial:fixedNativeGeometry}),
  ({...element('door','Moth entrance door','architecture',{},()=>({x:-22,h:80,w:44,tall:80}),(x,v,_p,s,at)=>kernel(undefined,{MOTH_DOOR_X:at.x}).drawDoor(x,raised(v,at.h),visual(s)),()=>({origin,entrance:{x:22,h:0,role:'entrance'}})),spatial:fixedNativeGeometry}),
  ({...element('mail','Hall table and uncollected mail','electronics',{},()=>box(28,30,-14),(x,v,_p,s,at)=>{const L=layout();L.mail=at.x;kernel(L).drawMail(x,raised(v,at.h),visual(s));}),spatial:fixedNativeGeometry}),
  ({...element('board','Pinned corkboard','electronics',{width:shapeLength(num('Width',44,1)),height:shapeLength(num('Height',34,1))},p=>box(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,s,at)=>{const L=layout();L.board={x:at.x,y:at.h,w:n(p,'width'),h:n(p,'height')};kernel(L).drawBoard(x,v,visual(s));}), spatial:rectangleControls({width:'width',height:'height',originX:.5})}),
  ({...element('rod','Unused fishing rod','props',{},()=>({x:-7,h:86,w:14,tall:86}),(x,v,_p,s,at)=>{const L=layout();L.rod=at.x;kernel(L).drawRod(x,raised(v,at.h),visual(s));}),spatial:fixedNativeGeometry}),
  ({...element('guitar','Wall guitar','props',{},()=>({x:-10,h:102,w:20,tall:56}),(x,v,_p,s,at)=>{const L=layout();L.guitar=at.x;kernel(L).drawGuitar(x,raised(v,at.h),visual(s));}),spatial:fixedNativeGeometry}),
  ({...element('record-player','Record player and crate','electronics',{},()=>({x:-15,h:66,w:30,tall:66}),(x,v,_p,s,at)=>{const L=layout();L.turntable=at.x;kernel(L).drawRecord(x,raised(v,at.h),visual(s));}),spatial:fixedNativeGeometry}),
  element('rig-glow','Rig screen light wash','atmosphere',{deskWidth:shapeLength(num('Desk width used to position glow',76,1))},p=>({x:n(p,'deskWidth')/2-90,h:120,w:180,tall:120}),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'deskWidth'),0)).drawRigGlow(x,raised(v,at.h),visual(s))),
  ({...element('rig-shelf','Rig router shelf and optional cables','electronics',{...width,cableConnected:appearanceBoolean(bool('Draw linked desk cables'))},p=>box(n(p,'width'),86),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),p.cableConnected?n(s,'deskHeight')-at.h:0)).drawRigShelf(x,raised(v,at.h),visual(s),p.cableConnected===true)), spatial:rectangleControls({width:'width',baseline:80})}),
  ({...element('desk','Moth workstation desk','furniture',{...width,height:shapeLength(num('Height',28,8))},p=>box(n(p,'width'),n(p,'height')),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),n(p,'height'))).drawDesk(x,raised(v,at.h),visual(s)),p=>({origin,top:{x:0,h:n(p,'height'),role:'surface'}})), spatial:rectangleControls({width:'width',height:'height'})}),
  ({...element('monitor','Moth workstation monitor','electronics',{width:shapeLength(num('Width',18,8)),height:shapeLength(num('Height',14,5)),standHeight:shapeLength(num('Stand height',8,0)),surfaceConnected:appearanceBoolean(bool('Stand on linked desk')),kind:appearanceChoice({kind:'select',label:'Display',default:'log',options:['log','lock']})},p=>box(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,s,at)=>kernel(deskAt(0,0,p.surfaceConnected?n(s,'deskHeight'):at.h-n(p,'standHeight'))).drawScreens(x,v,visual(s),v.sx(at.x),n(p,'width'),n(p,'height'),at.h,p.kind as 'lock'|'log')), spatial:rectangleControls({width:'width',height:'height',originX:.5})}),
  ({...element('webcams','Taped webcams','electronics',{},()=>({x:-4,h:27,w:40,tall:6}),(x,v,_p,s,at)=>kernel(deskAt(at.x,0,0)).drawWebcams(x,raised(v,at.h),visual(s))),spatial:fixedNativeGeometry}),
  element('desk-items','Keyboard, mug and takeaway boxes','props',width,p=>box(n(p,'width'),12),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),0)).drawDeskItems(x,raised(v,at.h),visual(s))),
  ({...element('chair','Pushed-back desk chair','furniture',{},()=>({x:-8,h:34,w:18,tall:34}),(x,v,_p,s,at)=>kernel(undefined,{chairX:at.x}).drawChair(x,raised(v,at.h),visual(s))),spatial:fixedNativeGeometry}),
  element('desk-signal','Workstation tell and hover bracket','electronics',width,p=>box(n(p,'width'),62),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),n(s,'deskHeight')-at.h)).drawDeskSignal(x,raised(v,at.h),visual(s))),
  ({...element('tank','Sprat aquarium and cabinet','electronics',{width:shapeLength(num('Width',46,16)),base:shapeLength(num('Cabinet height',22,1)),height:shapeLength(num('Tank height',24,5))},p=>({x:-n(p,'width')/2-10,h:n(p,'base')+n(p,'height')+34,w:n(p,'width')+20,tall:n(p,'base')+n(p,'height')+34}),(x,v,p,s,at)=>{const L=layout();L.tank={x:at.x,w:n(p,'width'),base:n(p,'base'),h:n(p,'height')};kernel(L).drawTank(x,raised(v,at.h),visual(s));}), spatial:{fields:['width','height'],handles:p=>rectangleControls({width:'width',height:'height',originX:.5,baseline:'base'}).handles(p).filter(h=>!h.id.includes('bottom'))}}),
  ({...element('smart-pot','Fern smart pot','electronics',{},()=>box(28,34,-14),(x,v,_p,s,at)=>{const L=layout();L.pot=at.x;kernel(L).drawPot(x,raised(v,at.h),visual(s));}),spatial:fixedNativeGeometry}),
  ({...element('phone','Answering machine and table','electronics',{},()=>box(30,36,-16),(x,v,_p,s,at)=>{const L=layout();L.phone=at.x;kernel(L).drawPhone(x,raised(v,at.h),visual(s));}),spatial:fixedNativeGeometry}),
  ({...element('sofa','Moth sofa bed','furniture',{width:shapeLength(num('Width',64,18))},p=>box(n(p,'width'),30),(x,v,p,s,at)=>{const L=layout();L.sofa={x0:at.x,x1:at.x+n(p,'width')};kernel(L).drawSofa(x,raised(v,at.h),visual(s));}), spatial:rectangleControls({width:'width'})}),
  ({...element('takeaway','Discarded takeaway boxes','props',{},()=>({x:-22,h:11,w:24,tall:11}),(x,v,_p,s,at)=>{const L=layout();L.sofa.x0=at.x;kernel(L).drawTakeaway(x,raised(v,at.h),visual(s));}),spatial:fixedNativeGeometry}),
  ({...element('flyer','Karaoke flyer','signage',{},()=>({x:-22,h:1,w:44,tall:24}),(x,v,_p,s,at)=>kernel(undefined,{flyerX:at.x}).drawFlyer(x,raised(v,at.h-84),visual(s))),spatial:fixedNativeGeometry}),
];

const monitor=mothElements.find(e=>e.type==='moth.monitor')!;
monitor.bounds=(p,s,c)=>{const stand=p.surfaceConnected?Math.max(0,(c?.placement.h??0)-n(s,'deskHeight')):n(p,'standHeight');return{x:-n(p,'width')/2,h:n(p,'height'),w:n(p,'width'),tall:n(p,'height')+stand};};

for(const e of mothElements)if(['moth.monitor','moth.rig-shelf'].includes(e.type))e.visualFields={deskHeight:mothVisualFields.deskHeight};

for(const e of mothElements){
 if(e.type==='moth.rig-glow')e.spatial=fixedGeometry('This wash has a fixed 90-unit glow radius. Desk width positions its centre; it does not resize the glow. Edit that layout input or move the asset.');
 if(e.type==='moth.desk-items')e.spatial=rectangleControls({width:'width',baseline:6});
 if(e.type==='moth.desk-signal')e.spatial=rectangleControls({width:'width',baseline:31});
}
