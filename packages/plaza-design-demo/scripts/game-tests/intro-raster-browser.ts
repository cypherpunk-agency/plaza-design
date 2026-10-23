/** Actual Canvas2D pixels: the native intro's tick, seek and paused-paint paths agree. */
import {CutscenePlay,createCutscenes,renderCutsceneDocument} from '../../src/ssg/game/story/cutscenes';
import {IntroSeekSession} from '../../src/ssg/game/story/cutscenes/skyline-session';
import {lightAt} from '../../src/ssg/game/world/light';

function surface(width:number,height:number,scale=1){
 const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;
 // Repeated readbacks can switch Chromium from GPU to CPU rasterization. Both sides must
 // start in the same mode; otherwise identical gradient commands can differ by one byte.
 const context=canvas.getContext('2d',{willReadFrequently:true})!;
 return{canvas,context};
}
function differentPixels(a:Uint8ClampedArray,b:Uint8ClampedArray){let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])n++;return n;}
export function checkIntroRaster(){
 const results:{id:string;ok:boolean;differences:number;repeatDifferences:number}[]=[],lighting=lightAt(1,1140,90,null);
 for(const[width,height]of [[640,360],[1024,576]])for(const reduced of [false,true])for(const scale of [1,2,3]){
  const live=surface(width,height,scale),play=new CutscenePlay(createCutscenes().intro,{reduced,touch:false});
  // Shipping can enter the intro after a normal frame; an editor surface starts afresh.
  live.context.setTransform(scale,0,0,scale,0,0);
  play.prepare(live.context,width,height,lighting);let frame=0;
  const raster=(player:CutscenePlay,s:ReturnType<typeof surface>)=>{s.context.clearRect(0,0,width,height);player.draw(s.context,width,height,lighting,scale);return s.context.getImageData(0,0,s.canvas.width,s.canvas.height).data.slice();};
  for(const target of [0,30,180,600,1440]){
   while(frame<target){play.prepare(live.context,width,height,lighting);play.step(1/60);frame++;}
   const actual=raster(play,live),repeat=raster(play,live),reference=surface(width,height,scale);
   renderCutsceneDocument(reference.context,width,height,'intro',play.t,{scale,reduced,lighting,seek:new IntroSeekSession()});
   const expected=reference.context.getImageData(0,0,reference.canvas.width,reference.canvas.height).data,differences=differentPixels(actual,expected),repeatDifferences=differentPixels(actual,repeat),id=`intro-${width}x${height}-${scale}x-${reduced?'reduced':'motion'}-${target}`;
   results.push({id,ok:differences===0&&repeatDifferences===0,differences,repeatDifferences});
   if(differences||repeatDifferences){
    const section=document.createElement('section'),copy=surface(width,height,scale);copy.context.drawImage(live.canvas,0,0);
    section.append(document.createTextNode(id),copy.canvas,reference.canvas);document.body.append(section);
   }
  }
  // Resizing resets the canvas context. The owner prepares the new layout without moving
  // timeline time; painting it twice must remain stable, then seeking must match the editor.
  const nextWidth=width===640?1024:640,nextHeight=height===360?576:360,nextScale=scale%3+1,time=play.t;
  live.canvas.width=nextWidth*nextScale;live.canvas.height=nextHeight*nextScale;
  play.prepare(live.context,nextWidth,nextHeight,lighting);
  const resizedRaster=()=>{play.draw(live.context,nextWidth,nextHeight,lighting,nextScale);return live.context.getImageData(0,0,live.canvas.width,live.canvas.height).data.slice();};
  const resized=resizedRaster(),pausedRepeat=resizedRaster(),resizeRepeat=differentPixels(resized,pausedRepeat),resizeId=`intro-resize-${width}-${scale}x-${reduced?'reduced':'motion'}`;
  results.push({id:resizeId+'-paused',ok:resizeRepeat===0&&play.t===time,differences:0,repeatDifferences:resizeRepeat});
  play.timeline.seek(time);play.step(1/60);
  const resumed=resizedRaster(),reference=surface(nextWidth,nextHeight,nextScale);
  renderCutsceneDocument(reference.context,nextWidth,nextHeight,'intro',play.t,{scale:nextScale,reduced,lighting,seek:new IntroSeekSession()});
  const expected=reference.context.getImageData(0,0,reference.canvas.width,reference.canvas.height).data,differences=differentPixels(resumed,expected);
  results.push({id:resizeId+'-seek-resume',ok:differences===0,differences,repeatDifferences:0});
 }
 return results;
}
