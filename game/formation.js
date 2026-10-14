/* Formation is independent of the initiative queue. Pure rules shared by UI and combat. */
(function(){
  'use strict';
  const defaultRow=hero=>['Wizard','Cleric'].includes(hero.role)?'back':'front';
  const row=hero=>['front','back'].includes(hero.row)?hero.row:defaultRow(hero);
  const defenders=party=>party.filter(h=>h.hp>0&&!h.hidden&&row(h)==='front');
  const enemyRange=enemy=>['melee','ranged','magic','flying'].includes(enemy.attackRange)?enemy.attackRange:['wisp','shaman'].includes(enemy.original||enemy.type)?'magic':(enemy.original||enemy.type)==='bat'?'flying':'melee';
  const screened=(hero,party)=>row(hero)==='back'&&defenders(party).length>0;
  const attackPenalty=(hero,party,spell=false)=>!spell&&hero.gear?.weapon!=='oakbow'&&screened(hero,party)?2:0;
  const coverDamage=(damage,hero,party,range='melee')=>range==='melee'&&screened(hero,party)?Math.ceil(damage*.75):damage;
  function targetPool(enemy,party){
    const visible=party.filter(h=>h.hp>0&&!h.hidden),screen=defenders(visible).length>0&&enemyRange(enemy)==='melee';
    return visible.flatMap(h=>Array(screen&&row(h)==='front'?4:1).fill(h));
  }
  function lighting(steps){
    const phase=((Number(steps)||0)%480+480)%480;
    if(phase<240)return {from:'day',to:'day',blend:0};
    if(phase<280)return {from:'day',to:'evening',blend:(phase-240)/40};
    if(phase<320)return {from:'evening',to:'evening',blend:0};
    if(phase<360)return {from:'evening',to:'night',blend:(phase-320)/40};
    if(phase<440)return {from:'night',to:'night',blend:0};
    return {from:'night',to:'day',blend:(phase-440)/40};
  }
  window.AshenFormation=Object.freeze({defaultRow,row,defenders,enemyRange,screened,attackPenalty,coverDamage,targetPool,lighting});
})();
