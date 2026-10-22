/** Authored framing and visual inputs for a camera travelling through ordinary world zones. No drawing or simulation. */
import type {Element} from '../core/composition';
export const worldControlElement:Element={
  type:'sequence.world-control',version:1,label:'World sequence settings',category:'sequences',parts:[],
  fields:{
    origin:{kind:'string',label:'Origin zone',default:''},
    zones:{kind:'json',label:'Visible world zones',default:[],validate(value){if(!Array.isArray(value)||!value.length||value.some(v=>typeof v!=='string'||!v)||new Set(value).size!==value.length)throw Error('World sequence zones must be unique zone names');}},
    width:{kind:'number',label:'Reference viewport width',default:1280,min:1},height:{kind:'number',label:'Reference viewport height',default:720,min:1},
    pixel:{kind:'number',label:'Artwork pixel size',default:3,min:1},ground:{kind:'number',label:'Ground position (viewport fraction)',default:.82,min:0,max:1},
  },
  visualFields:{playFit:{kind:'number',label:'Blend into playable framing',default:0,min:0,max:1,animatable:true},x:{kind:'number',label:'Vehicle frame x',default:20,animatable:true},offset:{kind:'number',label:'Vehicle offset (world units)',default:0,animatable:true},open:{kind:'number',label:'Doors openness',default:-1,min:-1,max:1,animatable:true},rain:{kind:'number',label:'Rain intensity',default:0,min:0,max:1,animatable:true},clock:{kind:'number',label:'City minute',default:1075,min:0,max:1439,animatable:true},nose:{kind:'number',label:'Train nose (world units)',default:-1e9,animatable:true}},
  bounds:()=>({x:0,h:0,w:0,tall:0}),anchors:()=>({origin:{x:0,h:0,role:'origin'}}),draw(){},
};
