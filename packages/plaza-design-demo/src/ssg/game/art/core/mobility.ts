/** Source identity and attachment membership only. Simulation stays in SceneModel. */
import type {Composition,Instance,ArtRegistry} from './composition';
const caches=new WeakMap<ArtRegistry,WeakMap<Composition,ReadonlySet<string>>>();
export function mobileInstances(doc:Composition,registry:ArtRegistry,extra?:ReadonlySet<string>):ReadonlySet<string>{
 let cache=caches.get(registry);if(!cache){cache=new WeakMap();caches.set(registry,cache);}
 const had=cache.get(doc);if(had&&!extra?.size)return had;
 const rows:Instance[]=[];const visit=(nodes:Instance[])=>{for(const n of nodes){rows.push(n);visit(n.children??[]);}};visit(doc.instances);
 const ids=new Set([...(extra??[]),...rows.filter(n=>registry.get(n.type).mobility?.(registry.properties(n.type,n.props))).map(n=>n.id)]);
 let changed=true;while(changed){changed=false;for(const n of rows)for(const child of [...(n.children??[]).map(c=>c.id),...rows.filter(r=>r.attach?.instance===n.id).map(r=>r.id)])if(ids.has(n.id)&&!ids.has(child)){ids.add(child);changed=true;}}
 if(!extra?.size)cache.set(doc,ids);return ids;
}
