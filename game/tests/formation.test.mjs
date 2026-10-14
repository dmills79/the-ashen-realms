import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const sandbox={window:{}};vm.createContext(sandbox);
new vm.Script(readFileSync(new URL('../formation.js',import.meta.url),'utf8')).runInContext(sandbox);
const f=sandbox.window.AshenFormation;
const hero=(id,row,hp=20,extra={})=>({id,row,hp,role:'Fighter',gear:{},...extra});

test('melee target weights favor each defender four to one, with no initiative mutation',()=>{
 const front=hero('tank','front'),rear=hero('mage','back'),party=[rear,front];
 const pool=f.targetPool({original:'orc'},party);
 assert.equal(pool.filter(h=>h===front).length,4);assert.equal(pool.filter(h=>h===rear).length,1);
 assert.deepEqual(party,[rear,front]);assert.equal(rear.row,'back');
});
test('magic, flying attacks and an absent frontline ignore melee target weighting',()=>{
 const party=[hero('tank','front'),hero('mage','back')];
 for(const original of ['shaman','wisp','bat'])assert.equal(f.targetPool({original},party).length,2);
 assert.equal(f.targetPool({original:'bandit',attackRange:'ranged'},party).length,2);
 party[0].hp=0;assert.equal(f.targetPool({original:'orc'},party).length,1);
 party[0].hp=20;party[0].hidden=true;assert.equal(f.targetPool({original:'orc'},party).length,1);
});
test('rear cover rounds upward, only applies to melee, and collapses when defenders fall or hide',()=>{
 const front=hero('tank','front'),rear=hero('mage','back'),party=[front,rear];
 assert.equal(f.coverDamage(8,rear,party),6);assert.equal(f.coverDamage(5,rear,party),4);
 for(const range of ['magic','ranged','flying','area'])assert.equal(f.coverDamage(8,rear,party,range),8);
 assert.equal(f.coverDamage(8,front,party),8);
 front.hidden=true;assert.equal(f.coverDamage(8,rear,party),8);
 delete front.hidden;front.hp=0;assert.equal(f.coverDamage(8,rear,party),8);
});
test('rear close-range penalty excludes bows, spells, solo and all-rear compositions',()=>{
 const front=hero('tank','front'),rear=hero('mage','back'),party=[front,rear];
 assert.equal(f.attackPenalty(rear,party),2);assert.equal(f.attackPenalty(rear,party,true),0);
 rear.gear.weapon='oakbow';assert.equal(f.attackPenalty(rear,party),0);
 rear.gear.weapon=null;assert.equal(f.attackPenalty(rear,[rear]),0);
 front.row='back';assert.equal(f.attackPenalty(rear,party),0);assert.equal(f.coverDamage(8,rear,party),8);
});
test('legacy defaults use class, never character names, and saved choices take precedence',()=>{
 assert.equal(f.row({role:'Wizard',name:'Arden'}),'back');assert.equal(f.row({role:'Fighter',name:'Sister Elowen'}),'front');
 assert.equal(f.row({role:'Wizard',row:'front'}),'front');assert.equal(f.row({role:'Rogue',row:'back'}),'back');
});
test('travel lighting crossfades continuously at every saved journey boundary',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(f.lighting(0))),{from:'day',to:'day',blend:0});
 for(const steps of [240,280,320,360,440,480]){
  const a=f.lighting(steps-1),b=f.lighting(steps);
  const weights=l=>({[l.from]:1-l.blend,[l.to]:l.from===l.to?1:l.blend});
  const wa=weights(a),wb=weights(b);
  for(const phase of ['day','evening','night'])assert.ok(Math.abs((wa[phase]||0)-(wb[phase]||0))<=.026);
 }
});
