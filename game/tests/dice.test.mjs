import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const sandbox={window:{},Math:Object.assign(Object.create(Math),{random:()=>{throw Error('Presentation must not use gameplay RNG')}})};
vm.runInNewContext(readFileSync(new URL('../dice-3d.js',import.meta.url),'utf8'),sandbox);
vm.runInNewContext(readFileSync(new URL('../tavern-creator.js',import.meta.url),'utf8'),sandbox);
const dice=sandbox.window.AshenDice,creator=sandbox.window.AshenTavern;

test('all six face orientations actually place the requested value on top',()=>{
 for(let value=1;value<=6;value++)for(const yaw of [-2,-.2,0,.5,2.8])assert.equal(dice.topFace(dice.settledOrientation(value,yaw)),value);
});
test('dice translate, tumble, bounce and contact each other before settling to sampled values',()=>{
 const bodies=dice.createSimulation([1,2,5,6]),initial=bodies.map(b=>({x:b.x,q:Array.from(b.q)}));let contacts=0,airborne=false;
 for(let i=0;i<144;i++){dice.step(bodies,1/120,i/120,()=>contacts++);if(i<80&&bodies.some(b=>b.y>1))airborne=true}
 assert.ok(airborne);assert.ok(contacts>0);assert.ok(bodies.some((b,i)=>Math.abs(b.x-initial[i].x)>2));
 assert.deepEqual(Array.from(bodies,b=>dice.topFace(b.q)),[1,2,5,6]);for(const b of bodies){assert.equal(b.y,.5);assert.equal(b.spin,0);assert.ok(Math.abs(b.x)<4.8)}
});
test('animation presentation validates four die faces and rejects invalid values',()=>{
 assert.throws(()=>dice.createSimulation([1,2,3]));assert.throws(()=>dice.createSimulation([1,2,3,7]));assert.throws(()=>dice.settledOrientation(0));
});
test('draft validation preserves unique roll identities even when totals tie',()=>{
 assert.equal(creator.validAssignments([0,1,2,3,4,5]),true);assert.equal(creator.validAssignments([0,0,2,3,4,5]),false);assert.equal(creator.validAssignments([0,1,2,3,4,6]),false);
 assert.equal(creator.validRoll({dice:[1,1,6,6],drop:0,score:13}),true);assert.equal(creator.validRoll({dice:[1,1,6,6],drop:1,score:13}),false);assert.equal(creator.validRoll({dice:[1,2,3,4],drop:0,score:10}),false);
});
