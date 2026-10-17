/* THE ASHEN REALMS — v1.7 LPC Character Preview Edition · Chapters I–II
   Original, zero-dependency, browser-playable fantasy RPG with real image atlases.
   Sections: data, world, UI, exploration, combat, rendering, initialization. */
'use strict';
(() => {
const $ = id => document.getElementById(id);
const Formation=window.AshenFormation;
const canvas = $('game'), ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=true;
const W=480,H=288,T=24, SAVE_KEY='ashen-realms-v1.2-save';
// v0.8 — improved battle presentation with illustrated party units and environment-specific backdrops.
canvas.width=W*3;canvas.height=H*3;ctx.setTransform(3,0,0,3,0,0);
const ART = {};
const LPC_NAMES=['fighter','rogue','wizard','cleric','goblin','shaman','orc','warboss','bandit','sentinel'];
const SPRITE_NAMES=['fighter','rogue','wizard','cleric','goblin','shaman','orc','warboss','bandit','sentinel','boss','bone','wolf','slime','wisp','bat'];
const SPRITE_FRAMES={width:240,height:280,idleA:0,idleB:1,attack:2,cast:3,hurt:4};
const ASSET_NAMES = [...LPC_NAMES.map(name=>'lpc/'+name+'.png'),...SPRITE_NAMES.map(name=>'sprites/'+name+'.png'),...['hall','smith','inn','tavern','chapel','cottage','bakery'].map(x=>'interiors/'+x+'.png'),'terrain_atlas.png','heroes_atlas.png','enemies_atlas.png','title_backdrop.jpg','battle_backdrop.jpg','battle_forest.jpg','battle_town.jpg','battle_crypt.jpg','gromclaw_battle.jpg','cinematic/camp_backdrop.jpg','overhaul/battle_crypt.png',...['day','evening','night'].map(n=>'battle/forest_'+n+'.jpg'),...['fighter','cleric','rogue','goblin','orc','shaman'].map(n=>'cinematic/'+n+'.png'),'portrait_fighter.png','portrait_rogue.png','portrait_wizard.png','portrait_cleric.png',...['hall','smith','inn','tavern','chapel','cottage','bakery'].map(x=>'havenmere/'+x+'.png'),'havenmere/outskirts.png'];
const imagePath = name => window.ASHEN_ASSET_DATA?.[name] || 'assets/' + name;
const assetNames=new Set(ASSET_NAMES);
const artPool=window.AshenScenes?.assetPool(name=>{const image=new Image();image.decoding='async';image.src=imagePath(name);ART[name]=image;return image},24,(name,image)=>{delete ART[name];image.src=''});
function requestArt(name){if(!assetNames.has(name))return null;if(artPool)return artPool.get(name);if(!ART[name]){const image=new Image();image.src=imagePath(name);ART[name]=image}return ART[name]}
const imageReady=name=>{const image=requestArt(name);return !!(image?.complete&&image.naturalWidth>0)};
const TERRAIN_CELLS = {"grass":[[0,0,96,96],[96,0,96,96],[192,0,96,96],[288,0,96,96]],"grass2":[[384,0,96,96],[480,0,96,96],[576,0,96,96],[672,0,96,96]],"path":[[0,96,96,96],[96,96,96,96],[192,96,96,96],[288,96,96,96]],"water":[[384,96,96,96],[480,96,96,96],[576,96,96,96],[672,96,96,96]],"forest":[[0,192,96,96],[96,192,96,96]],"mountain":[[192,192,96,96],[288,192,96,96]],"woodFloor":[[384,192,96,96],[480,192,96,96],[576,192,96,96]],"stoneFloor":[[672,192,96,96],[0,288,96,96],[96,288,96,96]],"rug":[[192,288,96,96]],"floor":[[288,288,96,96],[384,288,96,96],[480,288,96,96]],"wall":[[576,288,96,96],[672,288,96,96]],"insideWall":[[0,384,96,96],[96,384,96,96]],"wallTrim":[[192,384,96,96]],"bridge":[[288,384,96,96]],"fence":[[384,384,96,96]],"building":[[480,384,96,96]],"door":[[576,384,96,96]],"exitDoor":[[672,384,96,96]],"fountain":[[0,480,96,96]],"pillar":[[96,480,96,96]],"books":[[192,480,96,96]],"forge":[[288,480,96,96]],"anvil":[[384,480,96,96]],"rack":[[480,480,96,96]],"crate":[[576,480,96,96]],"bed":[[672,480,96,96]],"hearth":[[0,576,96,96]],"table":[[96,576,96,96]],"plant":[[192,576,96,96]],"barrel":[[288,576,96,96]],"window":[[384,576,96,96]],"altar":[[480,576,96,96]],"rune":[[576,576,96,96]],"exit":[[672,576,96,96]],"townGate":[[0,672,96,96]],"cryptGate":[[96,672,96,96]]};
const ROLE_ROW = {Fighter:0,Rogue:1,Wizard:2,Cleric:3};
const DIRECTION_ROW = {down:0,left:1,right:2,up:3};
const ENEMY_INDEX = {slime:0,wolf:1,bandit:2,bat:3,bone:4,wisp:5,sentinel:6,boss:7,goblin:8,orc:9,shaman:10,warboss:11};
const ROLE_ACCENT={Fighter:'#cf9a66',Rogue:'#7da88a',Wizard:'#7391d9',Cleric:'#d8c38b'};
const ROLE_PORTRAIT={Fighter:'portrait_fighter.png',Rogue:'portrait_rogue.png',Wizard:'portrait_wizard.png',Cleric:'portrait_cleric.png'};
const conditionBadges=h=>[h.hp<=0?['fallen','☠','Unconscious: cannot act until revived.']:null,h.poison>0?['poison','☣',`Poison: 2 damage at the start of the next ${h.poison} turns.`]:null,h.defending?['guard','◆','Guard: halves incoming damage until the next turn.']:null,h.protectedThroughRound>=combat?.round?['ward','✥',`Protected: halves incoming damage through round ${h.protectedThroughRound}.`]:null,h.hidden?['hidden','◐','Hidden: ready to backstab; enemy detection can reveal you.']:null].filter(Boolean).map(([id,icon,tip])=>`<span class="condition-icon condition-${id}" tabindex="0" role="img" aria-label="${tip}" title="${tip}">${icon}</span>`).join('');
const heroPortrait=h=>window.AshenIdentity?.portrait(h)||imagePath(ROLE_PORTRAIT[h.role]||'portrait_fighter.png');

const ABILS=['STR','DEX','CON','INT','WIS','CHA'];
const ANCESTRIES=window.AshenCharacterRules.ancestries;
const CLASSES={
 Fighter:{stats:[16,12,14,9,10,11],hp:27,mp:4,attack:'Iron Cleave',spellCost:2,desc:'A frontline warrior with powerful weapon attacks.',symbol:'⚔'},
 Rogue:{stats:[11,16,12,12,11,11],hp:22,mp:6,attack:'Shadowstep',spellCost:2,desc:'A nimble skirmisher skilled at critical strikes.',symbol:'✦'},
 Wizard:{stats:[8,12,11,17,12,11],hp:17,mp:16,attack:'Arcane Bolt',spellCost:3,desc:'A scholar wielding devastating elemental magic.',symbol:'✶'},
 Cleric:{stats:[12,10,14,10,16,12],hp:23,mp:13,attack:'Mend Wounds',spellCost:3,desc:'A healer and guardian against the restless dead.',symbol:'✚'}
};
// Ashen Realms house rule: a class adds two training points to rolled attributes.
// Official D&D 5e classes do not normally grant starting ability-score bonuses.
const CLASS_TRAINING={
 Fighter:{stats:[1,0,1,0,0,0],priority:[0,2,1,4,5,3]},
 Rogue:{stats:[0,1,0,0,0,1],priority:[1,5,2,4,3,0]},
 Wizard:{stats:[0,0,0,1,1,0],priority:[3,2,1,4,5,0]},
 Cleric:{stats:[0,0,1,0,1,0],priority:[4,2,0,5,1,3]}
};
const roll4d6=()=>{const dice=Array.from({length:4},()=>rand(6));const drop=dice.indexOf(Math.min(...dice));return {dice,drop,score:dice.reduce((a,b)=>a+b,0)-dice[drop]}};
const rollStatSet=()=>Array.from({length:6},roll4d6);
function autoAssign(rolls,role){const ranking=rolls.map((r,i)=>i).sort((a,b)=>rolls[b].score-rolls[a].score||a-b);const assignments=Array(6);CLASS_TRAINING[role].priority.forEach((ability,rank)=>{assignments[ability]=ranking[rank]});return assignments}
const bonusSummary=(values)=>ABILS.map((a,i)=>values[i]?`${a} ${values[i]>0?'+':''}${values[i]}`:null).filter(Boolean).join(' · ')||'No modifiers';
// RPG abilities unlock on level milestones; talents are elective upgrades purchased with level-up points.
const ABILITIES={
 Fighter:[
  {id:'power',name:'Iron Cleave',lvl:1,mp:2,kind:'single',fx:'slash',tip:'Heavy sword strike; 2 damage dice +2.'},
  {id:'sweep',name:'Whirlwind',lvl:3,mp:5,kind:'aoe',fx:'slash',tip:'Spin forward and strike ALL enemies.'},
  {id:'rally',name:'Battle Cry',lvl:4,mp:5,kind:'buff',fx:'holy',tip:'Restore 6 HP and halve party damage through the end of the next round.'}],
 Rogue:[
  {id:'hide',name:'Hide in Shadows',lvl:1,mp:1,kind:'self',fx:'shadow',tip:'DEX + proficiency vs enemy vigilance. On success, prepare a later Backstab; enemies may detect you.'},
  {id:'backstab',name:'Backstab',lvl:1,mp:2,kind:'single',fx:'slash',tip:'Requires Hidden. Attack with advantage: 3d6 + weapon modifier/bonuses +3. Reveals you even on a miss.'},
  {id:'silent',name:'Move Silently',lvl:1,mp:1,kind:'field',fx:'shadow',tip:'Field stance: halve random encounter chance for the next 12 successful steps. Scripted encounters remain unchanged.'},
  {id:'disarm',name:'Disarm Traps',lvl:1,mp:0,kind:'passive',fx:'shadow',tip:'When scouting traps, use DEX + proficiency vs DC 13.'},
  {id:'shadow',name:'Shadowstep',lvl:1,mp:2,kind:'single',fx:'slash',tip:'Ambush with advantage and extra damage.'},
  {id:'fan',name:'Blade Fan',lvl:3,mp:5,kind:'aoe',fx:'slash',tip:'Strike all enemies with thrown daggers.'},
  {id:'vanish',name:'Smoke Veil',lvl:4,mp:4,kind:'buff',fx:'shadow',tip:'Halve party damage through the end of the next round.'}],
 Wizard:[
  {id:'bolt',name:'Arcane Bolt',lvl:1,mp:3,kind:'single',fx:'arcane',tip:'Concentrated magical projectile.'},
  {id:'fireball',name:'Fireball',lvl:2,mp:6,kind:'aoe',fx:'fire',tip:'Blazing area blast. Every enemy rolls a DEX save.'},
  {id:'frost',name:'Frost Lance',lvl:3,mp:5,kind:'single',fx:'ice',tip:'On hit: 50% chance to lower attack by 1 for this encounter.'},
  {id:'meteor',name:'Falling Stars',lvl:5,mp:11,kind:'aoe',fx:'meteor',tip:'High-impact meteors strike all enemies.'}],
 Cleric:[
  {id:'mend',name:'Mend Wounds',lvl:1,mp:3,kind:'ally',fx:'holy',tip:'Restore HP to one ally.'},
  {id:'purify',name:'Purifying Light',lvl:2,mp:4,kind:'ally',fx:'holy',tip:'Remove poison and restore 4 HP to an ally.'},
  {id:'smite',name:'Radiant Bolt',lvl:2,mp:5,kind:'single',fx:'holy',tip:'Burn one enemy with radiant magic.'},
  {id:'sanctuary',name:'Sanctuary',lvl:3,mp:8,kind:'allies',fx:'holy',tip:'Heal the ENTIRE party.'},
  {id:'sunburst',name:'Sunburst',lvl:5,mp:10,kind:'aoe',fx:'holy',tip:'A radiant blast damages all enemies.'}]
};
const TALENTS={might:{name:'Martial Training',max:4,desc:'+1 weapon damage per rank'},focus:{name:'Spellcraft',max:4,desc:'+1 spell damage per rank'},vigor:{name:'Fortitude',max:4,desc:'+4 max HP per rank'},ward:{name:'Warding',max:3,desc:'+1 AC per rank'}};
function ensureProgress(h){h.talents=h.talents||{might:0,focus:0,vigor:0,ward:0};if(!Number.isFinite(h.talentPoints))h.talentPoints=Math.max(0,h.level-1)}
const RUNESTAFF_ABILITY={id:'runeflare',name:'Runic Flare',lvl:1,mp:4,kind:'single',fx:'fire',tip:'Runestaff ability: a spell attack with 2d6, spell modifier, staff bonus and +3 damage.'};
const knownAbilities=h=>[...(ABILITIES[h.role]||[]),...(h.gear?.weapon==='runestaff'?[RUNESTAFF_ABILITY]:[])].filter(a=>h.level>=a.lvl);
function spendTalent(id,key){const h=G?.party.find(p=>p.id===id),t=TALENTS[key];if(!h||!t||h.talentPoints<1||(h.talents[key]||0)>=t.max)return;h.talents[key]++;h.talentPoints--;if(key==='vigor'){h.maxHp+=4;h.hp+=4;}saveGame(true);refreshHud();talentMenu(id);SFX.play('level')}
function talentMenu(id){
 const h=G?.party.find(p=>p.id===id);if(!h)return;ensureProgress(h);
 const statLine=ABILS.map((a,i)=>`<span><small>${a}</small><b>${h.stats[i]}</b></span>`).join('');
 const talentArt={might:'⚔',focus:'✦',vigor:'♥',ward:'⬡'};
 const trainingCards=Object.entries(TALENTS).map(([key,t])=>{
  const current=h.talents[key]||0,full=current>=t.max,canBuy=h.talentPoints>0&&!full;
  const pips=Array.from({length:t.max},(_,i)=>`<i class="${i<current?'filled':''}"></i>`).join('');
  const currentEffect={might:`+${current} weapon damage`,focus:`+${current} spell damage`,vigor:`+${4*current} maximum HP`,ward:`+${current} Armor Class`}[key];
  return `<article class="train-card ${full?'maxed':''}"><div class="train-icon">${talentArt[key]}</div><div class="train-description"><h3>${t.name}</h3><p>${t.desc}</p><div class="train-pips" aria-label="Rank ${current} of ${t.max}">${pips}<span>${current}/${t.max}</span></div><small class="train-effect">CURRENT · ${currentEffect}</small></div><button data-action="buy:${key}" ${canBuy?'':'disabled'}>${full?'MAX RANK':h.talentPoints?'TRAIN · 1 PT':'NO POINTS'}</button></article>`
 }).join('');
 showModal(`<div class="train-screen"><header class="train-title"><span>THE ADVENTURER'S GUILD</span><h2>CHARACTER TRAINING</h2><p>Spend earned talent points to shape your adventurer. Training is permanent.</p></header><section class="train-hero"><img src="${heroPortrait(h)}" alt="${escapeHtml(h.role)} portrait"><div><span class="train-eyebrow">LEVEL ${h.level} · ${h.ancestry.toUpperCase()} ${h.role.toUpperCase()}</span><h3>${escapeHtml(h.name)}</h3><div class="train-vitals"><span>HP <b>${h.hp}/${h.maxHp}</b></span><span>MP <b>${h.mp}/${h.maxMp}</b></span><span>AC <b>${armorClass(h)}</b></span></div><div class="train-statline">${statLine}</div></div><div class="train-points"><b>${h.talentPoints}</b><span>AVAILABLE<br>POINTS</span></div></section><h3 class="train-section-title">CHOOSE YOUR DISCIPLINE</h3><div class="train-grid">${trainingCards}</div><footer class="train-footer"><span>Earn +1 talent point each time you level up. Every discipline has a maximum rank.</span><button data-action="back">← RETURN TO PARTY</button></footer></div>`,a=>{if(a==='back'){partyMenu();return}if(a.startsWith('buy:'))spendTalent(h.id,a.slice(4))});
}

const FIELD_SPELLS=new Set(['mend','sanctuary','rally','purify','silent']);
function canFieldCast(hero,ability){
 if(mode!=='explore'||!G||!hero||hero.hp<=0||!ability||!FIELD_SPELLS.has(ability.id)||hero.level<ability.lvl||hero.mp<ability.mp)return false;
 if(ability.id==='silent')return !(hero.silentSteps>0);
 if(ability.id==='purify')return G.party.some(h=>h.hp>0&&(h.poison>0||h.hp<h.maxHp));
 return G.party.some(h=>h.hp>0&&h.hp<h.maxHp);
}
function castFieldSpell(casterId,spellId,targetId=null){
 if(!G||mode!=='explore')return false;
 const caster=G.party.find(h=>h.id===casterId),ability=caster&&knownAbilities(caster).find(a=>a.id===spellId);
 if(!ability||!canFieldCast(caster,ability)){toast('Cannot cast: check your MP and party status.');return false}
 if(spellId==='silent'){caster.mp-=ability.mp;caster.silentSteps=12;uiLog(`${caster.name} moves silently for 12 steps.`);refreshHud();saveGame(true);return true}
 const partyWide=spellId==='sanctuary'||spellId==='rally';
 const targets=partyWide?G.party.filter(h=>h.hp>0):[G.party.find(h=>h.id===targetId)].filter(h=>h&&h.hp>0);
 if(!targets.length){toast('Choose a conscious ally.');return false}
 if(!targets.some(h=>spellId==='purify'?(h.poison>0||h.hp<h.maxHp):h.hp<h.maxHp)){toast('That ally does not need this spell.');return false}
 // Use the same healing dice and spellcraft bonuses as battle healing.
 caster.mp-=ability.mp;let total=0,cleansed=0;
 for(const h of targets){
  if(spellId==='purify'){if(h.poison>0){h.poison=0;cleansed++}const gain=Math.min(h.maxHp-h.hp,4);h.hp+=gain;total+=gain;continue}
  const amount=spellId==='rally'?6:dice(8,spellId==='sanctuary'?1:2)+Math.max(0,mod(caster.stats[4]))+2+(caster.talents?.focus||0);
  const restored=Math.max(0,Math.min(h.maxHp-h.hp,amount));h.hp+=restored;total+=restored;
 }
 const text=`${caster.name} casts ${ability.name}: +${total} HP${cleansed?`, cured ${cleansed} poison effect(s)`:''} · -${ability.mp} MP`;
 uiLog(text);toast(text);SFX.play('heal');refreshHud();saveGame(true);return true;
}
function fieldSpellTargets(casterId,spellId){
 const caster=G?.party.find(h=>h.id===casterId),ability=caster&&knownAbilities(caster).find(a=>a.id===spellId);if(!ability)return;
 if(spellId==='sanctuary'||spellId==='rally'||spellId==='silent'){if(castFieldSpell(casterId,spellId))spellbook();return}
 showModal(`<div class="field-target-screen"><div class="field-icon">✦</div><h2>${escapeHtml(ability.name)}</h2><p>Choose a party member to receive ${spellId==='purify'?'restoration and poison cleansing':'healing'}. The spell costs <strong>${ability.mp} MP</strong>.</p><div class="field-targets">${G.party.map(h=>{const useful=h.hp>0&&(spellId==='purify'?(h.poison>0||h.hp<h.maxHp):h.hp<h.maxHp);return `<button data-action="target:${h.id}" ${useful?'':'disabled'}><img src="${heroPortrait(h)}" alt=""><span><b>${escapeHtml(h.name)}</b><small>${h.role} · HP ${h.hp}/${h.maxHp}${h.poison?' · POISONED':''}</small></span><span>${useful?'SELECT':'FULL / DOWN'}</span></button>`}).join('')}</div><div class="choices"><button data-action="back">← BACK TO GRIMOIRE</button></div></div>`,a=>{if(a==='back'){spellbook();return}if(a.startsWith('target:')){if(castFieldSpell(casterId,spellId,a.slice(7)))spellbook()}});
}
function spellbook(){
 if(!G)return;
 showModal(`<div class="grimoire-screen"><header class="grimoire-header"><span>THE ARCANE ARCHIVE</span><h2>THE SPELL GRIMOIRE</h2><p>Restore your party between encounters. Field magic consumes the same MP as combat casting. Offensive magic remains battle-only.</p></header><div class="grimoire-list">${G.party.map(h=>`<section class="grimoire-member"><div class="grimoire-character"><img src="${heroPortrait(h)}" alt=""><div><b>${escapeHtml(h.name)}</b><small>LV ${h.level} ${h.role.toUpperCase()} · MP ${h.mp}/${h.maxMp}</small></div></div>${ABILITIES[h.role].map(a=>{const unlocked=h.level>=a.lvl,field=FIELD_SPELLS.has(a.id),usable=canFieldCast(h,a);return `<div class="grimoire-spell ${unlocked?'':'spell-locked'}"><div><strong>${a.name}</strong><small>${a.tip}</small><span class="spell-status">${unlocked?(a.kind==='passive'?'PASSIVE':a.kind==='field'?'FIELD ONLY':field?'FIELD + BATTLE':'BATTLE ONLY'):'UNLOCKS AT LEVEL '+a.lvl}</span></div><span class="spell-mp">${a.mp} MP</span>${unlocked&&field?`<button data-action="cast:${h.id}:${a.id}" ${usable?'':'disabled'}>${usable?'CAST':'UNAVAILABLE'}</button>`:''}</div>`}).join('')}</section>`).join('')}</div><footer class="grimoire-footer"><span>Recover MP with Moonwater or rest at the inn. Unconscious allies cannot be healed by field magic.</span><button data-action="back">CLOSE GRIMOIRE</button></footer></div>`,a=>{if(a==='back'){closeModal();return}if(a.startsWith('cast:')){const [,id,spellId]=a.split(':');fieldSpellTargets(id,spellId)}});
}

const ITEMS={
 potion:{name:'Healing Potion',description:'Restores 17 HP to one ally.',price:18,kind:'consumable'},
 ether:{name:'Moonwater',description:'Restores 9 MP to one ally.',price:26,kind:'consumable'},
 salve:{name:'Antidote Salve',description:'Cures poison and restores 4 HP.',price:12,kind:'consumable'},
 ration:{name:'Travel Rations',description:'Heals every conscious party member for 7 HP. Usable anywhere.',price:9,kind:'consumable',target:'party'},
 elixir:{name:'Greater Healing Draught',description:'Restores 35 HP to one hero.',price:45,kind:'consumable'},
 ashblade:{name:'Ashen Longsword',description:'+4 weapon damage. A rare drop from armored foes.',price:140,kind:'gear',slot:'weapon',bonus:4},
 oakbow:{name:'Hunter Bow',description:'+2 weapon damage. Found in the wilderness.',price:58,kind:'gear',slot:'weapon',bonus:2},
 silvermail:{name:'Silverguard Mail',description:'+4 Armor Class. Silver wards prevent new poison from enemy attacks.',price:155,kind:'gear',slot:'armor',bonus:4,poisonWard:true},
 iron:{name:'Ironblade',description:'+2 weapon damage (all classes).',price:65,kind:'gear',slot:'weapon',bonus:2},
 runestaff:{name:'Runestaff',description:'+3 spell and weapon damage.',price:90,kind:'gear',slot:'weapon',bonus:3,spellBonus:3},
 chain:{name:'Chainmail',description:'+2 Armor Class.',price:68,kind:'gear',slot:'armor',bonus:2},
 cloak:{name:'Shadow Cloak',description:'+1 Armor Class.',price:38,kind:'gear',slot:'armor',bonus:1},
 ember:{name:'The Ember Shard',description:'An ancient fragment stolen from the bell.',price:0,kind:'quest'},
 satchel:{name:'Merchant’s Satchel',description:'The merchant’s missing bundle.',price:0,kind:'quest'}
};
const BESTIARY={
 slime:{name:'Mire Slime',hp:15,ac:10,atk:2,dmg:5,dex:0,xp:9,gold:6,color:'#7fd38a',type:'slime'},
 wolf:{name:'Dusk Wolf',hp:19,ac:12,atk:3,dmg:6,dex:2,xp:13,gold:8,color:'#a8a1a4',type:'wolf'},
 bandit:{name:'Road Brigand',hp:23,ac:12,atk:4,dmg:7,dex:1,xp:16,gold:12,color:'#d4a26f',type:'bandit'},
 wisp:{name:'Grave Wisp',hp:17,ac:13,atk:4,dmg:6,dex:3,xp:16,gold:10,color:'#90d5ef',type:'wisp'},
 bone:{name:'Restless Bones',hp:21,ac:12,atk:4,dmg:7,dex:1,xp:17,gold:11,color:'#d4d0ba',type:'bone'},
 bat:{name:'Crypt Bat',hp:13,ac:13,atk:3,dmg:5,dex:4,xp:11,gold:5,color:'#a18ab7',type:'bat'},
 sentinel:{name:'Ash Sentinel',hp:32,ac:14,atk:5,dmg:8,dex:0,xp:26,gold:17,color:'#c77965',type:'sentinel'},
 boss:{name:'The Bell Warden',hp:80,ac:14,atk:5,dmg:8,dex:2,xp:105,gold:110,color:'#f0a26d',type:'boss'},
 goblin:{name:'Gromclaw Scout',hp:17,ac:12,atk:3,dmg:6,dex:3,xp:15,gold:9,color:'#8baf73',type:'goblin'},
 orc:{name:'Orc Reaver',hp:35,ac:13,atk:5,dmg:8,dex:0,xp:29,gold:19,color:'#79916b',type:'orc'},
 shaman:{name:'Goblin Hexcaller',hp:24,ac:12,atk:5,dmg:5,dex:2,xp:26,gold:17,color:'#c4a16d',type:'shaman'},
 warboss:{name:'Gruk Bloodtusk',hp:105,ac:15,atk:6,dmg:10,dex:1,xp:135,gold:145,color:'#91a675',type:'warboss'}
};
let G=null, mode='title', maps={}, keyboard=new Set(), lastMove=0, stepCounter=0, animTick=0, audioEnabled=true;
let modalCallback=null, toastTimeout=null, combat=null, battleMenu='commands', currentTargetAction=null, enemyTimer=null;
let fx=[];
let battleFX=null, battleNumbers=[], combatAnimating=false;
let battleWidth=W, highlightedTarget=null;
let lastSpriteStepAt=0;
// Per-encounter auto tactics: the same rules, MP and initiative apply as for manual turns.
const COMBAT_TACTICS={manual:'MANUAL',attack:'ATTACK ONLY',conserve:'LIMITED MAGIC',assault:'ALL-OUT OFFENSE'};
let combatTactic='manual',autoBattleTimer=null,combatSession=0;
function cancelAutoTurn(){clearTimeout(autoBattleTimer);autoBattleTimer=null}
function setCombatTactic(tactic){
 if(mode!=='combat'||!combat||!Object.prototype.hasOwnProperty.call(COMBAT_TACTICS,tactic))return;
 combatTactic=tactic;cancelAutoTurn();battleMenu='commands';
 combatLog(tactic==='manual'?'Manual control resumed.':`Tactics: ${COMBAT_TACTICS[tactic]}.`);
 if(tactic!=='manual')scheduleAutoTurn();
}
function bestAutoTarget(){return combat?.enemies.filter(e=>e.hp>0).sort((a,b)=>a.hp-b.hp||a.maxHp-b.maxHp)[0]||null}
function scheduleAutoTurn(){
 cancelAutoTurn();if(mode!=='combat'||!combat||combatTactic==='manual'||combatAnimating)return;
 const q=combat.queue[combat.turn];if(!q||q.side!=='ally')return;
 const session=combatSession,turn=combat.turn,actor=q.id;
 autoBattleTimer=setTimeout(()=>{
  autoBattleTimer=null;
  if(mode!=='combat'||!combat||session!==combatSession||combatTactic==='manual'||combatAnimating||combat.turn!==turn||activeUnit()?.id!==actor)return;
  autoAct();
 },430);
}
function autoAct(){
 if(!combat||mode!=='combat'||combatTactic==='manual'||combatAnimating||combat.queue[combat.turn]?.side!=='ally')return;
 const hero=activeUnit(),target=bestAutoTarget();if(!hero||!target)return;
 const known=knownAbilities(hero).filter(a=>a.mp<=hero.mp&&!['passive','field'].includes(a.kind)&&(a.id!=='backstab'||hero.hidden));
 let choice=null,targets=null;
 const neededHeal=G.party.filter(h=>h.hp>0&&h.hp/h.maxHp<.44).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
 const aoe=known.filter(a=>a.kind==='aoe').sort((a,b)=>b.mp-a.mp)[0];
 const offense=known.filter(a=>a.kind==='single').sort((a,b)=>b.mp-a.mp)[0];
 const restorative=known.filter(a=>['ally','allies'].includes(a.kind)).sort((a,b)=>a.mp-b.mp);
 const livingFoes=combat.enemies.filter(e=>e.hp>0);
 if(combatTactic==='conserve'){
  const reserve=Math.ceil(hero.maxMp*.45);
  if(neededHeal.length&&restorative.length){
   choice=restorative.find(a=>hero.mp-a.mp>=reserve);
   if(choice)targets=choice.kind==='allies'?G.party.filter(h=>h.hp>0):[neededHeal[0]];
  }
  if(!choice&&livingFoes.length>=3&&aoe&&hero.mp-aoe.mp>=reserve){choice=aoe;targets=livingFoes;}
 }else if(combatTactic==='assault'){
  // Offensive magic is preferred but *never* bypasses actual MP limits.
  choice=(livingFoes.length>=2&&aoe)?aoe:offense||aoe;
  if(choice)targets=choice.kind==='aoe'?livingFoes:[target];
 }
 if(choice&&targets?.length){performAbility(hero,choice,targets);return}
 queueCinematic(hero.gear.weapon==='oakbow'?'arrow':'slash',hero,[target],()=>hitAttack(hero,target),'ally');
}

let cameraZoom=.75; const zoomSteps=[.75,.9,1.1,1.35];
const rand=(n)=>Math.floor(Math.random()*n)+1;
const dice=(sides,count=1)=>Array.from({length:count},()=>rand(sides)).reduce((a,b)=>a+b,0);
const mod=(v)=>Math.floor((v-10)/2);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const levelThreshold=n=>20+((n-1)*30)+((n-1)*(n-1)*13);
const alive=()=>G?G.party.filter(h=>h.hp>0):[];
const isOverlay=()=>!$('overlay').classList.contains('hidden');
const objective=()=>!G?'Awaiting your adventure':G.flags.warboss?'The Gromclaw warband has fallen. Visit the town crier for more work.':G.flags.ending?'Chapter II: Follow the eastern road to the Gromclaw war camp and stop Gruk Bloodtusk.':G.flags.boss?'Return the Ember Shard to Elder Maelin in Havenmere.':!G.flags.elder?'Enter Havenmere Great Hall and speak to Elder Maelin inside.':!G.flags.ritual?'Find the old Emberfall Crypt northeast of Havenmere.':G.flags.leverA&&G.flags.leverB?'Confront the Warden in the eastern burial hall.':'Break both rune-seals inside Emberfall Crypt.';
const questTitle=()=>!G?'The road awaits':G.flags.warboss?'Chapter II — Warband Defeated':G.flags.ending?'Chapter II — The Broken Banner':G.flags.boss?'A Shard of Embers':G.flags.elder?'The Hollow Bell':'An Unquiet Morning';
const uiLog=(s)=>{if(!G)return;G.log.unshift(s);G.log=G.log.slice(0,10);refreshHud()};
function toast(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2300)}
function creationStats(ancestry,role,assigned,rolls){
 const c=CLASSES[role],a=ANCESTRIES[ancestry],training=CLASS_TRAINING[role];
 if(!c||!a||!Array.isArray(rolls)||rolls.length!==6||!Array.isArray(assigned)||assigned.length!==6||new Set(assigned).size!==6||assigned.some(i=>!Number.isInteger(i)||i<0||i>5)||rolls.some(r=>!Number.isInteger(r.score)||r.score<3||r.score>18))throw Error('Invalid ability assignment');
 const baseStats=assigned.map(i=>rolls[i].score),stats=baseStats.map((v,i)=>v+a.stats[i]+training.stats[i]);
 return {baseStats,stats,maxHp:Math.max(9,c.hp+mod(stats[2])*2),maxMp:Math.max(1,c.mp+Math.max(0,mod(stats[3])))};
}
function newHero(name,ancestry,role,level=1,assigned=null,rolls=null,appearance='male'){
 rolls=rolls||rollStatSet();assigned=assigned||autoAssign(rolls,role);
 const derived=creationStats(ancestry,role,assigned,rolls);
 return {id:Math.random().toString(36).slice(2,8),name,ancestry,role,row:Formation.defaultRow({role}),appearance:appearance==='female'?'female':'male',silentSteps:0,level,talentPoints:0,talents:{might:0,focus:0,vigor:0,ward:0},xp:0,xpTotal:0,ancestryRuleSet:window.AshenCharacterRules.version,ancestryModifiers:ANCESTRIES[ancestry].stats.slice(),classModifiers:CLASS_TRAINING[role].stats.slice(),rolls,assigned:assigned.slice(),...derived,hp:derived.maxHp,mp:derived.maxMp,gear:{weapon:null,armor:null},poison:0,defending:false};
}
function startGame(name,ancestry,role,assigned=null,rolls=null,appearance='male'){G={version:5,location:'town',x:15,y:11,dir:'up',party:[newHero(name||'Wanderer',ancestry,role,1,assigned,rolls,appearance)],bag:{potion:4,ether:2,salve:2,ration:3},gold:45,flags:{elder:false,ritual:false,leverA:false,leverB:false,gate:false,boss:false,ending:null,satchelFound:false,satchelReturned:false,shrine:false,starterChest:false,cryptChestA:false,cryptChestB:false,trial:false,lanternQuest:false,lanternRoadComplete:false},log:[],steps:0,battles:0,jobs:{goblin:{state:'none',count:0},orc:{state:'none',count:0}}};mode='explore';if(window.AshenWorldTime)G.world={clock:{minutes:540,day:1,rate:2},objects:{}};window.AshenNPCs?.clear();window.AshenAnimation?.clear();window.AshenIdentity?.prepare(G.party[0]);closeModal();trail=[];lastTownDistrict='';uiLog('A new adventurer arrives in Havenmere.');uiLog('Enter the northern Great Hall and speak to Elder Maelin.');refreshHud();saveGame(true);toast('Chapter I · The Hollow Bell');SFX.play('start')}
function showModal(html,onChoice){stopTouchMove();document.documentElement.classList.remove('title-menu-open','tavern-creation-open');$('modal').setAttribute('data-screen','dialog');modalCallback=onChoice;$('modal').innerHTML=html;$('overlay').classList.remove('hidden');$('modal').scrollTop=0;$('modal').querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{const action=btn.dataset.action;modalCallback?.(action,btn)}))}
function closeModal(){stopTouchMove();window.AshenTavern?.close();document.documentElement.classList.remove('title-menu-open');$('overlay').classList.add('hidden');$('modal').innerHTML='';modalCallback=null;updateMobileAction()}
function dialog(title,body,choices=[['Continue','close']],callback=null){showModal(`<h2>${title}</h2><p class="narrative">${body}</p><div class="choices">${choices.map(([label,id])=>`<button data-action="${id}">${label}</button>`).join('')}</div>`,(a)=>{closeModal();if(a!=='close')callback?.(a);else callback?.('close')})}
function mainMenu(focus=null){
 window.AshenTavern?.close();
 let hasSave=false;try{hasSave=!!localStorage.getItem(SAVE_KEY)}catch(e){/* New game remains available without storage. */}
 showModal(`<section class="title-menu" aria-label="Main menu"><div class="title-content"><header class="title-intro"><div class="title-eyebrow">A DARK FANTASY ADVENTURE</div><h2><small>THE</small><span>ASHEN</span><span>REALMS</span></h2><div class="title-chapter">CHAPTER I · THE HOLLOW BELL</div><p class="title-story">Beyond the lamps of Havenmere, an ancient bell tolls beneath the earth.<br>The living dream of ash. The dead begin to stir.</p></header><nav class="title-actions" aria-label="Choose your journey"><button class="primary" data-action="new" aria-label="Begin a New Adventure"><span><strong>NEW GAME</strong><small>Forge your adventurer</small></span><span aria-hidden="true">→</span></button><button data-action="continue" aria-label="Continue Saved Journey" ${hasSave?'':'disabled'}><span><strong>CONTINUE</strong><small>${hasSave?'Return to your saved journey':'No saved journey in this browser'}</small></span><span aria-hidden="true">◇</span></button><button data-action="settings"><span><strong>SETTINGS</strong><small>Sound, atmosphere & world view</small></span><span aria-hidden="true">⚙</span></button></nav><button class="title-help" data-action="help">HOW TO PLAY</button><div class="title-footer"><span>AN ADVENTURE BEGINS WITH A SINGLE STEP.</span>PROGRESS SAVES LOCALLY IN THIS BROWSER.</div></div></section>`,a=>{
  if(a==='new')characterCreate();if(a==='continue')loadGame();if(a==='help')helpMenu(true);if(a==='settings')titleSettings();
 });
 $('modal').setAttribute('data-screen','title-menu');document.documentElement.classList.add('title-menu-open');
 $('modal').querySelector(`[data-action="${focus||(hasSave?'continue':'new')}"]`)?.focus({preventScroll:true});
}
function titleSettings(focus=null,fromTitle=mode==='title'){
 const paused=window.AshenTitle?.preferences().motionPaused||false;
 showModal(`<section class="title-settings" aria-label="Presentation settings"><span class="settings-eyebrow">THE ASHEN REALMS</span><h2>SETTINGS</h2><div class="settings-row"><div><strong>Sound & music</strong><small>Battle effects and music during your journey.</small></div><button data-action="sound" role="switch" aria-label="Sound and music" aria-checked="${audioEnabled}">${audioEnabled?'ON':'OFF'}</button></div><div class="settings-row"><label for="musicVolume">Music volume</label><input id="musicVolume" type="range" min="0" max="100" value="${Math.round((window.AshenAudio?.preferences().music??.55)*100)}" aria-label="Music volume"></div><div class="settings-row"><label for="effectsVolume">Effects volume</label><input id="effectsVolume" type="range" min="0" max="100" value="${Math.round((window.AshenAudio?.preferences().effects??.7)*100)}" aria-label="Effects volume"></div><div class="settings-row"><div><strong>Title atmosphere</strong><small>Slow camera drift, mist and embers. Your device’s reduced-motion preference is always respected.</small></div><button data-action="motion" role="switch" aria-label="Title atmosphere" aria-checked="${!paused}">${paused?'PAUSED':'AUTO'}</button></div><div class="settings-row"><div><strong>World zoom</strong><small>Choose the exploration view. Combat keeps its own framing.</small></div><button data-action="zoom" aria-label="World zoom ${Math.round(cameraZoom*100)} percent">${Math.round(cameraZoom*100)}%</button></div><div class="settings-row"><div><strong>Environmental lighting</strong><small>Cached light quality for your device.</small></div><button data-action="lighting">${window.AshenLighting?.quality().toUpperCase()||'AUTO'}</button></div><div class="settings-row"><div><strong>World time</strong><small>Time advances while exploring.</small></div><button data-action="time" ${G?'':'disabled'}>${G?.world?.clock?.rate===0?'PAUSED':G?.world?.clock?.rate===.5?'SLOW':'NORMAL'}</button></div><button class="settings-return" data-action="back">${fromTitle?'← RETURN TO TITLE':'← RETURN TO GAME'}</button></section>`,a=>{
  if(a==='back'){if(fromTitle)mainMenu('settings');else closeModal();return}
  if(a==='lighting')window.AshenLighting?.cycleQuality();
  if(a==='time'&&G?.world){const rates=[2,.5,0];G.world.clock.rate=rates[(rates.indexOf(G.world.clock.rate)+1)%rates.length];saveGame(true)}
  if(a==='sound')SFX.toggle();
  if(a==='motion')window.AshenTitle?.save({motionPaused:!paused});
  if(a==='zoom')$('zoomBtn').click();
  titleSettings(a,fromTitle);
 });
 $('modal').setAttribute('data-screen','title-settings');
 for(const [id,key] of [['musicVolume','music'],['effectsVolume','effects']])$(id)?.addEventListener('input',event=>window.AshenAudio?.configure(key,Number(event.target.value)/100));
 $('modal').querySelector(`[data-action="${focus||'sound'}"]`)?.focus({preventScroll:true});
}
function characterCreate(){
 window.AshenTavern.open({
  attrs:ABILS,classes:CLASSES,training:CLASS_TRAINING,escape:escapeHtml,portrait:role=>imagePath(ROLE_PORTRAIT[role]),identity:hero=>heroPortrait(hero),
  preview:creationStats,roll:roll4d6,auto:autoAssign,abilities:role=>knownAbilities({role,level:1}),
  combatStats:hero=>({ac:armorClass(hero),attack:prof(hero)+attackMod(hero),spell:prof(hero)+attackMod(hero,true),dc:10+prof(hero)+mod(hero.stats[CLASS_TRAINING[hero.role].priority[0]]),initiative:mod(hero.stats[1])}),
  show:showModal,title:mainMenu,begin:startGame,prepareSound:()=>SFX.ensure(),sound:impact=>SFX.dice(impact)
 });
}
function saveGame(silent=false){if(!G){if(!silent)toast('Begin an adventure before saving.');return}if(mode==='combat'){if(!silent)toast('Finish the battle before saving.');return}try{localStorage.setItem(SAVE_KEY,JSON.stringify(G));if(!silent){toast('Adventure saved');SFX.play('menu')}}catch(e){toast('Save failed: browser storage is unavailable.')}}
function normalizeSave(data){
  const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const integer=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
  const requireValid=(ok)=>{if(!ok)throw Error('Invalid save')};
  requireValid(record(data)&&[2,3,4,5].includes(data.version)&&Object.hasOwn(maps,data.location));
  requireValid(Array.isArray(data.party)&&data.party.length>0&&integer(data.gold));
  requireValid(record(data.bag)&&record(data.flags));
  const ids=new Set();
  for(const h of data.party){
    requireValid(record(h)&&typeof h.id==='string'&&h.id.length>0&&!ids.has(h.id));ids.add(h.id);
    requireValid(typeof h.name==='string'&&Object.hasOwn(CLASSES,h.role)&&Object.hasOwn(ANCESTRIES,h.ancestry));
    requireValid(Array.isArray(h.stats)&&h.stats.length===6&&h.stats.every(v=>integer(v,1)));
    // Stored final stats are authoritative. Legacy saves gain provenance, never recalculated bonuses.
    delete h.hidden;delete h.hideTotal;h.silentSteps??=0;requireValid(integer(h.silentSteps)&&h.silentSteps<=12);
    h.row??=Formation.defaultRow(h);requireValid(['front','back'].includes(h.row));
    h.appearance??=h.name==='Sister Elowen'?'female':'male';
    requireValid(['male','female'].includes(h.appearance));
    h.ancestryRuleSet??='legacy-v1';
    requireValid(['legacy-v1',window.AshenCharacterRules.version].includes(h.ancestryRuleSet));
    h.ancestryModifiers??=(h.ancestryRuleSet==='legacy-v1'?window.AshenCharacterRules.legacy[h.ancestry]:ANCESTRIES[h.ancestry].stats).slice();
    h.classModifiers??=CLASS_TRAINING[h.role].stats.slice();
    for(const values of [h.ancestryModifiers,h.classModifiers])requireValid(Array.isArray(values)&&values.length===6&&values.every(v=>Number.isSafeInteger(v)&&v>=-2&&v<=2));
    requireValid(integer(h.level,1)&&integer(h.xp)&&integer(h.maxHp,1)&&integer(h.maxMp));
    requireValid(integer(h.hp)&&h.hp<=h.maxHp&&integer(h.mp)&&h.mp<=h.maxMp);
    if(h.gear===undefined)h.gear={weapon:null,armor:null};requireValid(record(h.gear));
    for(const slot of ['weapon','armor']){
      const id=h.gear[slot]??null;
      requireValid(id===null||(Object.hasOwn(ITEMS,id)&&ITEMS[id].kind==='gear'&&ITEMS[id].slot===slot));
      h.gear[slot]=id;
    }
    if(h.talents===undefined)h.talents={};requireValid(record(h.talents));
    for(const [key,t] of Object.entries(TALENTS)){h.talents[key]??=0;requireValid(integer(h.talents[key])&&h.talents[key]<=t.max)}
    h.talentPoints??=Math.max(0,h.level-1-Object.keys(TALENTS).reduce((sum,key)=>sum+h.talents[key],0));
    requireValid(integer(h.talentPoints));
    // Sum the old per-level XP thresholds without allocating an array by level.
    const n=h.level-1;
    h.xpTotal??=h.xp+20*n+30*n*(n-1)/2+13*n*(n-1)*(2*n-1)/6;
    requireValid(integer(h.xpTotal)&&h.xpTotal>=h.xp);
    h.poison??=0;requireValid(integer(h.poison));h.poison=Math.min(2,h.poison);
    h.defending=false;delete h.hidden;delete h.hideTotal;delete h.protectedThroughRound;
  }
  for(const [id,count] of Object.entries(data.bag))requireValid(Object.hasOwn(ITEMS,id)&&integer(count));
  for(const [key,value] of Object.entries(data.flags)){
    requireValid(!['__proto__','constructor','prototype'].includes(key));
    requireValid(key==='ending'?[null,'seal','keep'].includes(value):typeof value==='boolean');
  }
  data.flags.ending??=null;data.flags.lanternQuest??=false;data.flags.lanternRoadComplete??=false;
  data.steps??=0;data.battles??=0;requireValid(integer(data.steps)&&integer(data.battles));
  data.log??=[];requireValid(Array.isArray(data.log)&&data.log.every(s=>typeof s==='string'));data.log=data.log.slice(0,10);
  data.jobs??={};requireValid(record(data.jobs));
  for(const key of ['goblin','orc']){
    data.jobs[key]??={state:'none',count:0};const job=data.jobs[key];
    requireValid(record(job)&&['none','active'].includes(job.state)&&integer(job.count));
  }
  requireValid(Number.isSafeInteger(data.x)&&Number.isSafeInteger(data.y));
  const map=maps[data.location],inBounds=data.x>=0&&data.y>=0&&data.x<map.w&&data.y<map.h;
  if(data.location==='town'&&(!inBounds||['building','fence','fountain'].includes(map.tiles[data.y][data.x]))){data.x=15;data.y=11}
  else requireValid(inBounds);
  // Older wilderness saves may sit on a bank changed by the meandering river.
  if(data.location==='wild'&&['water','mountain'].includes(map.tiles[data.y][data.x])){
    const sourceX=data.x,sourceY=data.y;let found=false;
    for(let radius=1;radius<map.w+map.h&&!found;radius++)for(let dy=-radius;dy<=radius&&!found;dy++)for(const dx of [-(radius-Math.abs(dy)),radius-Math.abs(dy)]){const x=sourceX+dx,y=sourceY+dy;if(x>=0&&y>=0&&x<map.w&&y<map.h&&!['water','mountain'].includes(map.tiles[y][x])){data.x=x;data.y=y;found=true;break}}
    requireValid(found);
  }
  // Scene revisions can place furniture under a legacy interior save. Relocate
  // only the position; all character, inventory and quest progress stays intact.
  if(window.AshenInteriors?.has(data.location)){
    const occupied=(x,y)=>['insideWall','rack'].includes(map.tiles[y]?.[x])||entitiesForSave(data).some(e=>e.x===x&&e.y===y);
    if(occupied(data.x,data.y)){
      const candidates=[];for(let y=3;y<13;y++)for(let x=1;x<17;x++)if(!occupied(x,y))candidates.push({x,y,d:Math.abs(x-data.x)+Math.abs(y-data.y)});
      candidates.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);requireValid(candidates.length>0);data.x=candidates[0].x;data.y=candidates[0].y;
    }
  }
  if(window.AshenWorldProps?.blocks(data.location,data.x,data.y)||window.AshenEnvironment?.blocks(map,data.location,data.x,data.y)){
    const previous=G;try{G=data;const candidates=[];for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++)if(walkable(data.location,x,y))candidates.push({x,y,d:Math.abs(x-data.x)+Math.abs(y-data.y)});candidates.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);requireValid(candidates.length>0);data.x=candidates[0].x;data.y=candidates[0].y}finally{G=previous}
  }
  data.dir??='down';requireValid(['up','down','left','right'].includes(data.dir));
  if(window.AshenWorldTime)data.world=window.AshenWorldTime.world(data.world,data.steps);
  if(data.world)window.AshenInteractions?.validate(data.world);
  data.version=5;return data;
}
function entitiesForSave(data){const previous=G;try{G=data;return entities().filter(e=>!e.ambient)}finally{G=previous}}
function loadGame(){
  let data;
  try{data=normalizeSave(JSON.parse(localStorage.getItem(SAVE_KEY)))}
  catch(e){toast('No compatible save was found.');if(!G)mainMenu();return}
  // Accept only a fully validated save and invalidate pending encounter callbacks.
  endCombat();window.AshenNPCs?.clear();window.AshenAnimation?.clear();G=data;G.party.forEach(h=>window.AshenIdentity?.prepare(h));trail=[];stepCounter=0;lastTownDistrict='';closeModal();refreshHud();
  uiLog('Your journey resumes.');SFX.play('start');toast('Adventure restored');
}
function updateMobileAction(){const button=$('mobileAction');if(!button)return;const hint=G&&mode==='explore'?doorHint():'';const label=/STAND/.test(hint)?'STAND':/ENTER/.test(hint)?'ENTER':/EXIT/.test(hint)?'EXIT':/TALK/.test(hint)?'TALK':/LIGHT/.test(hint)?'LIGHT':/OPEN/.test(hint)?'OPEN':/CLOSE/.test(hint)?'CLOSE':/SIT/.test(hint)?'SIT':'ACT';button.textContent=label;button.setAttribute('aria-label',label==='ACT'?'Interact':label.charAt(0)+label.slice(1).toLowerCase())}
function refreshHud(){const party=$('partySummary'),quest=$('questSummary');if(!G){party.innerHTML='<div class="subtle">Begin an adventure to create your hero.</div>';quest.textContent='The road into the realm awaits.';$('coinCount').textContent='0 GOLD';$('locationText').textContent='—';$('proximityHint').textContent='EXPLORE · DISCOVER · CONQUER';updateMobileAction();return}
 party.innerHTML=G.party.map(h=>{const next=levelThreshold(h.level),percent=clamp(h.xp/next*100,0,100);return `<div class="memberline"><div class="portrait"><img class="portrait-art" src="${imagePath('portrait_'+h.role.toLowerCase()+'.png')}" alt="${h.role} portrait" loading="eager"></div><div class="memberinfo"><div class="memberhead"><span>${escapeHtml(h.name)}</span><small>LEVEL ${h.level} · ${h.role.toUpperCase().slice(0,3)}</small></div><div class="bars"><div class="vitalrow"><span>HP <b>${h.hp}<i> / ${h.maxHp}</i></b></span><div class="bar" title="HP ${h.hp}/${h.maxHp}"><span style="width:${100*h.hp/h.maxHp}%"></span></div></div><div class="vitalrow"><span>MP <b>${h.mp}<i> / ${h.maxMp}</i></b></span><div class="bar mana" title="MP ${h.mp}/${h.maxMp}"><span style="width:${h.maxMp?100*h.mp/h.maxMp:0}%"></span></div></div></div><div class="xp-head"><span>XP ${h.xp} / ${next}</span><span>${next-h.xp} TO LEVEL ${h.level+1}</span></div><div class="xpbar" role="progressbar" aria-label="${escapeHtml(h.name)} experience" aria-valuenow="${h.xp}" aria-valuemin="0" aria-valuemax="${next}"><span style="width:${percent}%"></span></div></div></div>`}).join('');
 const chap=document.querySelector('.chapter');if(chap)chap.innerHTML=G.flags.ending?'CHAPTER II <span>THE BROKEN BANNER</span>':'CHAPTER I <span>THE HOLLOW BELL</span>';quest.innerHTML=`<b>${questTitle()}</b>${objective()}`;$('coinCount').textContent=`${G.gold} GOLD`;$('locationText').textContent=maps[G.location].name.toUpperCase();$('regionLabel').textContent=maps[G.location].label;$('chronicle').innerHTML=G.log.map(s=>`<div>${escapeHtml(s)}</div>`).join('');$('proximityHint').textContent=doorHint()||(G.location==='town'?'FOLLOW HIGH STREET · E TO TALK':(['hall','smith','inn','tavern','chapel','cottage','bakery'].includes(G.location)?'SOUTH DOOR RETURNS TO HAVENMERE · E TO TALK':'EXPLORE · E TO INTERACT'));paintAreaMap();updateTownDistrict();updateMobileAction()}
function paintAreaMap(){const c=$('areaMini');if(!c||!G||!maps[G.location])return;const m=maps[G.location],cx=c.getContext('2d'),cw=c.width,ch=c.height;
 cx.clearRect(0,0,cw,ch);cx.fillStyle='#0b1420';cx.fillRect(0,0,cw,ch);
 const size=Math.min((cw-14)/m.w,(ch-14)/m.h),ox=(cw-m.w*size)/2,oy=(ch-m.h*size)/2;
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
  let tile=m.tiles[y][x],col=tileColor(tile);
  if(tile==='building')col='#c8aa7f';if(tile==='door'||tile==='exitDoor')col='#ffe1a1';
  cx.fillStyle=col;cx.fillRect(ox+x*size,oy+y*size,Math.ceil(size),Math.ceil(size))
 }
 for(const e of entities()){
  if(!['elder','shop','inn','merchant','rogue','cleric','townGate','cryptGate','leverA','leverB','altar'].includes(e.kind))continue;
  cx.fillStyle='#f6e5a6';cx.fillRect(ox+e.x*size,oy+e.y*size,Math.max(2,size),Math.max(2,size));
 }
 for(const peer of (window.AshenNetwork?.getOthers?.()||[])){
  if(peer.loc!==G.location)continue;cx.fillStyle='#81e5d2';cx.beginPath();cx.arc(ox+(peer.x+.5)*size,oy+(peer.y+.5)*size,Math.max(2,size*.5),0,Math.PI*2);cx.fill();
 }
 cx.fillStyle='#f9d98a';cx.beginPath();cx.arc(ox+(G.x+.5)*size,oy+(G.y+.5)*size,Math.max(3,size*.56),0,Math.PI*2);cx.fill();cx.strokeStyle='#1d2636';cx.lineWidth=1;cx.stroke();
 if(G.location==='town'){
  const names={hall:'H',smith:'F',inn:'I',tavern:'T',chapel:'C',cottage:'O',bakery:'B'};
  for(const b of maps.town.buildings){
   const x=ox+(b.x+b.w/2)*size,y=oy+(b.y+b.h/2)*size;
   cx.fillStyle='#233444';cx.beginPath();cx.arc(x,y,Math.max(5,size*.65),0,Math.PI*2);cx.fill();
   cx.fillStyle='#f3d5a2';cx.textAlign='center';cx.font=`bold ${Math.max(7,size*.95)}px Georgia`;
   cx.fillText(names[b.room]||'?',x,y+Math.max(2,size*.29));
  }
 }
 const summary=document.querySelector?.('.mapcaption');if(summary)summary.textContent=({town:'High Street leads from the Great Hall to Market Square. Forge Lane is west; Lantern Row east. Seven buildings are enterable.',hall:'Meet Elder Maelin and Sister Elowen. The southern door returns you to Havenmere.',smith:'Speak to Garrick for weapons and armor. Exit through the southern door.',inn:'Rest with Nessa to restore HP and MP. The southern door returns outside.',tavern:'Find Rook and Pella inside. Visit the bar, then leave by the south door.',chapel:'Receive a blessing from Brother Caden.',cottage:'Meet Farmer Tilda at home.',bakery:'Buy travel rations from Mira.',wild:'Follow the path east to Emberfall Crypt. Beware of roaming monsters.',crypt:'Break the northern and southern rune-seals to reach the Bell Warden.',camp:'Battle goblin scouts and orc reavers. Gruk Bloodtusk commands the eastern yard.'}[G.location]||'Explore this area and discover its secrets.');
}
function helpMenu(fromTitle=false){showModal(`<h2>ADVENTURER'S MANUAL</h2><p><b>Move:</b> Arrow keys or WASD. <b>Interact:</b> E / Space next to people, doors, chests, or glowing objects.</p><p><b>Menus:</b> I Inventory · P Party/Train · K Spells · J Journal · M Map · Esc Close Menu.</p><p><b>Combat:</b> Select commands and targets by mouse, touch, or number keys 1–9 (Esc to return). Tactics: MANUAL, ATTACK ONLY (no MP), LIMITED MAGIC (preserves 45% MP for critical moments), or ALL-OUT OFFENSE (spends MP on damage). You can switch tactics at any time. A d20 attack succeeds when the total meets or exceeds a foe's Armor Class. A natural 20 doubles damage dice, not flat bonuses; a natural 1 misses. Guard halves damage until your next turn. Battle Cry and Smoke Veil protect through the end of the following round. Poison deals 2 HP at the start of each of your next two turns, or ends sooner when cured.</p><p><b>Survive:</b> Potions heal HP, Moonwater restores MP, inns restore your party. Gain XP from battles; the gold experience bars in PARTY show progress to your next level. Level-ups restore HP/MP and increase your stats.</p><p><b>Objective:</b> Enter the Great Hall to meet Elder Maelin and Elowen; find Rook in the tavern; find the crypt beyond the eastern wilderness; break its two rune-seals.</p><p><b>New adventure:</b> Look for goblin and orc patrols on Gloamwood Road; visit the town crier for repeatable job contracts; and explore Gromclaw Warcamp after completing the Hollow Bell.</p><p><b>Save:</b> Press SAVE outside battles. Progress is kept only in this browser's local storage.</p><div class="choices"><button data-action="settings">SOUND & SETTINGS</button><button data-action="done">${fromTitle?'Return to Title':'Return to Game'}</button></div>`,a=>{if(a==='settings'){titleSettings(null,fromTitle);return}closeModal();if(fromTitle)mainMenu()})}
/* ---------------------------- MAP CREATION ---------------------------- */
function hash(x,y,seed=19){let n=((x*374761393+y*668265263+seed*982451653)|0);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296}
function mapCreate(id,name,w,h,fill){return {id,name,w,h,tiles:Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>fill(x,y))),label:name.toUpperCase()}}
function rect(m,x,y,w,h,t){for(let b=y;b<y+h;b++)for(let a=x;a<x+w;a++)if(a>=0&&b>=0&&a<m.w&&b<m.h)m.tiles[b][a]=t}
function initMaps(){
 const town=mapCreate('town','Havenmere',30,22,(x,y)=>hash(x,y,3)<.16?'grass2':'grass');
 // Havenmere is a planned medieval settlement, not random roads and disconnected blocks.
 // Street hierarchy: High Street links Great Hall -> market square -> south lane;
 // Forge Lane serves the work district, Lantern Row connects inn and bakery;
 // the east trade road goes through an actual town gate to Gloamwood.
 rect(town,13,6,4,16,'path');                 // High Street, north/south
 rect(town,10,11,13,8,'path');                // market square, paved
 rect(town,5,13,8,2,'path');                  // west Forge Lane
 rect(town,10,6,3,8,'path');                  // west linking lane
 rect(town,6,6,7,2,'path');                  // cottages -> High Street
 rect(town,20,6,5,2,'path');                 // bakery frontage
 rect(town,20,6,2,8,'path');                 // eastern Lantern Row
 rect(town,17,12,8,2,'path');                // inn -> market
 rect(town,5,20,22,1,'path');                // southern street
 rect(town,13,17,4,4,'path');                // market -> south street
 rect(town,23,14,6,3,'path');                // east trader's gate
 rect(town,24,13,2,3,'path');                // inn -> east road
 rect(town,18,13,5,6,'path');                // fountain square east
 rect(town,8,18,5,3,'path');                 // tavern -> south lane
 // A warm stone civic plaza is visually distinct from the older cobbled roads.
 for(let y=11;y<=18;y++)for(let x=12;x<=22;x++){
   if(town.tiles[y]?.[x]==='path'&&x!==15&&x!==16)town.tiles[y][x]='plaza';
 }
 // The plaza remains connected to High Street, Lantern Row and Forge Lane.
 // A public fountain anchors the eastern side of the square, leaving open walkways.
 for(let yy=15;yy<=16;yy++)for(let xx=19;xx<=20;xx++)town.tiles[yy][xx]='fountain';
 // Each building has its own illustrated facade and a physically enterable front door.
 town.buildings=[
  {x:11,y:1,w:8,h:6,kind:'GREAT HALL',room:'hall',district:'Civic Quarter'},
  {x:2,y:8,w:7,h:5,kind:'IRON FORGE',room:'smith',district:'Forge Lane'},
  {x:21,y:7,w:7,h:5,kind:'BLUE LANTERN INN',room:'inn',district:'Lantern Row'},
  {x:2,y:16,w:8,h:4,kind:'WAYFARER TAVERN',room:'tavern',district:'South Lane'},
  {x:21,y:16,w:7,h:4,kind:'CHAPEL',room:'chapel',district:'Quiet Quarter'},
  {x:3,y:1,w:6,h:5,kind:'OAK COTTAGE',room:'cottage',district:'North Cottages'},
  {x:21,y:1,w:7,h:5,kind:'MILLSTONE BAKERY',room:'bakery',district:'Lantern Row'}
 ];
 town.buildings.forEach(b=>{rect(town,b.x,b.y,b.w,b.h,'building');b.doorX=b.x+Math.floor(b.w/2);b.doorY=b.y+b.h-1;town.tiles[b.doorY][b.doorX]='door'});
 // Town boundaries are real hedgerows and palisades with a guarded trade-road opening.
 for(let y=0;y<22;y++){town.tiles[y][0]='fence';town.tiles[y][29]='fence'}
 for(let x=0;x<30;x++){town.tiles[0][x]='fence';town.tiles[21][x]='fence'}
 for(let y of [15,16])town.tiles[y][29]='path';
 for(let x=27;x<=29;x++)town.tiles[16][x]='path';
 // Scenery is placed by function: orchards at homes, vendors at the market,
 // anvil/cart by the forge, and lamps at street junctions (not random torches).
 town.props={trees:[[1,2],[9,2],[28,3],[1,17],[28,19]],
  hedges:[[9,4],[2,5],[28,8],[21,18],[2,14],[1,12],[27,18]],
  flowerbeds:[[4,6],[23,6],[22,14],[17,18],[26,17]],
  lamps:[[12,9],[18,10],[9,15],[26,14],[15,19]],
  market:[[11,15]],cart:[[9,10]],guard:[[27,16]],well:[[4,15]],
  benches:[[17,11],[22,15]],banners:[[11,7],[18,7]],
  veggie:[[7,5],[4,13]],crates:[[9,12],[26,12]]};
 const wild=mapCreate('wild','The Gloamwood Road',46,32,(x,y)=>{let h=hash(x,y,5);if(x<2||y<2||x>43||y>29)return 'mountain';const river=21+Math.round(Math.sin((y-16)/7)*3);if(Math.abs(x-river)<=1&&y<29)return 'water';if(x>33&&y<13)return 'mountain';if(y>26&&x<7)return 'mountain';if(h>.79)return 'forest';if(h<.11)return 'grass2';return 'grass'});
 // Guaranteed unobstructed route and river crossing.
 for(let x=5;x<=19;x++){const y=16+Math.round(Math.sin((x-5)/14*Math.PI)*2);rect(wild,x,y,1,2,'path')}rect(wild,19,16,3,2,'path');rect(wild,21,16,3,2,'bridge');rect(wild,24,16,2,7,'path');rect(wild,24,22,16,2,'path');
 rect(wild,6,16,5,2,'path');rect(wild,36,21,3,3,'path');
 rect(wild,11,5,5,3,'grass');rect(wild,31,8,4,4,'grass');rect(wild,23,17,4,5,'grass');
 wild.tiles[16][7]='townGate';wild.tiles[22][37]='cryptGate';
 // Gromclaw road branch: a new warcamp is available after the crypt and for brave early explorers.
 rect(wild,38,22,5,3,'path');wild.tiles[23][42]='townGate';
 const crypt=mapCreate('crypt','Emberfall Crypt',40,30,()=> 'wall');
 const carve=(x,y,w,h)=>rect(crypt,x,y,w,h,'floor');
 carve(2,12,15,6);carve(3,3,15,8);carve(8,10,4,4);carve(3,20,15,8);carve(8,17,4,4);carve(20,3,17,9);carve(15,6,7,4);carve(20,18,17,10);carve(15,14,10,3);carve(22,14,9,4);carve(28,10,4,10);
 crypt.tiles[15][2]='exit';crypt.tiles[23][32]='altar';crypt.tiles[5][8]='rune';crypt.tiles[25][8]='rune';crypt.tiles[21][27]='floor';
 // Four distinct interiors, each with furniture, traversable space, NPCs, and a way out.
 const interiors=[['hall','Havenmere Great Hall','stoneFloor'],['smith','Garrick’s Forge','stoneFloor'],['inn','The Blue Lantern Inn','woodFloor'],['tavern','The Wayfarer Tavern','woodFloor'],['chapel','Sanctuary of the Dawn','stoneFloor'],['cottage','Oak Cottage','woodFloor'],['bakery','The Millstone Bakery','woodFloor']];
 for(const [id,name,floor] of interiors){
  const room=mapCreate(id,name,18,14,()=> 'insideWall');
  rect(room,1,2,16,11,floor);room.tiles[13][8]='exitDoor';room.tiles[12][8]=floor;
  rect(room,2,3,14,1,'wallTrim');
  if(id==='hall'){
   rect(room,5,4,8,3,'rug');room.tiles[4][8]='stoneFloor';
   for(const [x,y] of [[2,4],[15,4],[2,9],[15,9]])room.tiles[y][x]='pillar';
   for(const x of [4,13])room.tiles[2][x]='window';
   for(const x of [4,13])room.tiles[7][x]='books';
   room.tiles[5][8]='stoneFloor';room.tiles[6][8]='stoneFloor';
  }else if(id==='smith'){
   room.tiles[4][13]='forge';room.tiles[5][13]='forge';room.tiles[8][13]='anvil';
   room.tiles[4][3]='rack';room.tiles[5][3]='rack';room.tiles[9][4]='crate';
   rect(room,5,7,5,2,'rug');room.tiles[7][7]='stoneFloor';
  }else if(id==='inn'){
   for(const [x,y] of [[3,4],[13,4],[3,9],[13,9]])room.tiles[y][x]='bed';
   room.tiles[7][13]='hearth';room.tiles[5][8]='table';room.tiles[2][8]='window';
   room.tiles[9][6]='plant';room.tiles[10][12]='plant';
  }else if(id==='tavern'){
   for(const [x,y] of [[4,5],[13,5],[4,9],[13,9]])room.tiles[y][x]='table';
   room.tiles[3][12]='barrel';room.tiles[3][13]='barrel';room.tiles[3][14]='barrel';
   room.tiles[5][15]='hearth';room.tiles[2][5]='window';
   room.tiles[8][8]='woodFloor';
  }else if(id==='chapel'){
   rect(room,6,4,6,3,'rug');room.tiles[5][8]='stoneFloor';room.tiles[4][8]='altar';
   for(const [x,y] of [[3,5],[14,5],[3,9],[14,9]])room.tiles[y][x]='pillar';
   room.tiles[2][5]='window';room.tiles[2][12]='window';room.tiles[10][14]='plant';
  }else if(id==='cottage'){
   room.tiles[4][4]='bed';room.tiles[4][12]='bed';room.tiles[8][4]='hearth';
   room.tiles[6][9]='table';room.tiles[2][5]='window';room.tiles[10][13]='plant';
   room.tiles[8][14]='books';
  }else if(id==='bakery'){
   room.tiles[5][13]='forge';room.tiles[6][13]='hearth';room.tiles[8][6]='table';
   room.tiles[3][4]='rack';room.tiles[3][5]='rack';room.tiles[3][12]='crate';
   room.tiles[9][13]='barrel';room.tiles[2][8]='window';
  }
  window.AshenInteriors?.configure(room);
  maps[id]=room;
 }
 const camp=mapCreate('camp','Gromclaw Warcamp',30,22,(x,y)=>hash(x,y,71)>.77?'grass2':'grass');
 // Palisade gate, central yard, supply tents and warleader's dais.
 for(let x=0;x<30;x++){camp.tiles[0][x]='fence';camp.tiles[21][x]='fence'}
 for(let y=0;y<22;y++){camp.tiles[y][0]='fence';camp.tiles[y][29]='fence'}
 rect(camp,3,9,24,5,'path');rect(camp,15,4,4,16,'path');
 for(const [x,y,w,h] of [[5,4,5,4],[23,5,4,4],[5,15,6,4],[22,15,5,4]])rect(camp,x,y,w,h,'building');
 for(const [x,y] of [[4,8],[13,7],[20,8],[25,14],[13,17]])camp.tiles[y][x]='barrel';
 camp.tiles[10][2]='exit';camp.tiles[10][23]='rune';camp.tiles[8][17]='altar';
 maps.town=town;maps.wild=wild;maps.crypt=crypt;maps.camp=camp;window.AshenScenes?.install(maps);
}
/* ----------------------- EXPLORATION AND EVENTS ----------------------- */
function entities(){if(!G)return [];const base=staticEntities();window.AshenScenes?.observeNPCs(G.location,base);const decorated=window.AshenNPCs&&G.world?window.AshenNPCs.decorate(base,G.world.clock,performance.now()):base;return decorated.concat(window.AshenNPCs?.entities(G.location)||[])}
function staticEntities(){if(!G)return[];
 if(G.location==='town')return [
 {x:10,y:14,name:'Town Crier',kind:'crier',symbol:'i',col:'#c7d4de'},
 {x:23,y:14,name:'Mara, villager',kind:'villager',symbol:'i',col:'#dac6b0'}
 ];
 if(G.location==='hall')return [
 {x:8,y:4,name:'Elder Maelin',kind:'elder',symbol:'!',col:'#e9cba0'},
 ...(!G.party.some(p=>p.name==='Sister Elowen')?[{x:5,y:7,name:'Sister Elowen',kind:'cleric',symbol:'!',col:'#bbaee3'}]:[]),
 {x:13,y:6,name:'Royal Archivist',kind:'archivist',symbol:'i',col:'#add6e1'}
 ];
 if(G.location==='smith')return [
 {x:8,y:5,name:'Garrick, the Smith',kind:'shop',symbol:'!',col:'#e8b777'},
 {x:5,y:9,name:'Forge Apprentice',kind:'apprentice',symbol:'i',col:'#ddaf78'}
 ];
 if(G.location==='inn')return [
 {x:7,y:6,name:'Nessa, Innkeeper',kind:'inn',symbol:'!',col:'#a8d99e'},
 {x:11,y:9,name:'Traveling Pilgrim',kind:'pilgrim',symbol:'i',col:'#d3e2c3'}
 ];
 if(G.location==='chapel')return [
 {x:8,y:6,name:'Brother Caden',kind:'healer',symbol:'!',col:'#f5d8ac'},
 {x:12,y:6,name:'Chapel Acolyte',kind:'acolyte',symbol:'i',col:'#e5ddad'}];
 if(G.location==='cottage')return [
 {x:9,y:5,name:'Farmer Tilda',kind:'resident',symbol:'i',col:'#f5cba9'}];
 if(G.location==='bakery')return [
 {x:8,y:6,name:'Mira, the Baker',kind:'baker',symbol:'!',col:'#f2d39a'},
 {x:12,y:9,name:'Bread Apprentice',kind:'breadApprentice',symbol:'i',col:'#d5b5a4'}];
 if(G.location==='camp')return [{x:2,y:10,name:'Return to Gloamwood',kind:'campExit',symbol:'↩',col:'#ddc495'},...(!G.flags.warboss?[{x:23,y:10,name:'Gruk Bloodtusk',kind:'warboss',symbol:'!',col:'#ee9f7f'}]:[]),...(!G.flags.scouts?[{x:17,y:8,name:'Goblin Sentry',kind:'campScout',symbol:'!',col:'#9dcf78'}]:[])];
 if(G.location==='tavern')return [
 {x:4,y:7,talk:{x:2,y:7},seated:true,name:'Pella, Merchant',kind:'merchant',symbol:'!',col:'#dcae83'},
 ...(!G.party.some(p=>p.name==='Rook')?[{x:13,y:7,talk:{x:11,y:7},seated:true,name:'Rook, Wanderer',kind:'rogue',symbol:'!',col:'#82c6bc'}]:[]),
 {x:8,y:4,talk:{x:8,y:6},behindBar:true,name:'Tavern Keeper',kind:'keeper',symbol:'i',col:'#e0b78d'}
 ];
 if(G.location==='wild')return[
  {x:7,y:16,name:'Havenmere',kind:'townGate',symbol:'↩',col:'#e9d5b0'},
  {x:37,y:22,name:'Crypt Entrance',kind:'cryptGate',symbol:'✦',col:'#faab83'},
  {x:42,y:23,name:'Gromclaw Warcamp',kind:'campGate',symbol:'!',col:'#f3a78a'},
  ...(!G.flags.satchelFound?[{x:24,y:19,name:'Lost Satchel',kind:'satchel',symbol:'?',col:'#f5c886'}]:[]),
  ...(!G.flags.starterChest?[{x:14,y:7,name:'Worn Supply Chest',kind:'starterChest',symbol:'▣',col:'#f4bd78'}]:[]),
  ...(!G.flags.shrine?[{x:33,y:10,name:'Whispering Stone',kind:'shrine',symbol:'✧',col:'#b5b4f9'}]:[])
 ];
 return[
  {x:2,y:15,name:'Exit the Crypt',kind:'exit',symbol:'↩',col:'#d8c6a4'},
  {x:8,y:5,name:'Northern Rune-Seal',kind:'leverA',symbol:G.flags.leverA?'✓':'✧',col:'#87c9ea'},
  {x:8,y:25,name:'Southern Rune-Seal',kind:'leverB',symbol:G.flags.leverB?'✓':'✧',col:'#87c9ea'},
  ...(!G.flags.cryptChestA?[{x:14,y:5,name:'Ancient Sarcophagus',kind:'cryptChestA',symbol:'▣',col:'#f4bd78'}]:[]),
  ...(!G.flags.cryptChestB?[{x:13,y:24,name:'Forgotten Reliquary',kind:'cryptChestB',symbol:'▣',col:'#f4bd78'}]:[]),
  ...(!G.flags.boss?[{x:32,y:23,name:'Altar of the Hollow Bell',kind:'altar',symbol:'!',col:'#ed8a68'}]:[]),
  {x:27,y:21,name:'Obsidian Gate',kind:'gate',symbol:G.flags.gate?'◌':'▣',col:'#cf88a1'}
 ];
}
function walkable(loc,x,y){const m=maps[loc];if(x<0||y<0||x>=m.w||y>=m.h)return false;let t=m.tiles[y][x];if(window.AshenWorldProps?.blocks(loc,x,y)||window.AshenEnvironment?.blocks(m,loc,x,y)||window.AshenArchitecture?.blocks(m,loc,x,y))return false;if(window.AshenInteractions?.blocks(loc,x,y,G?.world))return false;if(window.AshenNPCs?.blocks(loc,x,y))return false;if(['wall','mountain','water','fence','building','fountain','insideWall','wallTrim','pillar','books','forge','anvil','rack','crate','bed','hearth','table','plant','barrel','window'].includes(t))return false;const npc=entities().find(e=>e.x===x&&e.y===y&&!(e.kind==='gate'&&G?.flags.gate)&&['elder','shop','inn','merchant','rogue','cleric','crier','villager','archivist','apprentice','pilgrim','keeper','healer','acolyte','resident','baker','breadApprentice','warboss','campScout','leverA','leverB','altar','gate','satchel','shrine','cryptChestA','cryptChestB','starterChest'].includes(e.kind));if(npc)return false;return true}
function tryMove(dx,dy){if(mode!=='explore'||isOverlay()||!G)return;if(G.world?.seat)window.AshenInteractions?.stand(G.world);G.dir=dx===1?'right':dx===-1?'left':dy===-1?'up':'down';const x=G.x+dx,y=G.y+dy;if(!walkable(G.location,x,y)){SFX.play('bump');return}const previous={location:G.location,x:G.x,y:G.y,dir:G.dir,steps:G.steps,stepCounter,silentSteps:G.party.map(h=>h.silentSteps||0)};lastSpriteStepAt=performance.now();const motionId=G.location+':'+G.party[0].id;window.AshenAnimation?.sample(motionId,G.x,G.y,G.dir,lastSpriteStepAt);window.AshenAnimation?.move(motionId,x,y,G.dir,lastSpriteStepAt);G.x=x;G.y=y;G.steps++;stepCounter++;const silent=G.party.some(h=>h.hp>0&&h.silentSteps>0);G.party.forEach(h=>{if(h.silentSteps>0)h.silentSteps--});updateTownDistrict();
 if(G.location==='town'){
  const entrance=maps.town.buildings.find(b=>b.doorX===x&&b.doorY===y);
  if(entrance){enterBuilding(entrance.room);return}
 }
 if(['hall','smith','inn','tavern','chapel','cottage','bakery'].includes(G.location)&&maps[G.location].tiles[y][x]==='exitDoor'){leaveBuilding();return}
 if(G.location==='town'&&x===28&&y===16){changeMap('wild',9,16);return}if(G.location==='wild'&&x===7&&y===16){changeMap('town',26,16);return}if(G.location==='wild'&&x===37&&y===22){enterCrypt(previous);return}if(G.location==='wild'&&x===42&&y===23){enterCamp(previous);return}if(G.location==='camp'&&x===2&&y===10){changeMap('wild',41,23);return}if(G.location==='crypt'&&x===2&&y===15){changeMap('wild',35,22);return}
 if(G.location==='crypt'&&x===24&&y===15&&!G.flags.trial){G.flags.trial=true;trapCheck();return}
 if(['wild','crypt','camp'].includes(G.location)&&stepCounter>5&&G.steps%4===0&&Math.random()<(G.location==='crypt'?.42:G.location==='camp'?.32:.28)*(silent?.5:1)){stepCounter=0;const pool=G.location==='wild'?['slime','wolf','goblin','orc','bandit']:G.location==='camp'?['goblin','orc','shaman']:['wisp','bone','bat','sentinel'];const n=Math.random()<.48?1:Math.random()<.77?2:3;const types=Array.from({length:n},()=>pool[rand(pool.length)-1]);beginCombat(types)}
 if(G.steps%20===0)saveGame(true);refreshHud();SFX.play('foot');}
function changeMap(loc,x,y){window.AshenInteractions?.stand(G.world);window.AshenAnimation?.clear();G.location=loc;G.x=x;G.y=y;stepCounter=0;fx=[];updateTownDistrict();SFX.play('warp');refreshHud();saveGame(true);toast(maps[loc].name)}
function enterBuilding(room){if(!maps[room])return;changeMap(room,8,10);G.dir='up';uiLog(`Entered ${maps[room].name}.`);toast(`${maps[room].name} · E to speak`)}
function leaveBuilding(){const b=maps.town.buildings.find(b=>b.room===G.location);if(!b)return;changeMap('town',b.doorX,b.doorY+1);G.dir='down'}
function doorHint(){if(!G)return '';if(G.world?.seat)return 'E / MOVE · STAND UP';const dx={left:-1,right:1,up:0,down:0}[G.dir],dy={left:0,right:0,up:-1,down:1}[G.dir];const x=G.x+dx,y=G.y+dy;
 if(G.location==='town'){const b=maps.town.buildings.find(b=>b.doorX===x&&b.doorY===y);if(b)return `E / MOVE · ENTER ${b.kind}`}
 if(['hall','smith','inn','tavern','chapel','cottage','bakery'].includes(G.location)&&x===8&&y===13)return 'E / MOVE · EXIT TO HAVENMERE';
 const faced=window.AshenInteractions?.nearby(G.location,G.x,G.y,dx,dy,G.world);if(faced?.cell[0]===G.x+dx&&faced?.cell[1]===G.y+dy)return window.AshenInteractions.hint(faced,G.world);
 const entity=entities().find(e=>Math.abs((e.talk?.x??e.x)-G.x)+Math.abs((e.talk?.y??e.y)-G.y)<=1);if(entity)return 'E · TALK / INTERACT';const object=window.AshenInteractions?.nearby(G.location,G.x,G.y,dx,dy,G.world);return object?window.AshenInteractions.hint(object,G.world):''}
function locationEntry(loc,x,y,description,origin=null){
 if(!G||mode!=='explore'||isOverlay())return;
 const source=origin||{location:G.location,x:G.x,y:G.y,dir:G.dir,steps:G.steps,stepCounter};
 const art=loc==='crypt'?'assets/overhaul/crypt_arrival.png':'assets/gromclaw_battle.jpg';
 const party=G.party.map((h,i)=>`<img class="arrival-adventurer" style="--party-index:${i}" src="${window.AshenIdentity?.bodyPath(h,'up')||heroPortrait(h)}" alt="${escapeHtml(h.name)} approaching the destination">`).join('');
 showModal(`<section class="location-arrival" style="--arrival-art:url('${art}')" aria-label="${escapeHtml(maps[loc].name)} entry"><div class="arrival-mist" aria-hidden="true"></div><div class="arrival-party">${party}</div><div class="arrival-story"><span>BEYOND THE LANTERN LIGHT</span><h2>${escapeHtml(maps[loc].name)}</h2><p>${description}</p><button data-action="enter">CONTINUE →</button><button data-action="back">← GO BACK</button></div></section>`,action=>{
  closeModal();
  if(action==='enter'){
   if(loc==='crypt')G.flags.ritual=true;
   changeMap(loc,x,y);uiLog(loc==='crypt'?'The door of Emberfall Crypt grinds open.':'You pass beneath the broken banners of Gromclaw.');
  }else{
   G.location=source.location;G.x=source.x;G.y=source.y;G.dir=source.dir;G.steps=source.steps;stepCounter=source.stepCounter;if(source.silentSteps)G.party.forEach((h,i)=>h.silentSteps=source.silentSteps[i]);refreshHud();
  }
 });
 $('modal').setAttribute('data-screen','location-entry');
 $('modal').querySelector('[data-action="enter"]')?.focus({preventScroll:true});
}
function enterCrypt(origin=null){locationEntry('crypt',3,15,'A single iron bell tolls somewhere below, though no rope has moved for a hundred years. Two rune-seals sustain the Warden’s binding. Break them to enter the burial hall.',origin)}
function enterCamp(origin=null){locationEntry('camp',3,10,'Ragged banners stir above the warcamp. Beyond the fires, scouts keep watch while Gruk Bloodtusk gathers the clans. The road grows quiet behind you.',origin)}

function interact(){if(mode!=='explore'||isOverlay()||!G)return;if(G.world?.seat){window.AshenInteractions.stand(G.world);saveGame(true);refreshHud();return}const dx={left:-1,right:1,up:0,down:0}[G.dir],dy={left:0,right:0,up:-1,down:1}[G.dir];if(G.location==='town'){
 const entrance=maps.town.buildings.find(b=>b.doorX===G.x+dx&&b.doorY===G.y+dy);
 if(entrance){enterBuilding(entrance.room);return}
 }
 if(['hall','smith','inn','tavern','chapel','cottage','bakery'].includes(G.location)&&G.x+dx===8&&G.y+dy===13){leaveBuilding();return}
 let nearby=entities().map(e=>({...e,d:Math.abs((e.talk?.x??e.x)-G.x)+Math.abs((e.talk?.y??e.y)-G.y),f:(e.talk?.x??e.x)===G.x+dx&&(e.talk?.y??e.y)===G.y+dy})).filter(e=>e.d<=1).sort((a,b)=>Number(b.f)-Number(a.f)||a.d-b.d);const facedObject=window.AshenInteractions?.nearby(G.location,G.x,G.y,dx,dy,G.world);if(!nearby[0]?.f&&facedObject?.cell[0]===G.x+dx&&facedObject?.cell[1]===G.y+dy&&useEnvironment(dx,dy))return;if(nearby.length){window.AshenNPCs?.talk(nearby[0].id);action(nearby[0].kind);return}if(useEnvironment(dx,dy))return;dialog('THE STILLNESS','You examine your surroundings. The air carries the promise of adventure, but nothing nearby calls for your attention.')}
function lanternRoadProgress(){return ['wild:lantern-west','wild:lantern-bridge','wild:lantern-east'].filter(key=>G?.world?.objects?.[key]?.active).length}
function useEnvironment(dx,dy){
 const object=window.AshenInteractions?.nearby(G.location,G.x,G.y,dx,dy,G.world);if(!object||!G.world)return false;
 if(object.kind==='lantern'&&!G.flags.lanternQuest){dialog('A COLD WAYLANTERN','The lamp is sound, but its firebox bears the sun-mark of Havenmere’s chapel. The acolyte may know why the road has gone dark.');return true}
 const result=window.AshenInteractions.perform(object,G.world,G,(x,y)=>entities().some(e=>e.x===x&&e.y===y));
 if(object.kind==='lantern'&&result.lit){const progress=lanternRoadProgress();uiLog(`The Lantern Road: ${progress} of 3 waylanterns relit.`);SFX.play('magic');if(progress===3)dialog('THE LANTERN ROAD',`${result.text}<br><br>All three waylanterns burn again. Return to the chapel acolyte in Havenmere.`);else toast(`${result.text} ${progress}/3`)}else if(result.inspect)dialog(object.name.toUpperCase(),result.text);else toast(result.text);
 saveGame(true);refreshHud();return true;
}
function action(kind){switch(kind){
 case 'visitor':dialog('WAYFARER TRAVELER','“A warm hearth, a little bread, and a safe road tomorrow. There are worse places to pass the evening.”');return;
 case 'patrol':dialog('HAVENMERE WATCH','“Keep the high street clear. The eastern road grows less forgiving after sunset.”');return;
 case 'elder': if(G.flags.boss&&!G.flags.ending){dialog('ELDER MAELIN','You return with the Ember Shard. Maelin stares into its faint glow. “We can return this power to the earth, or keep it to defend Havenmere. Both choices will echo through the realm.”',[['Seal the shard beneath Havenmere','seal'],['Keep the shard as a guardian','keep'],['I need time to decide','close']],a=>{if(a==='seal'||a==='keep')finishQuest(a)});return}
 if(G.flags.ending){dialog('ELDER MAELIN',G.flags.ending==='seal'?'“The bell is silent, but goblin scouts gather beyond the eastern road. The town crier has new contracts. Investigate the Gromclaw camp.”':'“Guard that light, and watch the eastern road. Gruk Bloodtusk rallies orcs and goblins beneath a broken banner.”');return}
 if(!G.flags.elder){G.flags.elder=true;G.gold+=15;uiLog('Main quest begun: The Hollow Bell. +15 gold.');dialog('ELDER MAELIN','“The dead stir beneath Emberfall Crypt, and the village has heard a bell no living hand has rung. Take this coin for supplies. Find the crypt beyond the eastern road; break its twin rune-seals and silence the Warden. Sister Elowen is here in the hall; you will find Rook at the Wayfarer Tavern.”');saveGame(true);return}
 dialog('ELDER MAELIN','“Find Rook at the tavern, Sister Elowen here in the hall, and supplies at Garrick’s forge. Follow the east road past the Gloamwood bridge. The crypt is marked by a broken monument.”');return;
 case 'shop':shop();return;
 case 'inn':dialog('NESSA — HAVENMERE INN','“A warm hearth, clean linen and tea from the high meadows. All of you may rest here for 12 gold.”',[['Rest — 12 gold','rest'],['Not yet','close']],a=>{if(a==='rest'){if(G.gold<12){toast('Not enough gold.');return}G.gold-=12;G.party.forEach(h=>{h.hp=h.maxHp;h.mp=h.maxMp;h.poison=0});refreshHud();SFX.play('heal');dialog('A PEACEFUL NIGHT','Your wounds mend and your magic returns. For a moment the distant bell is silent.');saveGame(true)}});return;
 case 'merchant': if(G.flags.satchelFound&&!G.flags.satchelReturned){G.flags.satchelReturned=true;G.gold+=48;G.bag.potion=(G.bag.potion||0)+2;delete G.bag.satchel;uiLog('Side quest completed: A Merchant’s Misfortune. +48 gold and 2 potions.');dialog('PELLA — TRAVELING MERCHANT','“You found it! My maps, my grandmother’s ring, everything! Here, please, take some gold and medicines. The Gloamwood is no place for lost cargo.”');saveGame(true)}else dialog('PELLA — TRAVELING MERCHANT',G.flags.satchelReturned?'“You have my gratitude, friend. Take a look at my traveling wares.”':'“I lost a leather satchel by the old stone bridge, east of the village. Return it to me and I’ll reward you. Meanwhile, care to trade?”', [['Browse supplies','trade'],['Leave','close']],a=>{if(a==='trade')shop('traveler')});return;
 case 'rogue':if(G.party.length>=3){dialog('ROOK — ROGUE','“Your group is full. Look for me if you need a scout.”');return}G.party.push(newHero('Rook','Halfling','Rogue'));G.party.at(-1).gear.weapon='iron';uiLog('Rook, a quick-fingered rogue, joins the party.');refreshHud();SFX.play('join');dialog('ROOK — ROGUE','A traveler with a crooked grin flips a dagger in one hand. “Rook. Locks, traps, trouble — I’m your answer. That bell sounds like money and danger. Mostly danger.”<br><br><b>Rook joined your party!</b>');saveGame(true);return;
 case 'cleric':if(G.party.length>=3){dialog('SISTER ELOWEN','“Your group is full. Keep your wounds bound and your hearts steady.”');return}G.party.push(newHero('Sister Elowen','Elf','Cleric',1,null,null,'female'));G.party.at(-1).gear.armor='cloak';uiLog('Sister Elowen, a cleric, joins the party.');refreshHud();SFX.play('join');dialog('SISTER ELOWEN','“The whisper of the dead has reached the sanctuary. I cannot leave the living to face it alone. Let us go together.”<br><br><b>Sister Elowen joined your party!</b>');saveGame(true);return;
 case 'villager':dialog('MARA OF HAVENMERE','“The smith keeps the western forge, and the lanterns still burn at the eastern inn. Do go inside — the nights are getting colder.”');return;
 case 'archivist':dialog('ROYAL ARCHIVIST','“These shelves hold records of five centuries. The oldest mention of the Hollow Bell predates Havenmere itself.”');return;
 case 'apprentice':dialog('FORGE APPRENTICE','“Master Garrick can sell armor and weapons. His forge is loud, but his prices are fair.”');return;
 case 'pilgrim':dialog('TRAVELING PILGRIM','“Nessa’s beds restore both strength and magic. I will not venture east until the bell is silent.”');return;
 case 'keeper':dialog('TAVERN KEEPER','“Pella the merchant lost her satchel, and Rook has been boasting about crypts again. Both are right here in the tavern.”');return;
 case 'healer':dialog('SANCTUARY OF THE DAWN','“All are welcome beneath the dawn. Give what you can, and the wounded shall rise.” Sister Elowen has been preparing herbs and prayers in these halls.',[['Receive a blessing — 12 gold','bless'],['Leave','close']],a=>{if(a==='bless'){if(G.gold<12){toast('Need 12 gold');return}G.gold-=12;G.party.forEach(h=>{h.hp=h.maxHp;h.mp=Math.min(h.maxMp,h.mp+5)});uiLog('The chapel restored party health.');refreshHud();saveGame(true);SFX.play('heal')}});return;
 case 'acolyte':{const progress=lanternRoadProgress();if(G.flags.lanternRoadComplete){dialog('CHAPEL ACOLYTE','“The Lantern Road burns warmly because of you. Even on the darkest watch, Havenmere’s travelers can find their way home.”');return}if(G.flags.lanternQuest&&progress===3){G.flags.lanternRoadComplete=true;G.gold+=30;G.bag.ether=(G.bag.ether||0)+1;uiLog('Side quest completed: The Lantern Road. +30 gold and 1 Moonwater.');refreshHud();saveGame(true);SFX.play('victory');dialog('THE LANTERN ROAD','The acolyte sees three amber lights shining beyond the chapel windows.<br><br>“West road, bridge, and eastern turn—all burning. You have given every late traveler a path home.”<br><br><b>Reward: 30 gold · 1 Moonwater</b>');return}if(G.flags.lanternQuest){dialog('CHAPEL ACOLYTE',`“The road is brighter, but the work is not finished. You have relit <b>${progress} of 3</b> waylanterns. Follow the old stone road east and watch for the sun-mark.”`);return}dialog('CHAPEL ACOLYTE','“Three waylanterns once guided travelers along Gloamwood Road: one west of the woods, one at the old bridge, and one near the eastern turn. The bell’s shadow has left them cold. Will you relight them?”',[['Relight the waylanterns','accept'],['Not yet','close']],a=>{if(a==='accept'){G.flags.lanternQuest=true;uiLog('Side quest begun: The Lantern Road. Relight 3 waylanterns along Gloamwood Road.');refreshHud();saveGame(true);toast('The Lantern Road · 0/3')}});return}
 case 'resident':dialog('FARMER TILDA','“The town has seven doors and seven stories. The cottage is mine, the bakery is Mira’s, the hall belongs to everyone—and the old road belongs to nobody.”');return;
 case 'baker':shop('bakery');return;
 case 'breadApprentice':dialog('BREAD APPRENTICE','“Mira says every adventurer needs a loaf more than a sword. The forge disagrees.”');return;
 case 'crier':jobBoard();return;
 case 'campGate':enterCamp();return;
 case 'campExit':changeMap('wild',41,23);return;
 case 'campScout':dialog('THE GROMCLAW SENTRY','A goblin warhorn shrieks. Two scouts spring from behind the barricade!',[['Fight the scouts','fight'],['Back away','close']],a=>{if(a==='fight')beginCombat(['goblin','goblin'])});return;
 case 'warboss':dialog('GRUK BLOODTUSK — WARLEADER','“The Bell Warden fell, and now my clans claim this road. Come and take it from us, little heroes!” A shaman raises a totem as the orc warleader charges.',[['Battle the warleader','fight'],['Retreat','close']],a=>{if(a==='fight')beginCombat(['warboss','shaman'])});return;
 case 'satchel':G.flags.satchelFound=true;G.bag.satchel=1;uiLog('Found Pella’s lost satchel near the old bridge.');dialog('LOST SATCHEL','Half-buried in bracken lies a leather satchel with the initials P.M. stitched in faded thread. Someone in Havenmere must be missing this.');SFX.play('chest');saveGame(true);return;
 case 'starterChest':G.flags.starterChest=true;G.bag.potion=(G.bag.potion||0)+2;G.gold+=22;uiLog('Opened a worn chest: 2 potions and 22 gold.');dialog('WORN SUPPLY CHEST','Under a rusted clasp you find two healing potions and 22 gold coins. A fortunate discovery.');SFX.play('chest');saveGame(true);return;
 case 'shrine':{const h=G.party[0],score=dice(20),value=score+Math.max(mod(h.stats[3]),mod(h.stats[4]));G.flags.shrine=true;const success=value>=13;if(success){G.bag.ether=(G.bag.ether||0)+3;G.party.forEach(x=>x.mp=x.maxMp)}else G.party.forEach(x=>x.mp=Math.min(x.maxMp,x.mp+3));uiLog(`Whispering Stone: ${score} + modifier = ${value} vs DC 13 — ${success?'success':'failure'}.`);dialog('THE WHISPERING STONE',`An Arcana or Insight check tests the carved runes.<br><br><b>d20 ${score} ${value-score>=0?'+':'−'} ${Math.abs(value-score)} = ${value} vs DC 13.</b><br><br>${success?'The stones part, releasing moonlit water. You gain 3 Moonwater and restore all MP.':'The runes fade. You recover a little MP but the deeper mystery remains.'}`);SFX.play('magic');saveGame(true);return}
 case 'leverA':case 'leverB':{const key=kind;if(G.flags[key]){dialog('BROKEN RUNE-SEAL','The rune has gone cold and its magic is spent.');return}const hero=G.party[0],roll=dice(20),total=roll+Math.max(mod(hero.stats[3]),mod(hero.stats[4]));G.flags[key]=true;const passed=total>=12;if(!passed){G.party.filter(h=>h.hp>0).forEach(h=>h.hp=Math.max(1,h.hp-4));}if(G.flags.leverA&&G.flags.leverB){G.flags.gate=true;uiLog('Both rune-seals shattered. The path to the Warden is open.')}else uiLog(`${kind==='leverA'?'Northern':'Southern'} rune-seal broken.`);dialog('RUNE-SEAL SHATTERED',`You press your palm to the burning sigil.<br><br><b>Arcana / Insight check: d20 ${roll} + ${total-roll} = ${total} vs DC 12.</b><br><br>${passed?'You unravel the magic without harm.':'A burst of ash scorches your party for 4 HP.'}<br><br>${G.flags.gate?'Somewhere in the east, a heavy gate groans open.':'One more seal remains.'}`);SFX.play('magic');refreshHud();saveGame(true);return}
 case 'cryptChestA':G.flags.cryptChestA=true;G.bag.runestaff=(G.bag.runestaff||0)+1;G.bag.ether=(G.bag.ether||0)+2;uiLog('Found a Runestaff and 2 Moonwater.');dialog('ANCIENT SARCOPHAGUS','Behind crumbling stone lies an untouched Runestaff and two vials of Moonwater. The dead seem willing to relinquish them.');SFX.play('chest');saveGame(true);return;
 case 'cryptChestB':G.flags.cryptChestB=true;G.bag.chain=(G.bag.chain||0)+1;G.bag.potion=(G.bag.potion||0)+3;uiLog('Found Chainmail and 3 potions.');dialog('FORGOTTEN RELIQUARY','An engraved chest holds well-preserved Chainmail and three healing potions. No lock could keep out determined adventurers.');SFX.play('chest');saveGame(true);return;
 case 'gate':dialog('OBSIDIAN GATE',G.flags.gate?'The blackstone portal hangs open. Broken sigils smolder along its archway.':'The gate is wrapped in two blazing rune-circles. Both rune-seals must be broken before the Warden can be challenged.');return;
 case 'altar':if(!G.flags.gate){dialog('THE HOLLOW BELL','Before the altar, a towering shape waits behind crimson wards. The binding is too strong. Find and break the northern and southern rune-seals first.');return}dialog('THE HOLLOW BELL','A towering armored figure rises from the ashes. Above it hangs the Hollow Bell, silent and cracked. “NONE SHALL UNMAKE MY VIGIL.”',[['Face the Bell Warden','fight'],['Retreat for now','close']],a=>{if(a==='fight')beginCombat(['boss'])});return;
 case 'exit':changeMap('wild',35,22);return;
 case 'townGate':changeMap('town',26,16);return;
 case 'cryptGate':enterCrypt();return;
 }}
function trapCheck(){const scout=alive().find(h=>h.role==='Rogue')||alive()[0];if(!scout)return;const trained=scout.role==='Rogue',perception=dice(20),p=perception+mod(scout.stats[trained?1:4])+(trained?prof(scout):0);const defused=p>=13;let dmg=0,save=0;if(!defused){const victim=alive()[0];save=dice(20)+mod(victim.stats[1]);dmg=save>=12?4:9;victim.hp=Math.max(1,victim.hp-dmg)}uiLog(`Spike trap: ${trained?'Disarm Traps':'Perception'} ${p} vs DC 13; ${defused?'disarmed':'triggered'}.`);dialog('A HIDDEN TRAP',`Old masonry shifts beneath your boots. ${scout.name} makes ${trained?'a Disarm Traps (DEX + proficiency)':'a Perception'} check.<br><br><b>${perception} + ${p-perception} = ${p} vs DC 13.</b><br><br>${defused?'You spot a pressure plate and disable its spring mechanism.':`Hidden darts strike! A Dexterity saving throw is ${save} vs DC 12. Your front adventurer takes ${dmg} damage.`}`);refreshHud();saveGame(true)}
function finishQuest(choice){
 G.flags.ending=choice;G.gold+=150;
 uiLog(`Chapter I completed: ${choice==='seal'?'The Shard was sealed.':'The Shard was entrusted to your party.'} +150 gold.`);
 SFX.play('victory');
 const ending=choice==='seal'?'As the shard sinks beneath the oldest oak, the blighted wind lifts. The bells of Havenmere ring for the living once more.':'You pledge to defend Havenmere with the Ember Shard. The people sleep easier — for now.';
 dialog('CHAPTER I COMPLETE',`${ending}<br><br><b>You completed The Hollow Bell! +150 gold.</b><br><br><img class="chapter-illustration" src="${imagePath('warband_story.jpg')}" alt="The Gromclaw warband rises in ruined fortifications"><br><b>NEW: CHAPTER II — THE BROKEN BANNER</b><br>Goblin and orc warbands threaten the eastern Gloamwood Road. Travel to Gromclaw Warcamp and confront Gruk Bloodtusk. Check the town crier for bounty jobs.`);
 refreshHud();saveGame(true)
}
function jobBoard(){
 G.jobs=G.jobs||{goblin:{state:'none',count:0},orc:{state:'none',count:0}};
 const posters=[['goblin','Goblin Scout Bounty','Defeat 3 goblin scouts.',3,65,48],['orc','Orc Patrol Contract','Defeat 2 orc reavers.',2,100,75]];
 showModal(`<h2>HAVENMERE JOB BOARD</h2><p>The town crier pins two fresh bounties to the noticeboard. Jobs remain available after the crypt adventure and can be repeated.</p><div class="scroll">${posters.map(([id,name,desc,goal,gold,xp])=>{const j=G.jobs[id]||{state:'none',count:0};return `<div class="shoprow"><div><strong>${name}</strong><small>${desc} · Progress ${Math.min(goal,j.count)}/${goal} · Reward ${gold} gold + ${xp} XP per hero</small></div><button data-action="job:${id}">${j.state==='active'?(j.count>=goal?'CLAIM':'TRACK'):'ACCEPT'}</button></div>`}).join('')}</div><p>After the Hollow Bell, investigate <b>Gromclaw Warcamp</b> beyond the eastern Gloamwood road.</p><div class="choices"><button data-action="close">Leave Noticeboard</button></div>`,a=>{if(a==='close'){closeModal();return}const id=a.slice(4),cfg=posters.find(x=>x[0]===id);if(!cfg)return;let job=G.jobs[id]||{state:'none',count:0};if(job.state!=='active'){job={state:'active',count:0};G.jobs[id]=job;uiLog(`${cfg[1]} accepted.`);toast('Contract accepted');}else if(job.count>=cfg[3]){G.gold+=cfg[4];G.party.forEach(h=>{h.xp+=cfg[5];h.xpTotal=(h.xpTotal||0)+cfg[5];while(h.xp>=levelThreshold(h.level)){h.xp-=levelThreshold(h.level);levelUp(h)}});G.jobs[id]={state:'none',count:0};uiLog(`Contract complete: ${cfg[1]}! +${cfg[4]} gold, +${cfg[5]} XP.`);toast('Bounty paid');}else toast('Keep hunting: '+Math.max(0,cfg[3]-job.count)+' remaining');saveGame(true);refreshHud();jobBoard()});
}
/* ---------------------- INVENTORY, MENUS & SHOP ---------------------- */
function shop(vendor='forge',tab='buy'){
 if(!G)return;
 const catalog={forge:['potion','ether','salve','iron','oakbow','runestaff','chain','cloak','silvermail'],bakery:['ration','potion','salve'],traveler:['ration','potion','ether','salve','elixir','oakbow','cloak']};
 const names={forge:'GARRICK’S FORGE',bakery:'MILLSTONE BAKERY',traveler:'PELLA’S TRADING POST'};
 const stock=(catalog[vendor]||catalog.forge);
 const saleItems=Object.keys(G.bag).filter(id=>G.bag[id]>0&&ITEMS[id]&&ITEMS[id].price>0&&ITEMS[id].kind!=='quest');
 const items=tab==='buy'?stock:saleItems;
 const rows=items.map(id=>{
  const it=ITEMS[id],price=tab==='buy'?it.price:Math.max(1,Math.floor(it.price*.5)),owned=G.bag[id]||0;
  const maxQty=tab==='buy'?Math.max(0,Math.min(99,Math.floor(G.gold/price))):Math.min(99,owned);
  return `<div class="trade-row"><div class="trade-item"><strong>${escapeHtml(it.name)}</strong><small>${escapeHtml(it.description)}</small><em>${tab==='sell'?'OWNED '+owned+' · ':'OWNED '+owned+' · '}${tab==='buy'?'PRICE':'SELL VALUE'} ${price}G each</em></div><div class="trade-controls"><button data-action="minus:${id}" aria-label="Remove one ${escapeHtml(it.name)}">−</button><input id="trade-${id}" type="number" min="1" max="${Math.max(1,maxQty)}" value="1" aria-label="Quantity ${escapeHtml(it.name)}"/><button data-action="plus:${id}" aria-label="Add one ${escapeHtml(it.name)}">+</button><button class="trade-submit" data-action="${tab}:${id}" ${maxQty<1?'disabled':''}>${tab==='buy'?'BUY':'SELL'}</button></div></div>`
 }).join('');
 showModal(`<div class="trade-screen"><header class="trade-header"><span>HAVENMERE COMMERCE</span><h2>${names[vendor]||names.forge}</h2><p>Purchase supplies in bulk, sell spare equipment, and prepare your party for the road.</p><div class="trade-purse">YOUR PURSE <b>${G.gold} GOLD</b></div></header><nav class="trade-tabs"><button class="${tab==='buy'?'selected':''}" data-action="tab:buy">BUY GOODS</button><button class="${tab==='sell'?'selected':''}" data-action="tab:sell">SELL INVENTORY</button></nav><div class="trade-list">${rows||'<p class="empty-trade">You have nothing available to sell.</p>'}</div><footer class="trade-footer"><span>Sell prices: 50% of shop value. Equipped gear must be unequipped before selling.</span><button data-action="leave">LEAVE SHOP</button></footer></div>`,a=>{
  if(a==='leave'){closeModal();return}
  if(a.startsWith('tab:')){shop(vendor,a.slice(4));return}
  const [op,id]=a.split(':'),it=ITEMS[id];if(!it)return;
  const field=document.getElementById('trade-'+id),unit=op==='sell'?Math.max(1,Math.floor(it.price*.5)):it.price;
  const allowed=op==='sell'?Math.min(99,G.bag[id]||0):Math.min(99,Math.floor(G.gold/unit));
  const qty=Math.max(1,Math.min(allowed,Math.floor(Number(field?.value)||1)));
  if(op==='plus'||op==='minus'){if(field)field.value=Math.max(1,Math.min(Math.max(1,allowed),Number(field.value||1)+(op==='plus'?1:-1)));return}
  if(!['buy','sell'].includes(op)||allowed<1||qty<1){toast('Transaction unavailable.');return}
  if(op==='buy'){if(qty*unit>G.gold){toast('Not enough gold.');return}G.gold-=qty*unit;G.bag[id]=(G.bag[id]||0)+qty;}
  else{if(qty>(G.bag[id]||0)){toast('Not enough in your bag.');return}G.bag[id]-=qty;if(!G.bag[id])delete G.bag[id];G.gold+=qty*unit;}
  uiLog(`${op==='buy'?'Purchased':'Sold'} ${qty} × ${it.name} for ${qty*unit} gold.`);toast(`${op==='buy'?'Bought':'Sold'} ${qty} × ${it.name} · ${qty*unit} gold`);SFX.play('coin');refreshHud();saveGame(true);shop(vendor,tab);
 });
}
function equippedCards(){return '<div class="equipped-party">'+G.party.map(h=>`<article class="equipped-character"><header><img src="${heroPortrait(h)}" alt=""><div><b>${escapeHtml(h.name)}</b><small>${h.ancestry} ${h.role} · AC ${armorClass(h)}</small></div></header>${['weapon','armor'].map(slot=>{const id=h.gear[slot],item=ITEMS[id];return `<div class="equipped-slot"><div><span>${slot.toUpperCase()}</span><strong>${item?item.name:slot==='weapon'?'Unarmed':'No armor'}</strong><small>${item?item.description:'No equipment bonus'}</small></div>${item?`<button data-action="unequip:${h.id}:${slot}" aria-label="Unequip ${item.name} from ${escapeHtml(h.name)}">REMOVE</button>`:''}</div>`}).join('')}</article>`).join('')+'</div>'}
function inventory(){if(!G)return;const entries=Object.entries(G.bag).filter(([id,q])=>q>0&&ITEMS[id]);let html=`<h2>ADVENTURER'S SATCHEL</h2><p><span class="gold">${G.gold} gold</span> · Supplies can be used outside combat, equipment can be assigned to any party member.</p>${equippedCards()}<h3>SHARED SUPPLIES</h3><div class="scroll">`;
 html+=entries.length?entries.map(([id,q])=>`<div class="itemrow"><div><strong>${ITEMS[id].name} ×${q}</strong><small>${ITEMS[id].description}</small></div>${ITEMS[id].kind==='quest'?'<span class="muted">QUEST</span>':`<button data-action="use:${id}">${ITEMS[id].kind==='gear'?'EQUIP':'USE'}</button>`}</div>`).join(''):'<p>Your satchel is empty.</p>';
 html+='</div><div class="choices"><button data-action="close">Back to the World</button></div>';
 showModal(html,a=>{if(a==='close'){closeModal();return}if(a.startsWith('unequip:')){if(mode!=='explore')return;const[,id,slot]=a.split(':'),hero=G.party.find(h=>h.id===id);if(!hero||!['weapon','armor'].includes(slot)||!hero.gear[slot])return;const item=hero.gear[slot];G.bag[item]=(G.bag[item]||0)+1;hero.gear[slot]=null;saveGame(true);refreshHud();inventory();return}if(a.startsWith('use:')){const id=a.split(':')[1];pickMember(id,false)}})
}
function pickMember(id,inBattle){const item=ITEMS[id];if(!item||!G.bag[id]){toast('You have none of those left.');return}showModal(`<h2>${item.kind==='gear'?'EQUIP':'USE'} ${item.name.toUpperCase()}</h2><p>${item.description} Choose a party member.</p><div class="choices">${G.party.map((h,i)=>`<button data-action="member:${i}">${escapeHtml(h.name)} — ${h.role} · HP ${h.hp}/${h.maxHp} · MP ${h.mp}/${h.maxMp}${item.kind==='gear'?' · '+(h.gear[item.slot]?ITEMS[h.gear[item.slot]].name:'No '+item.slot):''}</button>`).join('')}<button data-action="cancel">Cancel</button></div>`,a=>{if(a==='cancel'){closeModal();if(inBattle)renderCombatMenu();else inventory();return}const index=Number(a.split(':')[1]);if(inBattle){closeModal();combatUseItem(index,id)}else{const ok=applyItem(G.party[index],id);if(ok){G.bag[id]--;if(!G.bag[id])delete G.bag[id];SFX.play('heal');saveGame(true)}inventory();refreshHud()}})
}
function applyItem(hero,id){if(!hero||!Object.hasOwn(ITEMS,id))return false;if(hero.hp<=0){toast('Unconscious allies cannot use this item.');return false}const item=ITEMS[id];if(item.kind==='gear'){const old=hero.gear[item.slot];if(old){G.bag[old]=(G.bag[old]||0)+1}hero.gear[item.slot]=id;toast(`${hero.name} equipped ${item.name}`);return true}if(id==='ration'){const targets=G.party.filter(h=>h.hp>0&&h.hp<h.maxHp);if(!targets.length){toast('Your party is already healthy.');return false}targets.forEach(h=>h.hp=Math.min(h.maxHp,h.hp+7));toast('Your party shares travel rations (+7 HP).');return true}if(id==='elixir'){if(hero.hp===hero.maxHp){toast('HP is already full.');return false}hero.hp=Math.min(hero.maxHp,hero.hp+35);toast(`${hero.name} recovered 35 HP`);return true}if(id==='potion'){if(hero.hp===hero.maxHp){toast('HP is already full.');return false}hero.hp=Math.min(hero.maxHp,hero.hp+17);toast(`${hero.name} recovered HP`);return true}if(id==='ether'){if(hero.mp===hero.maxMp){toast('MP is already full.');return false}hero.mp=Math.min(hero.maxMp,hero.mp+9);toast(`${hero.name} recovered MP`);return true}if(id==='salve'){if(!hero.poison&&hero.hp===hero.maxHp){toast('No treatment needed.');return false}hero.poison=0;hero.hp=Math.min(hero.maxHp,hero.hp+4);toast(`${hero.name} recovered`);return true}return false}
function partyMenu(){
 if(!G)return;G.party.forEach(ensureProgress);
 const cards=G.party.map(h=>`<article class="roster-card"><img src="${heroPortrait(h)}" alt="${escapeHtml(h.role)} portrait"><div class="roster-detail"><span class="roster-class">LV ${h.level} · ${h.ancestry.toUpperCase()} ${h.role.toUpperCase()}</span><h3>${escapeHtml(h.name)}</h3><div class="roster-meters"><span>HP ${h.hp}/${h.maxHp}</span><span>MP ${h.mp}/${h.maxMp}</span><span>AC ${armorClass(h)}</span></div><p>${knownAbilities(h).map(a=>a.name).join(' · ')}</p><small>Weapon: ${ITEMS[h.gear.weapon]?.name||'Unarmed'} · Armor: ${ITEMS[h.gear.armor]?.name||'None'}</small><small>${ABILS.map((a,i)=>a+' '+h.stats[i]).join(' · ')}</small><small>${h.ancestryRuleSet==='legacy-v1'?'Ancestry (legacy)':'Ancestry'}: ${bonusSummary(h.ancestryModifiers||ANCESTRIES[h.ancestry].stats)} · Class: ${bonusSummary(h.classModifiers||CLASS_TRAINING[h.role].stats)}</small><div class="roster-xp"><i style="width:${clamp(100*h.xp/levelThreshold(h.level),0,100)}%"></i></div><small>XP ${h.xp} / ${levelThreshold(h.level)} · ${h.talentPoints} TRAINING POINT${h.talentPoints===1?'':'S'}</small></div><button data-action="train:${h.id}">TRAIN →</button></article>`).join('');
 showModal(`<div class="roster-screen"><header class="train-title"><span>THE ADVENTURER'S GUILD</span><h2>YOUR PARTY</h2><p>Develop each adventurer, learn new techniques, and prepare for the next encounter.</p></header><div class="roster-list">${cards}</div><footer class="train-footer"><span>Select TRAIN to invest level-up points.</span><div><button data-action="formation">PARTY FORMATION</button><button data-action="spells">OPEN GRIMOIRE</button><button data-action="close">RETURN TO GAME</button></div></footer></div>`,a=>{if(a==='close'){closeModal();return}if(a==='formation'){formationMenu();return}if(a==='spells'){spellbook();return}if(a.startsWith('train:'))talentMenu(a.slice(6))});
}

function setFormation(id,row){
 if(!G||mode!=='explore'||!['front','back'].includes(row))return false;
 const hero=G.party.find(h=>h.id===id);if(!hero)return false;
 hero.row=row;saveGame(true);refreshHud();return true;
}
function formationMenu(){
 if(!G||mode!=='explore')return;
 const cards=G.party.map(h=>`<article class="formation-member"><img src="${heroPortrait(h)}" alt=""><div><h3>${escapeHtml(h.name)}</h3><small>${h.role} · AC ${armorClass(h)} · HP ${h.hp}/${h.maxHp}</small><div class="formation-switch" role="group" aria-label="${escapeHtml(h.name)} formation">${['front','back'].map(row=>`<button data-action="row:${escapeHtml(h.id)}:${row}" aria-pressed="${Formation.row(h)===row}">${row==='front'?'◆ FRONT ROW':'◇ BACK ROW'}</button>`).join('')}</div></div></article>`).join('');
 showModal(`<section class="formation-screen"><span class="settings-eyebrow">PREPARE FOR BATTLE</span><h2>PARTY FORMATION</h2><p>Choose who holds the line. Formation never changes initiative: each round uses d20 + DEX modifier.</p><div class="formation-rules"><div><h3>◆ FRONT ROW</h3><p>Visible, conscious defenders draw four times the melee attention and shield rear allies from 25% of melee damage.</p></div><div><h3>◇ BACK ROW</h3><p>While screened, close-range attacks take −2 to hit. Bows and spells work normally. Enemy magic, flying attacks and area attacks bypass the screen.</p></div></div><div class="formation-roster">${cards}</div><p class="formation-note">If no front-row ally can defend, everyone is exposed and the rear melee penalty ends. Hidden allies cannot hold the line. Placement is saved immediately.</p><div class="choices"><button data-action="party">← YOUR PARTY</button><button data-action="close">RETURN TO GAME</button></div></section>`,a=>{if(a==='close'){closeModal();return}if(a==='party'){partyMenu();return}if(a.startsWith('row:')){const split=a.lastIndexOf(':'),id=a.slice(4,split),row=a.slice(split+1);if(setFormation(id,row)){formationMenu();Array.from($('modal').querySelectorAll('[data-action]')).find(b=>b.dataset.action===a)?.focus({preventScroll:true})}}});
}
function journalMenu(){if(!G)return;const lanterns=lanternRoadProgress(),lanternText=G.flags.lanternRoadComplete?'Completed! Three amber lights guide travelers safely through Gloamwood.':G.flags.lanternQuest?(lanterns===3?'All 3 waylanterns are lit. Return to the chapel acolyte in Havenmere.':`Relight the waylanterns along Gloamwood Road. Progress: ${lanterns}/3.`):'Speak with the chapel acolyte about the darkened lamps along Gloamwood Road.';showModal(`<h2>ADVENTURER'S JOURNAL</h2><h3>MAIN QUEST: ${questTitle()}</h3><p>${objective()}</p><div class="rule"></div><h3>SIDE QUEST: A Merchant's Misfortune</h3><p>${G.flags.satchelReturned?'Completed! Pella has her satchel again.':G.flags.satchelFound?'Return the lost satchel to Pella in Havenmere.':'Pella the merchant lost a satchel near the bridge along the eastern road.'}</p><h3>SIDE QUEST: The Lantern Road</h3><p>${lanternText}</p><h3>CHAPTER II: THE BROKEN BANNER</h3><p>${G.flags.warboss?'Gruk Bloodtusk is defeated. The eastern road is safe.':G.flags.ending?'Find Gromclaw Warcamp beyond the eastern road. The goblins and orcs are organizing under Gruk Bloodtusk.':'A new threat is brewing east of Havenmere. Finish the Hollow Bell to learn more.'}</p><h3>JOBS</h3><p>Goblin scouts ${G.jobs?.goblin?.count||0}/3 · Orc reavers ${G.jobs?.orc?.count||0}/2. Accept and claim bounties from the town crier.</p><h3>YOUR JOURNEY</h3><p>Encounters: ${G.battles} · Steps: ${G.steps} · Rune-seals: ${Number(G.flags.leverA)+Number(G.flags.leverB)} of 2 · Boss: ${G.flags.boss?'Defeated':'Unbeaten'}</p><p>Choice: ${G.flags.ending==='seal'?'The shard was sealed.':G.flags.ending==='keep'?'The shard was kept.':'Not yet made.'}</p><h3>RECENT CHRONICLE</h3><div class="scroll">${G.log.map(x=>`<div class="logrow">${escapeHtml(x)}</div>`).join('')}</div><div class="choices"><button data-action="close">Return to Game</button></div>`,()=>closeModal())}
function mapMenu(){if(!G)return;const loc=G.location;showModal(`<h2>THE CARTOGRAPHER'S MAP</h2><p>${maps[loc].name} — your position is marked in gold. Important points of interest glow with white stars.</p><canvas id="miniMap" width="360" height="208" style="width:100%;height:auto;image-rendering:pixelated;border:1px solid #6a6b6f;background:#0e1420"></canvas><p>${loc==='town'?'Enter the GREAT HALL to find Maelin and Elowen. The FORGE sells equipment, the INN restores HP and MP, and the TAVERN holds Rook and Pella.':loc==='wild'?'Havenmere lies in the west. The broken monument outside Emberfall Crypt stands in the eastern wilds. Follow the old stone road.':'One rune-seal sleeps in the northern chamber and one in the southern chamber. The Warden waits within the eastern burial hall.'}</p><div class="choices"><button data-action="close">Return to Game</button></div>`,()=>closeModal());const mc=$('miniMap'),c=mc.getContext('2d'),m=maps[loc],scale=Math.min(350/m.w,198/m.h);const offX=(360-m.w*scale)/2,offY=(208-m.h*scale)/2;for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){c.fillStyle=tileColor(m.tiles[y][x]);c.fillRect(offX+x*scale,offY+y*scale,Math.ceil(scale),Math.ceil(scale))}entities().forEach(e=>{c.fillStyle='#f6ead0';c.fillRect(offX+e.x*scale,offY+e.y*scale,Math.max(2,scale),Math.max(2,scale))});c.fillStyle='#ffd05a';c.fillRect(offX+G.x*scale-1,offY+G.y*scale-1,Math.max(4,scale+2),Math.max(4,scale+2))}
/* -------------------------- COMBAT ENGINE -------------------------- */
function armorClass(hero){return 10+mod(hero.stats[1])+(hero.gear.armor?ITEMS[hero.gear.armor].bonus:0)+(hero.talents?.ward||0)}
function prof(hero){return 2+Math.floor((hero.level-1)/4)}
function weaponBonus(hero){return (hero.gear.weapon?ITEMS[hero.gear.weapon].bonus:0)+(hero.talents?.might||0)}
function spellDamageBonus(hero){return (ITEMS[hero.gear.weapon]?.spellBonus||0)+(hero.talents?.focus||0)}
function isDefending(unit){return !!unit.defending||!!(combat&&unit.protectedThroughRound>=combat.round)}
function clearCombatProtection(){for(const h of G?.party||[]){h.defending=false;delete h.hidden;delete h.hideTotal;delete h.protectedThroughRound}}
function endCombat(){
  window.AshenSprites?.clear();
  cancelAutoTurn();combatSession++;clearTimeout(enemyTimer);enemyTimer=null;
  mode='explore';combat=null;combatAnimating=false;battleFX=null;battleNumbers=[];
  battleMenu='commands';currentTargetAction=null;highlightedTarget=null;clearCombatProtection();renderCombatMenu();
}
function attackMod(hero,magic=false){return mod(hero.stats[magic?(hero.role==='Cleric'?4:3):(hero.role==='Rogue'?1:0)])}
function beginCombat(types){
 if(!G||mode!=='explore'||!Array.isArray(types)||!types.length)return;
 window.AshenSprites?.clear();
 window.AshenSprites?.prepare([...types,...G.party.map(h=>h.role.toLowerCase())]);
 window.AshenCharacterMotion?.prepare(G.party,'combat');
 clearTimeout(toastTimeout);$('toast').classList.remove('show');stopTouchMove();
 clearCombatProtection();mode='combat';closeModal();combatSession++;cancelAutoTurn();combatTactic='manual';combatAnimating=false;battleFX=null;battleNumbers=[];battleMenu='commands';
 combat={enemies:types.map((type,i)=>({...BESTIARY[type],id:'e'+i,original:type,maxHp:BESTIARY[type].hp,hp:BESTIARY[type].hp})),queue:[],turn:0,round:0,log:[],isBoss:types.includes('boss')||types.includes('warboss'),bossType:types.includes('warboss')?'warboss':types.includes('boss')?'boss':null};
 G.battles++;uiLog(`Encountered ${types.map(t=>BESTIARY[t].name).join(' and ')}.`);SFX.play('battle');startRound();refreshHud();
}
const COMBAT_EVENT_TYPES={info:'Encounter',round:'Round',action:'Ability',hit:'Hit',miss:'Miss',critical:'Critical',heal:'Healing',status:'Status',death:'Fallen',item:'Item'};
function combatLog(s,important=false,event={}){
  if(!combat)return;
  const type=Object.hasOwn(COMBAT_EVENT_TYPES,event.type)?event.type:'info';
  combat.eventSequence=(combat.eventSequence||0)+1;
  combat.log.unshift({...event,s,important,type,id:combat.eventSequence,round:combat.round});
  combat.log=combat.log.slice(0,100);renderCombatMenu();refreshHud();
}
function startRound(){if(!combat||mode!=='combat')return;combat.round++;for(const h of G.party){if(h.protectedThroughRound<combat.round)delete h.protectedThroughRound}combat.queue=[...alive().map(a=>({side:'ally',id:a.id,roll:dice(20)+mod(a.stats[1])})),...combat.enemies.filter(e=>e.hp>0).map(e=>({side:'enemy',id:e.id,roll:dice(20)+e.dex}))].sort((a,b)=>b.roll-a.roll);combat.turn=0;if(combat.round===1)combatLog('Initiative rolled! Choose actions when your character is ready.',true,{type:'round'});else combatLog(`Round ${combat.round} begins.`,false,{type:'round'});processTurn()}
function activeUnit(){if(!combat)return null;const q=combat.queue[combat.turn];if(!q)return null;return q.side==='ally'?G.party.find(h=>h.id===q.id):combat.enemies.find(e=>e.id===q.id)}
function processTurn(){
  if(mode!=='combat'||!combat)return;
  if(combat.enemies.every(e=>e.hp<=0)){winCombat();return}
  if(alive().length===0){loseCombat();return}
  if(combat.turn>=combat.queue.length){startRound();return}
  const q=combat.queue[combat.turn],unit=activeUnit();
  if(!unit||unit.hp<=0){combat.turn++;processTurn();return}
  const turnKey=combat.round+':'+combat.turn;
  if(combat.startedTurn===turnKey)return;combat.startedTurn=turnKey;
  if(q.side==='ally'){
    unit.defending=false;
    if(unit.poison>0){
      unit.poison--;unit.hp=Math.max(0,unit.hp-2);
      markDamage(unit,2,'ally');
      combatLog(`${unit.name} suffers 2 poison damage (${unit.poison} turn(s) remaining).`,false,{type:'status',target:unit.name,amount:2});
      if(unit.hp<=0){combatLog(`${unit.name} falls!`,true,{type:'death',target:unit.name});combat.turn++;processTurn();return}
    }
    renderCombatMenu();scheduleAutoTurn();
  }else{cancelAutoTurn();renderCombatMenu();clearTimeout(enemyTimer);enemyTimer=setTimeout(enemyAct,700)}
}
function nextTurn(){if(mode!=='combat')return;combat.turn++;refreshHud();processTurn()}
function battlePanel(html){
  const panel=$('battlePanel'),history=panel.querySelector('.battlehistory');
  const focused=document.activeElement;
  const focusCommand=panel.contains?.(focused)?focused?.dataset?.c:null;
  const focusTactic=panel.contains?.(focused)?focused?.dataset?.tactic:null;
  const focusHistory=!!history&&focused===history;
  panel.classList.remove('hidden');panel.innerHTML=html;
  // Keep the live log node and its scroll position when commands/turns change.
  if(history)panel.querySelector('.battlehistory').replaceWith(history);
  if(focusHistory)history.focus({preventScroll:true});
  panel.querySelectorAll('[data-c]').forEach(btn=>{
    btn.onclick=()=>battleAction(btn.dataset.c);
    const target=btn.dataset.c.startsWith('target:')||btn.dataset.c.startsWith('ally:')?btn.dataset.c.split(':')[1]:null;
    btn.onpointerenter=btn.onfocus=()=>{highlightedTarget=target;if(target)renderBattleTarget(target);if(btn.dataset.preview)renderBattleActionInspector(btn.dataset.preview)};
    btn.onpointerleave=btn.onblur=()=>{highlightedTarget=null};
  });
  panel.querySelectorAll('[data-nav],[data-action-card]').forEach(btn=>btn.onclick=()=>battleAction(btn.dataset.nav||btn.dataset.actionCard));
  panel.querySelectorAll('[data-preview]').forEach(btn=>{btn.addEventListener('pointerenter',()=>renderBattleActionInspector(btn.dataset.preview));btn.addEventListener('focus',()=>renderBattleActionInspector(btn.dataset.preview))});
  const inspectToggle=panel.querySelector('[data-inspect-toggle]');if(inspectToggle)inspectToggle.onclick=()=>inspectToggle.setAttribute('aria-expanded',panel.querySelector('.battle-controls').classList.toggle('show-action-detail'));
  panel.querySelectorAll('[data-tactic]').forEach(btn=>btn.onclick=()=>setCombatTactic(btn.dataset.tactic));
  if(focusCommand||focusTactic){
    const buttons=Array.from(panel.querySelectorAll('button'));
    const next=buttons.find(b=>focusCommand?b.dataset.c===focusCommand:b.dataset.tactic===focusTactic);
    (next&&!next.disabled?next:buttons.find(b=>b.dataset.c&&!b.disabled))?.focus({preventScroll:true});
  }
}
function renderCombatEvents(){
  const history=$('battlePanel').querySelector('.battlehistory');if(!history)return;
  const following=!history.dataset.session||history.dataset.session!==String(combatSession)||history.scrollHeight-history.scrollTop-history.clientHeight<24;
  if(history.dataset.session!==String(combatSession)){history.replaceChildren();history.dataset.session=String(combatSession);history.dataset.lastEvent='0'}
  const last=Number(history.dataset.lastEvent||0);
  for(const event of combat.log.slice().reverse().filter(e=>e.id>last)){
    const label=COMBAT_EVENT_TYPES[event.type]||COMBAT_EVENT_TYPES.info;
    const outcome=event.actor&&event.target&&['hit','critical','miss'].includes(event.type)
      ?`${event.actor} → ${event.target}${event.amount!==undefined?' · '+event.amount+' damage':''}`:event.s;
    const detail=event.actor&&event.target&&event.roll!==undefined?`d20 ${event.roll}${event.advantage?' · advantage':''} + ${event.attackBonus} = ${event.total} vs AC ${event.armor}${event.detail?' · '+event.detail:''}`:event.detail;
    history.insertAdjacentHTML('beforeend',`<li class="combat-event event-${event.type}${event.important?' event-important':''}" data-event-id="${event.id}"><span class="event-kind">${label}</span><div class="event-copy"><span>${escapeHtml(outcome)}</span>${detail?`<small>${escapeHtml(detail)}</small>`:''}</div><span class="event-round" title="Round ${event.round}">R${event.round}</span></li>`);
  }
  while(history.children.length>100)history.firstElementChild.remove();
  history.dataset.lastEvent=String(combat.eventSequence||0);
  if(following)history.scrollTop=history.scrollHeight;
  const follow=$('battlePanel').querySelector('[data-log-follow]');
  if(follow)follow.onclick=()=>{history.scrollTop=history.scrollHeight};
}
const battleIcon=name=>'assets/battle/ui/'+name+'.jpg';
const signedBonus=value=>value<0?' − '+Math.abs(value):' + '+value;
function battleActionInfo(id,hero){
 const weapon=ITEMS[hero.gear.weapon],melee=hero.gear.weapon!=='oakbow',penalty=Formation.attackPenalty(hero,G.party);
 const weaponName=weapon?.name||'Unarmed Strike';
 const attack=prof(hero)+attackMod(hero)-penalty;
 const base={id,title:weaponName,icon:!weapon?'gauntlet':hero.gear.weapon==='runestaff'?'book':melee?'sword':'bow',kind:'Weapon attack',description:'Strike one enemy with your equipped weapon.',stats:[['Damage','1d6'+signedBonus(attackMod(hero)+weaponBonus(hero))],['Accuracy','d20'+signedBonus(attack)+' vs AC'],['Range',melee?'Melee · 1 enemy':'Ranged · 1 enemy'],['Formation',penalty?'Rear melee: −2 to hit':'No attack penalty']]};
 if(id==='attack')return base;
 if(id==='guard')return {...base,title:'Guard',icon:'guard',kind:'Defensive action',description:'Brace until your next turn. Incoming damage is halved, rounded up.',stats:[['Recovery','1 MP'],['Cost','Your turn']]};
 if(id==='flee')return {...base,title:'Retreat',icon:'flee',kind:'Escape attempt',description:combat.isBoss?'This boss blocks escape. An attempt still spends your turn.':'Try to escape with your entire party. A failed attempt spends your turn.',stats:[['Success',combat.isBoss?'Blocked':'75%'],['Formation','Preserved on retreat']]};
 if(id==='skills'||id==='spells')return {...base,title:id==='spells'?'Spells':'Class abilities',icon:'book',kind:hero.role,description:'Select an ability to inspect its actual cost, targeting and effects.',stats:[['Mana',hero.mp+' / '+hero.maxMp],['Known',String(knownAbilities(hero).filter(a=>!['field','passive'].includes(a.kind)).length)]]};
 if(id==='item')return {...base,title:'Adventuring supplies',icon:'potion',kind:'Consumables',description:'Use an available supply on an ally. Only a successful use consumes the item and your turn.',stats:[['Supplies',Object.entries(G.bag).filter(([key,n])=>n>0&&ITEMS[key]?.kind==='consumable').reduce((sum,[,n])=>sum+n,0)+' available']]};
 if(id.startsWith('item:')){const item=ITEMS[id.slice(5)];return {...base,title:item.name,icon:id.includes('ether')?'ether':id.includes('salve')?'poison':'potion',kind:'Consumable',description:item.description,stats:[['Available','×'+(G.bag[id.slice(5)]||0)],['Target',item.target==='party'?'Entire party':'One ally']]}}
 const ability=knownAbilities(hero).find(a=>'ability:'+a.id===id);if(!ability)return base;
 const magic=['Wizard','Cleric'].includes(hero.role)||ability.id==='runeflare';
 const icon={power:'gauntlet',hide:'hide',backstab:'daggers',shadow:'daggers',fan:'daggers',vanish:'hide',mend:'heal',sanctuary:'heal',purify:'heal',rally:'guard'}[ability.id]||({slash:'sword',arcane:'arcane',ice:'ice',fire:'fire',meteor:'fire',holy:'holy',shadow:'hide'}[ability.fx]||'book');
 const target={single:'1 enemy',aoe:'All enemies',ally:'1 ally',allies:'Entire party',buff:'Entire party',self:'Self'}[ability.kind];
 const stats=[['Cost',ability.mp+' MP'],['Target',target]];
 if(ability.id==='hide'){stats.push(['Check','d20'+signedBonus(mod(hero.stats[1])+prof(hero))],['DC',String(10+Math.max(...combat.enemies.filter(e=>e.hp>0).map(e=>e.dex)))])}
 else if(ability.id==='purify')stats.push(['Healing','4 HP + remove poison']);
 else if(['ally','allies'].includes(ability.kind))stats.push(['Healing',(ability.kind==='allies'?'1d8':'2d8')+signedBonus(Math.max(0,mod(hero.stats[4]))+2+(hero.talents?.focus||0))]);
 else if(ability.kind==='buff')stats.push(['Protection','½ damage through next round']);
 else if(ability.kind==='aoe'){
  const index=hero.role==='Fighter'?0:hero.role==='Rogue'?1:hero.role==='Cleric'?4:3;
  stats.push(['Damage',(ability.id==='meteor'?'4d6':ability.id==='sunburst'?'3d6':'2d6')+signedBonus(Math.max(0,mod(hero.stats[index]))+(magic?spellDamageBonus(hero):weaponBonus(hero)))],['Save','DEX vs DC '+(10+prof(hero)+mod(hero.stats[index]))]);
 }else{
  const extra={backstab:3,shadow:3,power:2,bolt:1,frost:3}[ability.id]??3;
  stats.push(['Damage',(ability.id==='backstab'?'3d6':'2d6')+signedBonus(attackMod(hero,magic)+(magic?spellDamageBonus(hero):weaponBonus(hero))+extra)],['Accuracy','d20'+signedBonus(prof(hero)+attackMod(hero,magic)-(magic?0:penalty))+' vs AC']);
  if(['shadow','backstab'].includes(ability.id))stats.push(['Roll','Advantage']);
 }
 return {id,title:ability.name,icon,kind:magic?'Spell':'Class skill',description:ability.tip,stats};
}
function battleArtCard(id,hero,attribute='data-c'){
 const info=battleActionInfo(id,hero),ability=id.startsWith('ability:')?knownAbilities(hero).find(a=>a.id===id.slice(8)):null;
 const disabled=ability&&(hero.mp<ability.mp||(ability.id==='backstab'&&!hero.hidden)||(ability.id==='hide'&&hero.hidden));
 return `<button class="battle-art-card ${ability?'effect-'+ability.fx:''}" ${attribute}="${id}" data-preview="${id}" aria-describedby="battleActionDetail" title="${escapeHtml(info.description)}" ${disabled?'disabled':''}><span class="action-art"><img src="${battleIcon(info.icon)}" alt="">${ability?`<em>${ability.mp} MP</em>`:''}</span><b>${escapeHtml(info.title)}</b></button>`;
}
function renderBattleActionInspector(id='attack'){
 const node=$('battleActionDetail');if(!node||!combat)return;
 const who=activeUnit(),hero=who?.stats?who:G.party.find(h=>h.hp>0)||G.party[0];
 const info=who&&!who.stats?{title:who.name,image:enemyPortrait(who),kind:'Enemy turn',description:'The enemy is acting. Your next adventurer is shown in the initiative queue.',stats:[['Health',who.hp+' / '+who.maxHp],['Armor class',String(who.ac)],['Attack style',Formation.enemyRange(who)]]}:battleActionInfo(id,hero);
 node.innerHTML=`<header><img src="${info.image||battleIcon(info.icon)}" alt=""><div><h3>${escapeHtml(info.title)}</h3><small>${escapeHtml(info.kind)}</small></div></header><p>${escapeHtml(info.description)}</p><dl>${info.stats.map(([label,value])=>`<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>`;
 $('battlePanel').querySelectorAll('[data-preview]').forEach(b=>b.classList.toggle('inspected',b.dataset.preview===id));
}
const enemyPortrait=e=>'assets/battle/ui/enemy_'+e.type+'.jpg';
function renderBattleTarget(id=highlightedTarget||battleFX?.targetIds[0]){
 const node=$('battleTargetDetail');if(!node||!combat)return;
 const unit=G.party.find(h=>h.id===id)||combat.enemies.find(e=>e.id===id)||combat.enemies.find(e=>e.hp>0);
 if(!unit){node.innerHTML='<h3>TARGET</h3><p>No enemies remain.</p>';return}
 const hero=!!unit.stats,health=clamp(100*unit.hp/unit.maxHp,0,100);
 const conditions=hero?conditionBadges(unit):unit.atk<(BESTIARY[unit.original]?.atk??unit.atk)?`<span class="condition-icon condition-chilled" tabindex="0" role="img" title="Attack reduced from ${BESTIARY[unit.original].atk} to ${unit.atk} for this encounter" aria-label="Weakened attack: ${unit.atk} attack bonus">❄</span>`:'';
 node.innerHTML=`<h3>TARGET</h3><div class="target-identity"><img src="${hero?heroPortrait(unit):enemyPortrait(unit)}" alt=""><div><strong>${escapeHtml(unit.name)}</strong><small>${hero?unit.role+' · '+Formation.row(unit).toUpperCase()+' ROW':Formation.enemyRange(unit).toUpperCase()+' ATTACKER'}</small><div class="target-health"><i style="width:${health}%"></i></div><small>${unit.hp}/${unit.maxHp} HP · AC ${hero?armorClass(unit):unit.ac}</small></div></div><h4>CONDITIONS</h4><div class="target-conditions">${conditions||'<small>No active conditions</small>'}</div>${hero&&Formation.screened(unit,G.party)?'<p>Frontline cover: 25% less melee damage.</p>':''}`;
}
function renderCombatMenu(){
 if(mode!=='combat'||!combat){$('battlePanel').classList.add('hidden');return}
 const q=combat.queue[combat.turn],who=activeUnit();if(!who||!q)return;
 const ready=q.side==='ally'&&!combatAnimating&&combatTactic==='manual',hero=who.stats?who:G.party.find(h=>h.hp>0)||G.party[0];
 const commands=[['attack','⚔','ATTACK'],['skills','⚒','SKILLS'],['spells','✦','SPELLS'],['item','✚','ITEMS'],['guard','◈','GUARD'],['flee','↩','FLEE']];
 const category=battleMenu==='commands'?'attack':battleMenu==='abilities'?'skills':battleMenu==='items'?'item':battleMenu==='spells'?'spells':currentTargetAction?.startsWith('ability:')?(battleActionInfo(currentTargetAction,hero).kind==='Spell'?'spells':'skills'):currentTargetAction?.startsWith('item:')?'item':'attack';
 const rail=`<nav class="combat-command-rail" aria-label="Battle categories">${commands.map(([id,icon,label])=>`<button ${ready&&battleMenu==='commands'&&id!=='spells'?'data-c':'data-nav'}="${id}" data-preview="${id}" class="${category===id?'selected':''}" ${!ready||(id==='spells'&&!knownAbilities(hero).some(a=>a.id==='runeflare'||['Wizard','Cleric'].includes(hero.role)))?'disabled':''}><i aria-hidden="true">${icon}</i>${label}</button>`).join('')}</nav>`;
 let buttons='';
 if(ready){
  if(battleMenu==='commands')buttons=battleArtCard('attack',hero,'data-action-card')+knownAbilities(hero).filter(a=>['single','aoe'].includes(a.kind)).map(a=>battleArtCard('ability:'+a.id,hero)).join('');
  else if(['abilities','spells'].includes(battleMenu))buttons=knownAbilities(hero).filter(a=>!['passive','field'].includes(a.kind)&&(battleMenu!=='spells'||a.id==='runeflare'||['Wizard','Cleric'].includes(hero.role))).map(a=>battleArtCard('ability:'+a.id,hero)).join('')+'<button class="battle-back" data-c="back">↩ BACK</button>';
  else if(battleMenu==='enemy')buttons=combat.enemies.filter(e=>e.hp>0).map(e=>`<button class="battle-art-card target-card" data-c="target:${e.id}"><span class="action-art"><img src="${enemyPortrait(e)}" alt=""></span><b>${escapeHtml(e.name)}</b><small>${e.hp}/${e.maxHp} HP · AC ${e.ac}</small></button>`).join('')+'<button class="battle-back" data-c="back">↩ BACK</button>';
  else if(battleMenu==='ally')buttons=G.party.filter(h=>h.hp>0).map(h=>`<button class="battle-art-card target-card" data-c="ally:${h.id}"><span class="action-art"><img src="${heroPortrait(h)}" alt=""></span><b>${escapeHtml(h.name)}</b><small>${h.hp}/${h.maxHp} HP</small></button>`).join('')+'<button class="battle-back" data-c="back">↩ BACK</button>';
  else if(battleMenu==='items')buttons=Object.keys(G.bag).filter(id=>G.bag[id]>0&&ITEMS[id]?.kind==='consumable').map(id=>battleArtCard('item:'+id,hero)).join('')+'<button class="battle-back" data-c="back">↩ BACK</button>';
 }
 const tactics=`<div class="tactics" role="group" aria-label="Battle automation">${Object.entries(COMBAT_TACTICS).map(([id,label])=>`<button type="button" data-tactic="${id}" aria-pressed="${id===combatTactic}" class="${id===combatTactic?'tactic-current':''}" title="${label}">${label}</button>`).join('')}</div>`;
 const labels={commands:'ATTACK',abilities:'SKILLS',spells:'SPELLS',enemy:'CHOOSE AN ENEMY',ally:'CHOOSE AN ALLY',items:'ITEMS'};
 battlePanel(`<section class="battle-controls" aria-label="Combat commands"><div class="battle-topline"><div class="turntext"><span class="battle-eyebrow">${combatAnimating?'ACTION IN PROGRESS':q.side==='ally'?'YOUR TURN':'ENEMY TURN'}</span><strong>${escapeHtml(who.name)}</strong></div>${tactics}<span class="battle-round">ROUND ${combat.round}</span></div>${rail}<section class="battle-catalog"><div class="command-heading">${combatAnimating?'Resolving action…':q.side==='enemy'?'Awaiting the enemy':labels[battleMenu]}<span>1–9 SELECT · ESC BACK</span><button type="button" data-inspect-toggle aria-expanded="false" aria-controls="battleActionDetail">DETAILS</button></div><div class="actionrow" data-menu="${battleMenu}">${buttons||`<span class="battle-wait">${combatTactic!=='manual'?'AUTO: '+COMBAT_TACTICS[combatTactic]:'The next action will begin shortly.'}</span>`}</div></section><section id="battleActionDetail" class="battle-action-detail" aria-label="Action details"></section><aside id="battleTargetDetail" class="battle-target-detail" aria-label="Target details"></aside></section><section class="battle-events" aria-label="Combat events"><div class="events-heading"><span>COMBAT LOG</span><button type="button" data-log-follow title="Scroll to the latest combat event">LATEST ↓</button></div><ol class="battlehistory" tabindex="0" aria-label="Combat event history" role="log" aria-live="polite" aria-relevant="additions"></ol></section>`);
 const initial=battleMenu==='commands'?'attack':currentTargetAction||(['abilities','spells'].includes(battleMenu)?'ability:'+knownAbilities(hero).find(a=>!['passive','field'].includes(a.kind))?.id:battleMenu==='items'?'item:'+Object.keys(G.bag).find(id=>G.bag[id]>0&&ITEMS[id]?.kind==='consumable'):'attack');
 renderBattleActionInspector(initial);renderBattleTarget();renderCombatEvents();
}
function battleAction(a){
 if(mode!=='combat'||!combat||combatTactic!=='manual'||combatAnimating||!combat.queue[combat.turn]||combat.queue[combat.turn].side!=='ally')return;
 highlightedTarget=null;
 const hero=activeUnit();if(a==='back'){battleMenu='commands';renderCombatMenu();return}
 if(a==='attack'){currentTargetAction='attack';battleMenu='enemy';renderCombatMenu();return}
 if(a==='skills'){battleMenu='abilities';currentTargetAction=null;renderCombatMenu();return}
 if(a==='spells'){battleMenu='spells';currentTargetAction=null;renderCombatMenu();return}
 if(a.startsWith('ability:')){const ability=knownAbilities(hero).find(x=>x.id===a.slice(8));if(!ability||hero.mp<ability.mp)return;if(ability.kind==='self'){performAbility(hero,ability,[hero]);return}if(ability.kind==='aoe'||ability.kind==='allies'||ability.kind==='buff'){performAbility(hero,ability,ability.kind==='aoe'?combat.enemies.filter(e=>e.hp>0):G.party.filter(h=>h.hp>0));return}currentTargetAction='ability:'+ability.id;battleMenu=ability.kind==='ally'?'ally':'enemy';renderCombatMenu();return}
 if(a==='item'){battleMenu='items';currentTargetAction=null;renderCombatMenu();return}
 if(a.startsWith('item:')){const id=a.slice(5);if(!Object.hasOwn(ITEMS,id)||ITEMS[id].kind!=='consumable'||!G.bag[id])return;if(ITEMS[id].target==='party'){combatUseItem(G.party.indexOf(hero),id);return}currentTargetAction=a;battleMenu='ally';renderCombatMenu();return}
 if(a==='guard'){hero.defending=true;window.AshenSprites?.react(hero.id,'defend');hero.mp=Math.min(hero.maxMp,hero.mp+1);combatLog(`${hero.name} guards until their next turn and recovers 1 MP.`,false,{type:'status',actor:hero.name});SFX.play('guard');battleMenu='commands';nextTurn();return}
 if(a==='flee'){if(combat.isBoss){combatLog('The warleader blocks your escape!',true);SFX.play('bump');nextTurn();return}if(rand(100)<=75){combatLog('The party escapes!');endCombat();SFX.play('warp');stepCounter=0;saveGame(true);return}combatLog('Escape failed!');nextTurn();return}
 if(a.startsWith('target:')){const enemy=combat.enemies.find(e=>e.id===a.slice(7));if(enemy&&enemy.hp>0){if(currentTargetAction==='attack')queueCinematic(hero.gear.weapon==='oakbow'?'arrow':'slash',hero,[enemy],()=>hitAttack(hero,enemy),'ally');else if(currentTargetAction?.startsWith('ability:')){const ability=knownAbilities(hero).find(x=>x.id===currentTargetAction.slice(8));if(ability)performAbility(hero,ability,[enemy])}}return}
 if(a.startsWith('ally:')){const target=G.party.find(h=>h.id===a.slice(5));if(!target)return;if(currentTargetAction?.startsWith('item:'))combatUseItem(G.party.indexOf(target),currentTargetAction.split(':')[1]);else if(currentTargetAction?.startsWith('ability:')){const ability=knownAbilities(hero).find(x=>x.id===currentTargetAction.slice(8));if(ability)performAbility(hero,ability,[target])}return}
}
function markCombatNotice(unit,message,color){
 const point=unit.stats?battleHeroPoint(G.party.indexOf(unit)):battleEnemyPoint(combat?.enemies.indexOf(unit)??0);
 battleNumbers.push({x:point.x,xFraction:point.x/battleWidth,y:point.y-75,text:message,start:performance.now(),color});
}
function markDamage(unit,amount,side=null,color='#fff3c5'){
 if(amount>0&&color!=='#97ffd7'){delete unit.hidden;delete unit.hideTotal}
 if(amount>0&&color!=='#97ffd7')window.AshenSprites?.react(unit.id,unit.hp<=0?'death':'hit');
 const isHero=side?side==='ally':!!unit.stats;
 const point=isHero?battleHeroPoint(G.party.indexOf(unit)):battleEnemyPoint(combat?.enemies.indexOf(unit)??0);
 if(point&&amount>0)battleNumbers.push({x:point.x,xFraction:point.x/battleWidth,y:point.y-85,text:(color==='#ffe89b'?'CRITICAL ':'')+(color==='#97ffd7'?'+':'−')+amount,start:performance.now(),color});
}
function queueCinematic(kind,actor,targets,resolve,side=null){
 if(combatAnimating||mode!=='combat')return;
 const actorSide=side||(actor.stats?'ally':'enemy'),targetSide=actorSide==='ally'?'enemy':'ally';
 combatAnimating=true;battleMenu='commands';const started=performance.now(),session=combatSession;
 const start=actorSide==='ally'?battleHeroPoint(G.party.indexOf(actor)):battleEnemyPoint(combat.enemies.indexOf(actor));
 const ends=targets.map(t=>t.stats?battleHeroPoint(G.party.indexOf(t)):battleEnemyPoint(combat.enemies.indexOf(t)));
 const timing=window.AshenAnimation?.timing(kind)||{duration:850,impact:480,finish:900};
 battleFX={kind,startTime:started,duration:timing.duration,source:start,targets:ends,actorSide,targetSide,actorId:actor.id,targetIds:targets.map(t=>t.id)};
 renderCombatMenu();
 setTimeout(()=>{if(mode==='combat'&&combat&&session===combatSession){resolve();refreshHud()}},timing.impact);
 setTimeout(()=>{if(session!==combatSession)return;battleFX=null;combatAnimating=false;if(mode==='combat'&&combat)nextTurn()},timing.finish)
}
function combatUseItem(index,id){
  if(mode!=='combat'||!combat||combatAnimating||combat.queue[combat.turn]?.side!=='ally')return;
  const hero=activeUnit(),target=G.party[index],item=ITEMS[id];
  const before=G.party.map(h=>({id:h.id,hp:h.hp,mp:h.mp,poison:h.poison}));
  if(!target||!Object.hasOwn(ITEMS,id)||item.kind!=='consumable'||!(G.bag[id]>0)||!applyItem(target,id)){battleMenu='commands';renderCombatMenu();return}
  G.bag[id]--;if(!G.bag[id])delete G.bag[id];
  combatLog(`${hero.name} used ${item.name} on ${item.target==='party'?'the party':target.name}.`,true,{type:'item',actor:hero.name,target:target.name});
  for(const previous of before){
    const ally=G.party.find(h=>h.id===previous.id);
    if(ally.hp>previous.hp)combatLog(`${ally.name} recovers ${ally.hp-previous.hp} HP.`,false,{type:'heal',actor:hero.name,target:ally.name,amount:ally.hp-previous.hp});
    if(ally.mp>previous.mp)combatLog(`${ally.name} recovers ${ally.mp-previous.mp} MP.`,false,{type:'status',target:ally.name});
    if(previous.poison>0&&!ally.poison)combatLog(`${ally.name} is no longer poisoned.`,false,{type:'status',target:ally.name});
  }
  battleMenu='commands';nextTurn();
}
function hitAttack(actor,target,{spell=false,power=false,advantage=false,bonusDmg=0,backstab=false}={}){
 if(backstab&&(!actor.hidden||actor.role!=='Rogue'))return 0;
 if(actor.stats){delete actor.hidden;delete actor.hideTotal}
 const attackerHero=!!actor.stats,penalty=attackerHero?Formation.attackPenalty(actor,G.party,spell):0,modifier=attackerHero?attackMod(actor,spell):actor.atk;let d20=dice(20),second=advantage?dice(20):null;if(second!==null)d20=Math.max(d20,second);const toHit=d20+modifier+(attackerHero?prof(actor):0)-penalty,armor=target.stats?armorClass(target):target.ac,success=d20===20||(d20!==1&&toHit>=armor),critical=d20===20;
 if(!success){combatLog(`${actor.name}: d20 ${d20} + ${toHit-d20} = ${toHit} vs AC ${armor} — MISS.`,false,{type:'miss',actor:actor.name,target:target.name,roll:d20,attackBonus:toHit-d20,total:toHit,armor,advantage});markCombatNotice(target,'MISS','#b9c2ca');SFX.play('miss');return 0}
 const base=attackerHero?6:actor.dmg,dieCount=backstab?3:power?2:1,rolled=dice(base,critical?dieCount*2:dieCount);let dealt=Math.max(1,rolled+modifier+(attackerHero?(spell?spellDamageBonus(actor):weaponBonus(actor)):0)+bonusDmg);if(isDefending(target))dealt=Math.ceil(dealt/2);const beforeCover=dealt;if(!attackerHero&&target.stats)dealt=Formation.coverDamage(dealt,target,G.party,Formation.enemyRange(actor));const detail=[penalty?'Rear melee −2 to hit':'',beforeCover>dealt?`Frontline cover prevented ${beforeCover-dealt} damage`:''].filter(Boolean).join(' · ');target.hp=Math.max(0,target.hp-dealt);
 combatLog(`${actor.name}: d20 ${d20} + ${toHit-d20} = ${toHit} vs AC ${armor} — ${critical?'CRITICAL! ':'HIT! '}${dealt} damage.`,critical,{type:critical?'critical':'hit',actor:actor.name,target:target.name,amount:dealt,detail,roll:d20,attackBonus:toHit-d20,total:toHit,armor,advantage});markDamage(target,dealt,null,critical?'#ffe89b':spell?'#bddefe':'#fff0ce');
 SFX.play(critical?'critical':spell?'magic':'hit');if(target.hp<=0)combatLog(`${target.name} falls!`,true,{type:'death',target:target.name});
 if(!attackerHero&&target.hp>0&&['slime','bat'].includes(actor.original)&&rand(100)<=13){if(ITEMS[target.gear?.armor]?.poisonWard)combatLog(`${target.name}'s Silverguard wards resist poison.`,false,{type:'status',target:target.name});else{target.poison=2;combatLog(`${target.name} is poisoned for the next 2 turns!`,false,{type:'status',target:target.name})}}return dealt
}
function aoeDamage(actor,targets,spell){
 const abilityIndex=actor.role==='Fighter'?0:actor.role==='Rogue'?1:actor.role==='Cleric'?4:3;const dc=10+prof(actor)+mod(actor.stats[abilityIndex]);
 for(const foe of targets.filter(t=>t.hp>0)){
  const roll=dice(20)+(foe.stats?mod(foe.stats[1]):foe.dex),damageDice=spell.id==='meteor'?4:spell.id==='sunburst'?3:2;
  let amount=dice(6,damageDice)+Math.max(0,mod(actor.stats[abilityIndex]))+(actor.role==='Fighter'||actor.role==='Rogue'?weaponBonus(actor):spellDamageBonus(actor));
  if(roll>=dc)amount=Math.ceil(amount/2);if(isDefending(foe))amount=Math.ceil(amount/2);foe.hp=Math.max(0,foe.hp-amount);combatLog(`${foe.name}: DEX save ${roll} vs DC ${dc} · ${amount} ${spell.fx} damage${roll>=dc?' (half)':''}.`,false,{type:'hit',actor:actor.name,target:foe.name,amount,detail:`DEX save ${roll} vs DC ${dc}${roll>=dc?' · half damage':''}`});if(foe.hp<=0)combatLog(`${foe.name} falls!`,true,{type:'death',target:foe.name});markDamage(foe,amount);
 }
 SFX.play('magic')
}
function performAbility(hero,ability,targets){
 if(mode!=='combat'||!combat||combatAnimating||combat.queue[combat.turn]?.side!=='ally'||activeUnit()!==hero||hero.hp<=0||!knownAbilities(hero).includes(ability)||!Array.isArray(targets)||!targets.length)return;
 const available=ability.kind==='aoe'||ability.kind==='single'?combat.enemies:G.party;
 if(targets.some(t=>!available.includes(t)||t.hp<=0))return;
 if(['passive','field'].includes(ability.kind)||(ability.kind==='self'&&(targets.length!==1||targets[0]!==hero))||(ability.id==='backstab'&&!hero.hidden)||(ability.id==='hide'&&hero.hidden))return;
 if(hero.mp<ability.mp){toast('Not enough MP.');return}
 hero.mp-=ability.mp;
 const kind=ability.fx;
 queueCinematic(kind,hero,targets,()=>{
  combatLog(`${hero.name} uses ${ability.name}!`,true,{type:'action',actor:hero.name});
  if(ability.id==='hide'){const roll=dice(20),total=roll+mod(hero.stats[1])+prof(hero),dc=10+Math.max(...combat.enemies.filter(e=>e.hp>0).map(e=>e.dex));hero.hidden=roll===20||(roll!==1&&total>=dc);if(hero.hidden)hero.hideTotal=total;combatLog(`${hero.name}: Hide in Shadows ${total} vs DC ${dc} — ${hero.hidden?'hidden':'spotted'}.`,false,{type:'status',target:hero.name})}
  else if(ability.id==='backstab'){hitAttack(hero,targets[0],{advantage:true,backstab:true,bonusDmg:3})}
  else if(ability.kind==='aoe'){delete hero.hidden;delete hero.hideTotal;aoeDamage(hero,targets,ability)}
  else if(ability.id==='purify'){for(const target of targets){target.poison=0;const gain=Math.max(0,Math.min(4,target.maxHp-target.hp));target.hp+=gain;combatLog(`${target.name} is purified and recovers ${gain} HP.`,false,{type:'status',actor:hero.name,target:target.name,amount:gain});markDamage(target,gain,'ally','#97ffd7')}SFX.play('heal')}
  else if(ability.kind==='ally'||ability.kind==='allies'){
   for(const target of targets){let amount=dice(8,ability.kind==='allies'?1:2)+Math.max(0,mod(hero.stats[4]))+2+(hero.talents?.focus||0);let actual=Math.min(target.maxHp-target.hp,amount);target.hp+=actual;combatLog(`${target.name} recovers ${actual} HP.`,false,{type:'heal',actor:hero.name,target:target.name,amount:actual});markDamage(target,actual,'ally','#97ffd7')}SFX.play('heal')
  }else if(ability.kind==='buff'){
   for(const target of targets){target.protectedThroughRound=combat.round+1;if(ability.id==='rally')target.hp=Math.min(target.maxHp,target.hp+6)}combatLog(`The party gains defensive protection through round ${combat.round+1}!`,false,{type:'status',actor:hero.name});SFX.play('guard')
  }else if(ability.id==='shadow')hitAttack(hero,targets[0],{advantage:true,power:true,bonusDmg:3});
  else if(ability.id==='power')hitAttack(hero,targets[0],{power:true,bonusDmg:2});
  else if(ability.id==='bolt')hitAttack(hero,targets[0],{spell:true,power:true,bonusDmg:1});
  else if(ability.id==='frost'){const damage=hitAttack(hero,targets[0],{spell:true,power:true,bonusDmg:3});if(damage>0&&targets[0].hp>0&&targets[0].atk>1&&rand(100)<=50){targets[0].atk=Math.max(1,targets[0].atk-1);combatLog(`${targets[0].name} is chilled: attack reduced by 1.`,false,{type:'status',actor:hero.name,target:targets[0].name})}}
  else hitAttack(hero,targets[0],{spell:true,power:true,bonusDmg:3});
 },'ally')
}
function enemyAct(){if(mode!=='combat'||combatAnimating)return;const enemy=activeUnit();if(!enemy||enemy.hp<=0){nextTurn();return}let options=alive();if(!options.length){loseCombat();return}
 for(const hero of options.filter(h=>h.hidden)){const check=dice(20)+enemy.dex;if(check>=hero.hideTotal){delete hero.hidden;delete hero.hideTotal;combatLog(`${enemy.name} detects ${hero.name}!`,false,{type:'status',target:hero.name})}}
 const visible=options.filter(h=>!h.hidden);if(!visible.length){combatLog(`${enemy.name} searches the shadows.`,false,{type:'status'});nextTurn();return}const targets=Formation.targetPool(enemy,visible),target=targets[rand(targets.length)-1];
 const doAOE=(enemy.original==='boss'&&combat.round%4===0)||(enemy.original==='warboss'&&combat.round%3===0)||(enemy.original==='shaman'&&combat.round%3===0);
 if(doAOE){const name=enemy.original==='warboss'?'Crushing Warcry':enemy.original==='shaman'?'Cinder Hex':'Toll of Ash';
  queueCinematic(enemy.original==='shaman'?'fire':'shadow',enemy,options,()=>{combatLog(`${enemy.name} casts ${name} against the entire party!`,true,{type:'action',actor:enemy.name});for(const ally of options.filter(h=>h.hp>0)){const roll=dice(20)+mod(ally.stats[1]);let amount=dice(6)+(enemy.original==='warboss'?4:2);if(roll>=13)amount=Math.ceil(amount/2);if(isDefending(ally))amount=Math.ceil(amount/2);ally.hp=Math.max(0,ally.hp-amount);combatLog(`${ally.name}: DEX save ${roll} vs DC 13, ${amount} damage.`,false,{type:'hit',actor:enemy.name,target:ally.name,amount,detail:`DEX save ${roll} vs DC 13${roll>=13?' · half damage':''}`});if(ally.hp<=0)combatLog(`${ally.name} falls!`,true,{type:'death',target:ally.name});markDamage(ally,amount)}SFX.play('magic')},'enemy')}
 else queueCinematic(Formation.enemyRange(enemy)==='magic'?'arcane':'slash',enemy,[target],()=>hitAttack(enemy,target,{spell:Formation.enemyRange(enemy)==='magic'}),'enemy');
}

const ENEMY_DROPS={
 slime:[['potion',24],['salve',18]],wolf:[['ration',48],['salve',18]],
 bandit:[['iron',22],['cloak',12],['potion',44]],wisp:[['ether',40],['salve',26]],
 bone:[['chain',15],['ether',30]],bat:[['salve',38],['ration',26]],
 sentinel:[['chain',28],['silvermail',8]],boss:[['silvermail',75],['elixir',80]],
 goblin:[['iron',12],['potion',25],['ration',35]],orc:[['iron',28],['chain',18],['ashblade',5]],
 shaman:[['ether',32],['runestaff',10],['salve',24]],warboss:[['ashblade',100],['silvermail',60],['elixir',90]]
};
function rollDroppedLoot(types){
 const drops={};for(const enemyType of types){for(const [id,chance] of ENEMY_DROPS[enemyType]||[]){if(rand(100)<=chance){drops[id]=(drops[id]||0)+1;G.bag[id]=(G.bag[id]||0)+1}}}
 // Supplemental supplies on longer journeys, without guaranteeing gear every battle.
 if(rand(100)<=24){const id=rand(2)===1?'ration':'potion';drops[id]=(drops[id]||0)+1;G.bag[id]=(G.bag[id]||0)+1}
 return Object.entries(drops).map(([id,n])=>`${ITEMS[id].name} ×${n}`);
}
function winCombat(){if(mode!=='combat')return;const boss=combat.bossType==='boss',warboss=combat.bossType==='warboss',typesDefeated=combat.enemies.map(e=>e.original),xp=combat.enemies.reduce((s,e)=>s+e.xp,0),gold=combat.enemies.reduce((s,e)=>s+e.gold,0);endCombat();G.gold+=gold;const levelChanges=[];G.party.forEach(h=>{h.xp+=xp;h.xpTotal=(h.xpTotal||0)+xp;while(h.xp>=levelThreshold(h.level)){h.xp-=levelThreshold(h.level);levelChanges.push(levelUp(h))}});const drops=rollDroppedLoot(typesDefeated);if(boss){G.flags.boss=true;G.bag.ember=1;uiLog('The Bell Warden has fallen. The Ember Shard is yours.');}
 if(warboss){G.flags.warboss=true;G.gold+=70;G.bag.runestaff=(G.bag.runestaff||0)+1;uiLog('Gruk Bloodtusk defeated! The Broken Banner ends. Bonus: 70 gold and Runestaff.');}
 if(typesDefeated.includes('goblin')&&G.location==='camp'&&!G.flags.scouts)G.flags.scouts=true;
 for(const key of ['goblin','orc']){const job=G.jobs?.[key];if(job?.state==='active')job.count+=typesDefeated.filter(t=>t===key).length;}
 uiLog(`Battle won: +${xp} XP each, +${gold} gold${drops.length?', loot '+drops.join(', '):''}.`);refreshHud();saveGame(true);SFX.play('victory');dialog(warboss?'THE BROKEN BANNER IS TORN':boss?'THE WARDEN IS SILENCED':'VICTORY',warboss?`Gruk Bloodtusk crashes to the earth. The warband scatters, and the eastern trade road is safe once more.<br><br><b>+${xp} XP · +${gold+70} gold · Runestaff found</b><br>Chapter II complete! ${levelChanges.length?`<div class="level-summary"><b>LEVEL UP!</b><br>${levelChanges.join('<br>')}</div>`:''}`:boss?`The Warden falls to one knee and dissolves into drifting embers. The ancient bell cracks in two. In its center, a molten fragment glows.<br><br><b>Obtained the Ember Shard!</b><br><br>XP +${xp} · Gold +${gold}<br><br>Return to Elder Maelin in Havenmere.${levelChanges.length?`<div class="level-summary"><b>LEVEL UP!</b><br>${levelChanges.join('<br>')}</div>`:''}`:`The enemy is defeated. Your party gains <b>${xp} experience each</b> and <b>${gold} gold</b>${drops.length?', plus <b>'+drops.map(x=>escapeHtml(x)).join(', ')+'</b>':''}.${levelChanges.length?`<div class="level-summary"><b>LEVEL UP!</b><br>${levelChanges.join('<br>')}</div>`:''}`)}
function levelUp(h){ensureProgress(h);h.level++;h.talentPoints++;let abilityGain='';const newAbilities=(ABILITIES[h.role]||[]).filter(a=>a.lvl===h.level).map(a=>a.name);if(h.level%4===0){const statIndex=CLASS_TRAINING[h.role].priority[0];h.stats[statIndex]++;abilityGain=` · +1 ${ABILS[statIndex]}`}const hpGain=5+Math.max(1,mod(h.stats[2])),mpGain=h.role==='Fighter'?1:h.role==='Rogue'?2:4;h.maxHp+=hpGain;h.hp=h.maxHp;h.maxMp+=mpGain;h.mp=h.maxMp;uiLog(`${h.name} reached level ${h.level}! New talent point${newAbilities.length?', learned '+newAbilities.join(', '):''}.`);SFX.play('level');return `${escapeHtml(h.name)} is now level ${h.level}: +${hpGain} HP, +${mpGain} MP, +1 talent point${abilityGain}${newAbilities.length?' · UNLOCKED '+newAbilities.join(', '):''}`}
function loseCombat(){endCombat();const lost=Math.floor(G.gold*.2);G.gold-=lost;G.party.forEach(h=>{h.hp=Math.max(1,Math.floor(h.maxHp*.65));h.mp=Math.max(1,Math.floor(h.maxMp*.65));h.poison=0});G.location='town';G.x=15;G.y=11;stepCounter=0;uiLog(`Defeated in battle. Rescued to Havenmere. Lost ${lost} gold.`);refreshHud();saveGame(true);dialog('A NARROW ESCAPE',`A passing patrol finds your fallen party and carries you back to Havenmere. You wake beneath the inn’s rafters, battered but alive.<br><br>Lost ${lost} gold. HP and MP partially restored.`)}
/* ---------------------------- PIXEL ART ---------------------------- */
const colors={plaza:'#baa98d',woodFloor:'#805d47',stoneFloor:'#727783',rug:'#884e56',insideWall:'#2b2e3a',wallTrim:'#4a4243',exitDoor:'#9c815a',pillar:'#a4a5a0',books:'#735148',forge:'#c16b39',anvil:'#525d69',rack:'#856d52',crate:'#907254',bed:'#a19cad',hearth:'#a8653f',table:'#8a654d',plant:'#407158',barrel:'#92714d',window:'#6ba7b8',door:'#6a4b44',grass:'#39734e',grass2:'#437e54',forest:'#295d49',path:'#987e65',bridge:'#7c5641',water:'#256a93',mountain:'#5d6676',building:'#594454',fence:'#70583f',floor:'#535b69',wall:'#293342',exit:'#c0a171',altar:'#93606b',rune:'#7589af',townGate:'#a19274',cryptGate:'#736e7d',fountain:'#a3bbc0'};
function tileColor(t){return colors[t]||'#445468'}
const pix=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
function line(x,y,x2,y2,col,width=1){ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(Math.round(x)+.5,Math.round(y)+.5);ctx.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);ctx.stroke()}
function textDraw(s,x,y,size=10,color='#f7e8cb',align='left'){ctx.font=`bold ${size}px Georgia`;ctx.textAlign=align;ctx.fillStyle='#05070c';ctx.fillText(s,x+1,y+1);ctx.fillStyle=color;ctx.fillText(s,x,y);ctx.textAlign='left'}
function polygon(points,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();ctx.fill()}
// Hand-drawn deterministic material variants replace repeated one-block cobble tiles.
// Screen position derives from map coordinates, so the same stones persist while walking.
// v1.4: quiet, continuous flagstone surfaces; larger stones span tile boundaries.
// A tile remains 24px for the existing collision/quest map, but artwork no longer
// draws dozens of sharp stones per tile.
function drawHavenmereGround(t,sx,sy,x,y){
 const h=hash(x,y,54),v=hash(x,y,73);
 if(t==='grass'||t==='grass2'||t==='building'||t==='door'){
  const built=t==='building'||t==='door';
  pix(sx,sy,24,24,built?'#556254':t==='grass'?'#4e735a':'#567a60');
  // Only a few plants; no repeated confetti texture or flower carpet.
  if(!built&&h>.46){
   const ax=sx+5+v*13,ay=sy+7+hash(x,y,67)*12;
   ctx.strokeStyle='#75936f99';ctx.lineWidth=.75;
   ctx.beginPath();ctx.moveTo(ax,ay+3);ctx.lineTo(ax+1,ay-2);ctx.moveTo(ax,ay+1);ctx.lineTo(ax-2,ay-1);ctx.stroke();
  }
  if(!built&&h>.973){ctx.fillStyle='#d8bb87';ctx.beginPath();ctx.arc(sx+15,sy+13,1.15,0,Math.PI*2);ctx.fill()}
  return;
 }
 if(t==='fence'){
  pix(sx,sy,24,24,'#425f48');pix(sx,sy+17,24,7,'#314b3c');
  for(let i=0;i<4;i++){
   const px=sx+i*6;ctx.fillStyle='#1c2a2599';ctx.beginPath();ctx.moveTo(px+6,sy+13);ctx.lineTo(px+17,sy+24);ctx.lineTo(px+13,sy+24);ctx.closePath();ctx.fill();
   ctx.fillStyle=i%2?'#80603f':'#9e7850';ctx.fillRect(px,sy+4,5.2,17);
   ctx.fillStyle='#c39a67';ctx.beginPath();ctx.moveTo(px,sy+4);ctx.lineTo(px+2.5,sy-1);ctx.lineTo(px+5,sy+4);ctx.closePath();ctx.fill();
   ctx.fillStyle='#392c29';ctx.fillRect(px+1,sy+9,3,1);
  }
  pix(sx,sy+10,24,3,'#624b37');pix(sx,sy+18,24,3,'#5b4634');return;
 }
 const square=t==='plaza', stoneW=square?48:40,stoneH=square?35:28;
 const ground=square?'#b6ad9e':'#999386';
 ctx.fillStyle=ground;ctx.fillRect(sx,sy,24,24);
 // Low-contrast natural paving seams, aligned globally across adjacent cells.
 const wx=x*24,wy=y*24;
 ctx.save();ctx.beginPath();ctx.rect(sx,sy,24,24);ctx.clip();
 const firstRow=Math.floor(wy/stoneH)-1,lastRow=Math.ceil((wy+24)/stoneH)+1;
 for(let row=firstRow;row<=lastRow;row++){
  const py=row*stoneH,localY=sy+py-wy,stagger=(row%2)*stoneW/2;
  const firstCol=Math.floor((wx-stagger)/stoneW)-1,lastCol=Math.ceil((wx+24-stagger)/stoneW)+1;
  for(let col=firstCol;col<=lastCol;col++){
   const px=col*stoneW+stagger,localX=sx+px-wx,n=hash(row,col,84);
   ctx.fillStyle=square?(n>.54?'#ffffff08':'#6d584905'):(n>.55?'#ece5d009':'#3f352209');
   ctx.fillRect(localX+1,localY+1,stoneW-2,stoneH-2);
   ctx.strokeStyle=square?'#645b4d3b':'#4a49423c';ctx.lineWidth=.8;
   ctx.strokeRect(localX+.3,localY+.3,stoneW-.6,stoneH-.6);
  }
 }
 if(h>.95){ctx.strokeStyle='#6c716334';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(sx+14,sy+17);ctx.lineTo(sx+18,sy+18);ctx.stroke()}
 ctx.restore();
}

// Wild roads are soil and wagon ruts, not the same masonry found in Havenmere.
function drawGloamwoodRoad(sx,sy,x,y){
 const h=hash(x,y,43),light=hash(x,y,51);
 const grd=ctx.createLinearGradient(sx,sy,sx+24,sy+24);
 grd.addColorStop(0,h>.5?'#8a7255':'#84684d');grd.addColorStop(1,h>.5?'#70583f':'#755b44');
 ctx.fillStyle=grd;ctx.fillRect(sx,sy,24,24);
 for(let i=0;i<20;i++){
  const rx=sx+hash(x*19+i,y,8)*24,ry=sy+hash(x,y*17+i,12)*24;
  ctx.fillStyle=i%4===0?'#c09f78':i%3===0?'#594b36':'#a48660';
  ctx.fillRect(rx,ry,i%5===0?2:.8,i%7===0?1.5:.7);
 }
 ctx.strokeStyle='#5f4734';ctx.lineWidth=1.4;ctx.globalAlpha=.27;
 for(const yy of [7,17]){ctx.beginPath();ctx.moveTo(sx,sy+yy+h*2);ctx.quadraticCurveTo(sx+12,sy+yy+light*2,sx+24,sy+yy+h*2);ctx.stroke()}
 ctx.globalAlpha=1;
 const up=maps.wild.tiles[y-1]?.[x],down=maps.wild.tiles[y+1]?.[x];
 if(up!=='path'&&up!=='townGate'&&up!=='bridge'){
  ctx.fillStyle='#39684f';ctx.fillRect(sx,sy,24,2);
  for(let k=0;k<6;k++){ctx.strokeStyle='#649365';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx+k*4,sy+5);ctx.lineTo(sx+k*4+2,sy-1);ctx.stroke()}
 }
 if(down!=='path'&&down!=='townGate'&&down!=='bridge'){
  ctx.fillStyle='#325b48';ctx.fillRect(sx,sy+22,24,2);
  for(let k=0;k<6;k++){ctx.strokeStyle='#71956c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx+k*4,sy+24);ctx.lineTo(sx+k*4+1,sy+20);ctx.stroke()}
 }
}
function drawTile(t,sx,sy,x,y,loc){
 if((loc==='camp'||loc==='town')&&t==='fence'&&window.AshenPresentation?.piece(ctx,'fence',sx+12,sy+24,29,30))return;
 const regions=TERRAIN_CELLS[t];
 if(loc==='wild'&&t==='path'){drawGloamwoodRoad(sx,sy,x,y);return;}
 if(loc==='town' && ['path','plaza','grass','grass2','fence','building','door'].includes(t)){drawHavenmereGround(t,sx,sy,x,y);return;}
 if(regions && imageReady('terrain_atlas.png')){
  const uv=regions[Math.floor(hash(x,y,41)*regions.length)];
  ctx.drawImage(ART['terrain_atlas.png'],uv[0],uv[1],uv[2],uv[3],sx,sy,T,T);
  // The forge and hearth flames are a lightweight animated emissive overlay.
  if(t==='forge'||t==='hearth'){
   const blaze=5+Math.sin(animTick/9+x)*2;
   const g=ctx.createRadialGradient(sx+12,sy+16,1,sx+12,sy+16,18);
   g.addColorStop(0,'#ffde9d90');g.addColorStop(1,'#ff7a3a00');ctx.fillStyle=g;ctx.fillRect(sx-8,sy-5,40,42);
   ctx.fillStyle='#ffe3a2';ctx.fillRect(sx+11,sy+18-blaze,2,blaze);
  }
  return;
 }
 const n=hash(x,y,loc==='town'?5:loc==='wild'?11:23),nx=hash(x*3,y*5,33),wave=Math.sin(animTick/18+x*1.7+y*.8);
 pix(sx,sy,T,T,tileColor(t));
 if(t==='grass'||t==='grass2'){
  pix(sx+2,sy+3,4,2,t==='grass'?'#48895c':'#519461');pix(sx+14,sy+9,3,1,'#276047');
  if(n>.19){pix(sx+7,sy+13,2,5,'#82b86f');pix(sx+6,sy+15,1,2,'#7ca965');pix(sx+9,sy+13,1,3,'#a1bd7b')}
  if(n>.77){pix(sx+17,sy+5,3,2,'#e8c3a1');pix(sx+18,sy+4,1,4,'#f4dfb9');pix(sx+18,sy+9,1,3,'#2d684b')}
  if(nx>.76){pix(sx+3,sy+20,4,2,'#264e41');pix(sx+5,sy+17,2,5,'#44865c')}
 }
 if(t==='path'||t==='townGate'||t==='cryptGate'){
  pix(sx,sy+2,24,2,'#ab9476');pix(sx,sy+13,24,1,'#705947');
  const stones=[[2,4,8,5],[13,5,9,6],[4,15,9,6],[16,16,6,5]];
  stones.forEach(([a,b,w,h],i)=>{pix(sx+a,sy+b,w,h,i%2?'#ad987e':'#bba68c');pix(sx+a,sy+b,w,1,'#d0b99b');pix(sx+a+w-1,sy+b+1,1,h-1,'#7b6653')});
  if(n>.63)pix(sx+9,sy+12,3,2,'#726454');
 }
 if(t==='bridge'){
  pix(sx,sy,24,24,'#574a3d');for(let i=0;i<4;i++){pix(sx,sy+i*6+1,24,5,i%2?'#956a4d':'#aa7b52');pix(sx,sy+i*6+2,24,1,'#d9a371');pix(sx+3,sy+i*6+3,2,1,'#4a382f')}
  pix(sx+1,sy,2,24,'#463c35');pix(sx+21,sy,2,24,'#463c35');
 }
 if(t==='water'){
  pix(sx+1,sy+1,10,6,'#2c799a');pix(sx+11,sy+9,12,7,'#1c587d');pix(sx,sy+18,13,6,'#237ca0');
  const a=Math.floor((wave+1)*2);pix(sx+2+a,sy+6,9,2,'#72c2cf');pix(sx+12-a,sy+18,9,2,'#90d5d9');pix(sx+7,sy+13,5,1,'#b1d9d8');
 }
 if(t==='forest'){
  pix(sx+9,sy+12,6,12,'#523e39');pix(sx+6,sy+18,12,5,'#70513d');
  // An outlined, layered tree crown; not a solid-colored square.
  polygon([[2+sx,13+sy],[5+sx,7+sy],[9+sx,7+sy],[10+sx,2+sy],[16+sx,2+sy],[19+sx,9+sy],[22+sx,11+sy],[20+sx,20+sy],[4+sx,20+sy]],'#163d38');
  polygon([[3+sx,11+sy],[7+sx,6+sy],[11+sx,3+sy],[17+sx,5+sy],[20+sx,11+sy],[19+sx,17+sy],[5+sx,17+sy]],'#2c7054');
  pix(sx+7,sy+6,8,3,'#5b9869');pix(sx+4,sy+12,8,3,'#49905d');pix(sx+15,sy+10,4,5,'#3a7957');pix(sx+10,sy+18,8,2,'#205143');
  if(n>.5){pix(sx+13,sy+6,3,2,'#9ab77c');pix(sx+5,sy+14,3,1,'#93b17b')}
 }
 if(t==='mountain'){
  pix(sx,sy,24,24,'#3f4e61');polygon([[0+sx,23+sy],[9+sx,2+sy],[14+sx,9+sy],[18+sx,5+sy],[24+sx,23+sy]],'#8d94a0');
  polygon([[8+sx,3+sy],[10+sx,9+sy],[13+sx,12+sy],[5+sx,12+sy]],'#e6dcca');polygon([[18+sx,5+sy],[20+sx,12+sy],[15+sx,13+sy]],'#c4ccd2');
  polygon([[0+sx,23+sy],[12+sx,16+sy],[19+sx,23+sy]],'#596979');pix(sx+13,sy+18,8,2,'#2e4254');pix(sx+3,sy+21,7,1,'#bac1bb');
 }
 if(t==='woodFloor'||t==='stoneFloor'||t==='rug'){
  const wood=t==='woodFloor',carpet=t==='rug';const base=carpet?'#7d4254':wood?'#926f50':'#777e8b';pix(sx,sy,24,24,base);
  if(carpet){pix(sx+1,sy+1,22,22,'#9b5960');pix(sx+3,sy+3,18,18,'#884657');pix(sx+4,sy+4,16,1,'#d0a478');pix(sx+4,sy+19,16,1,'#d0a478');if((x+y)%2===0)pix(sx+10,sy+10,4,4,'#bb8a7c')}
  else if(wood){pix(sx,sy+2,24,1,'#b28c65');pix(sx,sy+13,24,1,'#583e39');pix(sx+(x%3)*6+4,sy+3,1,10,'#6a4938');pix(sx+18-((y%3)*4),sy+15,1,8,'#704b3c');if(n>.5)pix(sx+6,sy+19,5,1,'#b98f65')}
  else {pix(sx,sy,24,1,'#abb2b9');pix(sx,sy,1,24,'#9ba2a8');pix(sx+2,sy+18,22,1,'#505969');pix(sx+11,sy+1,1,17,'#505967');pix(sx+3,sy+4,7,1,'#939ba7')}
 }
 if(t==='exitDoor'){pix(sx,sy,24,24,'#3a3031');pix(sx+3,sy+1,18,22,'#ad8057');pix(sx+6,sy+3,12,19,'#463637');pix(sx+14,sy+11,2,2,'#e5c58e')}
 if(t==='insideWall'||t==='wallTrim'||t==='window'){
  pix(sx,sy,24,24,t==='insideWall'?'#3b3c45':'#5b4b4a');pix(sx,sy,24,3,'#80776c');pix(sx,sy+21,24,3,'#292c33');
  if((x+y)%2===0){pix(sx+3,sy+9,15,1,'#62616a');pix(sx+11,sy+3,1,8,'#282e39')}
  if(t==='window'){pix(sx+4,sy+5,16,15,'#ead8aa');pix(sx+6,sy+7,12,11,'#4f9fb9');pix(sx+11,sy+7,2,11,'#d7dcce');pix(sx+6,sy+12,12,2,'#d7dcce')}
 }
 if(['pillar','books','forge','anvil','rack','crate','bed','hearth','table','plant','barrel'].includes(t)){pix(sx,sy,24,24,loc==='inn'||loc==='tavern'?'#8b684d':'#737985');drawFurnitureTile(t,sx,sy,animTick)}
 if(t==='door'){pix(sx,sy,24,24,'#4e3740');pix(sx+2,sy+1,20,23,'#77523b');pix(sx+5,sy+3,14,21,'#2c2530')}
 if(t==='building'){
  pix(sx,sy,24,24,'#4c3b42');pix(sx,sy+21,24,3,'#393642');pix(sx+1,sy+4,21,1,'#816368');pix(sx+4,sy+11,10,1,'#705260');
 }
 if(t==='floor'){
  pix(sx,sy,24,24,(x+y)%2?'#4c5665':'#505967');pix(sx,sy,24,2,'#707a87');pix(sx,sy,2,24,'#737984');
  pix(sx+3,sy+4,18,1,'#616b79');pix(sx+12,sy+5,1,15,'#343e4e');pix(sx+1,sy+17,12,1,'#374758');
  if(n>.7){pix(sx+6,sy+11,6,2,'#707781');pix(sx+15,sy+19,4,1,'#9b8a78')}
 }
 if(t==='wall'){
  pix(sx,sy,24,24,'#263140');pix(sx,sy,24,4,'#505d69');pix(sx,sy+4,24,2,'#1b2632');
  for(let i=0;i<3;i++){const yy=6+i*6;pix(sx,sy+yy,24,1,'#5c6c7b');pix(sx+((i%2)*11+7),sy+yy+1,1,5,'#566272')}
  pix(sx+3,sy+9,2,2,'#384656');pix(sx+17,sy+20,4,1,'#1a242f');
 }
 if(t==='fence'){
  pix(sx+2,sy+1,5,22,'#574332');pix(sx+16,sy+1,5,22,'#49382d');pix(sx+2,sy+1,3,4,'#c3a06d');pix(sx+17,sy+1,3,4,'#b99565');
  pix(sx,sy+7,24,4,'#ab885d');pix(sx,sy+16,24,4,'#b39268');pix(sx,sy+8,24,1,'#d0aa72');pix(sx,sy+17,24,1,'#dbc18c')
 }
 if(t==='fountain'){pix(sx,sy,24,24,'#9eb4aa');pix(sx+2,sy+2,20,20,'#dde1cc');pix(sx+4,sy+4,16,16,'#2b8baf');pix(sx+7,sy+7,10,10,'#54c3cd');pix(sx+9,sy+8,3,6,'#bcebef')}
}
function drawFurnitureTile(t,sx,sy,time){
 const glow=Math.sin(time/11)*1.8;
 if(t==='table'){pix(sx+3,sy+4,18,16,'#48352f');pix(sx+2,sy+3,20,14,'#c08b60');pix(sx+4,sy+5,16,9,'#9c684b');pix(sx+7,sy+7,4,3,'#f4d9aa');pix(sx+14,sy+11,3,3,'#e4af6e')}
 if(t==='bed'){pix(sx+3,sy+1,18,23,'#624738');pix(sx+5,sy+2,14,19,'#d7c3ac');pix(sx+6,sy+3,12,6,'#ece8d5');pix(sx+5,sy+10,14,10,'#627ba1');pix(sx+7,sy+12,10,2,'#86a2c2')}
 if(t==='books'){pix(sx+2,sy+1,20,22,'#513b36');for(let j=0;j<2;j++){pix(sx+4,sy+10*j+3,16,8,'#755748');for(let i=0;i<5;i++)pix(sx+5+i*3,sy+10*j+4,2,6,['#d0ae72','#7d96b0','#a9786f'][i%3])}pix(sx+3,sy+11,18,2,'#c49b6f')}
 if(t==='pillar'){pix(sx+4,sy,16,24,'#b9af9d');pix(sx+3,sy,18,4,'#e2d6bc');pix(sx+6,sy+5,12,15,'#9b9d9b');pix(sx+3,sy+21,18,3,'#e0ccb0')}
 if(t==='forge'||t==='hearth'){pix(sx+1,sy+2,22,22,'#3b3434');pix(sx+3,sy+4,18,18,'#665553');pix(sx+5,sy+10,14,12,'#2e2228');pix(sx+5,sy+17,14,5,'#dc6e32');pix(sx+9,sy+9+glow,8,10,'#ffb34b');pix(sx+11,sy+7+glow,3,9,'#fff0a4')}
 if(t==='anvil'){pix(sx+9,sy+13,7,9,'#4b4d59');pix(sx+3,sy+9,20,7,'#a0b1b4');pix(sx+1,sy+7,11,4,'#bec8c9');pix(sx+15,sy+6,6,3,'#d6e2df')}
 if(t==='rack'){pix(sx+1,sy+2,22,21,'#564b40');pix(sx+2,sy+5,20,3,'#c6a176');for(let i=0;i<3;i++){pix(sx+5+i*6,sy+2,2,19,'#a0b5be');pix(sx+4+i*6,sy+2,4,3,'#e3dbca')}pix(sx+2,sy+20,20,3,'#c6a176')}
 if(t==='crate'){pix(sx+2,sy+4,20,18,'#9e7650');pix(sx+4,sy+6,16,14,'#674b39');pix(sx+5,sy+9,14,2,'#b68b60');pix(sx+4,sy+16,16,2,'#b68b60')}
 if(t==='plant'){pix(sx+6,sy+15,13,8,'#bc7d56');pix(sx+9,sy+8,6,8,'#3d7b50');pix(sx+4,sy+10,8,7,'#5eae65');pix(sx+13,sy+5,7,9,'#83bb68')}
 if(t==='barrel'){pix(sx+4,sy+3,16,20,'#79503b');pix(sx+5,sy+4,14,18,'#ba8a57');pix(sx+4,sy+8,16,3,'#43424a');pix(sx+4,sy+17,16,3,'#43424a');pix(sx+11,sy+6,2,12,'#d3a374')}
}
// Reforged gate, watchtowers, village furnishings and moving civilians.
function drawGloamwoodOutskirts(scrollX,scrollY){
 // World-map settlement has a proper silhouette, fortified gate and rooftops.
 const tx=7*T-scrollX,ty=16*T-scrollY;
 if(window.AshenEnvironment?.gate(ctx,tx+12,ty)){
  // Painted landmark uses the same entrance coordinates as the original map.
 }else if(imageReady('havenmere/outskirts.png')){
  ctx.drawImage(ART['havenmere/outskirts.png'],tx-69,ty-116,137,98);
 }else{
  ctx.fillStyle='#b9a583';ctx.fillRect(tx-48,ty-34,96,43);textDraw('HAVENMERE',tx,ty-39,14,'#e4c792','center');
 }
 // A waystone tells you how to enter. It is visible and distinct from the floor tiles.
 const x=tx+47,y=ty-2;window.AshenWorldArt?.draw(ctx,'sign',x+12,y+10,31,41);
}

function drawInteriorDecor(room,scrollX,scrollY){
 if(window.AshenInteriors?.has(room))return;
 const sx=x=>x*T-scrollX, sy=y=>y*T-scrollY;
 // Large room-defining props, mullioned windows, warm lantern pools and trim.
 for(const [x,y] of [[3,3],[15,3],[3,11],[15,11]]){
  const px=sx(x)+12,py=sy(y)+12;
  const glow=ctx.createRadialGradient(px,py,2,px,py,45);
  glow.addColorStop(0,room==='smith'?'#f4974650':'#ffe2a735');glow.addColorStop(1,'#ffbb8000');ctx.fillStyle=glow;ctx.fillRect(px-45,py-45,90,90);
  pix(px-2,py-9,4,9,'#d0b98d');pix(px-3,py-11,6,4,'#fff1b4');
 }
 const banner=({hall:'HALL OF THE ELDER',smith:'GARRICK’S FORGE',inn:'BLUE LANTERN INN',tavern:'WAYFARER TAVERN',chapel:'SANCTUARY OF THE DAWN',cottage:'OAK COTTAGE',bakery:'MILLSTONE BAKERY'})[room]||'HAVENMERE';
 const bx=sx(4),by=sy(1);pix(bx,by,238,18,'#1c2839d9');pix(bx,by,238,1,'#c6a878');textDraw(banner,bx+119,by+13,10,'#ffe2b0','center');
 // Clear luminous exit threshold at the southern end of every room.
 const ex=sx(8),ey=sy(12);pix(ex+7,ey+21,11,2,'#f1cc79');
 const ambient=ctx.createLinearGradient(0,0,0,H/cameraZoom);ambient.addColorStop(0,'#ffd99b0a');ambient.addColorStop(1,'#000d241c');ctx.fillStyle=ambient;ctx.fillRect(0,0,W/cameraZoom,H/cameraZoom)
}
function drawCryptDecor(scrollX,scrollY){
 for(const [x,y] of [[5,14],[12,5],[14,25],[21,7],[26,20],[34,7],[35,23]]){
  const sx=x*T-scrollX+12,sy=y*T-scrollY+18;
  ctx.strokeStyle='#544539';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx,sy+9);ctx.lineTo(sx,sy);ctx.stroke();
  window.AshenPresentation?.flame(ctx,sx,sy,12,performance.now());
 }
}

// LPC Revised composited sprites (64x64 original cell, directions: up/left/down/right).
// Three animation blocks per sprite: idle (3f), walk (8f), slash (7f).
// Pixel rendering is used for LPC characters only. Background painting keeps its own smoothing.
const LPC_DIRECTIONS={up:0,left:1,down:2,right:3};
const LPC_ANIMS={idle:0,walk:1,slash:2};
function drawLPC(name,x,y,direction='down',animation='idle',size=60,fade=1){
 const key='lpc/'+name.toLowerCase()+'.png';
 if(!imageReady(key))return false;
 const img=ART[key],ani=LPC_ANIMS[animation]??0,dir=LPC_DIRECTIONS[direction]??2;
 const len=animation==='walk'?8:animation==='slash'?7:3;
 const frame=animation==='idle'?Math.floor(animTick/31)%3:animation==='slash'?Math.floor(animTick/6)%len:Math.floor(animTick/7)%len;
 const row=ani*4+dir;
 ctx.save();ctx.globalAlpha*=fade;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(img,frame*64,row*64,64,64,x-size*.5,y-size*.91,size,size);
 ctx.restore();return true;
}
function drawSprite(x,y,role='Fighter',palette='hero',direction='down',scale=1,hero=null,motion=null){
 const lpcName=role.toLowerCase();
 const walking=mode==='explore'&&(motion?motion.walking:(palette==='hero'||hero)&&performance.now()-lastSpriteStepAt<180);
 if(hero&&window.AshenIdentity?.draw(ctx,hero,x,y,{direction,height:44*scale,walking,shadow:motion?.shadow!==false,gait:motion?.gait,time:performance.now()}))return;
 if((direction==='up'||direction==='down')&&drawLPC(lpcName,x,y,direction,walking?'walk':'idle',58*scale))return;
 const asset=window.AshenSprites?.manifest.characters[lpcName];
 if(asset&&window.AshenSprites.ready(lpcName)){
  const walking=mode==='explore'&&(palette==='hero'||hero)&&performance.now()-lastSpriteStepAt<180;
  const stature=hero?.ancestry==='Halfling'?.82:hero?.ancestry==='Dwarf'?.9:1;
  if(window.AshenSprites.draw(ctx,lpcName,x,y,{state:walking?'walk':'idle',height:asset.heightInWorld*scale*stature,facing:direction==='left'?'left':'right'}))return;
 }
 if(imageReady('lpc/'+lpcName+'.png')){
  const walking=mode==='explore' && palette==='hero' && keyboard.size>0;
  if(drawLPC(lpcName,x,y,direction,walking?'walk':'idle',58*scale))return;
 }
 if(imageReady('heroes_atlas.png') && ROLE_ROW[role]!==undefined){
  const row=ROLE_ROW[role]*4+(DIRECTION_ROW[direction]??0);
  const moving = mode==='explore' && palette==='hero' && keyboard.size>0;
  const frame = moving ? Math.floor(animTick/8)%4 : 0;
  const footSway = moving ? Math.sin(animTick/6)*.8 : Math.sin(animTick/38)*.35;
  ctx.save();ctx.imageSmoothingEnabled=true;
  ctx.drawImage(ART['heroes_atlas.png'],frame*96,row*112,96,112,x-13*scale,y-(32+footSway)*scale,26*scale,33*scale);
  ctx.restore();return;
 }
 ctx.save();ctx.translate(Math.floor(x),Math.floor(y));ctx.scale(scale,scale);
 const robes={Fighter:'#7b91ae',Rogue:'#3d8874',Wizard:'#7e70bc',Cleric:'#d9c9a8'}[role]||'#7b91ae';
 const accent=palette==='hero'?'#efd18d':palette==='npc'?'#c68d64':palette;
 const bob=Math.floor(animTick/11)%2,side=direction==='left'||direction==='right',back=direction==='up';
 // A grounded silhouette with contrasting boots, gloves, face and gear.
 pix(-7,0,15,3,'#20343a');pix(-6,-7,5,8,'#293541');pix(2,-7,5,8,'#293541');pix(-5,-9,4,4,'#5a657a');pix(2,-9,4,4,'#5a657a');
 pix(-8,-18+bob,17,13,'#222b37');pix(-7,-17+bob,15,12,robes);pix(-8,-14+bob,3,7,'#bf9876');pix(6,-14+bob,3,7,'#b88a6a');
 pix(-5,-8+bob,11,2,accent);pix(-4,-6+bob,8,2,'#564747');
 pix(-6,-28+bob,13,13,'#393341');pix(-5,-27+bob,11,11,palette==='npc'?'#d1a17c':'#dfb590');
 // Hair and eyes change with facing.
 const hair=palette==='npc'?'#695248':'#3a3241';
 pix(-6,-29+bob,13,5,hair);pix(-7,-26+bob,3,8,hair);pix(5,-26+bob,2,6,hair);
 if(back){pix(-5,-25+bob,10,8,hair);pix(-5,-20+bob,10,2,'#50404a')}
 else if(side){pix(direction==='right'?3:-4,-22+bob,3,2,'#272736');pix(direction==='right'?4:-6,-18+bob,3,1,'#b67c67')}
 else {pix(-4,-22+bob,2,2,'#24313b');pix(3,-22+bob,2,2,'#24313b');pix(-1,-18+bob,4,1,'#b87d6d')}
 if(role==='Wizard'){
  polygon([[-9,-28+bob],[-2,-36+bob],[5,-36+bob],[10,-28+bob]],'#5c4fa0');pix(-11,-29+bob,22,3,'#9689da');pix(-8,-16+bob,3,10,'#9a8dcf');pix(11,-19+bob,2,19,'#cbb27e');pix(9,-22+bob,6,6,'#9de4ed');pix(11,-23+bob,2,2,'#fff5be')
 }
 if(role==='Fighter'){
  pix(-9,-16+bob,5,11,'#b2c3d3');pix(-9,-16+bob,5,3,'#ecdcbe');pix(11,-21+bob,3,22,'#bbc9d3');pix(9,-26+bob,7,7,'#eff0df');pix(11,-21+bob,3,4,'#8197a4');pix(-7,-17+bob,2,4,'#d8ae70')
 }
 if(role==='Rogue'){
  pix(-8,-29+bob,16,8,'#355852');pix(-6,-27+bob,12,2,'#587e69');pix(-8,-18+bob,3,14,'#253c44');pix(9,-12+bob,4,13,'#bac7b7');pix(9,-11+bob,4,3,'#e5e6c9')
 }
 if(role==='Cleric'){
  pix(-8,-31+bob,17,10,'#e0d8c5');pix(-5,-28+bob,11,7,'#f1e5c9');pix(-7,-17+bob,4,11,'#f1d7a9');pix(11,-21+bob,3,22,'#bda57b');pix(8,-20+bob,9,3,'#f9d485');pix(11,-23+bob,3,9,'#f9d485');pix(-2,-13+bob,5,9,'#dbb778')
 }
 ctx.restore()
}

function drawEntity(e,sx,sy,motion=null){if(e.ambient){
 const x=sx+12,y=sy+12+(e.seated?18:0);
 if(window.AshenAmbientArt?.drawAmbient(ctx,e,x,y,{time:performance.now(),height:e.seated?34:40})){if(!e.seated)window.AshenGrounding?.shadow(ctx,x,y,{width:8,height:2.5});return}
 drawSprite(x,y,e.role,'npc',e.dir,e.seated?.8:1,e.hero,motion);return;
}if(e.kind==='warboss'||e.kind==='campScout'){drawEnemy({type:e.kind==='warboss'?'warboss':'goblin',hp:1},sx+12,sy+24,e.kind==='warboss'?.25:.27);textDraw('!',sx+12,sy-12,11,'#ffcf87','center');return}if(['elder','shop','inn','merchant','rogue','cleric','crier','villager','archivist','apprentice','pilgrim','keeper','healer','acolyte','resident','baker','breadApprentice'].includes(e.kind)){const roles={elder:'Wizard',shop:'Fighter',inn:'Cleric',merchant:'Rogue',rogue:'Rogue',cleric:'Cleric',crier:'Fighter',villager:'Cleric',archivist:'Wizard',apprentice:'Fighter',pilgrim:'Cleric',keeper:'Rogue',healer:'Cleric',acolyte:'Cleric',resident:'Rogue',baker:'Cleric',breadApprentice:'Rogue'};if(!window.AshenNPCArt?.draw(ctx,e,sx+12,sy+12+(window.AshenGrounding?.offset(e)??0),e.kind==='rogue'&&e.seated?30:e.seated?34:40)&&!window.AshenPresentation?.npc(ctx,e.kind,sx+12,sy+12+(window.AshenGrounding?.offset(e)??0),performance.now(),e.seated?34:40,{shadow:!e.seated&&!e.behindBar})){if(['cleric','rogue'].includes(e.kind)){const companion={role:roles[e.kind],ancestry:e.kind==='cleric'?'Elf':'Halfling',appearance:e.kind==='cleric'?'female':'male',gear:{}};drawSprite(sx+12,sy+12+(window.AshenGrounding?.offset(e)??0),roles[e.kind],'npc','down',e.seated?.8:1,companion,{walking:false,gait:0,shadow:!e.seated&&!e.behindBar})}else drawLPC(roles[e.kind].toLowerCase(),sx+12,sy+12+(window.AshenGrounding?.offset(e)??0),'down','idle',e.seated?44:54)}if(e.symbol==='!'||e.symbol==='i'){const bob=Math.floor(Math.sin(animTick/15)*2);textDraw(e.symbol,sx+11,sy+12+(window.AshenGrounding?.offset(e)??0)-(e.seated?34:40)-7+bob,12,e.col,'center')}return}
 if(e.kind==='townGate'||e.kind==='cryptGate'||e.kind==='exit')return;
 if(window.AshenWorldArt?.entity(ctx,e,sx+12,sy+24,G.flags))return;
 if(e.kind==='satchel'){pix(sx+5,sy+10,15,10,'#895b3f');pix(sx+7,sy+7,11,4,'#d3ae76');pix(sx+13,sy+11,3,3,'#e7c77e');return}
 if(e.kind.includes('Chest')||e.kind==='cryptChestA'||e.kind==='cryptChestB'){pix(sx+3,sy+8,19,13,'#8c5b3d');pix(sx+3,sy+9,19,4,'#c39156');pix(sx+12,sy+8,3,14,'#e3bb75');pix(sx+11,sy+14,5,4,'#625248');return}
 if(e.kind==='leverA'||e.kind==='leverB'){pix(sx+6,sy+10,13,13,'#646b84');pix(sx+7,sy+11,11,5,G.flags[e.kind]?'#37534c':'#86b2d5');pix(sx+11,sy+5,4,9,'#a9c6cf');return}
 if(e.kind==='shrine'){pix(sx+5,sy+10,15,13,'#546474');pix(sx+9,sy+5,8,13,'#9ba2ae');pix(sx+11,sy+8,4,4,'#a7e4ed');return}
 if(e.kind==='altar'){pix(sx+1,sy+5,22,18,'#6b4250');pix(sx+4,sy+2,16,19,'#b0786e');pix(sx+8,sy+6,8,8,'#eeb181');pix(sx+11,sy+9,3,4,'#fff1b3');return}
 if(e.kind==='gate'){pix(sx+2,sy,20,24,G.flags.gate?'#5b555f':'#2b222e');for(let k=0;k<4;k++)pix(sx+5+k*4,sy+2,2,19,G.flags.gate?'#786777':'#ad647b');return}
}
function paintSceneLights(loc,scrollX,scrollY,w,h){
 if(window.AshenLighting&&G.world){window.AshenLighting.draw(ctx,maps[loc],loc,scrollX,scrollY,w,h,G.world.clock,performance.now(),G.world.objects);return}
 if(window.AshenInteriors?.has(loc)){window.AshenInteriors.lights(ctx,loc,scrollX,scrollY,animTick);return}
 const pools=[];
 if(loc==='town'){
  for(const b of maps.town.buildings){pools.push({x:(b.doorX+.5)*T-scrollX,y:(b.doorY+.3)*T-scrollY,r:38,col:[254,190,108],power:.16})}
  pools.push({x:19.5*T-scrollX,y:15.5*T-scrollY,r:60,col:[114,220,239],power:.18});
 }else if(loc==='smith'){pools.push({x:6*T-scrollX,y:6*T-scrollY,r:92,col:[255,145,58],power:.39})}
 else if(['inn','tavern','hall','chapel','cottage','bakery'].includes(loc)){
  pools.push({x:5*T-scrollX,y:4*T-scrollY,r:90,col:[251,182,95],power:.23});
  pools.push({x:11*T-scrollX,y:6*T-scrollY,r:93,col:[252,189,107],power:.19});
 }else if(loc==='crypt'){
  for(const pos of [[8,5],[8,25],[32,23]])pools.push({x:(pos[0]+.5)*T-scrollX,y:(pos[1]+.5)*T-scrollY,r:66,col:[105,179,239],power:.21});
  pools.push({x:(G.x+.5)*T-scrollX,y:(G.y+.5)*T-scrollY,r:75,col:[250,191,114],power:.25});
 }
 ctx.save();ctx.globalCompositeOperation='screen';
 for(const p of pools){
  if(p.x<-p.r||p.y<-p.r||p.x>w+p.r||p.y>h+p.r)continue;
  let pulse=1+.06*Math.sin(animTick/14+p.x*.05);
  const g=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,p.r*pulse);
  const [r,gc,b]=p.col;
  g.addColorStop(0,`rgba(${r},${gc},${b},${p.power})`);g.addColorStop(.42,`rgba(${r},${gc},${b},${p.power*.31})`);g.addColorStop(1,`rgba(${r},${gc},${b},0)`);
  ctx.fillStyle=g;ctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);
 }
 ctx.restore();
 if(loc==='crypt'||loc==='wild'||loc==='camp'){
  ctx.save();ctx.fillStyle=loc==='crypt'?'#adc7d42b':'#e6d7be20';
  for(let i=0;i<26;i++){
   const x=(hash(i,10,31)*w+Math.sin(animTick/55+i)*12+w)%w;
   const y=(hash(i,20,51)*h+animTick*(.08+(i%5)*.025))%h;
   ctx.beginPath();ctx.arc(x,y,i%4===0?1.1:.48,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
}
// Painted district labels and warm architectural door glows add navigational hierarchy.
// District titles are presented unobtrusively in the HUD, never over the roads.
function drawTownDistrictSigns(scrollX,scrollY){}
function townDistrict(x,y){
 if(y<=7)return x>=10&&x<20?'GREAT HALL COURT':x>=20?'LANTERN ROW':'NORTH COTTAGES';
 if(x<=10)return y>=12?'FORGE LANE':'WEST WALK';
 if(x>=24&&y>=13)return 'EAST GATE';
 if(x>=20&&y<13)return 'LANTERN ROW';
 if(y>=15)return 'MARKET SQUARE';
 return 'HIGH STREET';
}
let lastTownDistrict='',districtHideTimer=null;
function updateTownDistrict(){
 const card=$('districtNotice');if(!card)return;
 if(!G||G.location!=='town'||mode!=='explore'){card.classList.remove('visible');return}
 const label=townDistrict(G.x,G.y);if(label===lastTownDistrict)return;
 lastTownDistrict=label;card.textContent=label;
 card.classList.remove('visible');void card.offsetWidth;card.classList.add('visible');
 clearTimeout(districtHideTimer);districtHideTimer=setTimeout(()=>card.classList.remove('visible'),2000);
}
function drawCampDecor(scrollX,scrollY){}
function drawAtmosphericEmbers(location,viewW,viewH){
 // Parallax motes are deterministic and lightweight. Combat has its own emitter.
 const count=location==='crypt'?18:location==='wild'?28:location==='town'?12:8;
 ctx.save();
 for(let i=0;i<count;i++){
  const phase=animTick*(.018+(i%7)*.007);
  const x=(hash(i,20,2)*viewW+Math.sin(phase*.6+i)*9+viewW)%viewW;
  const y=(hash(i,32,8)*viewH-phase*.8+viewH*6)%viewH;
  const alpha=.08+.12*hash(i,9,3);
  ctx.fillStyle=location==='crypt'?`rgba(139,186,224,${alpha})`:location==='town'?`rgba(246,210,136,${alpha*.65})`:`rgba(191,225,189,${alpha})`;
  ctx.beginPath();ctx.arc(x,y,.4+(i%4)*.2,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function interiorCamera(m,zoom){
 const focus=window.AshenAnimation?.sample(G.location+':'+G.party[0].id,G.world?.seat?.scene===G.location?G.world.seat.cell.x:G.x,G.world?.seat?.scene===G.location?G.world.seat.cell.y:G.y,G.dir,performance.now())||G;
 const frame=canvas.getBoundingClientRect?.();
 const cover=frame?.width>0&&frame?.height>0&&!document.documentElement.classList.contains('world-windowed');
 const visibleW=cover?Math.min(W,H*frame.width/frame.height):W;
 const visibleH=cover?Math.min(H,W*frame.height/frame.width):H;
 const viewW=W/zoom,viewH=H/zoom;
 // Portrait HUD docks occupy the top and bottom of the physical screen.
 const safeH=cover&&frame.width<frame.height?visibleH*.65:visibleH;
 const axis=(center,size,full,visible)=>size<=visible?(size-full)/2:clamp(center-full/2,-(full-visible)/2,size-full+(full-visible)/2);
 return {viewW,viewH,visibleW,visibleH,scrollX:axis(focus.x*T+12,m.w*T,viewW,visibleW/zoom),scrollY:axis(focus.y*T+12-.02*safeH/zoom,m.h*T,viewH,safeH/zoom)};
}
function drawLocation(){
 window.AshenScenes?.enter(G.location);
 const m=maps[G.location],interior=['hall','smith','inn','tavern','chapel','cottage','bakery'].includes(G.location);
 const localZoom=interior?Math.max(cameraZoom,Math.min(W/(m.w*T),H/(m.h*T))):cameraZoom;
 const viewW=W/localZoom,viewH=H/localZoom;
 const roomView=interior?interiorCamera(m,localZoom):null;
 const focus=window.AshenAnimation?.sample(G.location+':'+G.party[0].id,G.world?.seat?.scene===G.location?G.world.seat.cell.x:G.x,G.world?.seat?.scene===G.location?G.world.seat.cell.y:G.y,G.dir,performance.now())||G;
 const scrollX=roomView?roomView.scrollX:clamp(focus.x*T-viewW/2+T/2,0,Math.max(0,m.w*T-viewW));
 const scrollY=roomView?roomView.scrollY:clamp(focus.y*T-(G.location==='town'?.73:.52)*viewH+T/2,0,Math.max(0,m.h*T-viewH));
 const startX=Math.max(0,Math.floor(scrollX/T)),startY=Math.max(0,Math.floor(scrollY/T));
 ctx.clearRect(0,0,W,H);ctx.save();ctx.scale(localZoom,localZoom);
 const interiorFile='interiors/'+G.location+'.png';
 if(window.AshenInteriors?.background(ctx,m,G.location,scrollX,scrollY)){
  // Authored architecture; furniture joins actors in the ground-depth pass.
 }else if(['hall','smith','inn','tavern','chapel','cottage','bakery'].includes(G.location)&&imageReady(interiorFile)){
  ctx.drawImage(ART[interiorFile],-scrollX,-scrollY,m.w*T,m.h*T);
 }else{
 const landscape=G.location==='crypt'?window.AshenPresentation?.crypt(ctx,m,scrollX,scrollY,viewW,viewH):window.AshenEnvironment?.draw(ctx,m,G.location,scrollX,scrollY,viewW,viewH);
 for(let y=startY;y<=Math.min(m.h-1,startY+Math.ceil(viewH/T)+1);y++)for(let x=startX;x<=Math.min(m.w-1,startX+Math.ceil(viewW/T)+1);x++){const tile=m.tiles[y][x];if(landscape&&(G.location==='crypt'||(G.location!=='crypt'&&window.AshenEnvironment.handles(tile)&&tile!=='fence')))continue;drawTile(tile,Math.floor(x*T-scrollX),Math.floor(y*T-scrollY),x,y,G.location)}
 }
 if(G.location!=='camp')window.AshenLighting?.flames(ctx,G.location,scrollX,scrollY,performance.now());
 if(G.location==='wild'){drawGloamwoodOutskirts(scrollX,scrollY);window.AshenPresentation?.piece(ctx,'crypt_entry',37.5*T-scrollX,22.9*T-scrollY,104,105);window.AshenPresentation?.piece(ctx,'camp_entry',42.5*T-scrollX,24*T-scrollY,93,68);const words=[{x:37,y:20,t:'EMBERFALL CRYPT'},{x:41,y:25,t:'GROMCLAW CAMP'}];for(const label of words)textDraw(label.t,label.x*T-scrollX+12,label.y*T-scrollY,9,'#f7d6ac','center')}
 if(['hall','smith','inn','tavern','chapel','cottage','bakery'].includes(G.location)){drawInteriorDecor(G.location,scrollX,scrollY)}
 if(G.location==='camp')drawCampDecor(scrollX,scrollY);
 if(G.location==='crypt'){drawCryptDecor(scrollX,scrollY);const pulses=[{x:8,y:5},{x:8,y:25},{x:32,y:23}];for(const p of pulses){const sx=p.x*T-scrollX+12,sy=p.y*T-scrollY+12;const r=13+Math.sin(animTick/12)*4;const gr=ctx.createRadialGradient(sx,sy,0,sx,sy,r*3);gr.addColorStop(0,'#b4748050');gr.addColorStop(1,'#b4748000');ctx.fillStyle=gr;ctx.fillRect(sx-r*3,sy-r*3,r*6,r*6)}}

 // Every actor shares one ground-depth pass; walking behind an NPC no longer paints over them.
 const drawables=entities().map(entity=>({type:'entity',x:entity.x,y:entity.y,entity}));
 drawables.push(...(window.AshenEnvironment?.getDecorations(m,G.location)||[]));
 drawables.push(...(window.AshenScenes?.cached(G.location,()=>window.AshenInteriors?.getProps(G.location)||[])||window.AshenInteriors?.getProps(G.location)||[]));
 drawables.push(...(window.AshenWorldProps?.forScene(G.location,m)||[]));
 drawables.push(...(window.AshenArchitecture?.forScene(m,G.location)||[]));
 drawables.push(...(window.AshenInteractions?.props(G.location,G.world)||[]));
 if(trail.length>2)G.party.slice(1).forEach((hero,i)=>{
  const step=trail[Math.min(trail.length-1,(i+1)*3)];
  if(step?.loc===G.location)drawables.push({type:'follower',x:step.x,y:step.y,direction:step.dir||G.dir,hero});
 });
 const seat=G.world?.seat?.scene===G.location?G.world.seat:null;
 drawables.push({type:'leader',x:seat?.cell.x??G.x,y:seat?.cell.y??G.y,seated:!!seat,hero:G.party[0]});
 for(const peer of window.AshenNetwork?.getOthers?.()||[]){
  if(peer.loc===G.location&&Number.isFinite(peer.x)&&Number.isFinite(peer.y))drawables.push({type:'peer',x:peer.x,y:peer.y,peer});
 }
 for(const actor of drawables){if(actor.type==='sceneProp'||actor.type==='interiorProp'||actor.type==='interactiveProp'||actor.type==='landscape')continue;const id=G.location+':'+(actor.hero?.id||actor.peer?.id||actor.entity?.id||actor.entity?.kind+':'+actor.x+':'+actor.y);actor.motion=window.AshenAnimation?.sample(id,actor.x,actor.y,actor.direction||actor.peer?.dir||actor.entity?.dir||G.dir,performance.now());actor.renderX=actor.motion?.x??actor.x;actor.renderY=actor.motion?.y??actor.y;}
 drawables.sort((a,b)=>(window.AshenGrounding?.depth(a)??a.y)-(window.AshenGrounding?.depth(b)??b.y)||a.x-b.x);
 for(const actor of drawables){
  if(actor.type==='sceneProp'){const [x,y,w,h]=actor.bounds;if(window.AshenScenes.visible([x*T,y*T,w*T,h*T],{x:scrollX,y:scrollY,w:viewW,h:viewH})){if(actor.architecture)window.AshenArchitecture.draw(ctx,actor,scrollX,scrollY);else window.AshenWorldProps.draw(ctx,actor,scrollX,scrollY,G)}continue}
  if(actor.type==='interactiveProp'){window.AshenInteractions.draw(ctx,actor,scrollX,scrollY);continue}
  if(actor.type==='interiorProp'){const [x,y,w,h]=actor.prop.bounds;if(!window.AshenScenes||window.AshenScenes.visible([x*T,y*T,w*T,h*T],{x:scrollX,y:scrollY,w:viewW,h:viewH}))window.AshenInteriors.drawProp(ctx,actor.prop,scrollX,scrollY);continue}
  const sx=(actor.renderX??actor.x)*T-scrollX+12,sy=(actor.renderY??actor.y)*T-scrollY+12;
  const margin=actor.height||60;if(sx< -margin||sy< -margin||sx>viewW+margin||sy>viewH+margin)continue;
  if(actor.type==='landscape'){const near=Math.hypot(actor.x-G.x,actor.y-G.y)<1.8;if(actor.prop)window.AshenPresentation?.piece(ctx,actor.prop,sx,sy,47,20,near?.4:1);else window.AshenEnvironment.tree(ctx,sx,sy,actor.height,near?.28:1,actor.variant);continue}
  if(actor.type==='entity'){drawEntity(actor.entity,sx-12,sy-12,actor.motion);continue}
  if(actor.hero){
   if(actor.seated&&window.AshenSeating?.draw(ctx,actor.hero,sx,sy+18,36,{state:'idle',time:performance.now()}))continue;
   if(!window.AshenSprites?.ready(actor.hero.role.toLowerCase())&&actor.type==='leader')pix(sx-6,sy-2,12,3,'#172625');
   if(actor.seated&&actor.motion){actor.motion.walking=false;actor.motion.shadow=false}
   drawSprite(sx,sy,actor.hero.role,actor.type==='leader'?'hero':actor.hero.role==='Rogue'?'#93ba9c':'#cfb99e',actor.seated?'down':actor.motion?.direction||actor.direction||G.dir,actor.seated?.82:1,actor.hero,actor.motion);
   continue;
  }
  const peer=actor.peer;
  ctx.save();ctx.fillStyle='#70c6c599';ctx.beginPath();ctx.ellipse(sx,sy,10,4,0,0,Math.PI*2);ctx.fill();
  drawSprite(sx,sy,['Fighter','Rogue','Wizard','Cleric'].includes(peer.role)?peer.role:'Fighter','npc',peer.dir||'down');
  const tag=String(peer.name||'Adventurer').slice(0,20);
  ctx.font='bold 8px Arial';const tw=ctx.measureText(tag).width;ctx.fillStyle='#081321d9';ctx.fillRect(sx-tw/2-4,sy-46,tw+8,13);ctx.fillStyle='#b3eee8';ctx.textAlign='center';ctx.fillText(tag,sx,sy-37);ctx.restore();
 }

 if(G.location==='camp')window.AshenLighting?.flames(ctx,'camp',scrollX,scrollY,performance.now());
 window.AshenInteriors?.foreground(ctx,m,G.location,scrollX,scrollY);
 window.AshenEnvironment?.animate(ctx,m,G.location,scrollX,scrollY,viewW,viewH,animTick);
 // Art/lighting layer, separate from tiles, actors and encounter logic.
 paintSceneLights(G.location,scrollX,scrollY,viewW,viewH);
 drawAtmosphericEmbers(G.location,viewW,viewH);
 // HD-2D environmental lighting and gentle particles at higher backing resolution.
 if(G.location==='town'||G.location==='wild'||G.location==='camp'){
  const horizon=ctx.createLinearGradient(0,0,viewW,viewH);horizon.addColorStop(0,'#d0e9f20a');horizon.addColorStop(.52,'#ffffff00');horizon.addColorStop(1,'#13274b17');ctx.fillStyle=horizon;ctx.fillRect(0,0,viewW,viewH);
 }
 // Atmospheric tint / soft vignette.
 const shade=ctx.createRadialGradient(viewW/2,viewH/2,45,viewW/2,viewH/2,Math.max(viewW,viewH)*.7);shade.addColorStop(0,'#00000000');shade.addColorStop(1,G.location==='crypt'?'#080c205c':'#07121b24');ctx.fillStyle=shade;ctx.fillRect(0,0,viewW,viewH);
 if(G.location==='crypt'){pix(4,viewH-24,155,20,'#0b1325df');textDraw(`${Number(G.flags.leverA)+Number(G.flags.leverB)}/2 RUNES SEALED`,12,viewH-10,10,'#e4b9a0')}
 ctx.restore();
}

function roundRect(x,y,w,h,r=6){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
// Dedicated original five-frame sprite sheets replace hard-edged cinematic cutouts.
// Each frame contains the *entire* character: head, armor, limbs and weapon.
function actorSpriteFrame(actor,kind='ally'){
 const move=battleFX&&battleFX.actorId===actor.id;
 if(move){if(battleFX.kind==='slash')return SPRITE_FRAMES.attack;
  return SPRITE_FRAMES.cast;}
 if(actor.hp<=0)return SPRITE_FRAMES.hurt;
 return Math.floor(animTick/26)%2===0?SPRITE_FRAMES.idleA:SPRITE_FRAMES.idleB;
}
function illustratedActorState(actor){
 const reaction=window.AshenSprites?.reaction(actor.id),now=performance.now();
 if(actor.hp<=0)return {state:'death',time:reaction?now-reaction.startedAt:700};
 if(reaction)return {state:reaction.state,time:now-reaction.startedAt};
 if(battleFX&&battleFX.actorId===actor.id)return {state:['slash','arrow'].includes(battleFX.kind)?'attack':'cast',time:now-battleFX.startTime};
 if(actor.defending)return {state:'defend',time:0,duration:Infinity};
 return {state:'idle',time:now+hash((actor.id||'').length,actor.role?.length||actor.type?.length||0)*1500};
}
function drawIllustratedActor(actor,x,y,kind='ally',scale=1){
 const name=kind==='ally'?actor.role.toLowerCase():actor.type;
 const state=illustratedActorState(actor);
 if(kind==='ally'&&window.AshenCharacterMotion?.drawAction(ctx,actor,x,y,{...state,kind:battleFX?.actorId===actor.id?battleFX.kind:'slash',height:85*scale}))return true;
 if(kind==='ally'&&(state.state==='idle'||actor.ancestry!=='Human'||actor.appearance==='female')&&window.AshenIdentity?.draw(ctx,actor,x,y,{direction:'right',height:85*scale,time:state.time,state:state.state}))return true;
 const asset=window.AshenSprites?.manifest.characters[name];
 if(!asset)return false;
 const stature=actor.ancestry==='Halfling'?.82:actor.ancestry==='Dwarf'?.9:1;
 const height=mode==='explore'?asset.heightInWorld:asset.heightInBattle*scale;
 return window.AshenSprites.draw(ctx,name,x,y,{...state,height:height*stature,facing:kind==='ally'?'right':'left',alpha:actor.hp<=0?.65:1})||false;
}
function drawActorSprite(type,x,y,scale=1,frame=0,fade=1){
 const name=SPRITE_NAMES.includes(type)?type:'fighter';const key='sprites/'+name+'.png';
 // Replace home-drawn humanoids with LPC sprites; non-humanoid monsters retain original art until matched sets are available.
 if(imageReady('lpc/'+name+'.png')){
  const actorAnimation=frame===SPRITE_FRAMES.attack?'slash':'idle';
  const faceDirection=['goblin','shaman','orc','warboss','bandit','sentinel'].includes(name)?'left':'right';
  return drawLPC(name,x,y,faceDirection,actorAnimation,scale*1.04,fade);
 }
 if(!imageReady(key))return false;
 const img=ART[key],wid=SPRITE_FRAMES.width,hei=SPRITE_FRAMES.height;
 const destH=scale, destW=scale*wid/hei;
 ctx.save();ctx.globalAlpha=fade;
 ctx.shadowColor='#020710aa';ctx.shadowBlur=12;ctx.shadowOffsetY=5;
 ctx.drawImage(img,frame*wid,0,wid,hei,x-destW/2,y-destH,destW,destH);
 ctx.restore();return true;
}
function drawEnemy(enemy,x,y,scale=1){
 const type=enemy.type;
 if(drawIllustratedActor(enemy,x,y,'enemy',scale))return;
 // Common monsters have matched sprites rather than photo cutouts or blocky atlases.
 const size=(type==='warboss'||type==='boss'?104:type==='orc'||type==='sentinel'?85:type==='wolf'?81:81)*scale;
 if(drawActorSprite(type,x,y,size,actorSpriteFrame(enemy,'enemy'),enemy.hp>0?1:.25))return;
 if(imageReady('enemies_atlas.png')&&ENEMY_INDEX[type]!==undefined){
  const ix=ENEMY_INDEX[type],s=105*scale;
  ctx.drawImage(ART['enemies_atlas.png'],(ix%4)*192,Math.floor(ix/4)*192,192,192,x-s/2,y-s,s,s);
 }
}
function battleHeroPoint(index){
 const hero=G?.party[index],row=hero?Formation.row(hero):'front',members=(G?.party||[]).filter(h=>Formation.row(h)===row),slot=Math.max(0,members.indexOf(hero)),count=Math.max(1,members.length);
 const spread=Math.min(36,96/Math.max(1,count-1));
 return {x:battleWidth*(row==='front'?.39:.22)+(slot%2)*Math.min(28,battleWidth*.04),y:216+(slot-(count-1)/2)*spread};
}
function battleEnemyPoint(index){
 const count=Math.max(1,combat?.enemies.length||1),spacing=Math.min(61,battleWidth*.12);
 return {x:battleWidth*.73+(index-(count-1)/2)*spacing,y:232-(index%2)*14};
}
function drawBattleMarker(unit,point){
 const active=activeUnit()?.id===unit.id,selected=highlightedTarget===unit.id;
 if(unit.hp<=0||(!active&&!selected))return;
 ctx.save();ctx.strokeStyle=selected?'#ffe5a4':'#d1b782';ctx.lineWidth=1.2;
 ctx.globalAlpha=selected?.9:.5;
 ctx.beginPath();ctx.ellipse(point.x,point.y+2,27,6,0,0,Math.PI*2);ctx.stroke();
 textDraw(selected?'TARGET':unit.name,point.x,point.y+19,7,selected?'#ffe5a4':'#dacaa7','center');
 ctx.restore();
}
function drawBattleHero(hero,x,y,index){
 const type=(hero.role||'fighter').toLowerCase(),frame=actorSpriteFrame(hero,'ally');
 if(drawIllustratedActor(hero,x,y,'ally',1.5))return;
 ctx.save();ctx.globalAlpha=hero.hp>0?1:.35;
 ctx.fillStyle='#060b1399';ctx.beginPath();ctx.ellipse(x,y+3,15,4,0,0,Math.PI*2);ctx.fill();
 drawActorSprite(type,x,y+Math.sin(animTick/33+index)*.6,128,frame);
 ctx.restore();
}
function drawEnemyBattlePlate(enemy,point){
 const focus=highlightedTarget||combat.enemies.find(e=>e.hp>0)?.id;
 if(enemy.hp<=0||enemy.id!==focus)return;
 const scale=(enemy.type==='warboss'?1.06:enemy.type==='boss'?1.1:1)*(enemy.type==='wisp'?2.55:1.4);
 const height=(window.AshenSprites?.manifest.characters[enemy.type]?.heightInBattle||72)*scale;
 const top=Math.max(18,point.y-height-24),left=point.x-55;
 ctx.save();ctx.fillStyle='#041016dc';ctx.fillRect(left,top,110,24);ctx.strokeStyle='#cba76570';ctx.lineWidth=.6;ctx.strokeRect(left,top,110,24);
 textDraw(enemy.name.length>20?enemy.name.slice(0,18)+'…':enemy.name,left+5,top+9,7,'#f0dec0');
 textDraw(`${enemy.hp}/${enemy.maxHp}`,left+105,top+9,6,'#e1c4a8','right');
 ctx.fillStyle='#251c1c';ctx.fillRect(left+5,top+14,100,4);ctx.fillStyle='#c25243';ctx.fillRect(left+5,top+14,100*clamp(enemy.hp/enemy.maxHp,0,1),4);
 ctx.restore();
}
function drawBattleFX(){
 const now=performance.now();
 if(battleFX&&!window.AshenEffects?.draw(ctx,battleFX,now)){
  const e=battleFX,p=clamp((now-e.startTime)/e.duration,0,1);
  const col={fire:'#ffb65d',meteor:'#ffe48a',ice:'#a9f7ff',arcane:'#bd94ff',holy:'#ffe8a6',shadow:'#bca3e9',slash:'#fff7d5'}[e.kind]||'#f6d2a0';
  e.targets.forEach((t,i)=>{
   if(!t)return;
   const isMelee=e.kind==='slash',exploding=p>.36;
   if(!isMelee){
    const shot=Math.min(1,p/.52),sx=e.source.x,sy=e.source.y-39,tx=t.x,ty=t.y-45;
    if(shot<1){const x=sx+(tx-sx)*shot,y=sy+(ty-sy)*shot-25*Math.sin(Math.PI*shot);const r=e.kind==='meteor'?13:8;
     if(e.kind==='arrow'){ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(ty-sy,tx-sx));ctx.strokeStyle='#f0d5a5';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-17,0);ctx.lineTo(7,0);ctx.moveTo(2,-3);ctx.lineTo(7,0);ctx.lineTo(2,3);ctx.moveTo(-14,-3);ctx.lineTo(-10,0);ctx.lineTo(-14,3);ctx.stroke();ctx.restore();return}
     const halo=ctx.createRadialGradient(x,y,0,x,y,r*4);halo.addColorStop(0,'#ffffffed');halo.addColorStop(.18,col);halo.addColorStop(1,'#ffffff00');ctx.fillStyle=halo;ctx.fillRect(x-r*4,y-r*4,r*8,r*8);
     ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.globalAlpha=.75;ctx.beginPath();ctx.moveTo(x-17,y+9);ctx.lineTo(x,y);ctx.stroke();ctx.globalAlpha=1;
    }
   }
   if(exploding&&e.kind!=='arrow'){const t01=(p-.36)/.64,rad=(e.kind==='fire'||e.kind==='meteor'?45:30)*(.3+t01),fade=Math.max(0,1-t01);
    ctx.save();ctx.globalAlpha=.75*fade;ctx.strokeStyle=col;ctx.lineWidth=6*fade+1;ctx.beginPath();ctx.ellipse(t.x,t.y-42,rad,rad*.56,0,0,Math.PI*2);ctx.stroke();
    if(e.kind!=='slash'){const glow=ctx.createRadialGradient(t.x,t.y-42,0,t.x,t.y-42,rad*1.7);glow.addColorStop(0,col+'b9');glow.addColorStop(1,col+'00');ctx.fillStyle=glow;ctx.fillRect(t.x-rad*2,t.y-rad*2,rad*4,rad*4);}
    if(e.kind==='slash'){ctx.strokeStyle='#fff6d8';ctx.lineWidth=4*fade;ctx.beginPath();ctx.moveTo(t.x-25,t.y-73);ctx.quadraticCurveTo(t.x+15,t.y-45,t.x+25,t.y-10);ctx.stroke()}
    else for(let k=0;k<10;k++){const a=k*Math.PI*2/10+(.5+t01),r2=rad*(.55+(.2*(k%3)));ctx.fillStyle=k%2?col:'#fff3d5';ctx.fillRect(t.x+Math.cos(a)*r2,t.y-42+Math.sin(a)*r2,2.4,3.5)}
    ctx.restore();}
  });
  if(e.kind==='slash'&&p<.55){const t=e.targets[0];if(t){ctx.save();ctx.globalAlpha=.8*(1-p/.55);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.source.x,e.source.y-35);ctx.lineTo(t.x,t.y-48);ctx.stroke();ctx.restore();}}
 }
 battleNumbers=battleNumbers.filter(n=>now-n.start<1300);
 for(const n of battleNumbers){const p=(now-n.start)/1300,x=n.xFraction*battleWidth;ctx.save();ctx.globalAlpha=Math.min(1,(1-p)*1.4);ctx.font='bold 17px Georgia,serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#181d2d';ctx.strokeText(n.text,x,n.y-32*p);ctx.fillStyle=n.color;ctx.fillText(n.text,x,n.y-32*p);ctx.restore()}
}
function battleScene(){
 if(!G)return 'wild';
 if(window.AshenInteriors?.has(G.location))return G.location;
 if(G.location==='town')return 'town';
 if(G.location==='crypt'||combat?.bossType==='boss')return 'crypt';
 if(G.location==='camp'||combat?.bossType==='warboss')return 'camp';
 return 'wild';
}
function drawCombatBackdrop(name){
 if(!imageReady(name))return false;
 const img=ART[name],scale=Math.max(battleWidth/img.naturalWidth,H/img.naturalHeight);
 const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
 ctx.drawImage(img,(battleWidth-width)/2,(H-height)/2,width,height);return true;
}
function drawBackdropInterior(loc){
 const m=maps[loc],scale=Math.max(battleWidth/(m.w*T),H/(m.h*T));ctx.save();ctx.translate((battleWidth-m.w*T*scale)/2,(H-m.h*T*scale)/2);ctx.scale(scale,scale);window.AshenInteriors.background(ctx,m,loc,0,0);for(const p of window.AshenInteriors.getProps(loc))window.AshenInteriors.drawProp(ctx,p.prop,0,0);window.AshenLighting?.flames(ctx,loc,0,0,performance.now());ctx.restore();ctx.fillStyle='#100e172b';ctx.fillRect(0,0,battleWidth,H);
}
function drawBackdropTown(){
 if(!drawCombatBackdrop('battle_town.jpg')){ctx.fillStyle='#6e8f9a';ctx.fillRect(0,0,battleWidth,H)}
 const shade=ctx.createLinearGradient(0,0,0,H);
 shade.addColorStop(0,'#fff8d316');shade.addColorStop(.55,'#101c2218');shade.addColorStop(1,'#09111ed0');
 ctx.fillStyle=shade;ctx.fillRect(0,0,battleWidth,H);
}
function drawBackdropWild(){
 const light=window.AshenWorldTime?.battleLighting(G?.world?.clock)||Formation.lighting(G?.steps),path=n=>'battle/forest_'+n+'.jpg';
 if(!drawCombatBackdrop(path(light.from))&&!drawCombatBackdrop(path('day'))){ctx.fillStyle='#1b2336';ctx.fillRect(0,0,battleWidth,H)}
 if(light.blend>0&&imageReady(path(light.to))){ctx.save();ctx.globalAlpha=light.blend;drawCombatBackdrop(path(light.to));ctx.restore()}
 const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#07101808');shade.addColorStop(.65,'#07101800');shade.addColorStop(1,'#07101835');ctx.fillStyle=shade;ctx.fillRect(0,0,battleWidth,H);
}
function drawBackdropCamp(){
 const backdrop='gromclaw_battle.jpg';
 if(!drawCombatBackdrop(backdrop))drawBackdropWild();
 const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#10152516');shade.addColorStop(.45,'#1b1b2824');shade.addColorStop(1,'#10131ae0');ctx.fillStyle=shade;ctx.fillRect(0,0,battleWidth,H);
}
function drawBackdropCrypt(){
 if(drawCombatBackdrop('overhaul/battle_crypt.png')||drawCombatBackdrop('battle_crypt.jpg')){
  const image=ART[imageReady('overhaul/battle_crypt.png')?'overhaul/battle_crypt.png':'battle_crypt.jpg'];
  const cover=Math.max(battleWidth/image.naturalWidth,H/image.naturalHeight),width=image.naturalWidth*cover,height=image.naturalHeight*cover;
  for(const position of [.13,.86])window.AshenPresentation?.flame(ctx,(battleWidth-width)/2+width*position,(H-height)/2+height*.34,14,performance.now());
  const veil=ctx.createLinearGradient(0,0,0,H);veil.addColorStop(0,'#01050b10');veil.addColorStop(.65,'#03091814');veil.addColorStop(1,'#010611d1');ctx.fillStyle=veil;ctx.fillRect(0,0,battleWidth,H);return;
 }
 const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1f2737');bg.addColorStop(.45,'#131c2b');bg.addColorStop(1,'#090d16');ctx.fillStyle=bg;ctx.fillRect(0,0,battleWidth,H);
 for(let i=0;i<6;i++){const x=24+i*78;ctx.fillStyle='#293547';ctx.fillRect(x,52,18,155);ctx.fillStyle='#1a2534';ctx.fillRect(x+18,52,6,155);ctx.fillStyle='#55637b';ctx.fillRect(x-3,45,26,10);} 
 ctx.fillStyle='#182335';ctx.beginPath();ctx.moveTo(140,185);ctx.lineTo(240,102);ctx.lineTo(340,185);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#8da5cf55';ctx.lineWidth=2;ctx.beginPath();ctx.arc(240,138,29,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<4;i++){const x=60+i*110, y=146+Math.sin(animTick/25+i)*2;const glow=ctx.createRadialGradient(x,y,0,x,y,26);glow.addColorStop(0,'#f8bd7875');glow.addColorStop(1,'#f8bd7800');ctx.fillStyle=glow;ctx.fillRect(x-28,y-28,56,56);ctx.fillStyle='#3a2014';ctx.fillRect(x-2,y-8,4,36);ctx.fillStyle='#f4b36c';ctx.beginPath();ctx.arc(x,y-10,5,0,Math.PI*2);ctx.fill();}
 const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#d8e2ff0a');shade.addColorStop(.38,'#00000010');shade.addColorStop(1,'#030710db');ctx.fillStyle=shade;ctx.fillRect(0,0,battleWidth,H);
}
function drawBattle(){
 const bounds=canvas.getBoundingClientRect();
 battleWidth=bounds.height>0?H*bounds.width/bounds.height:W;
 if(battleFX){
  const point=id=>{const hero=G.party.findIndex(h=>h.id===id);return hero>=0?battleHeroPoint(hero):battleEnemyPoint(combat.enemies.findIndex(e=>e.id===id))};
  battleFX.source=point(battleFX.actorId);battleFX.targets=battleFX.targetIds.map(point);
 }
 ctx.save();ctx.setTransform(canvas.width/battleWidth,0,0,canvas.height/H,0,0);
 const scene=battleScene();
 if(window.AshenInteriors?.has(scene))drawBackdropInterior(scene);
 else if(scene==='camp')drawBackdropCamp();
 else if(scene==='crypt')drawBackdropCrypt();
 else if(scene==='town')drawBackdropTown();
 else drawBackdropWild();
 for(let i=0;i<18;i++){const x=(i*67+Math.sin(animTick/43+i)*10)%battleWidth,y=(i*27+animTick*.14)%220;ctx.fillStyle=scene==='camp'?'#f1b77384':scene==='crypt'?'#9fb8d939':'#acc3d039';ctx.fillRect(x,y,1.4,1.4)}
 const moving=(actor,base)=>{if(!battleFX||battleFX.actorId!==actor.id)return base;const p=clamp((performance.now()-battleFX.startTime)/battleFX.duration,0,1),move=p<.3?p/.3:p<.55?1:p<.9?(1-(p-.55)/.35):0,t=battleFX.targets[0];if(!t)return base;if(!['slash'].includes(battleFX.kind))return base;return{x:base.x+(t.x-base.x)*Math.min(.76,move*.76),y:base.y+(t.y-base.y)*move*.21}};
 const immersive=document.documentElement.classList.contains('cinematic-battle');
 const light=window.AshenWorldTime?.battleLighting(G.world?.clock)||Formation.lighting(G.steps),tones={day:1,evening:.91,night:.68};
 const brightness=battleScene()==='wild'?tones[light.from]*(1-light.blend)+tones[light.to]*light.blend:1;
 const actorFilter=brightness<1?`brightness(${brightness}) saturate(${.7+.3*brightness})`:'none';
 for(let i=0;i<combat.enemies.length;i++){
  const e=combat.enemies[i];
  if(e.hp<=0&&!window.AshenSprites?.ready(e.type))continue;
  const pt=battleEnemyPoint(i),m=moving(e,pt);
  drawBattleMarker(e,pt);
  ctx.save();ctx.filter=actorFilter;
  drawEnemy(e,m.x,m.y,(e.type==='warboss'?1.06:e.type==='boss'?1.1:1)*(e.type==='wisp'?2.55:1.4));
  ctx.restore();
  drawEnemyBattlePlate(e,pt);
  if(!immersive){
   const y=Math.max(24,pt.y-(e.type==='warboss'?131:e.type==='boss'?131:112));
   ctx.fillStyle='#08111be2';ctx.fillRect(pt.x-21,y-8,42,17);
   textDraw(e.name.length>12?e.name.slice(0,11)+'…':e.name,pt.x,y-1,6,'#fff3d8','center');
   ctx.fillStyle='#342e33';ctx.fillRect(pt.x-18,y+3,36,4);ctx.fillStyle=e.type==='warboss'?'#ecab60':'#d97170';ctx.fillRect(pt.x-18,y+3,36*e.hp/e.maxHp,4);
  }
 }

 G.party.map((hero,i)=>({hero,i,point:battleHeroPoint(i)})).sort((a,b)=>a.point.y-b.point.y).forEach(({hero,i})=>{
  const point=battleHeroPoint(i),m=moving(hero,point);
  drawBattleMarker(hero,point);
  ctx.save();ctx.filter=actorFilter;
  drawBattleHero(hero,m.x,m.y,i);
  ctx.restore();
  if(!immersive){ctx.fillStyle='#121d2cbb';ctx.fillRect(point.x-30,point.y+6,60,12);textDraw(hero.name.slice(0,11),point.x,point.y+15,8,hero.hp>0?'#fff1d8':'#aaabb9','center');}
 });
 drawBattleFX();
 if(!document.documentElement.classList.contains('cinematic-battle')){ctx.save();ctx.fillStyle='#071221d9';ctx.fillRect(6,5,184,24);ctx.strokeStyle='#c7a46a77';ctx.strokeRect(6,5,184,24);ctx.restore();textDraw(`ROUND ${combat.round}   ·   ${combat.isBoss?'BOSS BATTLE':'TACTICAL ENCOUNTER'}`,13,22,10,'#ffe0ac');}
 ctx.restore();
}
function drawTitle(){
 if(imageReady('title_backdrop.jpg'))ctx.drawImage(ART['title_backdrop.jpg'],0,0,W,H);
 else{ctx.fillStyle='#091321';ctx.fillRect(0,0,W,H)}
}
let trail=[];
function rememberStep(){if(!G)return;trail.unshift({loc:G.location,x:G.x,y:G.y,dir:G.dir});trail=trail.slice(0,18)}
let lastScreenMode=null;
let previousCinemaHud='';
function renderCinemaHud(){
 const hud=$('cinemaHud');if(!hud)return;
 if(mode!=='combat'||!combat){if(hud.innerHTML)hud.innerHTML='';previousCinemaHud='';return}
 const turn=combat.queue?.[combat.turn],actor=activeUnit();
 const cacheKey=combatSession+':'+combatAnimating+':'+G.party.map(h=>[h.id,h.hp,h.mp,h.poison,h.defending,h.protectedThroughRound,h.xp,h.level,h.row,h.appearance,h.hidden,h.gear.weapon,h.gear.armor].join(':')).join('|')+combat.enemies.map(e=>e.id+':'+e.hp).join(',')+turn?.id+combat.round+document.documentElement.classList.contains('cinema-compact');
 if(cacheKey===previousCinemaHud)return;previousCinemaHud=cacheKey;
 const viewFocused=document.activeElement?.id==='cinemaMinimize';
 const party=G.party.map(h=>{
   const hp=clamp(100*h.hp/h.maxHp,0,100),mp=h.maxMp?clamp(100*h.mp/h.maxMp,0,100):0;
   return `<article data-row="${Formation.row(h)}" class="cinema-member ${actor?.id===h.id?'active':''} ${h.hp<=0?'fallen':''}"><img src="${heroPortrait(h)}" alt=""><div class="cinema-member-info"><b title="${escapeHtml(h.name)}">${escapeHtml(h.name)}</b><small title="Level ${h.level} ${h.role} · AC ${armorClass(h)}"><span class="row-badge row-${Formation.row(h)}" title="${Formation.screened(h,G.party)?'Screened: 25% melee protection; −2 close-range hit':'Exposed frontline; full melee effectiveness'}">${Formation.row(h).toUpperCase()}</span> LV ${h.level} · ${h.role} · AC ${armorClass(h)}</small><div class="cinema-stat"><span>HP</span><i><em style="width:${hp}%"></em></i><span>${h.hp}/${h.maxHp}</span></div><div class="cinema-stat mana"><span>MP</span><i><em style="width:${mp}%"></em></i><span>${h.mp}/${h.maxMp}</span></div><div class="cinema-stat experience" title="${Math.max(0,levelThreshold(h.level)-h.xp)} EXP to level ${h.level+1}"><span>EXP</span><i role="progressbar" aria-label="${escapeHtml(h.name)} experience" aria-valuenow="${h.xp}" aria-valuemin="0" aria-valuemax="${levelThreshold(h.level)}"><em style="width:${clamp(100*h.xp/levelThreshold(h.level),0,100)}%"></em></i><span>${Math.max(0,levelThreshold(h.level)-h.xp)} to go</span></div><div class="combat-conditions">${conditionBadges(h)}</div></div></article>`;
 }).join('');
 const foes=combat.enemies.filter(e=>e.hp>0).map(e=>`<article class="cinema-foe ${actor?.id===e.id?'active':''}"><div class="foe-line"><span>${escapeHtml(e.name)}</span><b>${e.hp}/${e.maxHp} HP</b></div><div class="foe-track" role="progressbar" aria-label="${escapeHtml(e.name)} health" aria-valuenow="${e.hp}" aria-valuemin="0" aria-valuemax="${e.maxHp}"><i style="width:${clamp(100*e.hp/e.maxHp,0,100)}%"></i></div></article>`).join('');
 const initiative=combat.queue.slice(combat.turn).map(q=>{
   const unit=q.side==='ally'?G.party.find(h=>h.id===q.id):combat.enemies.find(e=>e.id===q.id);
   return unit?.hp>0?`<span class="initiative-actor ${q.side} ${unit.id===actor?.id?'current':''}" ${unit.id===actor?.id?'aria-current="step"':''} title="${escapeHtml(unit.name)} · Initiative ${q.roll} · ${q.side==='ally'?Formation.row(unit)+' row':'enemy'}">${q.side==='ally'?`<img src="${heroPortrait(unit)}" alt="">`:`<img src="${enemyPortrait(unit)}" alt="">`}<b>${escapeHtml(unit.name)}</b><small>${q.roll}</small></span>`:'';
 }).join('');
 hud.innerHTML=`<header class="cinema-title"><div class="combat-title"><span class="battle-compass" aria-hidden="true">✧</span><span>THE ASHEN REALMS</span><small>${G.flags.ending?'CHAPTER II':'CHAPTER I'} · ${battleScene().toUpperCase()} ENCOUNTER</small></div><nav class="turn-order" aria-label="Remaining turn order"><span>UP NEXT</span>${initiative}</nav><span class="header-round">ROUND ${combat.round}</span><button id="cinemaMinimize" title="Toggle immersive battle view" aria-label="${document.documentElement.classList.contains('cinema-compact')?'Expand combat view':'Use windowed combat view'}">${document.documentElement.classList.contains('cinema-compact')?'EXPAND':'WINDOWED'}</button></header><section class="cinema-party" aria-label="Party status" style="--party-count:${G.party.length}"><h2 class="combat-section-title">YOUR PARTY</h2><div class="combat-status-list">${party}</div></section><section class="cinema-foes" aria-label="Enemy status"><div class="battle-location"><img src="${imagePath(window.AshenInteriors?.has(G.location)?(G.location==='tavern'?'interiors_v2/tavern_shell.png':'living_world/room_'+G.location+'.png'):battleScene()==='crypt'?'overhaul/battle_crypt.png':battleScene()==='camp'?'gromclaw_battle.jpg':battleScene()==='town'?'battle_town.jpg':'battle/forest_'+Formation.lighting(G.steps).from+'.jpg')}" alt=""><strong>${escapeHtml(maps[G.location]?.name||'Battlefield')}</strong><small>${escapeHtml('Defeat '+(combat.isBoss?combat.enemies.find(e=>e.original===combat.bossType)?.name||'the enemy leader':'the enemy party'))}</small></div><h2 class="combat-section-title">ENEMIES</h2><div class="combat-status-list">${foes}</div></section>`;
 $('cinemaMinimize').onclick=()=>document.documentElement.classList.toggle('cinema-compact');
 if(viewFocused)$('cinemaMinimize').focus({preventScroll:true});
}
let lastWorldHudKey='';
function renderWorldHud(){
 const hud=$('worldHud');if(!hud||!G||mode!=='explore')return;
 const clockLabel=G.world&&window.AshenWorldTime?window.AshenWorldTime.read(G.world.clock):null;const clockNode=$('worldClock');if(clockNode&&clockLabel){const label='DAY '+G.world.clock.day+' · '+clockLabel.label+' '+clockLabel.phase.toUpperCase();if(clockNode.textContent!==label)clockNode.textContent=label}
 const key=[G.location,G.gold,...G.party.map(h=>[h.id,h.name,h.role,h.hp,h.maxHp,h.mp,h.maxMp,h.level].join(':'))].join('|');
 if(key!==lastWorldHudKey){lastWorldHudKey=key;
  $('worldPartyRoster').innerHTML=G.party.map((h,i)=>`<div class="world-party-row ${h.hp<=0?'knocked-out':''}"><img src="${heroPortrait(h)}" alt="${escapeHtml(h.role)} portrait"><div class="world-party-row-info"><strong>${escapeHtml(h.name)}</strong><small>LV ${h.level} · ${h.role.toUpperCase()}</small><div class="party-mini-bar"><span>HP</span><i><em style="width:${clamp(100*h.hp/h.maxHp,0,100)}%"></em></i><b>${h.hp}/${h.maxHp}</b></div><div class="party-mini-bar mp"><span>MP</span><i><em style="width:${clamp(100*h.mp/h.maxMp,0,100)}%"></em></i><b>${h.mp}/${h.maxMp}</b></div></div></div>`).join('');
  $('worldPartyCount').textContent=G.party.length===1?'SOLO ADVENTURER':G.party.length+' PARTY MEMBERS';
  $('worldGold').textContent=G.gold+' GOLD';$('worldLocation').textContent=maps[G.location]?.name.toUpperCase()||G.location.toUpperCase();
 }
 if(animTick%24===0){BGM.update();
  const minimap=$('worldMini'),original=$('areaMini');
  if(minimap&&original&&minimap.width&&original.width){const mctx=minimap.getContext('2d');mctx.clearRect(0,0,minimap.width,minimap.height);mctx.drawImage(original,0,0,minimap.width,minimap.height)}
  const q=$('questSummary');if(q){$('worldQuest').textContent=q.querySelector('b')?.textContent||'THE HOLLOW BELL';$('worldQuestDesc').textContent=q.textContent.replace($('worldQuest').textContent,'').trim().slice(0,145)}
 }
}

let lastWorldUpdate=0;
function render(schedule=true){
 const worldNow=performance.now(),worldDelta=lastWorldUpdate?worldNow-lastWorldUpdate:0;lastWorldUpdate=worldNow;
 if(schedule!==false&&G?.world){const active=mode==='explore'&&!isOverlay()&&!document.hidden;window.AshenWorldTime?.advance(G.world.clock,worldDelta,active);const motion=window.AshenAnimation?.sample(G.location+':'+G.party[0].id,G.world?.seat?.scene===G.location?G.world.seat.cell.x:G.x,G.world?.seat?.scene===G.location?G.world.seat.cell.y:G.y,G.dir,worldNow);window.AshenNPCs?.update(G.location,worldDelta,{clock:G.world.clock,player:{x:G.x,y:G.y,visualX:Math.round(motion?.x??G.x),visualY:Math.round(motion?.y??G.y)},map:maps[G.location],walkable:(x,y)=>walkable(G.location,x,y)},active)}
 animTick++;
 document.documentElement.classList.toggle('cinematic-battle',mode==='combat'&&!!combat);
 document.documentElement.classList.toggle('world-explore',mode==='explore'&&!!G);
 document.documentElement.classList.toggle('title-screen',mode==='title');
 if(lastScreenMode!==mode){
  const showWorld=mode==='explore';
  $('regionLabel').style.display=showWorld?'block':'none';
  $('proximityHint').style.display=showWorld?'block':'none';
  lastScreenMode=mode;
 }
 if(mode==='title'||!G)drawTitle();else if(mode==='combat'&&combat)drawBattle();else drawLocation();
 renderCinemaHud();renderWorldHud();if(animTick%24===0&&mode!=='explore')BGM.update();if(schedule!==false)requestAnimationFrame(render)
}
/* ---------------------------- AUDIO ENGINE ---------------------------- */
/* Locally bundled original instrumental loops, generated for this game. The audio starts only
   after the player interacts, as required by browser autoplay policies. */
const BGM={node:null,key:'',
 update(){
  if(!audioEnabled||!SFX.ctx){this.stop();return}
  const key=mode==='title'?(document.documentElement.classList.contains('tavern-creation-open')?'tavern':'title'):mode==='combat'?(combat?.isBoss?'boss':'combat'):G?.location==='crypt'?'crypt':['wild','camp'].includes(G?.location)?'wilderness':G?.location==='tavern'||G?.location==='inn'?'tavern':'havenmere';
  if(!window.AshenAudio)return;
  this.key=key;this.node=window.AshenAudio.play(key);
 },
 stop(){window.AshenAudio?.stop();this.node=null;this.key=''}
};

const SFX={ctx:null,musicTimer:null,notes:[220,261.6,293.7,349.2,293.7,261.6,196,220,174.6,220,261.6,329.6,293.7,220,196,174.6],idx:0,
 ensure(){if(!audioEnabled)return null;try{if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();BGM.update();return this.ctx}catch(e){return null}},
 tone(freq,dur=.1,shape='square',vol=.024,delay=0){const a=this.ctx;if(!a||!audioEnabled||window.AshenAudio?.preferences().effects===0)return;try{const o=a.createOscillator(),gain=a.createGain(),now=a.currentTime+delay;o.type=shape;o.frequency.setValueAtTime(freq,now);gain.gain.setValueAtTime(Math.max(.0001,vol*(window.AshenAudio?.preferences().effects??1)),now);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);o.connect(gain);gain.connect(a.destination);o.start(now);o.stop(now+dur+.02)}catch(e){}},
 play(key){if(!audioEnabled)return;this.ensure();const f={menu:440,bump:135,foot:100,hit:155,miss:170,critical:330,magic:570,heal:440,coin:820,warp:340,battle:220,victory:510,level:660,join:490,chest:610,start:370,guard:270}[key]||340;const vol=key==='foot'?.004:.025;this.tone(f,key==='warp'?.22:.11,key==='heal'?'sine':'triangle',vol);if(['chest','victory','level','magic','join','start'].includes(key)){this.tone(f*1.25,.1,'triangle',.015,.1);this.tone(f*1.5,.18,'triangle',.012,.2)}},
 dice(impact=.5){
  const a=this.ensure();if(!a||!audioEnabled)return;
  try{const length=Math.floor(a.sampleRate*.065),buffer=a.createBuffer(1,length,a.sampleRate),samples=buffer.getChannelData(0);
   for(let i=0;i<length;i++){const n=Math.sin(i*12.9898)*43758.5453;samples[i]=((n-Math.floor(n))*2-1)*Math.exp(-i/(length*.17));}
   const source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1400;gain.gain.value=.035*Math.max(.15,impact)*(window.AshenAudio?.preferences().effects??1);source.connect(filter);filter.connect(gain);gain.connect(a.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};source.start();
  }catch(e){/* Audio is optional; outcomes and animations never depend on it. */}
 },
 music(){BGM.update()},
 toggle(){audioEnabled=!audioEnabled;window.AshenTitle?.save({sound:audioEnabled});$('soundBtn').textContent=audioEnabled?'SOUND ON':'SOUND OFF';$('worldSoundBtn').textContent=audioEnabled?'SOUND ON':'SOUND OFF';if(audioEnabled)this.ensure();else BGM.stop();toast(audioEnabled?'Sound and music enabled':'Sound and music muted')}
};
window.addEventListener('pointerdown',()=>SFX.ensure(),{once:true});
window.addEventListener('keydown',()=>SFX.ensure(),{once:true});
/* ---------------------------- INPUT AND START ---------------------------- */
function moveCommand(dx,dy){if(mode!=='explore'||isOverlay()||!G)return;rememberStep();tryMove(dx,dy)}
let touchMoveDelay=0,touchMoveRepeat=0,touchMovePointer=null;
function stopTouchMove(pointerId=null){if(pointerId!==null&&touchMovePointer!==null&&pointerId!==touchMovePointer)return;clearTimeout(touchMoveDelay);clearTimeout(touchMoveRepeat);touchMoveDelay=touchMoveRepeat=0;touchMovePointer=null;document.querySelectorAll('.mobilepad .is-pressed').forEach(button=>button.classList.remove('is-pressed'))}
function startTouchMove(button,event,dx,dy){if(event.button!==undefined&&event.button!==0)return;event.preventDefault();stopTouchMove();touchMovePointer=event.pointerId;button.classList.add('is-pressed');try{button.setPointerCapture(event.pointerId)}catch(e){/* Synthetic and keyboard pointers may not be capturable. */}moveCommand(dx,dy);touchMoveDelay=setTimeout(()=>{moveCommand(dx,dy);touchMoveRepeat=setInterval(()=>moveCommand(dx,dy),145)},180)}
function updateFrame(now){if(mode==='explore'&&!isOverlay()&&now-lastMove>145){const directions=[['ArrowUp',0,-1],['w',0,-1],['ArrowDown',0,1],['s',0,1],['ArrowLeft',-1,0],['a',-1,0],['ArrowRight',1,0],['d',1,0]];for(const [key,dx,dy] of directions)if(keyboard.has(key)){moveCommand(dx,dy);lastMove=now;break}}requestAnimationFrame(updateFrame)}
window.addEventListener('keydown',e=>{const k=e.key;const typing=['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName);if(typing&&k!=='Escape')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)||(k===' '&&document.activeElement?.tagName!=='BUTTON'))e.preventDefault();
 if(k.toLowerCase()==='h'&&G&&mode==='explore'&&!isOverlay()){if(e.shiftKey){document.documentElement.classList.toggle('hud-detailed')}else document.documentElement.classList.toggle('hud-hidden');return}if(k==='Tab'&&G&&mode==='explore'&&!isOverlay()){e.preventDefault();document.getElementById('worldQuestBtn')?.classList.toggle('expanded');return}if(k.toLowerCase()==='k'&&G&&mode==='explore'&&!isOverlay()){spellbook();return}if(k==='Escape'){if(mode==='title'&&document.documentElement.classList.contains('tavern-creation-open')&&window.AshenTavern?.back())return;if(isOverlay()){if($('modal').getAttribute('data-screen')==='location-entry'){modalCallback?.('back');return}closeModal();if(mode==='title')mainMenu()}else if(mode==='combat'){battleMenu='commands';renderCombatMenu()}else if(mode==='explore')helpMenu();return}if(isOverlay())return;
 if(mode==='title'){if(k==='Enter')mainMenu();return}if(mode==='combat'){if(k==='0'){setCombatTactic(combatTactic==='manual'?'attack':'manual');return}if(/^[1-9]$/.test(k)||k==='Enter'){const bs=Array.from(document.querySelectorAll('#battlePanel button[data-c]')).filter(b=>!b.disabled);const b=bs[k==='Enter'?0:Number(k)-1];if(b)battleAction(b.dataset.c)}return;}
 if(k.toLowerCase()==='e'||k===' '||k==='Enter'){interact();return}if(k.toLowerCase()==='i'){inventory();return}if(k.toLowerCase()==='p'){partyMenu();return}if(k.toLowerCase()==='j'){journalMenu();return}if(k.toLowerCase()==='m'){mapMenu();return}
 keyboard.add(k.length===1?k.toLowerCase():k);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(k.toLowerCase())||k.startsWith('Arrow')){let m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[k]||{w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[k.toLowerCase()];if(m){if(performance.now()-lastMove>95){moveCommand(...m);lastMove=performance.now()}}}
});
window.addEventListener('keyup',e=>keyboard.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>{keyboard.clear();stopTouchMove()});
$('worldViewBtn').onclick=()=>{document.documentElement.classList.add('world-windowed')};$('windowExpandBtn').onclick=()=>{document.documentElement.classList.remove('world-windowed')};
$('worldZoomBtn').onclick=()=>{$('zoomBtn').click();$('worldZoomBtn').textContent=$('zoomBtn').textContent};
$('worldMapBtn').onclick=()=>{if(G&&mode==='explore')mapMenu()};$('worldQuestBtn').onclick=()=>{if(G&&mode==='explore')$('worldQuestBtn').classList.toggle('expanded')};
$('worldPartyBtn').onclick=()=>{if(G&&mode==='explore')partyMenu()};$('worldSaveBtn').onclick=()=>saveGame();$('worldSoundBtn').onclick=()=>SFX.toggle();$('worldMenuBtn').onclick=()=>helpMenu();$('worldBagBtn').onclick=()=>inventory();$('worldSkillsBtn').onclick=()=>spellbook();$('worldJournalBtn').onclick=()=>journalMenu();$('hudToggle').onclick=()=>document.documentElement.classList.toggle('hud-hidden');
$('zoomBtn').onclick=()=>{cameraZoom=zoomSteps[(zoomSteps.indexOf(cameraZoom)+1)%zoomSteps.length];window.AshenTitle?.save({zoom:cameraZoom});$('zoomBtn').textContent=`ZOOM ${Math.round(cameraZoom*100)}%`; $('worldZoomBtn').textContent=$('zoomBtn').textContent;toast(`World zoom: ${Math.round(cameraZoom*100)}%`)};
 $('saveBtn').onclick=()=>saveGame();$('loadBtn').onclick=()=>loadGame();$('soundBtn').onclick=()=>SFX.toggle();$('menuBtn').onclick=()=>{if(!G)mainMenu();else if(isOverlay())closeModal();else helpMenu()};
$('skillsBtn').onclick=()=>{if(G&&mode==='explore')spellbook()};
$('bagBtn').onclick=()=>{if(G&&mode==='explore')inventory()};$('partyBtn').onclick=()=>{if(G&&mode==='explore')partyMenu()};$('journalBtn').onclick=()=>{if(G&&mode==='explore')journalMenu()};$('mapBtn').onclick=()=>{if(G&&mode==='explore')mapMenu()};
$('mobileAction').onclick=()=>{if(mode==='explore')interact()};$('mobileMenu').onclick=()=>{if(mode==='explore')inventory()};
for(const b of document.querySelectorAll('[data-dir]')){const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},move=dirs[b.dataset.dir];b.addEventListener('pointerdown',event=>startTouchMove(b,event,...move));for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,event=>stopTouchMove(event.pointerId));b.onclick=event=>{if(event.detail===0)moveCommand(...move)};}
for(const b of document.querySelectorAll('.mobilepad .actionkey')){b.addEventListener('pointerdown',()=>b.classList.add('is-pressed'));for(const type of ['pointerup','pointercancel','pointerleave'])b.addEventListener(type,()=>b.classList.remove('is-pressed'))}
const presentation=window.AshenTitle?.preferences();
if(presentation){audioEnabled=presentation.sound;cameraZoom=presentation.zoom;$('soundBtn').textContent=$('worldSoundBtn').textContent=audioEnabled?'SOUND ON':'SOUND OFF';$('zoomBtn').textContent=$('worldZoomBtn').textContent=`ZOOM ${Math.round(cameraZoom*100)}%`;}
initMaps();refreshHud();mainMenu();requestAnimationFrame(render);requestAnimationFrame(updateFrame);
// Expose a small test/debug surface; no effect on normal play.
window.AshenRealms={getRenderResources:()=>({artTextures:artPool?.size()??Object.keys(ART).length,scenes:window.AshenScenes?.metrics(),lights:window.AshenLighting?.resources(),actors:window.AshenAnimation?.size()}),enterBuilding,leaveBuilding,getState:()=>G?JSON.parse(JSON.stringify(G)):null,networkState:()=>G?{name:G.party[0]?.name,loc:G.location,x:G.x,y:G.y,dir:G.dir,role:G.party[0]?.role,level:G.party[0]?.level,mode}:null,getMode:()=>mode,openFormation:formationMenu,setFormation,newGame:startGame,move:moveCommand,interact,action,beginCombat,save:saveGame,load:loadGame,closeModal,getMap:()=>G?.location,getCombat:()=>combat?JSON.parse(JSON.stringify(combat)):null,battleAction,setCombatTactic,getCombatTactic:()=>combatTactic,walkable,getMapData:loc=>maps[loc],getAbilities:()=>G?G.party.map(h=>({role:h.role,level:h.level,known:knownAbilities(h).map(a=>a.id),points:h.talentPoints})):[],triggerJob:jobBoard,spellbook,levelUp,performAbility,getBattleFX:()=>battleFX,renderFrame:()=>render(false),getZoom:()=>cameraZoom,openShop:shop,openInventory:inventory,rollDroppedLoot,getMusicTheme:()=>BGM.key,getMusicStatus:()=>({theme:BGM.key,paused:BGM.node?.paused??true,ready:BGM.node?.readyState??0}),roll4d6,rollStatSet,autoAssign,createHero:newHero,levelThreshold,mod};
if(window.__ASHEN_TEST__){window.AshenRealms.test={interiorView:()=>interiorCamera(maps[G.location],Math.max(cameraZoom,Math.min(W/(maps[G.location].w*T),H/(maps[G.location].h*T)))),entities:()=>entities(),previewCreation:creationStats,modifyGame:fn=>{fn(G);refreshHud()},setLevel:(index,level)=>{const hero=G.party[index];while(hero.level<level)levelUp(hero);refreshHud()},addAlly:role=>{G.party.push(newHero(role, 'Human',role));refreshHud()},modifyCombat:fn=>{fn(combat);renderCombatMenu()},runEnemy:enemyAct,resolveWin:winCombat,refresh:refreshHud};}
})();
