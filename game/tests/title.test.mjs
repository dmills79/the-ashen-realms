import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source=readFileSync(new URL('../title-ui.js',import.meta.url),'utf8');
function setup(stored=null,restricted=false){
 const storage=new Map([['ashen-realms-v1.2-save','existing adventure'],['ashen-realms-presentation-v1',stored]]),classes=new Set();
 const sandbox={window:{},document:{documentElement:{classList:{toggle:(key,value)=>value?classes.add(key):classes.delete(key)}}},localStorage:{getItem:key=>{if(restricted)throw Error('Blocked');return storage.get(key)},setItem:(key,value)=>{if(restricted)throw Error('Blocked');storage.set(key,value)}}};
 vm.runInNewContext(source,sandbox);return {api:sandbox.window.AshenTitle,storage,classes};
}
test('corrupt or unsupported presentation preferences use safe defaults',()=>{
 for(const stored of ['{',JSON.stringify({sound:'off',zoom:999,motionPaused:'yes'}),'null']){
  const {api}=setup(stored);assert.equal(api.preferences().sound,true);assert.equal(api.preferences().zoom,.75);assert.equal(api.preferences().motionPaused,false);
 }
});
test('presentation preferences survive reload without modifying adventure saves',()=>{
 const {api,storage,classes}=setup();api.save({sound:false,zoom:1.1,motionPaused:true});
 assert.equal(storage.get('ashen-realms-v1.2-save'),'existing adventure');assert.ok(classes.has('title-motion-paused'));
 const restored=setup(storage.get('ashen-realms-presentation-v1')).api.preferences();assert.equal(restored.sound,false);assert.equal(restored.zoom,1.1);assert.equal(restored.motionPaused,true);
 const copy=api.preferences();copy.sound=true;assert.equal(api.preferences().sound,false);
});
test('blocked storage still applies session preferences',()=>{
 const {api,classes}=setup(null,true);assert.doesNotThrow(()=>api.save({motionPaused:true,sound:false}));assert.ok(classes.has('title-motion-paused'));assert.equal(api.preferences().sound,false);
});
