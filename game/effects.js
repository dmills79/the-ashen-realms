/* Restrained effect vocabulary, driven by the same impact clock as combat damage. */
(function(){
'use strict';
const colors={fire:'#c88d50',meteor:'#d2aa68',ice:'#9ab9c7',arcane:'#a293ba',holy:'#d9c08b',heal:'#b6c69b',shadow:'#82738f',slash:'#e0c79b',arrow:'#c3a077'};
function draw(c,e,now){
 if(!e)return false;const elapsed=now-e.startTime,p=window.AshenAnimation.phase(elapsed,e.kind),color=colors[e.kind]||colors.arcane;
 c.save();c.strokeStyle=color;c.fillStyle=color;
 if(p.preparing&&e.kind!=='slash'&&e.kind!=='arrow'){c.globalAlpha=.35;const r=4+elapsed/70;c.lineWidth=.8;c.beginPath();c.arc(e.source.x,e.source.y-36,r,0,Math.PI*1.6);c.stroke()}
 for(const target of e.targets){
  if(!target)continue;const sx=e.source.x,sy=e.source.y-36,tx=target.x,ty=target.y-38;
  if(!p.preparing&&!p.impact&&e.kind!=='slash'){
   const x=sx+(tx-sx)*p.projectile,y=sy+(ty-sy)*p.projectile-12*Math.sin(Math.PI*p.projectile);
   c.globalAlpha=.8;c.lineWidth=e.kind==='arrow'?1:2;c.beginPath();c.moveTo(x-7,y+2);c.lineTo(x+2,y);c.stroke();
   if(e.kind!=='arrow'){c.globalAlpha=.25;c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill()}
  }
  if(p.impact){
   const fade=Math.max(0,1-(elapsed-480)/370);c.globalAlpha=fade*.65;c.lineWidth=1.5;
   if(e.kind==='slash'){c.beginPath();c.moveTo(tx-14,ty-17);c.quadraticCurveTo(tx+2,ty,tx+17,ty+12);c.stroke()}
   else {const r=5+(1-fade)*18;c.beginPath();c.ellipse(tx,ty,r,r*.5,0,0,Math.PI*2);c.stroke();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.fillRect(tx+Math.cos(a)*r,ty+Math.sin(a)*r*.65,1,2)}}
  }
 }
 c.restore();return true;
}
window.AshenEffects={draw,colors};
})();
