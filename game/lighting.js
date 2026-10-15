/* Cached, restrained Canvas light masks; explicit sources stay in scene coordinates. */
(function(){
'use strict';
const masks=new Map(),motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');let quality='auto';
try{const value=localStorage.getItem('ashen-realms-lighting-v1');if(['auto','full','low','off'].includes(value))quality=value}catch(e){}
const fire=new Image();fire.decoding='async';fire.src='assets/living_world/fire_cycle.png';
const sources={
 camp:{outdoor:true,fires:[[12.5,7.55,14,19],[19.5,14.55,14,19],[25.5,11.55,14,19]],lights:[[12.5,7.5,50,.12],[19.5,14.5,50,.12],[25.5,11.5,50,.12]]},
 tavern:{fires:[[14.7,2.5,22,23],[4.75,7.77,2.2,5],[13.75,7.77,2.2,5]],lights:[[14.7,3,62,.13],[4.75,8,25,.045],[13.75,8,25,.045],[11.8,1.7,22,.035]]},
 smith:{fires:[[14.7,4.8,18,21]],lights:[[14.7,4.8,74,.14]]},
 inn:{fires:[],lights:[[3,3,26,.035],[15,3,26,.035]]},
 hall:{fires:[],lights:[[3,4,35,.045],[15,4,35,.045]]},
 chapel:{fires:[[7.55,4.13,2,5],[9.45,4.13,2,5]],lights:[[8.5,4.5,35,.06]]},
 cottage:{fires:[[1.8,6.6,11,17]],lights:[[2,6.5,55,.13]]},
 bakery:{fires:[[14.8,3.6,15,18]],lights:[[15,4,65,.12]]}
};
function resolved(){return quality==='auto'?(window.innerWidth<700?'low':'full'):quality}
function mask(color){if(masks.has(color))return masks.get(color);const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color);g.addColorStop(.3,color+'9a');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,128,128);masks.set(color,canvas);return canvas}
function lightSources(loc,map){if(sources[loc])return sources[loc].lights;if(loc==='town')return (map.buildings||[]).map(b=>[b.doorX+.5,b.doorY+.7,35,.13]);if(loc==='crypt')return [[8.5,5.5,52,.15],[8.5,25.5,52,.15],[32.5,23.5,52,.15]];return []}
function frame(c,x,y,w,h,now){if(!fire.complete||!fire.naturalWidth)return false;const index=motionPreference?.matches?0:Math.floor(now/125)%8,fw=fire.naturalWidth/4,fh=fire.naturalHeight/2;c.drawImage(fire,index%4*fw,Math.floor(index/4)*fh,fw,fh,x-w/2,y-h,w,h);return true}
function flames(c,loc,sx,sy,now){if(resolved()==='off'||!fire.complete||!fire.naturalWidth)return;const reduced=motionPreference?.matches;const index=reduced?0:Math.floor(now/125)%8,fw=fire.naturalWidth/4,fh=fire.naturalHeight/2;for(const[x,y,w,h]of sources[loc]?.fires||[])c.drawImage(fire,(index%4)*fw,Math.floor(index/4)*fh,fw,fh,x*24-sx-w/2,y*24-sy-h,w,h)}
function draw(c,map,loc,sx,sy,w,h,clock,now,objects={}){
 const level=resolved();if(level==='off')return;const t=window.AshenWorldTime.read(clock),inside=!!sources[loc]&&!sources[loc].outdoor,dark=loc==='crypt'?.16:inside?t.ambient*.3:t.ambient;
 c.save();if(dark>0){c.globalAlpha=dark;c.fillStyle=inside?'#181c28':'#142337';c.fillRect(0,0,w,h)}c.globalCompositeOperation='screen';
 let count=0;for(const[x,y,r,power]of lightSources(loc,map)){const px=x*24-sx,py=y*24-sy;if(px+r<0||py+r<0||px-r>w||py-r>h)continue;if(++count>(level==='low'?4:12))break;const stoked=objects[loc+':hearth']?.stokedAt,boost=stoked!==undefined&&clock.day*1440+clock.minutes-stoked<10?1.1:1;const flicker=motionPreference?.matches?1:1+.035*Math.sin(now/330+x)+.025*Math.sin(now/197+y);c.globalAlpha=Math.min(.24,power*boost*flicker*(inside?1+t.ambient:Math.max(.2,t.ambient*3)));c.drawImage(mask(loc==='crypt'?'#9aaec8':'#e9b778'),px-r,py-r,2*r,2*r)}c.restore();
}
function setQuality(value){if(!['auto','full','low','off'].includes(value))return;quality=value;try{localStorage.setItem('ashen-realms-lighting-v1',value)}catch(e){}}
window.AshenLighting={sources,draw,flames,frame,setQuality,quality:()=>quality,cycleQuality:()=>setQuality(['auto','full','low','off'][(['auto','full','low','off'].indexOf(quality)+1)%4]),resources:()=>({masks:masks.size,quality:resolved()})};
})();
