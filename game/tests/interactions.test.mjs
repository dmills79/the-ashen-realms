import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const path=new URL('../interactions.js',import.meta.url),s={window:{},Image:class{}};vm.runInNewContext(existsSync(path)?readFileSync(path,'utf8'):'',s);const a=s.window.AshenInteractions;
test('service gate state and collision toggle together and cannot close onto an actor',()=>{const world={objects:{}},gate={id:'gate',scene:'tavern',kind:'gate',cell:[11,5],open:true};a?.perform?.(gate,world,{x:11,y:6},()=>false);assert.equal(a?.blocked?.(gate,world),true);a?.perform?.(gate,world,{x:11,y:6},()=>false);assert.equal(a?.blocked?.(gate,world),false);const result=a?.perform?.(gate,world,{x:11,y:5},()=>false);assert.equal(result?.blocked,true);assert.equal(a?.blocked?.(gate,world),false)});
test('container inspection persists search state without creating repeatable loot',()=>{const world={objects:{}},box={id:'chest',scene:'tavern',kind:'container'};a?.perform?.(box,world,{x:13,y:10},()=>false);assert.equal(world.objects['tavern:chest']?.looted,true);const saved=JSON.parse(JSON.stringify(world));a?.perform?.(box,saved,{x:13,y:10},()=>false);assert.equal(saved.objects['tavern:chest']?.looted,true);assert.equal(saved.objects['tavern:chest']?.open,false)});
test('a seat keeps the saved stand position and clears occupation when standing',()=>{const world={objects:{}},seat={id:'bench',scene:'tavern',kind:'seat',cell:[5,9]};a?.perform?.(seat,world,{x:6,y:9},()=>false);assert.equal(world.seat?.stand.x,6);assert.equal(world.seat?.cell.x,5);assert.equal(world.objects['tavern:bench']?.occupied,true);a?.stand?.(world);assert.equal(world.seat,undefined);assert.equal(world.objects['tavern:bench']?.occupied,false)});
test('invalid persisted object flags are rejected instead of corrupting collision state',()=>{assert.throws(()=>a?.validate?.({objects:{'tavern:gate':{open:'yes'}}}),/Invalid object/);assert.throws(()=>a?.validate?.({objects:{},seat:{scene:'missing',object:'bench'}}),/Invalid seat/)});

test('chair approach avoids an adjacent table footprint',()=>{s.window.AshenInteriors={scenes:{fixture:{walls:[],props:[{id:'chair',sprite:'chair',footprint:[2,11,1,1]},{id:'table',sprite:'table',footprint:[3,10,3,2]}]}}};assert.deepEqual(Array.from(a.forScene('fixture').find(o=>o.id==='chair').anchor),[1,11])});

test('Lantern Road defines three persistent non-blocking wilderness lights',()=>{
 const lanterns=a.forScene('wild');
 assert.deepEqual(Array.from(lanterns,o=>[o.id,Array.from(o.cell),Array.from(o.anchor)]),[
  ['lantern-west',[10,17],[10,18]],
  ['lantern-bridge',[22,15],[22,16]],
  ['lantern-east',[30,21],[30,22]]
 ]);
 const world={objects:{}},lantern=lanterns[0];
 assert.equal(a.blocked(lantern,world),false);
 const first=a.perform(lantern,world,{x:10,y:18});
 assert.equal(first.lit,true);assert.equal(first.text,'You relight the western waylantern. Its amber flame steadies against the Gloamwood mist.');
 assert.equal(world.objects['wild:lantern-west'].active,true);
 const repeated=a.perform(lantern,world,{x:10,y:18});
 assert.equal(repeated.lit,false);assert.equal(repeated.text,'The western waylantern burns with a steady amber flame.');
 const saved=JSON.parse(JSON.stringify(world));
 assert.doesNotThrow(()=>a.validate(saved));
 assert.equal(saved.objects['wild:lantern-west'].active,true);
 const props=a.props('wild',saved);
 assert.equal(props.length,3);
 assert.equal(props[0].frame,'lantern');
 assert.equal(props[0].active,true);
});
