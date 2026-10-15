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
function bodyKey(hero,direction='down'){
  const ancestry=ancestries.includes(hero?.ancestry)?hero.ancestry:'Human';
  return (ancestry==='Human'?'':ancestry.toLowerCase()+'_')+sprite(hero)+'_'+(hero?.appearance==='female'?'female':'male')+'_'+direction;
}
function bodyPath(hero,direction='down'){return 'assets/identity/'+bodyKey(hero,direction)+'.png'}
document.addEventListener?.('error',event=>{
  const image=event.target;if(image?.tagName!=='IMG'||!image.src.includes('/assets/identity/')||image.dataset.artFallback)return;
  image.dataset.artFallback='true';const role=image.src.match(/fighter|rogue|wizard|cleric/)?.[0]||'fighter';image.src='assets/portrait_'+role+'.png';
},true);
const images=new Map(),draws=[],prepared=new Set();
function load(key){
  if(!images.has(key)){const image=new Image();image.decoding='async';image.src='assets/identity/'+key+'.png';images.set(key,image)}
  const image=images.get(key);return image.complete&&image.naturalWidth>0?image:null;
}
function prepare(hero){const key=bodyKey(hero,'down');if(prepared.has(key))return;prepared.add(key);for(const dir of ['up','down','left','right']){load(bodyKey(hero,dir));load(bodyKey(hero,dir)+'_walk')}}
function draw(ctx,hero,x,y,{direction='down',height=44,walking=false,time=0,state='idle',gait=null,shadow=true}={}){
  const appearance=hero?.appearance==='female'?'female':'male';
  const key=bodyKey(hero,direction);
  const standing=load(key),stride=load(key+'_walk');
  const image=walking&&Math.floor(gait??time/110)%2&&stride?stride:standing;
  if(!image)return false;
  // Ancestry silhouettes and class costumes share one registry in every game scene.
  const stature=hero.ancestry==='Halfling'?.8:hero.ancestry==='Dwarf'?.88:1;
  const h=height*stature,w=h*image.naturalWidth/image.naturalHeight;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const bob=reduced?0:walking?Math.sin(time/65)*.8:Math.sin(time/520)*.18;
  ctx.save();ctx.globalAlpha*=hero.hp===0?.45:1;
  if(shadow)window.AshenGrounding?.shadow(ctx,x,y,{width:w*.32,height:h*.065});
  if(state==='death'){ctx.translate(x,y);ctx.rotate(direction==='left'?-.8:.8);ctx.translate(-x,-y)}
  if(state==='hit')ctx.globalAlpha*=.7+.3*Math.sin(time/28)**2;
  ctx.drawImage(image,x-w/2,y-h-bob,w,h);
  // Compatible overlays follow the actual equipped item; empty hands stay empty.
  const weapon=hero.gear?.weapon;
  if(weapon){
    const side=direction==='left'?-1:1,hx=x+side*w*.25,hy=y-h*.43;
    ctx.save();ctx.translate(hx,hy);if(state==='attack')ctx.rotate(side*-.65);ctx.lineCap='round';
    if(weapon==='runestaff'){
      ctx.strokeStyle='#6d4c2b';ctx.lineWidth=Math.max(1.1,h*.025);ctx.beginPath();ctx.moveTo(0,h*.35);ctx.lineTo(side*2,-h*.47);ctx.stroke();
      ctx.fillStyle='#93cde7';ctx.shadowBlur=6;ctx.shadowColor='#6bbfff';ctx.beginPath();ctx.arc(side*2,-h*.47,h*.037,0,Math.PI*2);ctx.fill();
    }else if(weapon==='oakbow'){
      ctx.strokeStyle='#a07c45';ctx.lineWidth=Math.max(1,h*.022);ctx.beginPath();ctx.moveTo(0,-h*.3);ctx.quadraticCurveTo(side*h*.2,0,0,h*.25);ctx.stroke();ctx.lineWidth=.5;ctx.strokeStyle='#d9c8a0';ctx.beginPath();ctx.moveTo(0,-h*.3);ctx.lineTo(0,h*.25);ctx.stroke();
    }else{
      ctx.strokeStyle=weapon==='ashblade'?'#eac193':'#bdccd1';ctx.lineWidth=Math.max(1.4,h*.035);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*h*.07,-h*.31);ctx.stroke();ctx.strokeStyle='#c6a46a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-h*.06,-h*.01);ctx.lineTo(h*.06,-h*.01);ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  if(window.__ASHEN_TEST__){draws.push({id:sprite(hero),state:walking?'walk':state,direction,height:h,result:true,appearance,ancestry:hero.ancestry,src:image.src});if(draws.length>100)draws.shift()}
  return true;
}
window.AshenIdentity=Object.freeze({appearances:Object.freeze(appearances),normalize,portrait,sprite,bodyPath,prepare,draw,debug:()=>({draws:draws.slice(),loaded:[...images.keys()].filter(k=>images.get(k).complete&&images.get(k).naturalWidth>0)})});
})();
