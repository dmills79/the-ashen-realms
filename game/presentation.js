/* Painted scene pieces supplement, but never mutate, the existing navigation maps. */
(function(){
'use strict';
const art=new Map(),T=24,cryptCache=new WeakMap();let revision=0;
const noise=(x,y,s=0)=>{const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)};
function load(name){
 if(!art.has(name)){const image=new Image();image.decoding='async';image.onload=()=>revision++;image.src='assets/overhaul/'+name+'.png';art.set(name,image)}
 const image=art.get(name);return image.complete&&image.naturalWidth>0?image:null;
}
function piece(c,name,x,y,w,h=null,alpha=1){
 const image=load(name);if(!image)return false;
 h=h??w*image.naturalHeight/image.naturalWidth;
 c.save();c.globalAlpha*=alpha;c.imageSmoothingEnabled=true;c.drawImage(image,x-w/2,y-h,w,h);c.restore();return true;
}
function flame(c,x,y,size,time=0){
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||window.AshenTitle?.preferences().motionPaused)time=0;
 const sway=Math.sin(time/83+x)*size*.15,flicker=1+Math.sin(time/53+x)*.12;
 c.save();const halo=c.createRadialGradient(x,y-size*.4,0,x,y-size*.4,size*3.8);
 halo.addColorStop(0,'#ffb95852');halo.addColorStop(.4,'#ee81351b');halo.addColorStop(1,'#f58a3000');c.fillStyle=halo;c.fillRect(x-size*4,y-size*4,size*8,size*8);
 for(let i=0;i<3;i++){
  const h=size*flicker*(1-i*.21),w=size*(.38-i*.08),dx=sway*(1+i*.3);
  c.fillStyle=['#e96522','#ffc260','#fff2b6'][i];c.beginPath();c.moveTo(x-w,y);
  c.bezierCurveTo(x-w*1.6,y-h*.45,x+dx+w*.7,y-h*.6,x+dx,y-h);
  c.bezierCurveTo(x+dx-w*.15,y-h*.55,x+w*1.7,y-h*.35,x+w,y);c.quadraticCurveTo(x,y+w*.5,x-w,y);c.fill();
 }
 c.restore();
}
function crypt(c,m,sx,sy,w,h){
 const floor=load('crypt_floor'),masonry=load('masonry');load('sarcophagus');load('statue');load('pillar');load('arch');
 let entry=cryptCache.get(m);
 if(!entry||entry.revision!==revision){
  const surface=document.createElement('canvas');surface.width=m.w*T*2;surface.height=m.h*T*2;const g=surface.getContext('2d');g.scale(2,2);
  g.fillStyle='#141b24';g.fillRect(0,0,m.w*T,m.h*T);
  g.save();g.beginPath();for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)if(m.tiles[y][x]!=='wall')g.rect(x*T,y*T,T,T);g.clip();
  g.fillStyle='#515560';g.fillRect(0,0,m.w*T,m.h*T);
  if(floor){const tile=document.createElement('canvas');tile.width=tile.height=256;tile.getContext('2d').drawImage(floor,0,0,256,256);g.fillStyle=g.createPattern(tile,'repeat');g.fillRect(0,0,m.w*T,m.h*T)}
  g.restore();
  let stone='#3a4149';
  if(masonry){const tile=document.createElement('canvas');tile.width=128;tile.height=96;tile.getContext('2d').drawImage(masonry,0,0,128,96);stone=g.createPattern(tile,'repeat')}
  // Wall edges are cut from the actual carved rooms; opening centers remain unpainted.
  for(let y=1;y<m.h-1;y++)for(let x=1;x<m.w-1;x++)if(m.tiles[y][x]==='wall'){
   const floorAt=(dx,dy)=>m.tiles[y+dy]?.[x+dx]!=='wall';
   if(floorAt(0,1)){
    g.fillStyle=stone;g.fillRect(x*T,y*T-8,T,32);g.fillStyle='#8c8a7045';g.fillRect(x*T,y*T-8,T,2);
    g.fillStyle='#070e1a45';g.fillRect(x*T,(y+1)*T,T,7);
   }else if(floorAt(1,0)||floorAt(-1,0)){g.fillStyle=stone;g.fillRect(x*T,y*T,T,T);g.fillStyle='#10172275';g.fillRect(x*T,y*T,T,T)}
  }
  // Chamber furniture occupies edges and corners, outside the principal routes.
  for(const [name,x,y,width] of [['sarcophagus',4,6,37],['sarcophagus',15,7,36],['sarcophagus',4,24,37],['sarcophagus',15,24,35],['statue',21,4,26],['statue',35,4,27],['pillar',20,22,32],['pillar',35,26,30]])piece(g,name,(x+.5)*T,(y+1)*T,width);
  for(const [x,y] of [[8,11],[8,20],[28,13]])piece(g,'arch',(x+2)*T,y*T+10,4*T,62,.8);
  entry={revision,surface};cryptCache.set(m,entry);
 }
 const cw=Math.min(w,m.w*T-sx),ch=Math.min(h,m.h*T-sy);c.drawImage(entry.surface,sx*2,sy*2,cw*2,ch*2,0,0,cw,ch);return true;
}
function npc(c,kind,x,y,time=0,height=39,options={}){
 const names={elder:'scholar',archivist:'scholar',shop:'smith_npc',apprentice:'smith_npc',baker:'baker_npc',breadApprentice:'baker_npc',inn:'innkeeper',keeper:'innkeeper',crier:'crier',villager:'farmer',merchant:'merchant',pilgrim:'pilgrim',healer:'pilgrim',acolyte:'pilgrim',resident:'farmer',guard:'guard',traveler:'traveler'};
 const name=names[kind];if(!name)return false;const image=load(name);if(!image)return false;
 const sway=Math.sin(time/650+x)*.25,h=height;
 c.save();if(options.shadow!==false)window.AshenGrounding?.shadow(c,x,y,{width:8,height:2.5});
 c.drawImage(image,x-h*image.naturalWidth/image.naturalHeight/2+sway,y-h,h*image.naturalWidth/image.naturalHeight,h);c.restore();return true;
}
function smoke(c,x,y,time=0){
 c.save();for(let i=0;i<5;i++){const p=(time/1700+i*.2)%1;c.globalAlpha=(1-p)*.13;const r=5+p*11,g=c.createRadialGradient(x+Math.sin(p*4+x)*7,y-p*42,0,x+Math.sin(p*4+x)*7,y-p*42,r);g.addColorStop(0,'#d2c9b7');g.addColorStop(1,'#d2c9b700');c.fillStyle=g;c.fillRect(x-25,y-p*42-r,50,r*2)}c.restore();
}
window.AshenPresentation={piece,flame,crypt,npc,smoke,debug:()=>({ready:[...art.keys()].filter(k=>art.get(k).complete&&art.get(k).naturalWidth>0)})};
})();
