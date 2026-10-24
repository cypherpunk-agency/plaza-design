/** Shared editor transport keys. Native Play owns its own keyboard inside its isolated realm. */
export function animationShortcut(event:KeyboardEvent):'toggle'|{frames:number}|{seconds:number}|undefined {
  if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey)return;
  const target=event.target as HTMLElement|null;
  if(target?.closest('input,textarea,select,dialog,[contenteditable]:not([contenteditable="false"])')||document.querySelector('dialog[open]'))return;
  if(event.key===' ')return event.repeat?undefined:'toggle';
  if(event.key===',')return{frames:-1};
  if(event.key==='.')return{frames:1};
  if(event.key==='ArrowLeft')return{seconds:event.shiftKey?-5:-1};
  if(event.key==='ArrowRight')return{seconds:event.shiftKey?5:1};
}
