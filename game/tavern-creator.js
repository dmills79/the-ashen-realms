/* Five-stage creator, isolated from exploration/combat. A draft never writes an adventure save. */
(function(){
'use strict';
let current=null;
const titles=['Choose your ancestry','Choose your calling','Roll your attributes','Assign your scores','Review your adventurer'];
const shortTitles=['Ancestry','Class','Dice','Attributes','Review'];
const names=['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma'];
const asset=name=>'assets/tavern_creation/'+name+'.png';
const signed=v=>(v>0?'+':'')+v;
const modifier=v=>Math.floor((v-10)/2);
function validRoll(r){return r&&Array.isArray(r.dice)&&r.dice.length===4&&r.dice.every(v=>Number.isInteger(v)&&v>=1&&v<=6)&&r.drop===r.dice.indexOf(Math.min(...r.dice))&&r.score===r.dice.reduce((a,b)=>a+b,0)-r.dice[r.drop]}
function validAssignments(values){return Array.isArray(values)&&values.length===6&&new Set(values).size===6&&values.every(v=>Number.isInteger(v)&&v>=0&&v<6)}
function close(){current?.dispose();current=null;document.documentElement.classList.remove('tavern-creation-open')}
function open(engine){
 close();const rules=window.AshenCharacterRules;
 let stage=1,reached=1,name='Arden',ancestry='Human',role='Fighter',appearance='male',rolls=[],assigned=[0,1,2,3,4,5],selected=null,renderer=null,busy=false,alive=true,operation=0;
 const esc=engine.escape;
 const bonus=(values)=>values.some(v=>v!==0)?values.map((v,i)=>v?`<span class="${v>0?'bonus-positive':'bonus-negative'}">${engine.attrs[i]} ${signed(v)}</span>`:'').join(''):'<span class="bonus-neutral">No ancestry modifiers</span>';
 const ready=()=>rolls.length===6&&rolls.every(validRoll)&&validAssignments(assigned);
 function preview(){const source=rolls.length===6?rolls:Array.from({length:6},()=>({score:12})),assignment=rolls.length===6?assigned:[0,1,2,3,4,5];return {role,ancestry,appearance,level:1,gear:{weapon:null,armor:null},talents:{},...engine.preview(ancestry,role,assignment,source)}}
 const abilities=()=>engine.abilities(role).map(a=>`<span class="tavern-ability"><b>${a.name}</b> · ${a.mp} MP<small>${a.tip}</small></span>`).join('');
 const vitals=(hero,estimated=false)=>{const d=engine.combatStats(hero);return `<div class="tavern-vitals" aria-label="${estimated?'Estimated':'Starting'} statistics"><span><small>HP</small><b data-preview="hp">${hero.maxHp}</b></span><span><small>MP</small><b data-preview="mp">${hero.maxMp}</b></span><span><small>AC</small><b data-preview="ac">${d.ac}</b></span></div>${estimated?'<small class="estimate-note">Estimates use a roll of 12 in every attribute until you roll.</small>':''}`};
 const portrait=()=>`<div class="lineage-portrait"><img src="${engine.identity({ancestry,role,appearance})}" alt="${appearance} ${ancestry} ${role} portrait"><span class="calling-seal" role="img" aria-label="${role} class sigil">${engine.classes[role].symbol}</span></div>`;
 function lineage(){
  const a=rules.ancestries[ancestry];return `<div class="ancestry-gallery" role="group" aria-label="Ancestry">${Object.entries(rules.ancestries).map(([id,a])=>`<button class="illustrated-choice" data-action="ancestry:${id}" aria-label="Choose ${id} ancestry" aria-pressed="${id===ancestry}"><img src="${asset(a.portrait)}" alt="${id} portrait"><span class="choice-caption"><strong>${id}</strong><small>${a.tagline}</small><span class="choice-bonuses">${bonus(a.stats)}</span></span></button>`).join('')}</div><section class="parchment lineage-story"><div><h3>${ancestry}</h3><p>${a.flavor}</p><p class="lineage-strength">${a.strengths}</p></div><div class="ledger-name"><label for="heroName">NAME UPON THE LEDGER</label><input id="heroName" maxlength="18" autocomplete="off" value="${esc(name)}" placeholder="Wanderer"><div class="appearance-picker" role="group" aria-label="Character appearance">${['male','female'].map(value=>`<button data-action="appearance:${value}" aria-pressed="${value===appearance}">${value.toUpperCase()}</button>`).join('')}</div><span>${role} · ${rolls.length===6?'Your rolled attributes':'Your calling awaits'}</span>${vitals(preview(),rolls.length!==6)}</div></section>`;
 }
 function calling(){
  const c=rules.classes[role],hero=preview();return `<div class="class-gallery" role="group" aria-label="Class">${Object.entries(engine.classes).map(([id,c])=>`<button class="illustrated-choice class-choice" data-action="class:${id}" aria-label="Choose ${id} class" aria-pressed="${id===role}"><img src="${engine.identity({ancestry,role:id,appearance})}" alt="${appearance} ${ancestry} ${id} portrait"><span class="choice-caption"><strong>${id}</strong><small>${rules.classes[id].role}</small></span></button>`).join('')}</div><section class="parchment calling-notes"><div><h3>${role} <small>${c.role}</small></h3><p>${engine.classes[role].desc}</p><p><b>Strength:</b> ${c.strength}<br><b>Weakness:</b> ${c.weakness}</p><p class="calling-recommend">Favour ${c.recommend}. Training: ${bonus(engine.training[role].stats)}</p></div><div>${vitals(hero,rolls.length!==6)}${abilities()}<p class="starter-equipment"><b>Starting equipment:</b> unarmed, no armour. Your shared travel kit contains potions, Moonwater, antidotes and rations.</p></div></section>`;
 }
 function receipts(){return Array.from({length:6},(_,i)=>{const r=rolls[i];return `<button class="dice-receipt" data-action="show:${i}" ${r?'':'disabled'} aria-label="${r?'Show Roll '+(i+1)+': '+r.score:'Roll '+(i+1)+' not rolled'}"><span>${String(i+1).padStart(2,'0')}</span><span class="receipt-dice">${r?r.dice.map((v,j)=>`<i class="${j===r.drop?'discarded-value':''}">${v}</i>`).join(''):'— — — —'}</span><b>${r?r.score:'—'}</b></button>`}).join('')}
 function dice(){return `<div class="dice-layout"><section class="physical-dice-table" aria-label="Dice on the tavern table"><div class="dice-table-heading"><span>FOUR DICE. THREE KEPT.</span><p>Let fortune find you at the Lantern.</p></div><canvas id="diceTable" aria-label="Four three-dimensional dice rolling on an oak table"></canvas><div id="diceOutcome" class="dice-outcome" role="status" aria-live="polite">${rolls.length?'Your last roll: '+rolls.at(-1).score:'Pick up the dice to begin.'}</div><p id="diceNotice" class="dice-notice"></p><div class="dice-tools"><button data-action="roll-one" ${rolls.length===6?'disabled':''}>ROLL ${Math.min(6,rolls.length+1)} OF 6</button><button data-action="roll-all">${rolls.length===6?'REROLL ALL SIX':'ROLL ALL SIX'}</button></div></section><aside class="parchment dice-ledger"><h3>Your six rolls</h3><div id="diceReceipts">${receipts()}</div><p>Four d6 per roll. Cross out one lowest die; add the other three.</p><small>Each roll will be assigned once. Equal totals are separate rolls.</small></aside></div>`}
 const tokens=()=>rolls.map((r,i)=>`<button class="roll-token" data-action="select:${i}" aria-label="Select Roll ${i+1}: ${r.score}" aria-pressed="${selected===i}"><small>ROLL ${i+1}</small><b>${r.score}</b><span>${engine.attrs[assigned.indexOf(i)]}</span></button>`).join('');
 function attributes(){
  const hero=preview(),a=rules.ancestries[ancestry].stats,c=engine.training[role].stats;
  return `<section class="parchment assignment-journal"><div class="assignment-intro"><div><h3>Your strengths, in ink</h3><p id="assignmentHint" aria-live="polite">${selected===null?'Choose a roll, then an attribute total. Or use the roll menus.':'Roll '+(selected+1)+' selected. Choose an attribute below.'}</p></div><button data-action="auto" class="ink-button">AUTO-ASSIGN</button></div><div class="roll-token-strip" role="group" aria-label="Rolled scores">${tokens()}</div><div class="assignment-grid">${engine.attrs.map((attr,i)=>`<div class="assignment-entry"><div><label for="assign${i}">${names[i]}</label><small>${attr}</small></div><select id="assign${i}" data-assign="${i}" aria-label="${names[i]} roll">${rolls.map((r,j)=>`<option value="${j}" ${assigned[i]===j?'selected':''}>Roll ${j+1} · ${r.score}</option>`).join('')}</select><span class="attribute-bonuses"><i class="${a[i]<0?'bonus-negative':a[i]>0?'bonus-positive':'bonus-neutral'}">${signed(a[i])} ancestry</i><i class="bonus-class">${signed(c[i])} class</i></span><button class="ink-score" data-action="apply:${i}" ${selected===null?'disabled':''} aria-label="${selected===null?names[i]+' total '+hero.stats[i]:'Assign selected roll to '+names[i]}"><b data-stat="${i}">${hero.stats[i]}</b><small>${signed(modifier(hero.stats[i]))}</small></button></div>`).join('')}</div><div class="assignment-footnote"><span>${ancestry} ${role}</span>${vitals(hero)}<p>Score = roll + ancestry + class. Swapping preserves all six unique assignments.</p></div></section>`;
 }
 function review(){
  const hero=preview(),combat=engine.combatStats(hero),a=rules.ancestries[ancestry].stats,c=engine.training[role].stats;
  return `<section class="parchment final-ledger"><aside>${portrait()}<h3>${esc(name.trim()||'Wanderer')}</h3><span class="final-identity">${ancestry} · ${role} · LEVEL 1 · ${appearance.toUpperCase()}</span>${vitals(hero)}<p><b>Weapon attack</b> ${signed(combat.attack)}<br><b>Spell attack</b> ${signed(combat.spell)}<br><b>Ability save DC</b> ${combat.dc}<br><b>Initiative</b> ${signed(combat.initiative)}</p><small>Natural 20: critical hit.<br>AC includes no equipped armour.</small></aside><div class="final-details"><h3>The adventurer’s ledger</h3><p class="sheet-subtitle">${ancestry} ancestry · ${role} training · ${appearance} appearance</p><div class="sheet-ability-grid" aria-label="Ability scores">${engine.attrs.map((attr,i)=>`<article class="sheet-ability"><header><span>${attr}</span><strong>${names[i]}</strong></header><div class="sheet-ability-total"><b data-review-stat="${i}">${hero.stats[i]}</b><span>${signed(modifier(hero.stats[i]))}<small>MODIFIER</small></span></div><footer>Roll ${rolls[assigned[i]].score} · Ancestry <em class="${a[i]<0?'bonus-negative':a[i]>0?'bonus-positive':'bonus-neutral'}">${signed(a[i])}</em> · Class ${signed(c[i])}</footer></article>`).join('')}</div><div class="final-kit"><section><h4>SKILLS & CLASS ABILITIES</h4><ul class="sheet-skills">${engine.abilities(role).map(a=>`<li title="${a.tip}"><b>${a.name}</b> <span>${a.kind==='passive'?'Passive':a.mp+' MP'}</span></li>`).join('')}</ul><p>Arcana / Insight checks use the higher of INT ${signed(modifier(hero.stats[3]))} and WIS ${signed(modifier(hero.stats[4]))}.<br>DEX saving throw ${signed(combat.initiative)}.</p></section><section><h4>PROFICIENCIES & TRAINING</h4><p>${engine.training[role].priority.slice(0,2).map(i=>names[i]).join(' · ')}<br>Attacks use level proficiency ${signed(2+Math.floor((hero.level-1)/4))}.<br>Attribute checks use the modifiers above.</p><h4>EQUIPMENT & SUPPLIES</h4><p>Weapon: unarmed · Armour: none<br>45 gold · 4 Healing Potions · 2 Moonwaters<br>2 Antidote Salves · 3 Travel Rations</p></section></div><p class="final-message">The road to Havenmere awaits. Your adventure is saved when you begin.</p></div></section>`;
 }
 function resizeControls(){
  const root=document.getElementById('modal');
  const one=root.querySelector('[data-action="roll-one"]'),all=root.querySelector('[data-action="roll-all"]');
  if(one)one.textContent=busy?'ROLLING…':rolls.length===6?'SIX SCORES ROLLED':'ROLL '+(rolls.length+1)+' OF 6';
  if(all)all.textContent=busy?'ROLLING…':rolls.length===6?'REROLL ALL SIX':'ROLL ALL SIX';
  root.querySelectorAll('[data-action="roll-one"],[data-action="roll-all"],[data-action="next"]').forEach(b=>{b.disabled=busy||(b.dataset.action==='roll-one'&&rolls.length===6)||(b.dataset.action==='next'&&stage===3&&!ready())});
 }
 function setStage(next){if(next<1||next>5)return;operation++;busy=false;renderer?.dispose();renderer=null;stage=next;reached=Math.max(reached,stage);selected=null;render()}
 async function roll(all){
  if(busy||!renderer)return;engine.prepareSound?.();if(rolls.length===6){rolls=[];assigned=[0,1,2,3,4,5]}
  busy=true;const token=++operation;resizeControls();let end=all?6:rolls.length+1;
  while(rolls.length<end&&alive&&token===operation){
   const value=engine.roll();if(!validRoll(value))throw Error('Invalid generated roll');rolls.push(value);
   const index=rolls.length-1;document.getElementById('diceOutcome').textContent='Rolling '+(index+1)+' of 6…';
   const shown=await renderer.play(value);if(!alive||token!==operation)return;
   if(shown&&shown.rendered&&shown.values.some((v,i)=>v!==value.dice[i]))throw Error('Rendered dice disagree with generated result');
   document.getElementById('diceReceipts').innerHTML=receipts();bindReceipts();
   const result=document.getElementById('diceOutcome');result.textContent=value.dice.filter((_,i)=>i!==value.drop).join(' + ')+' = '+value.score+' · discard '+value.dice[value.drop];result.classList.remove('result-settled');void result.offsetWidth;result.classList.add('result-settled');
  }
  if(rolls.length===6)assigned=engine.auto(rolls,role);busy=false;resizeControls();
 }
 function bindReceipts(){document.querySelectorAll('#diceReceipts [data-action]').forEach(button=>button.onclick=()=>{if(!busy)renderer?.show(rolls[Number(button.dataset.action.slice(5))])})}
 function swap(at,value){if(!validAssignments(assigned)||!Number.isInteger(value)||value<0||value>5)return;const other=assigned.indexOf(value),old=assigned[at];assigned[other]=old;assigned[at]=value;selected=null}
 function act(action){
  if(action==='back'){if(stage===1){engine.title();return}setStage(stage-1);return}
  if(action==='next'){if(busy)return;if(stage===3&&!ready())return;if(stage===5){if(!ready())return;engine.begin(name.trim().slice(0,18)||'Wanderer',ancestry,role,assigned.slice(),rolls.map(r=>({...r,dice:r.dice.slice()})),appearance);return}setStage(stage+1);return}
  if(action==='roll-one'){roll(false);return}if(action==='roll-all'){roll(true);return}
  if(action.startsWith('appearance:')){const value=action.slice(11);if(['male','female'].includes(value)){appearance=value;render(`[data-action="${action}"]`)}return}
  if(action.startsWith('ancestry:')){const next=action.slice(9);if(!Object.hasOwn(rules.ancestries,next))return;ancestry=next;render(`[data-action="${action}"]`);return}
  if(action.startsWith('class:')){const next=action.slice(6);if(!Object.hasOwn(engine.classes,next)||next===role)return;role=next;if(rolls.length===6)assigned=engine.auto(rolls,role);render(`[data-action="${action}"]`);return}
  if(action.startsWith('stage:')){const next=Number(action.slice(6));if(next<=reached&&(![4,5].includes(next)||ready()))setStage(next);return}
  if(action==='auto'){assigned=engine.auto(rolls,role);selected=null;render('[data-action="auto"]');return}
  if(action.startsWith('select:')){const i=Number(action.slice(7));selected=selected===i?null:i;render(`[data-action="${action}"]`);return}
  if(action.startsWith('apply:')&&selected!==null){const at=Number(action.slice(6));swap(at,selected);render('#assign'+at);return}
  if(action.startsWith('show:')&&!busy)renderer?.show(rolls[Number(action.slice(5))]);
 }
 function render(focus=null){
  if(!alive)return;const previous=document.querySelector('.tavern-body'),scroll=previous&&Number(previous.dataset.stage)===stage?previous.scrollTop:0;renderer?.dispose();renderer=null;
  const content=[lineage,calling,dice,attributes,review][stage-1]();
  const nextLabels=['CHOOSE YOUR CLASS →','ROLL YOUR ATTRIBUTES →','ASSIGN ABILITY SCORES →','REVIEW ADVENTURER →','BEGIN ADVENTURE →'];
  engine.show(`<section class="tavern-shell stage-${stage}" aria-label="Tavern character creation"><header class="tavern-header"><div><span>THE BLUE LANTERN · HAVENMERE</span><h2>${titles[stage-1]}</h2></div><nav class="tavern-stages" aria-label="Character creation stages">${shortTitles.map((label,i)=>`<button data-action="stage:${i+1}" ${i+1>reached?'disabled':''} ${stage===i+1?'aria-current="step"':''} aria-label="Stage ${i+1}: ${label}"><b>${i+1}</b><span>${label}</span></button>`).join('')}</nav></header><div class="tavern-body" data-stage="${stage}">${content}</div><footer class="tavern-footer"><button data-action="back">${stage===1?'← RETURN TO TITLE':'← BACK'}</button><span>${stage===3?'4d6 · DROP ONE LOWEST · SIX SCORES':'An adventure begins by the fire.'}</span><button class="tavern-primary" data-action="next" ${stage===3&&!ready()?'disabled':''}>${nextLabels[stage-1]}</button></footer></section>`,act);
  document.documentElement.classList.add('tavern-creation-open');const modal=document.getElementById('modal');modal.setAttribute('data-screen','tavern-create');modal.setAttribute('data-stage',stage);
  const body=modal.querySelector('.tavern-body');body.scrollTop=scroll;
  modal.querySelector(focus||(stage===1?'#heroName':stage===3?'[data-action="roll-all"]':'[data-action="next"]'))?.focus({preventScroll:true});
  if(stage===1)document.getElementById('heroName').addEventListener('input',event=>name=event.target.value);
  if(stage===4)modal.querySelectorAll('[data-assign]').forEach(select=>select.addEventListener('change',event=>{const at=Number(event.target.dataset.assign);swap(at,Number(event.target.value));render('#assign'+at)}));
  if(stage===3){
   renderer=window.AshenDice.mount(document.getElementById('diceTable'),{onContact:engine.sound,reducedMotion:()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||window.AshenTitle?.preferences().motionPaused,onUnavailable:message=>{const note=document.getElementById('diceNotice');if(note)note.textContent=message}});
   if(rolls.length)renderer.show(rolls.at(-1));
  }
 }
 current={dispose:()=>{alive=false;operation++;busy=false;renderer?.dispose();renderer=null},back:()=>{if(stage===1)engine.title();else setStage(stage-1);return true},debug:()=>({stage,ancestry,role,appearance,name,busy,rolls:rolls.map(r=>({...r,dice:r.dice.slice()})),assigned:assigned.slice(),preview:preview(),dice:renderer?.debug()||null})};
 render();
}
window.AshenTavern={open,close,back:()=>current?.back()||false,debug:()=>current?.debug()||null,validRoll,validAssignments};
})();
