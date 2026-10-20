/** Checks that compare current source with the frozen 2026-10-18 baseline code: hand the old code a pass-format copy.
 * Layers flatten into one back-to-front sequence (foreground stays foreground) and the player row takes back the
 * frozen spawn marker's type and properties, so the old renderer and geometry read the same document. */
import {LAYERS,type Composition,type Instance} from '../../src/ssg/game/art/core/composition';
export function legacyComposition(current:Composition,frozen:Composition):Composition{
 const doc=structuredClone(current),flat=(ns:Instance[]):Instance[]=>ns.flatMap(n=>[n,...flat(n.children??[])]),rows=flat(doc.instances);
 if(!rows.some(n=>n.layer!==undefined))return doc;
 const old=new Map(flat(frozen.instances).map(n=>[n.id,n]));
 rows.map((n,i)=>({n,i})).sort((a,b)=>LAYERS.indexOf(a.n.layer!)-LAYERS.indexOf(b.n.layer!)||a.n.order-b.n.order||a.i-b.i).forEach(({n},i)=>{n.order=i;});
 for(const n of rows){
  n.pass=n.layer==='foreground'?'foreground':'backdrop';delete n.layer;
  if(n.type==='scene.player'){const was=old.get(n.id);if(was){n.type=was.type;n.props=structuredClone(was.props);}}
 }
 return doc;
}
