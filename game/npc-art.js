/* Original identity-matched tavern poses; foot anchors measured from the atlas. */
(function(){
'use strict';
const image=new Image();image.decoding='async';image.src='assets/living_world/tavern_npc_poses.png';
const rows={keeper:[[[125,0,250,432],250,428],[[491,0,265,433],628,428],[[879,0,266,433],1014,428]],merchant:[[[94,430,309,417],270,842],[[476,430,322,417],645,842],[[871,430,311,420],1038,844]],rogue:[[[123,849,260,394],250,1234],[[509,847,269,396],645,1234],[[898,849,281,394],1038,1234]]};
function draw(c,e,x,y,height=40){
 const frames=rows[e.kind];if(!frames||!image.complete||!image.naturalWidth)return false;
 const [rect,ax,ay]=frames[(e.pose||0)%3],[sx,sy,w,h]=rect,scale=height/(e.kind==='keeper'?428:e.kind==='merchant'?412:385);
 c.drawImage(image,sx,sy,w,h,x+(sx-ax)*scale,y+(sy-ay)*scale,w*scale,h*scale);return true;
}
window.AshenNPCArt={draw,rows,ready:()=>image.complete&&image.naturalWidth>0};
})();
