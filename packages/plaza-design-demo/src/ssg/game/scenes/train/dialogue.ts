/** Compatibility read over authored fixed regular recipes and their readable content. */
import scene from './scene.json';
export const TRAIN_REGULARS=scene.actors.filter(a=>a.presentation.regular).map(a=>{const readable=scene.readables.find(r=>r.id===a.id);return{id:a.id,name:readable?.name??'PASSENGER',pages:readable?.pages??[]};});
