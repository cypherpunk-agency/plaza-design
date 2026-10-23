/** Moth's apartment catalogue: editable furnishings, devices and independent rig components. */
import { createMothInteriorArtwork, type ArtworkInputs, type MothLayout, type MothVisualState } from './moth-interior';
import type { Anchor, Bounds, Element, Field, Placement, Properties } from '../core/composition';
import type { View } from '../core/view';
const num = (label: string, value: number, min = -10000): Field => ({ kind: 'number', label, default: value, min, max: 10000, step: 1 });
const bool = (label: string): Field => ({ kind: 'boolean', label, default: false });
const text = (label: string): Field => ({ kind: 'string', label, default: '' });
const n = (p: Properties, key: string) => Number(p[key]);
const origin: Anchor = { x: 0, h: 0, role: 'origin' };
const raised = (v: View, h: number): View => h === 0 ? v : ({ ...v, gy: v.gy - h, y: height => v.y(height + h) });
export const mothVisualFields: Record<string, Field> = { hover: text('Hovered device'), playing: bool('Record playing'), nextMs: num('Next record beat in ms', 0, 0), fed: bool('Sprat fed'), wet: bool('Fern watered'), fresh: bool('Unread message'), deskHeight: num('Desk surface height', 28) };
function layout(): MothLayout { return { mail: 0, board: { x: 0, y: 0, w: 44, h: 34 }, rod: 0, guitar: 0, turntable: 0, desk: { x0: 0, x1: 76, h: 28 }, tank: { x: 0, w: 46, base: 22, h: 24 }, window: { x0: 0, x1: 74, h0: 42, h1: 100 }, pot: 0, phone: 0, sofa: { x0: 0, x1: 64 } }; }
const cache = new Map<string, ReturnType<typeof createMothInteriorArtwork>>();
function kernel(L = layout(), extra: Partial<Omit<ArtworkInputs, 'L'>> = {}) {
  const input: ArtworkInputs = { L, MOTH_W: 660, MOTH_FACING: 270, MOTH_DOOR_X: 0, ...extra };
  const key = JSON.stringify(input); let result = cache.get(key);
  if (!result) { result = createMothInteriorArtwork(input); if (cache.size >= 2048) cache.clear(); cache.set(key, result); }
  return result;
}
type Draw = (ctx: CanvasRenderingContext2D, view: View, props: Properties, state: Properties, at: Required<Placement>) => void;
function element(id: string, label: string, category: string, fields: Record<string, Field>, bounds: (props: Properties) => Bounds, draw: Draw, anchors: (props: Properties) => Record<string, Anchor> = () => ({ origin })): Element {
  // Room-frame paintings and desk-relative cable/signal pieces retain their source context.
  return { type: 'moth.' + id, bindingIdentity:'presentation', version: 1, label, category, coordinates: 'world', libraryUse:!['marker','neighbors','shell','rig-shelf','monitor','desk-signal'].includes(id)?'reusable':undefined, fields, visualFields: mothVisualFields, parts: ['backdrop'], bounds, anchors, draw: (x,v,p,s,_pass,at) => draw(x,v,p,s,at) };
}
const visual = (state: Properties) => state as unknown as MothVisualState;
const box = (w: number, h: number, x = 0): Bounds => ({ x, h, w, tall: h });
function deskAt(x: number, width: number, height: number) { const L = layout(); L.desk = { x0: x, x1: x + width, h: height }; return L; }
const width = { width: num('Width', 76, 1) };
export const mothElements: Element[] = [
  { ...element('marker','Moth gameplay marker','markers',{ role: text('Role') },() => box(8,8,-4),() => {}), visualFields: {}, parts: [] },
  element('neighbors','Tenement neighbors','architecture',{ width:num('Room gap width',660,1),ceiling:num('Ceiling',112,1) },p=>box(n(p,'width'),n(p,'ceiling')),(x,v,p,_s,at)=>kernel(undefined,{MOTH_W:n(p,'width'),ceiling:n(p,'ceiling')}).drawBuilding(x,{...raised(v,at.h),sx:wx=>v.sx(at.x+wx)})),
  element('shell','Old tenement walls, bulb and floor','architecture',{ width:num('Width',660,16),ceiling:num('Ceiling',112,1) },p=>box(n(p,'width'),n(p,'ceiling')+12),(x,v,p,s,at)=>kernel(undefined,{MOTH_W:n(p,'width'),ceiling:n(p,'ceiling'),originX:at.x}).drawShell(x,raised(v,at.h),visual(s))),
  element('window','Street-facing window','architecture',{width:num('Width',74,1),height:num('Height',58,1),facing:num('Compass facing',270,0)},p=>({x:-5,h:n(p,'height')+3,w:n(p,'width')+10,tall:n(p,'height')+6}),(x,v,p,s,at)=>{const L=layout();L.window={x0:at.x,x1:at.x+n(p,'width'),h0:at.h,h1:at.h+n(p,'height')};kernel(L,{MOTH_FACING:n(p,'facing')}).drawWindow(x,v,visual(s));}),
  element('string-lights','Moth string lights','electronics',{},()=>box(266,8),(x,v,_p,s,at)=>kernel(undefined,{lightsX:at.x,ceiling:at.h+6}).drawStringLights(x,v,visual(s))),
  element('resident-panel','Resident status panel','electronics',{},()=>({x:-30,h:48,w:60,tall:66}),(x,v,_p,s,at)=>kernel(undefined,{panelX:at.x}).drawResidentPanel(x,raised(v,at.h-64),visual(s))),
  element('calendar','Marked wall calendar','props',{},()=>({x:0,h:0,w:15,tall:20}),(x,v,_p,s,at)=>kernel(undefined,{calendarX:at.x}).drawCalendar(x,raised(v,at.h-88),visual(s))),
  element('books','Books and shelf','furniture',{},()=>box(44,14),(x,v,_p,s,at)=>kernel(undefined,{booksX:at.x}).drawBooks(x,raised(v,at.h-66),visual(s))),
  element('door','Moth entrance door','architecture',{},()=>({x:-22,h:80,w:44,tall:80}),(x,v,_p,s,at)=>kernel(undefined,{MOTH_DOOR_X:at.x}).drawDoor(x,raised(v,at.h),visual(s)),()=>({origin,entrance:{x:22,h:0,role:'entrance'}})),
  element('mail','Hall table and uncollected mail','electronics',{},()=>box(28,30,-14),(x,v,_p,s,at)=>{const L=layout();L.mail=at.x;kernel(L).drawMail(x,raised(v,at.h),visual(s));}),
  element('board','Pinned corkboard','electronics',{width:num('Width',44,1),height:num('Height',34,1)},p=>box(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,s,at)=>{const L=layout();L.board={x:at.x,y:at.h,w:n(p,'width'),h:n(p,'height')};kernel(L).drawBoard(x,v,visual(s));}),
  element('rod','Unused fishing rod','props',{},()=>({x:-7,h:86,w:14,tall:86}),(x,v,_p,s,at)=>{const L=layout();L.rod=at.x;kernel(L).drawRod(x,raised(v,at.h),visual(s));}),
  element('guitar','Wall guitar','props',{},()=>({x:-10,h:102,w:20,tall:56}),(x,v,_p,s,at)=>{const L=layout();L.guitar=at.x;kernel(L).drawGuitar(x,raised(v,at.h),visual(s));}),
  element('record-player','Record player and crate','electronics',{},()=>({x:-15,h:66,w:30,tall:66}),(x,v,_p,s,at)=>{const L=layout();L.turntable=at.x;kernel(L).drawRecord(x,raised(v,at.h),visual(s));}),
  element('rig-glow','Rig screen light wash','atmosphere',width,()=>({x:-52,h:120,w:180,tall:120}),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),0)).drawRigGlow(x,raised(v,at.h),visual(s))),
  element('rig-shelf','Rig router shelf and cables','electronics',width,p=>box(n(p,'width'),86),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),n(s,'deskHeight')-at.h)).drawRigShelf(x,raised(v,at.h),visual(s))),
  element('desk','Moth workstation desk','furniture',{...width,height:num('Height',28,8)},p=>box(n(p,'width'),n(p,'height')),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),n(p,'height'))).drawDesk(x,raised(v,at.h),visual(s)),p=>({origin,top:{x:0,h:n(p,'height'),role:'surface'}})),
  element('monitor','Moth workstation monitor','electronics',{width:num('Width',18,8),height:num('Height',14,5),kind:{kind:'select',label:'Display',default:'log',options:['log','lock']}},p=>box(n(p,'width'),n(p,'height'),-n(p,'width')/2),(x,v,p,s,at)=>kernel(deskAt(0,0,n(s,'deskHeight'))).drawScreens(x,v,visual(s),v.sx(at.x),n(p,'width'),n(p,'height'),at.h,p.kind as 'lock'|'log')),
  element('webcams','Taped webcams','electronics',width,()=>({x:-4,h:27,w:40,tall:6}),(x,v,p,s,at)=>kernel(deskAt(at.x-n(p,'width')/2,n(p,'width'),0)).drawWebcams(x,raised(v,at.h),visual(s))),
  element('desk-items','Keyboard, mug and takeaway boxes','props',width,p=>box(n(p,'width'),12),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),0)).drawDeskItems(x,raised(v,at.h),visual(s))),
  element('chair','Pushed-back desk chair','furniture',{},()=>({x:-8,h:34,w:18,tall:34}),(x,v,_p,s,at)=>kernel(undefined,{chairX:at.x}).drawChair(x,raised(v,at.h),visual(s))),
  element('desk-signal','Workstation tell and hover bracket','electronics',width,p=>box(n(p,'width'),62),(x,v,p,s,at)=>kernel(deskAt(at.x,n(p,'width'),n(s,'deskHeight')-at.h)).drawDeskSignal(x,raised(v,at.h),visual(s))),
  element('tank','Sprat aquarium and cabinet','electronics',{width:num('Width',46,16),base:num('Cabinet height',22,1),height:num('Tank height',24,5)},p=>({x:-n(p,'width')/2-10,h:n(p,'base')+n(p,'height')+34,w:n(p,'width')+20,tall:n(p,'base')+n(p,'height')+34}),(x,v,p,s,at)=>{const L=layout();L.tank={x:at.x,w:n(p,'width'),base:n(p,'base'),h:n(p,'height')};kernel(L).drawTank(x,raised(v,at.h),visual(s));}),
  element('smart-pot','Fern smart pot','electronics',{},()=>box(28,34,-14),(x,v,_p,s,at)=>{const L=layout();L.pot=at.x;kernel(L).drawPot(x,raised(v,at.h),visual(s));}),
  element('phone','Answering machine and table','electronics',{},()=>box(30,36,-16),(x,v,_p,s,at)=>{const L=layout();L.phone=at.x;kernel(L).drawPhone(x,raised(v,at.h),visual(s));}),
  element('sofa','Moth sofa bed','furniture',{width:num('Width',64,18)},p=>box(n(p,'width'),30),(x,v,p,s,at)=>{const L=layout();L.sofa={x0:at.x,x1:at.x+n(p,'width')};kernel(L).drawSofa(x,raised(v,at.h),visual(s));}),
  element('takeaway','Discarded takeaway boxes','props',{},()=>({x:-22,h:11,w:24,tall:11}),(x,v,_p,s,at)=>{const L=layout();L.sofa.x0=at.x;kernel(L).drawTakeaway(x,raised(v,at.h),visual(s));}),
  element('flyer','Karaoke flyer','signage',{},()=>({x:-22,h:1,w:44,tall:24}),(x,v,_p,s,at)=>kernel(undefined,{flyerX:at.x}).drawFlyer(x,raised(v,at.h-84),visual(s))),
];
