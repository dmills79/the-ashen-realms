import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const path=new URL('../scene-runtime.js',import.meta.url),s={window:{}};vm.runInNewContext(existsSync(path)?readFileSync(path,'utf8'):'',s);const a=s.window.AshenScenes;
test('asset cache reuses live textures and disposes least recently used entries at its limit',()=>{const disposed=[],pool=a?.assetPool?.(id=>({id}),2,(id)=>disposed.push(id));const first=pool?.get('a');pool?.get('b');assert.equal(pool?.get('a'),first);pool?.get('c');assert.deepEqual(disposed,['b']);for(let i=0;i<60;i++)pool.get('scene-'+i);assert.equal(pool.size(),2)});
test('scene layer caches remain bounded through repeated transitions without mutating map tiles',()=>{const maps={};for(let i=0;i<10;i++)maps['scene'+i]={id:'scene'+i,w:4,h:3,name:'Room',tiles:[['floor']]};const before=JSON.stringify(maps);a?.install?.(maps);for(let i=0;i<60;i++){const id='scene'+i%10;a?.enter?.(id);a?.cached?.(id,()=>[{id}])}assert.equal(a?.metrics?.().cachedScenes,4);assert.equal(JSON.stringify(maps),before);assert.equal(a?.get?.('scene0')?.bounds.width,96)});
test('viewport culling includes tall props whose base is just below the screen',()=>{assert.equal(a?.visible?.([10,280,30,80],{x:0,y:0,w:480,h:288}),true);assert.equal(a?.visible?.([800,300,30,80],{x:0,y:0,w:480,h:288}),false)});

test('invalid cache budgets fail before any resource is allocated',()=>assert.throws(()=>a.assetPool(()=>({}),0),/limit/));
