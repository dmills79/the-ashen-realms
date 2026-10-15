/* Original identity-matched poses; metadata uses absolute source-pixel foot anchors. */
(function(){
'use strict';
const draws=[],images=new Map(),pending=new Map(),isolatedFrames=new Map(),LIMIT=window.innerWidth>0&&window.innerWidth<700?6:12;
let manifest=window.AshenMotionManifest||null,request=null;
function registry(){
  if(window.AshenMotionManifest){manifest=window.AshenMotionManifest;flushPrepared()}
  if(!manifest&&!request&&typeof fetch==='function')request=fetch('assets/living_world/motion/manifest.json').then(r=>r.ok?r.json():null).then(data=>{manifest=data;flushPrepared()}).catch(()=>{});
  return manifest||{};
}
function key(hero,withRole=true){
  const ancestry=['Human','Elf','Dwarf','Halfling'].includes(hero?.ancestry)?hero.ancestry:'Human';
  const role=['Fighter','Rogue','Wizard','Cleric'].includes(hero?.role)?hero.role:'Fighter';
  return ancestry.toLowerCase()+'_'+(withRole?role.toLowerCase()+'_':'')+(hero?.appearance==='female'?'female':'male');
}
function load(asset){
  if(!asset?.src)return null;
  let image=images.get(asset.src);
  if(image){images.delete(asset.src);images.set(asset.src,image)}else{
    image=new Image();image.decoding='async';images.set(asset.src,image);
    image.src=window.ASHEN_ASSET_DATA?.[asset.src]||asset.src;
    while(images.size>LIMIT){const oldest=images.keys().next().value;const previous=images.get(oldest);images.delete(oldest);if(!previous.complete)previous.src=''}
  }
  return image.complete&&image.naturalWidth>0?image:null;
}
function stature(hero){return hero?.ancestry==='Halfling'?.8:hero?.ancestry==='Dwarf'?.88:1}
function isolatedFrame(asset,index,image){
  const pose=asset.frames[index];if(!pose.exclusions?.length)return null;
  const token=asset.src+':'+index;let canvas=isolatedFrames.get(token);
  if(canvas){isolatedFrames.delete(token);isolatedFrames.set(token,canvas);return canvas}
  if(typeof document==='undefined')return false;
  const [sx,sy,width,height]=pose.rect;canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');if(!context)return false;
  context.drawImage(image,sx,sy,width,height,0,0,width,height);
  context.globalCompositeOperation='destination-out';
  for(const [x,y,length] of pose.exclusions)context.fillRect(x-sx,y-sy,length,1);
  isolatedFrames.set(token,canvas);
  while(isolatedFrames.size>LIMIT*4){const oldest=isolatedFrames.keys().next().value,previous=isolatedFrames.get(oldest);isolatedFrames.delete(oldest);previous.width=previous.height=0}
  return canvas;
}
function drawAsset(ctx,asset,x,y,{frame=0,height=44,alpha=1,shadow=true,hero=null,direction='down',tag=null,action=null,time=0,gait=null}={}){
  const pose=asset?.frames?.[frame];if(!pose)return false;
  const image=load(asset);if(!image)return false;
  const [sx,sy,w,h]=pose.rect||[],[ax,ay]=pose.anchor||[],reference=pose.referenceHeight||asset.referenceHeight;
  if(![sx,sy,w,h,ax,ay,reference,height].every(Number.isFinite)||w<=0||h<=0||reference<=0)return false;
  const isolated=isolatedFrame(asset,frame,image);if(isolated===false)return false;
  const scale=height/reference;
  ctx.save();ctx.globalAlpha*=alpha;
  if(shadow)window.AshenGrounding?.shadow(ctx,x,y,{width:Math.max(3,w*scale*.28),height:Math.max(1.5,height*.055)});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const equipment=()=>{
    if(!hero||action==='death'&&!pose.hand||hero.gear?.weapon==='oakbow'&&action==='rangedrelease')return;
    const hand=pose.hand?{x:x+(pose.hand[0]-ax)*scale,y:y+(pose.hand[1]-ay)*scale}:undefined;
    if(!window.AshenEquipment?.draw(ctx,hero,x,y,{height,direction,pose:action||tag,time,gait,hand,angle:pose.weaponAngle}))window.AshenIdentity?.drawEquipmentFallback(ctx,hero,x,y,{height,width:w*scale,direction,state:action||tag});
  };
  if(direction==='up')equipment();
  ctx.drawImage(isolated||image,isolated?0:sx,isolated?0:sy,w,h,x+(sx-ax)*scale,y+(sy-ay)*scale,w*scale,h*scale);
  if(direction!=='up')equipment();
  ctx.restore();
  if(window.__ASHEN_TEST__){draws.push({src:asset.src,frame,state:action||tag,tag,direction});if(draws.length>128)draws.shift()}
  return true;
}
function flushPrepared(){
  if(!manifest)return;
  for(const {id,kind} of pending.values()){const asset=manifest[kind]?.[id];if(asset)load(asset)}
  pending.clear();
}
function prepare(heroes,kind='walk'){
  window.AshenEquipment?.prepare(heroes);registry();
  for(const hero of (heroes||[]).slice(0,LIMIT)){
    const id=key(hero,kind==='walk'),token=kind+':'+id;
    pending.delete(token);pending.set(token,{id,kind});
    while(pending.size>LIMIT)pending.delete(pending.keys().next().value);
  }
  flushPrepared();
}

function drawWalk(ctx,hero,x,y,{direction='down',height=44,walking=false,time=0,gait=null,shadow=true}={}){
  if(!walking)return false;
  const asset=registry().walk?.[key(hero)],animation=asset?.animations?.[direction];
  if(!animation?.frames?.length)return false;
  const progress=Number.isFinite(gait)?Math.max(0,gait)/2:Math.max(0,time)/(animation.duration||660);
  const index=Math.floor(progress*animation.frames.length)%animation.frames.length;
  return drawAsset(ctx,asset,x,y,{frame:animation.frames[index],height:height*stature(hero),shadow,alpha:hero?.hp===0?.45:1,hero,direction,tag:'walk',time,gait});
}
function actionPose(state,time,kind,duration){
  const timing=window.AshenAnimation?.timing(kind)||{impact:480,duration:850,finish:900};
  if(state==='death')return 'death';
  if(state==='hit'||state==='defend')return time<(duration??380)?state:null;
  if(!['attack','cast','ranged'].includes(state)||time>=timing.finish)return null;
  const ranged=state==='ranged'||kind==='arrow';
  const casting=state==='cast'||(!ranged&&kind&&kind!=='slash'&&kind!=='melee');
  if(ranged)return time<170?'windup':time<650?'rangedrelease':'windup';
  if(casting)return time<170?'castprepare':time<650?'castrelease':'castprepare';
  return time<timing.impact?'windup':time<650?'meleeimpact':'windup';
}
function drawAction(ctx,hero,x,y,{state='idle',time=0,height=110,kind='slash',shadow=true,duration,direction='right'}={}){
  const asset=registry().combat?.[key(hero,false)],pose=actionPose(state,Math.max(0,time),kind,duration);
  const frame=asset?.classes?.[hero?.role||'Fighter']?.[pose];
  if(frame===undefined)return false;
  return drawAsset(ctx,asset,x,y,{frame,height:height*stature(hero),shadow,alpha:hero?.hp===0?.6:1,hero,direction,tag:state,action:pose,time});
}
function drawSeated(ctx,hero,x,y,{height=36,state='idle',time=0,shadow=true}={}){
  const asset=registry().seated?.[key(hero,false)],poses=asset?.classes?.[hero?.role||'Fighter'];
  if(!poses)return false;
  const animation=asset.animations?.[state];
  const frame=animation?.frames?.length?animation.frames[Math.floor(Math.max(0,time)/(animation.duration||1800)*animation.frames.length)%animation.frames.length]:poses[state]??poses.idle;
  return drawAsset(ctx,asset,x,y,{frame,height:height*stature(hero),shadow,tag:'seated',action:state});
}
registry();
window.AshenCharacterMotion=Object.freeze({key,prepare,drawAsset,drawWalk,drawAction,drawSeated,debug:()=>({cached:[...images.keys()],isolated:[...isolatedFrames.keys()],manifest:!!manifest,budget:LIMIT,draws:window.__ASHEN_TEST__?draws.slice():[]})});
})();
