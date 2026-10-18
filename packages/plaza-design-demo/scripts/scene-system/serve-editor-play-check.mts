/** Focused browser fixture. Test controls and storage traps never enter production bundles. */
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
const root=path.resolve('dist-homepage');
const instrumentation=`
(()=>{
 const send=(type,value)=>parent.postMessage({channel:'editor-play-check',type,value},'*');
 for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){send('storage',key);throw new Error('Unexpected native storage access: '+key);}});
 const lifetime=Math.random().toString(36);setInterval(()=>send('heartbeat',lifetime),80);
 const texts=[];const fill=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(text,...rest){texts.push(String(text));if(texts.length>1000)texts.shift();return fill.call(this,text,...rest);};
 window.addEventListener('message',event=>{if(event.source!==parent||event.data?.channel!=='editor-play-check')return;
 const {type,key,duration}=event.data;
 if(type==='key'){window.dispatchEvent(new KeyboardEvent('keydown',{key}));setTimeout(()=>window.dispatchEvent(new KeyboardEvent('keyup',{key})),duration??30);}
 if(type==='texts')send('texts',texts);
 if(type==='reload')window.dispatchEvent(new Event('editor-runtime-reload'));
 if(type==='dom')send('dom',[...document.querySelectorAll('.sch [data-target], .sch [data-plate], .sch-verb')].map(e=>({target:e.dataset.target,plate:e.dataset.plate,text:e.textContent.slice(0,100)})));
 if(type==='tap'){const el=document.querySelector(event.data.selector);if(!el){send('missing',event.data.selector);return;}const r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));window.dispatchEvent(new PointerEvent('pointerup',{clientX:r.x+r.width/2,clientY:r.y+r.height/2}));}
 if(type==='click'){const el=[...document.querySelectorAll(event.data.selector)].find(e=>!event.data.text||e.textContent===event.data.text);if(el)el.dispatchEvent(new MouseEvent('click',{bubbles:true}));else send('missing',event.data.selector+':'+event.data.text);}
 if(type==='click-pause'){const el=[...document.querySelectorAll(event.data.selector)].find(e=>e.textContent===event.data.text);if(!el){send('missing',event.data.selector);return;}el.dispatchEvent(new MouseEvent('click',{bubbles:true}));for(let i=0;i<2;i++)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));}
 if(type==='wire'){const source=document.querySelector('[data-port="'+event.data.from+'"]'),dest=document.querySelector('[data-target="'+event.data.to+'"] .sch-label');if(!source||!dest){send('missing','wire endpoints');return;}const a=source.getBoundingClientRect(),b=dest.getBoundingClientRect();source.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:a.x+a.width/2,clientY:a.y+a.height/2}));window.dispatchEvent(new PointerEvent('pointerup',{clientX:b.x+b.width/2,clientY:b.y+b.height/2}));}
 });
})();`;
const server=createServer((req,res)=>{
 const url=new URL(req.url??'/','http://127.0.0.1'),relative=decodeURIComponent(url.pathname).replace(/^\//,'');
 const file=path.resolve(root,relative.endsWith('/')?relative+'index.html':relative);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}
 const ext=path.extname(file),type=ext==='.html'?'text/html':ext==='.js'?'text/javascript':ext==='.json'?'application/json':ext==='.woff2'?'font/woff2':'text/css';
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
 res.end(/^play-[A-Z0-9]+\.js$/i.test(path.basename(file))?instrumentation+fs.readFileSync(file,'utf8'):fs.readFileSync(file));
});
server.listen(4204,'127.0.0.1',()=>console.log('Focused editor Play fixture http://127.0.0.1:4204/editor/'));
