import * as city from '../../src/ssg/game/world/city';
import {createNativePreview} from '../../src/ssg/game/authoring/native-preview';
import {nativeSceneAdapters} from '../../src/ssg/game/authoring/scene-adapters';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createLineSystem} from '../../src/ssg/game/world/transport/line';
import {checkIntroRaster} from './intro-raster-browser';
const status=document.querySelector('pre')!;
async function run(){
 const config=await (await fetch('/config')).json();
 await Promise.all([400,500,600,700].map(async weight=>{const font=new FontFace('IBM Plex Mono',`url(/fonts/ibm-plex-mono-latin-${weight}-normal.woff2)`,{weight:String(weight)});document.fonts.add(await font.load());}));
 await document.fonts.ready;
 const results=config.introOnly?checkIntroRaster():[];
 for(const sample of config.samples){
  try{
   const doc=sourceDocuments.find(d=>d.kind==='composition'&&d.id===sample.scene)!;
   const composition=await (await fetch('/source/'+encodeURIComponent(doc.id))).json();
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
   const preview=createNativePreview(nativeSceneAdapters,scene=>scene.bindWorld?.({metro:createLineSystem(city),city})??scene);
   preview.render(canvas,{composition,time:sample.time,reduced:sample.reduced,overlays:false,environment:{day:1,minute:sample.minute,seed:3,weather:sample.weather,cameraX:0,zoom:1,flags:'{}',state:'{}',hack:sample.hack,hover:''}});
   const section=document.createElement('section');section.append(document.createTextNode(sample.id),canvas);document.body.append(section);
   let differences=0,minX=640,minY=360,maxX=-1,maxY=-1;
   if(config.accept){
    const response=await fetch('/accept/'+sample.id,{method:'POST',headers:{'Content-Type':'image/png'},body:await new Promise<Blob>(resolve=>canvas.toBlob(b=>resolve(b!),'image/png'))});if(!response.ok)throw Error(await response.text());
   }else{
    const response=await fetch('/expected/'+sample.id+'.png');if(!response.ok)throw Error(`Visual reference unavailable: ${sample.id}.png (HTTP ${response.status})`);
    const image=new Image(),url=URL.createObjectURL(await response.blob());image.src=url;try{await image.decode();}finally{URL.revokeObjectURL(url);}
    if(image.width!==640||image.height!==360)throw Error('Expected image dimensions changed');
    const reference=document.createElement('canvas');reference.width=640;reference.height=360;reference.getContext('2d')!.drawImage(image,0,0);
    const actual=canvas.getContext('2d')!.getImageData(0,0,640,360).data,expected=reference.getContext('2d')!.getImageData(0,0,640,360).data;
    const diff=document.createElement('canvas');diff.width=640;diff.height=360;const diffContext=diff.getContext('2d')!,picture=diffContext.createImageData(640,360);
    for(let i=0;i<actual.length;i+=4)if(actual[i]!==expected[i]||actual[i+1]!==expected[i+1]||actual[i+2]!==expected[i+2]||actual[i+3]!==expected[i+3]){differences++;const px=(i/4)%640,py=Math.floor(i/4/640);minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);picture.data.set([255,80,120,255],i);}
    if(differences){diffContext.putImageData(picture,0,0);const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Reference and exact pixel differences';details.append(summary,reference,diff);section.append(details);}
   }
   results.push({id:sample.id,ok:differences===0,differences,...(differences?{differenceBounds:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}}:{})});
  }catch(error){results.push({id:sample.id,ok:false,error:String(error)});}
  status.textContent=JSON.stringify(results,null,2);
 }
 status.textContent=`${config.accept?'ACCEPT':'COMPARE'} ${results.filter(r=>r.ok).length}/${results.length}\n`+JSON.stringify(results,null,2);
 await fetch('/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(results)});
}
run().catch(error=>status.textContent=String(error));
