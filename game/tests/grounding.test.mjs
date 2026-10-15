import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const path=new URL('../grounding.js',import.meta.url);
const sandbox={window:{}};vm.runInNewContext(existsSync(path)?readFileSync(path,'utf8'):'',sandbox);
const api=sandbox.window.AshenGrounding;
test('rendered feet follow the navigation cell center after camera scrolling',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(api?.point?.(4,7,24,48)??null)),{x:84,y:132});
});
test('seated and counter actors sort by their actual raised foot placement',()=>{
 assert.equal(api?.depth?.({y:4,entity:{behindBar:true}}),5.875);
 assert.ok(Math.abs((api?.depth?.({y:7,entity:{seated:true}})??0)-8.25)<.00001);
 assert.equal(api?.depth?.({type:'interiorProp',y:99,prop:{depth:6}}),6);
});

test('a seated player sorts in front of the bench at their visible boot position',()=>assert.equal(api.depth({y:9,seated:true}),10.25));
