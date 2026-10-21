import type {SceneMechanism} from '../scene-mechanisms';
import {validateSandboxGeometry,sandboxStations} from '../../controllers/sandbox-picture';
import {sandboxController} from '../../controllers/sandbox';
/**
 * Mechanism `sandboxBay`: the QA bay's controller (devices.json) must name artwork that exists in the
 * composition and has the shape its picture needs. A station card's readable is named after its
 * sign ("BAY 3·NN · title") unless the scene gives it a name of its own.
 */
export const sandboxBay:SceneMechanism={
 face:{function:'logic',controller:'sandbox'},
 label:'Sandbox bay (checks the picture controller against the artwork)',requires:[],world:false,
 apply:({scene,rows,content})=>{const data=content.data??{} as never;validateSandboxGeometry(data,rows);
  const controller=sandboxController(data)??null,stations=sandboxStations(rows,controller),generated=/^BAY 3·\d\d · /;
  return{readables:content.readables?.map(r=>{const bound=scene.manifest?.readables?.[r.id],instance=typeof bound==='string'?bound:bound?.instance,i=controller?.stations.findIndex(st=>st.card!==undefined&&st.card===instance)??-1,st=stations[i];
   return st&&generated.test(r.name)?{...r,name:'BAY 3·'+String(st.n).padStart(2,'0')+' · '+st.title}:r;})};},
 // the reset console the controller names is where the reset target stands
 anchors:({data,rows})=>{const ref=sandboxController(data)?.geometry.reset,row=ref?rows.find(r=>r.instance.id===ref):undefined;return row?{reset:row}:{} as Record<string,never>;},
};
