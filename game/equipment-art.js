/* Inventory-selected original weapon PNGs, anchored to the actual pose hand. */
(function(){
'use strict';
const lengths={iron:.4,ashblade:.44,runestaff:.82,oakbow:.6};
let manifest=null,request=null,image=null,imageSource=null,wanted=false;
function load(data){if(!data?.src)return null;if(imageSource!==data.src){image=new Image();image.decoding='async';image.src=data.src;imageSource=data.src}return image.complete&&image.naturalWidth>0?image:null}
function registry(){
 if(window.AshenEquipmentManifest)manifest=window.AshenEquipmentManifest;
 if(!manifest&&!request&&typeof fetch==='function')request=fetch('assets/living_world/equipment_manifest.json').then(r=>r.ok?r.json():null).then(data=>{manifest=data;if(wanted)load(data)}).catch(()=>{});
 return manifest;
}
function prepare(heroes=[]){if(!heroes.some(h=>Object.hasOwn(lengths,h.gear?.weapon)))return;wanted=true;const data=registry();if(data)load(data)}
function draw(ctx,hero,x,y,{height=44,direction='down',pose='idle',time=0,gait=0,hand,angle}={}){
 const weapon=hero?.gear?.weapon;if(!Object.hasOwn(lengths,weapon)||weapon==='oakbow'&&pose==='rangedrelease')return false;
 const data=registry(),item=data?.items?.[weapon];if(!item)return false;const source=load(data);if(!source)return false;
 const [sx,sy,w,h]=item.rect||[],[gx,gy]=item.grip||[],reference=item.referenceLength;
 if(![sx,sy,w,h,gx,gy,reference,height,x,y].every(Number.isFinite)||reference<=0||w<=0||h<=0)return false;
 const side=direction==='left'||direction==='up'?-1:1,grip=hand||{x:x+side*height*.13,y:y-height*.43};
 if(!Number.isFinite(grip.x)||!Number.isFinite(grip.y))return false;
 const rotation=Number.isFinite(angle)?angle:direction==='left'?-.12:direction==='right'?.12:0,scale=height*lengths[weapon]/reference;
 ctx.save();ctx.translate(grip.x,grip.y);ctx.rotate(rotation);ctx.drawImage(source,sx,sy,w,h,(sx-gx)*scale,(sy-gy)*scale,w*scale,h*scale);ctx.restore();return true;
}
window.AshenEquipment={draw,prepare};
})();
