import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const gameSource=readFileSync(new URL('../game.js',import.meta.url),'utf8');
const SAVE_KEY='ashen-realms-v1.2-save';

// No browser, real storage, audio, network, or wall-clock timers are used.
function createHarness(role='Wizard',level=5){
  const nodes=new Map(),storage=new Map(),pending=new Map();let clock=1000,nextTimer=0;
  const noop=()=>{};
  const context2d=new Proxy({measureText:s=>({width:String(s).length*6}),createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  const element=()=>{
    const classes=new Set(['hidden']);
    return {innerHTML:'',textContent:'',style:{},value:'',width:300,height:155,
      classList:{add:(...a)=>a.forEach(x=>classes.add(x)),remove:(...a)=>a.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:x=>classes.has(x)?(classes.delete(x),false):(classes.add(x),true)},
      getContext:()=>context2d,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:noop,setAttribute:noop,click:noop};
  };
  const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
  const math=Object.create(Math);
  const sandbox={document:{getElementById:node,querySelector:()=>null,querySelectorAll:()=>[],documentElement:element(),activeElement:null},
    window:{addEventListener:noop,__ASHEN_TEST__:true},Image:class{complete=false;naturalWidth=0},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
    requestAnimationFrame:noop,setTimeout:(fn,ms)=>{const id=++nextTimer;pending.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>pending.delete(id),
    performance:{now:()=>clock},Math:math};
  const end=gameSource.lastIndexOf('})();');assert.ok(end>=0);
  const inspect='window.__engine={getGame:()=>G,getCombat:()=>combat,setCombat:v=>{combat=v;mode="combat";combatAnimating=false},hitAttack,aoeDamage,processTurn,startRound,nextTurn,enemyAct,applyItem,pickMember,chooseModal:a=>modalCallback(a),normalizeSave,isDefending,abilities:ABILITIES};';
  vm.createContext(sandbox);new vm.Script(gameSource.slice(0,end)+inspect+gameSource.slice(end),{filename:'game.js'}).runInContext(sandbox);
  const api=sandbox.window.AshenRealms,engine=sandbox.window.__engine;
  api.newGame('Audit','Human',role);api.closeModal();
  const hero=engine.getGame().party[0];hero.stats=[10,10,10,10,10,10];hero.level=level;hero.hp=hero.maxHp=100;hero.mp=hero.maxMp=100;
  function random(values=[],fallback=0){let i=0;math.random=()=>i<values.length?values[i++]:fallback}
  function enemy(overrides={}){return {id:'e0',name:'Test enemy',type:'orc',original:'orc',hp:100,maxHp:100,ac:1,atk:2,dmg:6,dex:0,xp:0,gold:0,...overrides}}
  function battle(foes=[enemy()],queue=null,round=1){const combat={enemies:foes,queue:queue||[{side:'ally',id:hero.id},{side:'enemy',id:foes[0].id}],turn:0,round,log:[],isBoss:false};engine.setCombat(combat);return combat}
  function advance(ms){const endTime=clock+ms;let count=0;for(;;){const entry=[...pending].filter(([,t])=>t.at<=endTime).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!entry)break;if(++count>10000)throw Error('Timer loop');pending.delete(entry[0]);clock=entry[1].at;entry[1].fn()}clock=endTime}
  function ally(role='Cleric'){const h=api.createHero('Companion','Human',role);h.id='a'+engine.getGame().party.length;h.stats=[10,10,10,10,10,10];h.hp=h.maxHp=100;h.mp=h.maxMp=100;engine.getGame().party.push(h);return h}
  function ability(id){return engine.abilities[hero.role].find(a=>a.id===id)}
  return {api,engine,hero,node,storage,random,enemy,battle,advance,ally,ability};
}

test('natural 1 misses and natural 20 doubles only damage dice',()=>{
  const h=createHarness('Fighter');h.hero.stats[0]=14;h.hero.gear.weapon='iron';h.hero.talents.might=1;
  const foe=h.enemy({ac:999});h.battle([foe]);h.random([0]);assert.equal(h.engine.hitAttack(h.hero,foe),0);assert.equal(foe.hp,100);
  h.random([.999]);assert.equal(h.engine.hitAttack(h.hero,foe,{bonusDmg:3}),10);
  foe.hp=100;h.random([.999]);assert.equal(h.engine.hitAttack(h.hero,foe,{power:true,bonusDmg:3}),12);
});

test('advantage takes the higher d20, including a natural 20',()=>{
  const h=createHarness('Rogue'),foe=h.enemy({ac:999});h.battle([foe]);h.random([0,.999]);
  assert.equal(h.engine.hitAttack(h.hero,foe,{advantage:true}),2);
  assert.match(h.engine.getCombat().log[0].s,/CRITICAL/);
});

test('weapon training and ordinary gear do not boost spells',()=>{
  const h=createHarness(),foe=h.enemy();h.battle([foe]);h.hero.gear.weapon='iron';h.hero.talents.might=3;h.hero.talents.focus=2;
  h.random([.5]);assert.equal(h.engine.hitAttack(h.hero,foe,{spell:true,power:true}),4);
  h.random([.5]);assert.equal(h.engine.hitAttack(h.hero,foe),6);
  h.hero.gear.weapon='runestaff';h.random([.5]);assert.equal(h.engine.hitAttack(h.hero,foe,{spell:true,power:true}),7);
});

test('Runestaff boosts area spell damage and physical gear boosts weapon areas',()=>{
  const h=createHarness(),foe=h.enemy();h.battle([foe]);h.hero.gear.weapon='runestaff';h.hero.talents.focus=2;h.random();
  h.engine.aoeDamage(h.hero,[foe],h.ability('fireball'));assert.equal(foe.hp,93);
  const f=createHarness('Fighter'),target=f.enemy();f.battle([target]);f.hero.gear.weapon='iron';f.hero.talents.might=1;f.random();
  f.engine.aoeDamage(f.hero,[target],f.ability('sweep'));assert.equal(target.hp,95);
});

test('area saves halve damage upward and cannot produce critical hits',()=>{
  const h=createHarness(),foe=h.enemy();h.battle([foe]);h.hero.gear.weapon='runestaff';h.random([.999]);
  h.engine.aoeDamage(h.hero,[foe],h.ability('fireball'));assert.equal(foe.hp,97);assert.doesNotMatch(h.engine.getCombat().log[0].s,/CRITICAL/);
});

for(const [label,rolls,expectedAttack] of [['miss',[0],5],['successful chill',[.5,0,0,.25],4],['failed chill',[.5,0,0,.75],5]]){
  test('Frost Lance: '+label,()=>{
    const h=createHarness(),foe=h.enemy({atk:5});h.battle([foe]);h.random(rolls);
    h.api.performAbility(h.hero,h.ability('frost'),[foe]);h.advance(480);assert.equal(foe.atk,expectedAttack);
    if(label==='miss')assert.equal(foe.hp,100);
    assert.equal(h.hero.mp,95);
  });
}

test('Frost Lance does not chill a defeated target',()=>{
  const h=createHarness(),foe=h.enemy({hp:1,atk:5});h.battle([foe]);h.random([.5]);
  h.api.performAbility(h.hero,h.ability('frost'),[foe]);h.advance(480);assert.equal(foe.hp,0);assert.equal(foe.atk,5);
});

test('poison ticks once per turn and expires after two turns',()=>{
  const h=createHarness(),combat=h.battle();h.hero.poison=2;h.engine.processTurn();assert.equal(h.hero.hp,98);assert.equal(h.hero.poison,1);
  h.engine.processTurn();assert.equal(h.hero.hp,98);
  combat.round=2;h.engine.processTurn();assert.equal(h.hero.hp,96);assert.equal(h.hero.poison,0);
  combat.round=3;h.engine.processTurn();assert.equal(h.hero.hp,96);
});

test('poison can knock out an actor and skips their action',()=>{
  const h=createHarness(),other=h.ally(),foe=h.enemy();const c=h.battle([foe],[{side:'ally',id:h.hero.id},{side:'ally',id:other.id},{side:'enemy',id:foe.id}]);
  h.hero.hp=1;h.hero.poison=2;h.engine.processTurn();assert.equal(h.hero.hp,0);assert.equal(c.turn,1);assert.equal(h.api.getMode(),'combat');
});

test('antidote clears poison immediately',()=>{
  const h=createHarness();h.hero.poison=2;h.hero.hp=90;
  assert.equal(h.engine.applyItem(h.hero,'salve'),true);assert.equal(h.hero.poison,0);assert.equal(h.hero.hp,94);
});

test('guard halves damage until the next own turn and grants one MP',()=>{
  const h=createHarness('Fighter'),foe=h.enemy({dmg:1});const c=h.battle([foe]);h.hero.mp=50;h.random([.5]);
  h.api.battleAction('guard');assert.equal(c.turn,1);assert.equal(h.hero.mp,51);assert.equal(h.engine.isDefending(h.hero),true);
  h.random([.5]);assert.equal(h.engine.hitAttack(foe,h.hero),2);
  c.round=2;c.turn=0;h.engine.processTurn();assert.equal(h.engine.isDefending(h.hero),false);
});

for(const [role,id] of [['Fighter','rally'],['Rogue','vanish']]){
  test(id+' protects allies across their turns and expires after the following round',()=>{
    const h=createHarness(role),other=h.ally(),foe=h.enemy();const c=h.battle([foe],[{side:'ally',id:h.hero.id},{side:'ally',id:other.id},{side:'enemy',id:foe.id}]);h.hero.hp=80;other.hp=80;
    h.api.performAbility(h.hero,h.ability(id),[h.hero,other]);h.advance(900);assert.equal(c.turn,1);
    assert.equal(h.engine.isDefending(other),true);assert.equal(h.hero.protectedThroughRound,2);
    assert.equal(h.hero.hp,id==='rally'?86:80);
    c.round=2;assert.equal(h.engine.isDefending(other),true);
    h.engine.startRound();assert.equal(c.round,3);assert.equal(h.engine.isDefending(other),false);assert.equal(h.hero.protectedThroughRound,undefined);
  });
}

test('party protection halves enemy area damage',()=>{
  const h=createHarness(),foe=h.enemy({original:'boss'});h.battle([foe],[{side:'enemy',id:foe.id}],4);h.hero.protectedThroughRound=5;h.random();
  h.engine.enemyAct();h.advance(480);assert.equal(h.hero.hp,98);
});

test('ability resolution consumes MP once and advances exactly one turn',()=>{
  const h=createHarness(),foe=h.enemy(),c=h.battle([foe]);h.random([.5]);
  h.api.battleAction('ability:bolt');h.api.battleAction('target:e0');h.api.battleAction('target:e0');
  assert.equal(h.hero.mp,97);assert.equal(c.turn,0);h.advance(480);assert.equal(c.turn,0);assert.equal(foe.hp,97);
  h.advance(420);assert.equal(c.turn,1);assert.equal(h.hero.mp,97);
});

test('unaffordable or wrong-turn abilities do not spend MP',()=>{
  const h=createHarness(),foe=h.enemy(),c=h.battle([foe]);h.hero.mp=1;
  h.api.performAbility(h.hero,h.ability('bolt'),[foe]);assert.equal(h.hero.mp,1);
  c.turn=1;h.hero.mp=100;h.api.performAbility(h.hero,h.ability('bolt'),[foe]);assert.equal(h.hero.mp,100);
});

test('combat menu exposes all stocked consumables and excludes gear and quests',()=>{
  const h=createHarness();h.engine.getGame().bag={potion:1,ether:1,salve:1,ration:1,elixir:1,iron:1,ember:1};h.battle();h.api.battleAction('item');
  const html=h.node('battlePanel').innerHTML;
  for(const id of ['potion','ether','salve','ration','elixir'])assert.ok(html.includes('item:'+id));
  for(const id of ['iron','ember'])assert.ok(!html.includes('item:'+id));
});

test('greater draught heals one ally, consumes one item and uses one turn',()=>{
  const h=createHarness(),c=h.battle();h.hero.hp=10;h.engine.getGame().bag.elixir=1;
  h.api.battleAction('item:elixir');h.api.battleAction('ally:'+h.hero.id);
  assert.equal(h.hero.hp,45);assert.equal(h.engine.getGame().bag.elixir,undefined);assert.equal(c.turn,1);
});

test('rations heal the conscious party directly and consume one stack unit',()=>{
  const h=createHarness(),other=h.ally(),unconscious=h.ally('Rogue'),c=h.battle();h.hero.hp=10;other.hp=98;unconscious.hp=0;h.engine.getGame().bag.ration=2;
  h.api.battleAction('item:ration');assert.equal(h.hero.hp,17);assert.equal(other.hp,100);assert.equal(unconscious.hp,0);
  assert.equal(h.engine.getGame().bag.ration,1);assert.equal(c.turn,1);
});

test('useless or invalid combat items consume neither stock nor turns',()=>{
  const h=createHarness(),c=h.battle();h.engine.getGame().bag={potion:1,ration:1,iron:1};
  h.api.battleAction('item:potion');h.api.battleAction('ally:'+h.hero.id);assert.equal(c.turn,0);assert.equal(h.engine.getGame().bag.potion,1);
  h.api.battleAction('item:ration');assert.equal(c.turn,0);assert.equal(h.engine.getGame().bag.ration,1);
  h.api.battleAction('item:iron');assert.equal(c.turn,0);assert.equal(h.hero.gear.weapon,null);
});

test('equipping and swapping preserves total item counts and persists equipment',()=>{
  const h=createHarness(),g=h.engine.getGame();g.bag.iron=1;g.bag.runestaff=1;
  h.engine.pickMember('iron',false);h.engine.chooseModal('member:0');assert.equal(h.hero.gear.weapon,'iron');assert.equal(g.bag.iron,undefined);
  h.engine.pickMember('runestaff',false);h.engine.chooseModal('member:0');assert.equal(h.hero.gear.weapon,'runestaff');assert.equal(g.bag.iron,1);assert.equal(g.bag.runestaff,undefined);
  h.engine.pickMember('iron',false);h.engine.chooseModal('member:0');assert.equal(g.bag.runestaff,1);
  assert.equal(JSON.parse(h.storage.get(SAVE_KEY)).party[0].gear.weapon,'iron');
});

for(const version of [2,3,4,5]){
  test('loads compatible version '+version+' without losing progress',()=>{
    const h=createHarness(),saved=JSON.parse(h.storage.get(SAVE_KEY));saved.version=version;saved.gold=123;saved.flags.boss=true;saved.bag.runestaff=2;saved.party[0].gear.weapon='iron';
    saved.party[0].level=3;saved.party[0].xp=7;saved.party[0].talents={might:1};saved.party[0].poison=2;saved.party[0].defending=true;saved.party[0].protectedThroughRound=99;
    delete saved.party[0].talentPoints;delete saved.party[0].xpTotal;delete saved.jobs;
    h.storage.set(SAVE_KEY,JSON.stringify(saved));h.api.load();const restored=h.api.getState();
    assert.equal(restored.version,5);assert.equal(restored.gold,123);assert.equal(restored.flags.boss,true);assert.equal(restored.bag.runestaff,2);
    assert.equal(restored.party[0].gear.weapon,'iron');assert.equal(restored.party[0].xpTotal,90);assert.equal(restored.party[0].talentPoints,1);
    assert.equal(restored.party[0].poison,2);assert.equal(restored.party[0].defending,false);assert.equal(restored.party[0].protectedThroughRound,undefined);
    assert.equal(restored.jobs.goblin.state,'none');
  });
}

const invalidSaves=[
  ['unknown class',s=>s.party[0].role='Thief'],['invalid stats',s=>s.party[0].stats[0]=null],
  ['excess HP',s=>s.party[0].hp=s.party[0].maxHp+1],['wrong gear slot',s=>s.party[0].gear.weapon='chain'],
  ['unknown item',s=>s.bag.missing=1],['negative inventory',s=>s.bag.potion=-1],
  ['fractional quantity',s=>s.bag.potion=1.5],['bad currency',s=>s.gold='100'],
  ['duplicate IDs',s=>s.party.push({...s.party[0]})],['bad job count',s=>s.jobs.goblin.count=-1],
  ['invalid location',s=>s.location='missing'],['out of bounds dungeon',s=>{s.location='crypt';s.x=999}],
  ['invalid ending',s=>s.flags.ending='missing'],['bad direction',s=>s.dir='north'],
  ['invalid log',s=>s.log=[{}]],['empty party',s=>s.party=[]]
];
for(const [label,mutate] of invalidSaves){
  test('rejects '+label+' without altering the current game or stored save',()=>{
    const h=createHarness(),before=JSON.stringify(h.api.getState()),saved=JSON.parse(h.storage.get(SAVE_KEY));mutate(saved);
    const invalid=JSON.stringify(saved);h.storage.set(SAVE_KEY,invalid);h.api.load();
    assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(h.storage.get(SAVE_KEY),invalid);
  });
}

test('old town coordinates relocate to the safe starting square',()=>{
  const h=createHarness(),saved=JSON.parse(h.storage.get(SAVE_KEY));saved.x=999;saved.y=999;h.storage.set(SAVE_KEY,JSON.stringify(saved));h.api.load();
  assert.equal(h.api.getState().x,15);assert.equal(h.api.getState().y,11);
});

test('loading cancels stale battle callbacks before accepting another encounter',()=>{
  const h=createHarness(),foe=h.enemy();h.battle([foe]);h.random([.5]);h.api.performAbility(h.hero,h.ability('bolt'),[foe]);
  h.api.load();const before=JSON.stringify(h.api.getState());h.advance(2000);
  assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(foe.hp,100);assert.equal(h.api.getMode(),'explore');
  h.api.beginCombat(['orc']);assert.equal(h.api.getMode(),'combat');
});

test('flee clears protection and does not allow it into the next battle',()=>{
  const h=createHarness();h.battle();h.hero.defending=true;h.hero.protectedThroughRound=2;h.random();h.api.battleAction('flee');
  assert.equal(h.api.getMode(),'explore');assert.equal(h.hero.defending,false);assert.equal(h.hero.protectedThroughRound,undefined);
  h.api.beginCombat(['orc']);assert.equal(h.engine.isDefending(h.hero),false);
});

test('manual saving is blocked during combat',()=>{
  const h=createHarness(),saved=h.storage.get(SAVE_KEY);h.battle();h.engine.getGame().gold=999;h.api.save();assert.equal(h.storage.get(SAVE_KEY),saved);
});


test('Frost Lance does not claim to weaken an enemy already at minimum attack',()=>{
  const h=createHarness(),foe=h.enemy({atk:1});h.battle([foe]);h.random([.5]);
  h.api.performAbility(h.hero,h.ability('frost'),[foe]);h.advance(480);assert.equal(foe.atk,1);
  assert.ok(!h.engine.getCombat().log.some(entry=>entry.s.includes('attack reduced')));
});
