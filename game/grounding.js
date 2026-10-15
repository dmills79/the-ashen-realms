/* One floor plane for simulation cells, actor feet and painterly contact shadows. */
(function(){
'use strict';
let mask=null;
const point=(x,y,sx=0,sy=0)=>({x:x*24+12-sx,y:y*24+12-sy});
const offset=e=>e?.seated?18:e?.behindBar?33:0;
const depth=actor=>actor.type==='interiorProp'?actor.prop.depth:(actor.renderY??actor.y)+.5+offset(actor.entity)/24;
function shadow(c,x,y,{width=12,height=3,alpha=1}={}){
 if(!mask){
  mask=document.createElement('canvas');mask.width=96;mask.height=32;
  const g=mask.getContext('2d');g.translate(48,16);g.scale(1,.25);
  const ink=g.createRadialGradient(0,0,0,0,0,44);
  ink.addColorStop(0,'rgba(17,12,9,.4)');ink.addColorStop(.35,'rgba(17,12,9,.22)');ink.addColorStop(1,'rgba(17,12,9,0)');
  g.fillStyle=ink;g.fillRect(-48,-64,96,128);
 }
 c.save();c.globalAlpha*=alpha;c.drawImage(mask,x-width,y-height,width*2,height*2);c.restore();
}
window.AshenGrounding={point,offset,depth,shadow};
})();
