/* Original four-panel material atlas, sampled once per requested repeat size. */
(function(){
'use strict';
const image=new Image(),patterns=new Map();let version=0;image.decoding='async';image.onload=()=>{version++;patterns.clear()};image.src='assets/living_world/world_materials.png';
const panels={forest:[0,0],trail:[1,0],stream:[0,1],crypt:[1,1]};
function texture(name,size=192){if(!image.complete||!image.naturalWidth||!panels[name])return null;const key=name+':'+size;if(!patterns.has(key)){const tile=document.createElement('canvas');tile.width=tile.height=size;const [x,y]=panels[name],w=image.naturalWidth/2,h=image.naturalHeight/2;tile.getContext('2d').drawImage(image,x*w,y*h,w,h,0,0,size,size);patterns.set(key,tile)}return patterns.get(key)}
window.AshenMaterials={texture,revision:()=>version};
})();
