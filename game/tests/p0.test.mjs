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
  const inspect='window.__engine={getGame:()=>G,getCombat:()=>combat,setCombat:v=>{combat=v;mode="combat";combatAnimating=false},hitAttack,aoeDamage,processTurn,startRound,nextTurn,enemyAct,applyItem,pickMember,castFieldSpell,trapCheck,knownAbilities,illustratedActorState,chooseModal:a=>modalCallback(a),normalizeSave,isDefending,battleActionInfo,abilities:ABILITIES,creationStats,ancestries:ANCESTRIES,classes:CLASSES,training:CLASS_TRAINING};';
  vm.createContext(sandbox);new vm.Script(readFileSync(new URL('../formation.js',import.meta.url),'utf8')).runInContext(sandbox);new vm.Script(readFileSync(new URL('../character-config.js',import.meta.url),'utf8')).runInContext(sandbox);new vm.Script(gameSource.slice(0,end)+inspect+gameSource.slice(end),{filename:'game.js'}).runInContext(sandbox);
  const api=sandbox.window.AshenRealms,engine=sandbox.window.__engine;
  api.newGame('Audit','Human',role);api.closeModal();
  const hero=engine.getGame().party[0];hero.stats=[10,10,10,10,10,10];hero.level=level;hero.hp=hero.maxHp=100;hero.mp=hero.maxMp=100;
  function random(values=[],fallback=0){let i=0;math.random=()=>i<values.length?values[i++]:fallback}
  function enemy(overrides={}){return {id:'e0',name:'Test enemy',type:'orc',original:'orc',hp:100,maxHp:100,ac:1,atk:2,dmg:6,dex:0,xp:0,gold:0,...overrides}}
  function battle(foes=[enemy()],queue=null,round=1){const combat={enemies:foes,queue:queue||[{side:'ally',id:hero.id},{side:'enemy',id:foes[0].id}],turn:0,round,log:[],isBoss:false};engine.setCombat(combat);return combat}
  function advance(ms){const endTime=clock+ms;let count=0;for(;;){const entry=[...pending].filter(([,t])=>t.at<=endTime).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!entry)break;if(++count>10000)throw Error('Timer loop');pending.delete(entry[0]);clock=entry[1].at;entry[1].fn()}clock=endTime}
  function ally(role='Cleric'){const h=api.createHero('Companion','Human',role);h.id='a'+engine.getGame().party.length;h.stats=[10,10,10,10,10,10];h.hp=h.maxHp=100;h.mp=h.maxMp=100;engine.getGame().party.push(h);return h}
  function ability(id){return engine.abilities[hero.role].find(a=>a.id===id)}
  return {api,engine,hero,node,storage,random,enemy,battle,advance,ally,ability,window:sandbox.window};
}

test('action inspector derives weapon damage and rear accuracy from actual gear and formation',()=>{
 const h=createHarness('Fighter');h.hero.stats[0]=14;h.hero.gear.weapon='iron';h.hero.talents.might=1;h.hero.row='back';h.ally('Fighter');h.battle();
 const info=h.engine.battleActionInfo('attack',h.hero),stats=Object.fromEntries(info.stats);
 assert.equal(info.title,'Ironblade');assert.equal(stats.Damage,'1d6 + 5');assert.equal(stats.Accuracy,'d20 + 3 vs AC');assert.match(stats.Formation,/−2/);
 h.hero.gear.weapon='oakbow';assert.equal(h.engine.battleActionInfo('attack',h.hero).icon,'bow');
 h.hero.gear.weapon=null;assert.equal(h.engine.battleActionInfo('attack',h.hero).icon,'gauntlet');
});
test('spell, area and healing inspections mirror the engine without spending MP or modifying state',()=>{
 const h=createHarness('Wizard');h.hero.stats[3]=16;h.hero.gear.weapon='runestaff';h.hero.talents.focus=2;h.hero.row='back';h.ally('Fighter');h.battle();const before=JSON.stringify(h.api.getState());
 const bolt=Object.fromEntries(h.engine.battleActionInfo('ability:bolt',h.hero).stats),area=Object.fromEntries(h.engine.battleActionInfo('ability:fireball',h.hero).stats);
 assert.equal(bolt.Damage,'2d6 + 9');assert.equal(bolt.Accuracy,'d20 + 6 vs AC');assert.equal(area.Damage,'2d6 + 8');assert.equal(area.Save,'DEX vs DC 16');assert.equal(JSON.stringify(h.api.getState()),before);
 const c=createHarness('Cleric');c.hero.stats[4]=16;c.hero.talents.focus=2;c.battle();assert.equal(Object.fromEntries(c.engine.battleActionInfo('ability:mend',c.hero).stats).Healing,'2d8 + 7');
});
test('real attack engine applies rear melee penalty but exempts bows and spells',()=>{
 const h=createHarness('Wizard'),front=h.ally('Fighter'),foe=h.enemy({ac:10});h.hero.row='back';front.row='front';h.battle([foe]);
 h.random([.35,.999]);assert.equal(h.engine.hitAttack(h.hero,foe),0);
 h.hero.gear.weapon='oakbow';h.random([.35,.999]);assert.equal(h.engine.hitAttack(h.hero,foe),8);
 h.hero.gear.weapon=null;h.random([.35,.999]);assert.equal(h.engine.hitAttack(h.hero,foe,{spell:true}),6);
 front.hp=0;h.random([.35,.999]);assert.equal(h.engine.hitAttack(h.hero,foe),6);
});
test('real enemy damage applies cover after guard, with magic and fallen defenders bypassing it',()=>{
 const h=createHarness('Wizard'),front=h.ally('Fighter'),foe=h.enemy();h.hero.row='back';front.row='front';h.battle([foe]);
 h.random([.5,.999]);assert.equal(h.engine.hitAttack(foe,h.hero),6);assert.match(h.engine.getCombat().log[0].detail,/prevented 2/);
 h.hero.defending=true;h.random([.5,.999]);assert.equal(h.engine.hitAttack(foe,h.hero),3);
 h.hero.defending=false;foe.original='shaman';h.random([.5,.999]);assert.equal(h.engine.hitAttack(foe,h.hero),8);
 foe.original='orc';front.hp=0;h.random([.5,.999]);assert.equal(h.engine.hitAttack(foe,h.hero),8);
});
test('enemy turns use weighted formation targets and area attacks still hit rear heroes',()=>{
 const h=createHarness('Fighter'),rear=h.ally('Cleric'),foe=h.enemy();h.hero.row='front';rear.row='back';
 const combat=h.battle([foe],[{side:'enemy',id:foe.id},{side:'ally',id:h.hero.id}]);
 h.random([.7,.5,.999],.5);h.engine.enemyAct();h.advance(500);assert.equal(h.hero.hp,92);assert.equal(rear.hp,100);
 foe.original='shaman';combat.turn=0;combat.round=3;h.advance(400);combat.turn=0;h.random([.5],.5);h.engine.enemyAct();h.advance(500);assert.ok(rear.hp<100);
});
test('formation changes save safely outside battle and cannot alter initiative during combat',()=>{
 const h=createHarness('Fighter');assert.equal(h.api.setFormation(h.hero.id,'back'),true);
 h.api.load();assert.equal(h.api.getState().party[0].row,'back');
 const old=h.api.getState();delete old.party[0].row;const stats=old.party[0].stats.slice();
 const migrated=h.engine.normalizeSave(old);assert.equal(migrated.party[0].row,'front');assert.deepEqual(migrated.party[0].stats,stats);
 const combat=h.battle();const queue=JSON.stringify(combat.queue);assert.equal(h.api.setFormation(h.hero.id,'front'),false);assert.equal(JSON.stringify(combat.queue),queue);
});
test('initiative follows DEX regardless of party array or row placement',()=>{
 const h=createHarness('Fighter'),rear=h.ally('Wizard'),foe=h.enemy();rear.row='back';rear.stats[1]=20;h.hero.row='front';h.battle([foe]);h.random([], .5);h.engine.startRound();
 assert.equal(h.engine.getCombat().queue[0].id,rear.id);assert.equal(h.engine.getCombat().queue[0].roll,16);
});
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

test('structured attack events retain target, dice and critical outcome',()=>{
  const h=createHarness('Fighter'),foe=h.enemy();h.battle([foe]);h.random([.999]);
  const amount=h.engine.hitAttack(h.hero,foe);
  const event=h.engine.getCombat().log[0];
  assert.equal(event.type,'critical');assert.equal(event.actor,h.hero.name);assert.equal(event.target,foe.name);
  assert.equal(event.amount,amount);assert.equal(event.roll,20);assert.equal(event.round,1);
  assert.equal(event.total,20+event.attackBonus);assert.equal(event.armor,foe.ac);
  h.random([0]);h.engine.hitAttack(h.hero,foe);
  assert.equal(h.engine.getCombat().log[0].type,'miss');
});

test('area knockouts record deaths and consumables record actual healing',()=>{
  const h=createHarness(),foe=h.enemy({hp:1});h.battle([foe]);h.random();
  h.engine.aoeDamage(h.hero,[foe],h.ability('fireball'));
  assert.equal(h.engine.getCombat().log[0].type,'death');
  assert.equal(h.engine.getCombat().log[1].type,'hit');
  const item=createHarness(),c=item.battle();item.hero.hp=98;item.engine.getGame().bag.potion=1;
  item.api.battleAction('item:potion');item.api.battleAction('ally:'+item.hero.id);
  const healed=c.log.find(e=>e.type==='heal');assert.equal(healed.amount,2);assert.equal(c.turn,1);
});

test('combat event history stays bounded without entering persistent saves',()=>{
  const h=createHarness(),foe=h.enemy({hp:10000});h.battle([foe]);h.random([0]);
  for(let i=0;i<120;i++)h.engine.hitAttack(h.hero,foe);
  const c=h.engine.getCombat();assert.equal(c.log.length,100);assert.equal(c.eventSequence,120);
  assert.equal(c.log[0].id,120);assert.equal(c.log[99].id,21);
  assert.equal(Object.hasOwn(h.api.getState(),'combat'),false);
});

test('4d6 drops exactly one lowest die even when the lowest values tie',()=>{
 const h=createHarness();h.random([0,0,.999,.999]);const roll=h.api.roll4d6();
 assert.deepEqual(Array.from(roll.dice),[1,1,6,6]);assert.equal(roll.drop,0);assert.equal(roll.score,13);
 h.random();assert.equal(h.api.roll4d6().score,3);h.random([], .999);assert.equal(h.api.roll4d6().score,18);
});

test('class auto-assignment is a stable permutation, including tied scores',()=>{
 const h=createHarness(),rolls=[12,18,8,15,12,3].map(score=>({score}));
 for(const role of Object.keys(h.engine.classes)){
  const assignment=h.api.autoAssign(rolls,role),priority=h.engine.training[role].priority;
  assert.deepEqual(Array.from(assignment).sort((a,b)=>a-b),[0,1,2,3,4,5]);
  assert.deepEqual(Array.from(priority,i=>assignment[i]),[1,3,0,4,2,5]);
 }
});

for(const ancestry of ['Human','Elf','Dwarf','Halfling'])test(`creation preview preserves formulas and generated heroes for ${ancestry}`,()=>{
 const h=createHarness(),rolls=[3,18,10,15,8,12].map(score=>({score,dice:[6,6,6,6],drop:0}));
 for(const role of Object.keys(h.engine.classes)){
  const assigned=h.api.autoAssign(rolls,role),preview=h.engine.creationStats(ancestry,role,assigned,rolls);
  const expected=Array.from(assigned,(roll,i)=>rolls[roll].score+h.engine.ancestries[ancestry].stats[i]+h.engine.training[role].stats[i]);
  assert.deepEqual(Array.from(preview.stats),expected);
  assert.equal(preview.maxHp,Math.max(9,h.engine.classes[role].hp+h.api.mod(expected[2])*2));
  assert.equal(preview.maxMp,Math.max(1,h.engine.classes[role].mp+Math.max(0,h.api.mod(expected[3]))));
  const hero=h.api.createHero('Arden',ancestry,role,1,assigned,rolls);assert.deepEqual(hero.stats,preview.stats);assert.equal(hero.maxHp,preview.maxHp);assert.equal(hero.maxMp,preview.maxMp);
 }
});

test('preview updates neither consume random numbers nor alter the supplied rolls',()=>{
 const h=createHarness(),rolls=[3,6,9,12,15,18].map(score=>({score})),assigned=[0,1,2,3,4,5],before=JSON.stringify(rolls);
 h.random([.999]);for(let i=0;i<20;i++)h.engine.creationStats('Human','Wizard',assigned,rolls);
 assert.equal(h.api.roll4d6().dice[0],6);assert.equal(JSON.stringify(rolls),before);
});

test('central ancestry configuration exactly matches the tavern balance',()=>{
 const h=createHarness();const expected={Human:[0,0,0,0,0,0],Elf:[-1,2,-1,1,0,0],Dwarf:[1,-1,2,0,0,-1],Halfling:[-1,2,-1,0,0,1]};
 for(const [name,values] of Object.entries(expected))assert.deepEqual(Array.from(h.engine.ancestries[name].stats),values);
 const rolls=Array.from({length:6},()=>({score:12})),hero=h.api.createHero('Arden','Human','Fighter',1,[0,1,2,3,4,5],rolls);
 assert.deepEqual(Array.from(hero.stats),[13,12,13,12,12,12]);assert.deepEqual(Array.from(hero.ancestryModifiers),expected.Human);assert.deepEqual(Array.from(hero.classModifiers),[1,0,1,0,0,0]);assert.equal(hero.ancestryRuleSet,'tavern-v2');
});

for(const version of [2,3,4,5])test(`legacy version ${version} attributes, vitals and equipment survive rule migration twice`,()=>{
 const h=createHarness(),saved=JSON.parse(h.storage.get(SAVE_KEY)),hero=saved.party[0];saved.version=version;
 delete hero.ancestryRuleSet;delete hero.ancestryModifiers;delete hero.classModifiers;
 hero.ancestry='Human';hero.role='Fighter';hero.stats=[14,13,14,13,13,13];hero.maxHp=31;hero.hp=17;hero.maxMp=5;hero.mp=2;hero.gear={weapon:'iron',armor:'chain'};
 const expected=JSON.stringify({stats:hero.stats,hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,gear:hero.gear});
 h.storage.set(SAVE_KEY,JSON.stringify(saved));h.api.load();h.api.save();h.api.load();
 const restored=h.api.getState().party[0];assert.equal(JSON.stringify({stats:restored.stats,hp:restored.hp,maxHp:restored.maxHp,mp:restored.mp,maxMp:restored.maxMp,gear:restored.gear}),expected);
 assert.equal(restored.ancestryRuleSet,'legacy-v1');assert.deepEqual(Array.from(restored.ancestryModifiers),[1,1,1,1,1,1]);
});

test('invalid or duplicate creation assignments cannot create characters',()=>{
 const h=createHarness(),rolls=Array.from({length:6},()=>({score:12}));
 for(const assignment of [[0,0,2,3,4,5],[0,1,2,3,4,6],[0,1,2,3,4],[0,1,2,3,4,1.2]])assert.throws(()=>h.api.createHero('Invalid','Human','Fighter',1,assignment,rolls));
});

test('all 1296 four-die combinations retain the highest three dice without a tie bias',()=>{
 const h=createHarness();for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)for(let d=1;d<=6;d++){
  const values=[a,b,c,d];h.random(values.map(v=>(v-.5)/6));const rolled=h.api.roll4d6();assert.deepEqual(Array.from(rolled.dice),values);assert.equal(rolled.drop,values.indexOf(Math.min(...values)));assert.equal(rolled.score,values.reduce((sum,v)=>sum+v,0)-Math.min(...values));
 }
});

test('legacy Elf, Dwarf and Halfling bonuses remain saved facts rather than new modifiers',()=>{
 const legacy={Elf:[0,2,0,1,0,0],Dwarf:[1,0,2,0,0,0],Halfling:[0,2,0,0,0,1]};
 for(const [ancestry,mods] of Object.entries(legacy)){
  const h=createHarness(),saved=JSON.parse(h.storage.get(SAVE_KEY)),hero=saved.party[0];hero.ancestry=ancestry;delete hero.ancestryRuleSet;delete hero.ancestryModifiers;delete hero.classModifiers;
  hero.baseStats=[12,12,12,12,12,12];hero.stats=mods.map((v,i)=>12+v+h.engine.training[hero.role].stats[i]);hero.maxHp=hero.hp=37;hero.maxMp=hero.mp=21;
  const before=hero.stats.slice();h.storage.set(SAVE_KEY,JSON.stringify(saved));h.api.load();h.api.save();h.api.load();const restored=h.api.getState().party[0];
  assert.deepEqual(Array.from(restored.stats),before);assert.deepEqual(Array.from(restored.ancestryModifiers),mods);assert.equal(restored.maxHp,37);assert.equal(restored.maxMp,21);assert.equal(restored.ancestryRuleSet,'legacy-v1');
 }
});

test('a newly created Elf Rogue uses final ancestry/class stats once in real combat',()=>{
 const h=createHarness('Rogue'),rolls=Array.from({length:6},()=>({score:12})),hero=h.api.createHero('Rook','Elf','Rogue',1,[0,1,2,3,4,5],rolls);
 h.engine.getGame().party[0]=hero;const foe=h.enemy({ac:15});h.battle([foe],[{side:'ally',id:hero.id},{side:'enemy',id:foe.id}]);h.random([.5]);
 assert.equal(hero.stats[1],15);assert.equal(h.engine.hitAttack(hero,foe),3);assert.equal(foe.hp,97);assert.equal(h.engine.getCombat().log[0].attackBonus,4);
});

test('backstab requires hiding, consumes hiding on a miss, and doubles only dice on criticals',()=>{
 const h=createHarness('Rogue'),foe=h.enemy();h.battle([foe]);h.hero.stats[1]=14;h.hero.gear.weapon='iron';
 assert.equal(h.engine.hitAttack(h.hero,foe,{backstab:true,bonusDmg:3}),0);assert.equal(foe.hp,100);
 h.hero.hidden=true;h.random([.5,.5,0,0,0]);assert.equal(h.engine.hitAttack(h.hero,foe,{backstab:true,advantage:true,bonusDmg:3}),10);assert.equal(h.hero.hidden,undefined);
 h.hero.hidden=true;h.random([.999,.999,0,0,0,0,0,0]);assert.equal(h.engine.hitAttack(h.hero,foe,{backstab:true,advantage:true,bonusDmg:3}),13);
 h.hero.hidden=true;h.random([0,0]);assert.equal(h.engine.hitAttack(h.hero,foe,{backstab:true,advantage:true}),0);assert.equal(h.hero.hidden,undefined);
});

test('Hide in Shadows succeeds or fails on real checks and cannot repeatedly spend MP while hidden',()=>{
 const h=createHarness('Rogue'),foe=h.enemy();h.battle([foe]);h.random([.5]);h.api.performAbility(h.hero,h.ability('hide'),[h.hero]);h.advance(500);
 assert.equal(h.hero.hidden,true);assert.equal(h.hero.mp,99);assert.equal(h.hero.hideTotal,14);
 const h2=createHarness('Rogue');h2.battle();h2.random([0]);h2.api.performAbility(h2.hero,h2.ability('hide'),[h2.hero]);h2.advance(500);assert.equal(h2.hero.hidden,false);
 const h3=createHarness('Rogue');h3.battle();h3.hero.hidden=true;h3.api.performAbility(h3.hero,h3.ability('hide'),[h3.hero]);assert.equal(h3.hero.mp,100);
});

test('enemies search if all heroes remain hidden; successful detection reveals their target',()=>{
 const h=createHarness('Rogue'),foe=h.enemy(),battle=h.battle([foe]);battle.turn=1;h.hero.hidden=true;h.hero.hideTotal=99;h.random([0]);h.engine.enemyAct();
 assert.equal(h.hero.hp,100);assert.equal(h.hero.hidden,true);assert.ok(battle.log.some(e=>e.s.includes('searches the shadows')));
 const h2=createHarness('Rogue'),b2=h2.battle();b2.turn=1;h2.hero.hidden=true;h2.hero.hideTotal=1;h2.random([.5]);h2.engine.enemyAct();assert.equal(h2.hero.hidden,undefined);
});

test('silent field movement spends MP once, lasts 12 successful steps and survives saves',()=>{
 const h=createHarness('Rogue');assert.equal(h.engine.castFieldSpell(h.hero.id,'silent'),true);assert.equal(h.hero.silentSteps,12);assert.equal(h.hero.mp,99);
 assert.equal(h.engine.castFieldSpell(h.hero.id,'silent'),false);assert.equal(h.hero.mp,99);
 h.api.move(0,1);assert.equal(h.hero.silentSteps,11);h.api.save();h.api.load();assert.equal(h.api.getState().party[0].silentSteps,11);
});

test('Rogues disarm traps using DEX and proficiency rather than untrained perception',()=>{
 const h=createHarness('Rogue');h.hero.stats[1]=14;h.hero.stats[4]=2;h.random([.4]);h.engine.trapCheck();
 assert.equal(h.hero.hp,100);assert.ok(h.engine.getGame().log.some(line=>line.includes('Disarm Traps 14 vs DC 13')));
});

test('Runestaff unlocks a real spell; Silverguard wards new poison without healing existing poison',()=>{
 const h=createHarness('Fighter');h.hero.gear.weapon='runestaff';assert.ok(h.api.getAbilities()[0].known.includes('runeflare'));
 h.hero.gear.weapon=null;assert.ok(!h.api.getAbilities()[0].known.includes('runeflare'));
 h.hero.gear.armor='silvermail';const foe=h.enemy({original:'slime',atk:99});h.battle([foe]);h.random([.5,0,0]);h.engine.hitAttack(foe,h.hero);assert.equal(h.hero.poison,0);
 h.hero.poison=2;h.random([.5,0,0]);h.engine.hitAttack(foe,h.hero);assert.equal(h.hero.poison,2);
});

test('older saves on a changed riverbank relocate to dry ground without losing quest or character progress',()=>{
 const h=createHarness(),save=h.api.getState(),map=h.api.getMapData('wild');save.location='wild';save.x=map.tiles[6].indexOf('water');save.y=6;save.flags.elder=true;save.gold=171;save.bag.runestaff=2;
 const stats=Array.from(save.party[0].stats);h.storage.set(SAVE_KEY,JSON.stringify(save));h.api.load();const loaded=h.api.getState();
 assert.equal(loaded.location,'wild');assert.ok(h.api.walkable('wild',loaded.x,loaded.y));assert.equal(loaded.flags.elder,true);assert.equal(loaded.gold,171);assert.equal(loaded.bag.runestaff,2);assert.deepEqual(Array.from(loaded.party[0].stats),stats);
});

test('Runic Flare spends actual MP and applies Runestaff spell damage to its target',()=>{
 const h=createHarness('Fighter'),foe=h.enemy();h.hero.gear.weapon='runestaff';h.battle([foe]);h.random([.5]);
 const ability=h.engine.knownAbilities(h.hero).find(a=>a.id==='runeflare');h.api.performAbility(h.hero,ability,[foe]);assert.equal(h.hero.mp,96);h.advance(500);assert.equal(foe.hp,92);
});

test('combat preloads customized action sheets before the first player command',()=>{const h=createHarness('Fighter'),prepared=[];h.window.AshenCharacterMotion={prepare:(heroes,kind)=>prepared.push({ids:heroes.map(x=>x.id),kind})};h.api.beginCombat(['orc']);assert.equal(prepared.length,1);assert.equal(prepared[0].kind,'combat');assert.equal(prepared[0].ids[0],h.hero.id)});
test('guard triggers a defend pose that persists between transient reactions without changing defense rules',()=>{
 const h=createHarness('Fighter'),foe=h.enemy(),events=[];let reaction=null;h.window.AshenSprites={react:(id,state)=>events.push([id,state]),reaction:()=>reaction};h.battle([foe]);h.api.battleAction('guard');assert.equal(h.hero.defending,true);assert.deepEqual(events,[[h.hero.id,'defend']]);const state=h.engine.illustratedActorState(h.hero);assert.equal(state.state,'defend');assert.equal(state.duration,Infinity);assert.equal(state.time,0);reaction={state:'hit',startedAt:1000};assert.equal(h.engine.illustratedActorState(h.hero).state,'hit');h.hero.hp=0;assert.equal(h.engine.illustratedActorState(h.hero).state,'death');
});
