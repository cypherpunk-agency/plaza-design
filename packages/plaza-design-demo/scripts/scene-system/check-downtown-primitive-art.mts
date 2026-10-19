import assert from 'node:assert/strict';
import {downtownComposition,validateDowntownComposition} from '../../src/ssg/game/scenes/downtown/composition';
const optional=structuredClone(downtownComposition),gate=optional.instances.find(n=>n.id==='device-gate')!;gate.id='replacement-gate-picture';for(const node of optional.instances)if(node.attach?.instance==='device-gate')node.attach.instance=gate.id;assert.doesNotThrow(()=>validateDowntownComposition(optional),'ordinary attachment consumers can follow a replacement marker');
const required=structuredClone(downtownComposition);required.instances=required.instances.filter(n=>n.id!=='device-dlv9');assert.throws(()=>validateDowntownComposition(required),/device-dlv9/);
console.log('Downtown primitive artwork PASS: gate endpoint geometry is independent of its optional picture; moving DLV home marker remains required.');
