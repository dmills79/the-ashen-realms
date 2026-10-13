/* One authoritative configuration for ancestry rules, including legacy save provenance. */
(function(){
'use strict';
const ancestries={
 Human:{stats:[0,0,0,0,0,0],tagline:'People of every road',flavor:'From every road and hearth, humans carry the courage to begin again.',strengths:'An adaptable, neutral baseline. No ancestry bonuses or penalties.',portrait:'human'},
 Elf:{stats:[-1,2,-1,1,0,0],tagline:'Children of the elder woods',flavor:'Children of the elder woods, patient as moonlight and keen as a drawn bow.',strengths:'Swift reflexes and arcane insight; less physical strength and resilience.',portrait:'elf'},
 Dwarf:{stats:[1,-1,2,0,0,-1],tagline:'Keepers of the deep halls',flavor:'Forged by deep halls and old oaths, dwarves endure what others cannot.',strengths:'Strong and exceptionally hardy; less nimble and socially reserved.',portrait:'dwarf'},
 Halfling:{stats:[-1,2,-1,0,0,1],tagline:'Small folk, brave hearts',flavor:'Small travelers with quick hands, bright spirits and remarkably brave hearts.',strengths:'Agile and personable; a lighter, less resilient build.',portrait:'halfling'}
};
const legacy={Human:[1,1,1,1,1,1],Elf:[0,2,0,1,0,0],Dwarf:[1,0,2,0,0,0],Halfling:[0,2,0,0,0,1]};
const classes={
 Fighter:{role:'Frontline warrior',strength:'Heavy weapon strikes and a sturdy health pool.',weakness:'Little mana; limited magical reach.',recommend:'STR, CON, then DEX'},
 Rogue:{role:'Agile skirmisher',strength:'Shadowstep attacks with advantage and extra damage.',weakness:'Less durable than a Fighter; needs careful timing.',recommend:'DEX, CHA, then CON'},
 Wizard:{role:'Arcane damage dealer',strength:'Elemental spells and powerful area attacks as you level.',weakness:'The smallest health pool; relies on mana.',recommend:'INT, CON, then DEX'},
 Cleric:{role:'Healer and guardian',strength:'Healing, poison cleansing and radiant magic as you level.',weakness:'Offensive spells unlock after your first level.',recommend:'WIS, CON, then STR'}
};
for(const a of Object.values(ancestries)){Object.freeze(a.stats);Object.freeze(a)}
for(const values of Object.values(legacy))Object.freeze(values);
for(const c of Object.values(classes))Object.freeze(c);
window.AshenCharacterRules=Object.freeze({version:'tavern-v2',ancestries:Object.freeze(ancestries),legacy:Object.freeze(legacy),classes:Object.freeze(classes)});
})();
