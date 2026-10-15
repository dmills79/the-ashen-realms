import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const path=new URL('../animation.js',import.meta.url),sandbox={window:{}};vm.runInNewContext(existsSync(path)?readFileSync(path,'utf8'):'',sandbox);const a=sandbox.window.AshenAnimation;
test('motion is halfway after 80ms without changing the gameplay destination',()=>{
 a?.clear?.();a?.snap?.('hero',0,0,'down',0);a?.move?.('hero',1,0,'right',0);const p=a?.sample?.('hero',1,0,'right',80);assert.equal(p?.x,.5);assert.equal(p?.state,'walk');assert.equal(p?.direction,'right');assert.equal(a?.sample?.('hero',1,0,'right',161)?.state,'idle');
});
test('chained turns remain continuous and teleports do not glide through walls',()=>{
 a?.clear?.();a?.snap?.('hero',0,0,'down',0);a?.move?.('hero',1,0,'right',0);a?.move?.('hero',1,1,'down',80);const p=a?.sample?.('hero',1,1,'down',80);assert.equal(p?.x,.5);assert.equal(p?.y,0);assert.equal(a?.sample?.('hero',8,10,'up',90)?.x,8);assert.equal(a?.sample?.('hero',8,10,'up',90)?.state,'idle');
});
test('combat impact and recovery share one timeline with no premature impact',()=>{
 assert.equal(a?.phase?.(479,'fire')?.impact,false);assert.equal(a?.phase?.(480,'fire')?.impact,true);assert.equal(a?.phase?.(480,'arrow')?.projectile,1);assert.equal(a?.timing?.('slash')?.impact,480);assert.equal(a?.timing?.('slash')?.finish,900);
});
test('transient reactions return to idle, while defeat remains until reset',()=>{
 a?.snap?.('npc',2,3,'left',0);a?.transition?.('npc','hit',0,380);assert.equal(a?.sample?.('npc',2,3,'left',100)?.state,'hit');assert.equal(a?.sample?.('npc',2,3,'left',400)?.state,'idle');a?.transition?.('npc','death',400);assert.equal(a?.sample?.('npc',2,3,'left',5000)?.state,'death');
});
