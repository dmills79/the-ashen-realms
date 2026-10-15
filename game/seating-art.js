/* Human seated poses match the existing appearance registry; other ancestries retain identity. */
(function(){
'use strict';
const images={},roles={Fighter:0,Rogue:1,Wizard:2,Cleric:3};
for(const sex of ['male','female']){const im=new Image();im.decoding='async';im.src='assets/living_world/seated_'+sex+'.png';images[sex]=im}
const anchors={male:[[345,612],[910,612],[345,1217],[910,1217]],female:[[377,608],[887,608],[380,1234],[888,1234]]};
function draw(c,hero,x,y,height=36){if(hero.ancestry!=='Human')return false;const sex=hero.appearance==='female'?'female':'male',im=images[sex],index=roles[hero.role];if(index===undefined||!im.complete||!im.naturalWidth)return false;const w=im.naturalWidth/2,h=im.naturalHeight/2,sx=(index%2)*w,sy=Math.floor(index/2)*h,[ax,ay]=anchors[sex][index],scale=height/590;window.AshenGrounding?.shadow(c,x,y,{width:10,height:2.5});c.drawImage(im,sx,sy,w,h,x+(sx-ax)*scale,y+(sy-ay)*scale,w*scale,h*scale);return true}
window.AshenSeating={draw};
})();
