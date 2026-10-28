import {fixedGeometry} from '../core/spatial';
import {appearanceRatio,appearanceStructure,appearanceText,semantic} from '../core/fields';
/** Authored framing and visual inputs for a camera travelling through ordinary world zones. No drawing or simulation. */
import type {AssetDefinition} from '../core/composition';
export const worldControlElement:AssetDefinition={
  type:'sequence.world-control',version:1,label:'World sequence settings',category:'sequences',parts:[],
  spatial:fixedGeometry('Reference viewport dimensions and artwork pixel size are camera settings, not a world-space object. Edit the camera controls; this settings asset draws nothing.'),
  fields:{
    origin:appearanceText({kind:'string',label:'Origin zone',default:''}),
    worldComposition:appearanceText({kind:'string',label:'World composition (empty uses explicit zones)',default:''}),
    zones:appearanceStructure({kind:'json',label:'Explicit world zones',default:[],validate(value){if(!Array.isArray(value)||value.some(v=>typeof v!=='string'||!v)||new Set(value).size!==value.length)throw Error('World sequence zones must be unique zone names');},editor:{kind:'contextual',section:'appearance',label:'Edit World direction above'}}),
    width:semantic({kind:'number',label:'Reference viewport width',default:1280,min:1},{group:'Shape / Area',quantity:'length',unit:'render pixels',space:'camera'}),height:semantic({kind:'number',label:'Reference viewport height',default:720,min:1},{group:'Shape / Area',quantity:'length',unit:'render pixels',space:'camera'}),
    pixel:semantic({kind:'number',label:'Artwork pixel size',default:3,min:1},{"group":"Appearance","quantity":"length","unit":"artwork pixels","space":"artwork"}),ground:appearanceRatio({kind:'number',label:'Ground position (viewport fraction)',default:.82,min:0,max:1}),
  },
  visualFields:{playFit:{kind:'number',label:'Blend into playable framing',default:0,min:0,max:1,animatable:true},rain:{kind:'number',label:'Rain intensity',default:0,min:0,max:1,animatable:true},clock:{kind:'number',label:'City minute',default:1075,min:0,max:1439,animatable:true}},
  bounds:()=>({x:0,h:0,w:0,tall:0}),anchors:()=>({origin:{x:0,h:0,role:'origin'}}),draw(){},
};
