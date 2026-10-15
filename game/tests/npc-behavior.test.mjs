import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const path=new URL('../npc-behavior.js',import.meta.url),s={window:{}};vm.runInNewContext(existsSync(path)?readFileSync(path,'utf8'):'',s);const a=s.window.AshenNPCs;
test('pathfinding goes around furniture and never steps through an occupied cell',()=>{const path=a?.findPath?.({x:0,y:1},{x:3,y:1},(x,y)=>x>=0&&y>=0&&x<4&&y<3&&!(x===1&&y===1)&&!(x===2&&y===1),4,3);assert.ok(path?.length>3);assert.ok(path.every(p=>!(p.x===1&&p.y===1)&&!(p.x===2&&p.y===1)));assert.equal(path.at(-1).x,3)});
test('unreachable destinations return no route instead of walking through walls',()=>{assert.deepEqual(Array.from(a?.findPath?.({x:0,y:0},{x:2,y:0},()=>false,3,1)??['missing']),[])});

test('travelers wait outside a crowded entrance and reserve movement cells',()=>{
 a.clear();const map={w:18,h:14},clock={minutes:540},floor=(x,y)=>x>0&&x<17&&y>=3&&y<12||x===8&&y===12;
 a.update('tavern',250,{clock,player:{x:8,y:11},map,walkable:floor});assert.equal(a.entities('tavern').length,0);
 a.update('tavern',250,{clock,player:{x:11,y:10},map,walkable:floor});const e=a.entities('tavern')[0];assert.ok(e);assert.equal(e.x,8);assert.equal(e.y,11);assert.equal(a.blocks('tavern',8,12),true);
 for(let i=0;i<30;i++)a.update('tavern',250,{clock,player:{x:9,y:10},map,walkable:floor});assert.ok(a.entities('tavern').every(e=>e.x!==9||e.y!==10));
});
