import {art} from '../../src/ssg/game/art';
import assert from 'node:assert/strict';
import {preserveBoundIdentity} from '../../src/ssg/game/authoring/bound-identity';
const registry={get:(type:string)=>({bindingIdentity:type==='picture'?'presentation':undefined})}as any;
const doc=(type:string,source='old')=>({scene:'fixture',instances:[{id:'consumer',type,props:{},placement:{x:0,h:0},order:0,layer: 'backdrop',bindings:{snapshot:source}}]});
assert.doesNotThrow(()=>preserveBoundIdentity(doc('picture'),doc('picture','replacement'),registry));
assert.doesNotThrow(()=>preserveBoundIdentity(doc('picture'),{scene:'fixture',instances:[]},registry));
assert.throws(()=>preserveBoundIdentity(doc('picture'),doc('otherPicture'),registry),/preserve gameplay identity/);
assert.throws(()=>preserveBoundIdentity(doc('mechanic'),doc('mechanic','replacement'),registry),/preserve gameplay identity/);
assert.throws(()=>preserveBoundIdentity(doc('mechanic'),{scene:'fixture',instances:[]},registry),/preserve gameplay identity/);
assert.doesNotThrow(()=>preserveBoundIdentity(doc('mechanic'),doc('mechanic'),registry));
console.log('Presentation binding identity PASS: registered pictures can rebind/remove; retained types and gameplay binding identities stay protected. Native source validation separately rejects dangling streams.');

for(const type of ['train.seatBack','train.seatFront'])assert.deepEqual(art.get(type).bindingChoices!({scene:'train',instances:[{id:'replacement',type:'train.windowFrame',children:[]},{id:'decoration',type:'furniture.stool',children:[]}]}as any),{frame:['train.frame'],width:['train.replacement.width']});
