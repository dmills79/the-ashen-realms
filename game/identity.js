/* Appearance is presentation-only; old saves retain every gameplay statistic. */
(function(){
'use strict';
const appearances=['male','female'];
const classes=['Fighter','Rogue','Wizard','Cleric'];
const ancestries=['Human','Elf','Dwarf','Halfling'];
function normalize(hero){
  if(!appearances.includes(hero.appearance))hero.appearance='male';
  return hero;
}
function portrait(hero){
  const ancestry=ancestries.includes(hero?.ancestry)?hero.ancestry:'Human';
  const role=classes.includes(hero?.role)?hero.role:'Fighter';
  const appearance=appearances.includes(hero?.appearance)?hero.appearance:'male';
  return 'assets/identity/'+ancestry.toLowerCase()+'_'+role.toLowerCase()+'_'+appearance+'.png';
}
function sprite(hero){return classes.includes(hero?.role)?hero.role.toLowerCase():'fighter'}
window.AshenIdentity=Object.freeze({appearances:Object.freeze(appearances),normalize,portrait,sprite});
})();
