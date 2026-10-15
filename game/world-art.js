/* Original scenic prop sprites. Alpha padding is included in source cells. */
(function(){
'use strict';
const atlas=new Image();atlas.decoding='async';atlas.src='assets/living_world/world_props.png';
const states=new Image();states.decoding='async';states.src='assets/living_world/world_states.png';
const frames={banner:[0,0],campfire:[1,0],satchel:[2,0],sign:[0,1],seal:[1,1],gate:[2,1]};
function draw(c,name,x,y,w,h){if(['openGate','spentSeal'].includes(name)){if(!states.complete||!states.naturalWidth)return false;const source=name==='openGate'?[60,0,910,887]:[1080,0,630,887];c.drawImage(states,...source,x-w/2,y-h,w,h);return true}if(!atlas.complete||!atlas.naturalWidth||!frames[name])return false;const [col,row]=frames[name],sw=atlas.naturalWidth/3,sh=atlas.naturalHeight/2;c.drawImage(atlas,col*sw,row*sh,sw,sh,x-w/2,y-h,w,h);return true}
function frameFor(e,flags={}){if(e.kind==='gate')return flags.gate?'openGate':'gate';if(['leverA','leverB'].includes(e.kind))return flags[e.kind]?'spentSeal':'seal';if(e.kind==='shrine')return 'seal';return e.kind}
function entity(c,e,x,y,flags){if(e.kind==='satchel')return draw(c,'satchel',x,y,26,27);if(['leverA','leverB','shrine'].includes(e.kind))return draw(c,frameFor(e,flags),x,y,26,36);if(e.kind==='gate')return draw(c,frameFor(e,flags),x,y,38,49);if(e.kind.includes('Chest')){window.AshenInteractions?.draw(c,{frame:'chestClosed',bounds:[(x-14)/24,(y-25)/24,28/24,25/24]},0,0);return true}if(e.kind==='altar'){window.AshenInteriors?.drawProp(c,{sprite:'altar',bounds:[(x-21)/24,(y-38)/24,42/24,38/24]},0,0);return true}return false}
window.AshenWorldArt={draw,entity,frameFor};
})();
