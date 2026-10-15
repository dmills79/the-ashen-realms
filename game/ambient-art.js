/* Measured identity-matched action poses; directional walking stays in identity.js. */
(function(){
'use strict';
let manifest=null,requested=false,image=null,imageSource=null;
function registry(){
 if(window.AshenAmbientManifest)return window.AshenAmbientManifest;
 if(!requested){requested=true;const request=window.fetch||globalThis.fetch;if(request)request('assets/living_world/ambient_manifest.json').then(response=>response.ok?response.json():null).then(value=>{manifest=value}).catch(()=>{})}
 return manifest;
}
function drawAmbient(c,e,x,y,{time=0,height=40}={}){
 const hero=e.hero||e,role=e.role||hero.role;
 if((hero.ancestry&&hero.ancestry!=='Human')||(hero.appearance&&hero.appearance!=='male')||!['Rogue','Cleric'].includes(role)||e.state==='walking')return false;
 const action=e.seated?(e.state==='drinking'?'seatedDrink':e.state==='conversing'?'seatedConverse':'seatedIdle'):e.state==='working'?'serve':e.state==='drinking'?'drink':e.state==='conversing'?'converse':null;
 if(!action)return false;
 const data=registry();if(!data)return false;
 const selected=data.poses?.[role]?.[action];
 if(Number.isInteger(selected)){
  if(!data.frames?.[selected])return false;
  return window.AshenCharacterMotion?.drawAsset(c,data,x,y,{frame:selected,height,shadow:false,tag:'ambient',action,time})||false;
 }
 const explicit=selected,row=data.frames?.[action]?.row,col=data.columnsByRole?.[role];
 if(!explicit&&(!Number.isInteger(row)||!Number.isInteger(col)))return false;
 const source=data.src||'assets/living_world/ambient_poses.png';if(imageSource!==source){image=new Image();image.decoding='async';image.src=source;imageSource=source}
 if(!image.complete||!image.naturalWidth)return false;
 const sw=image.naturalWidth/(data.columns||2),sh=image.naturalHeight/(data.rows||6);
 const rect=explicit?.rect||[col*sw,row*sh,sw,sh],anchor=explicit?.anchor||data.anchors?.[role]?.[row],referenceHeight=explicit?.referenceHeight||data.referenceHeight;
 const ax=Array.isArray(anchor)?anchor[0]:anchor?.x,ay=Array.isArray(anchor)?anchor[1]:anchor?.y;
 if(!rect.every(Number.isFinite)||!Number.isFinite(ax)||!Number.isFinite(ay)||!Number.isFinite(referenceHeight)||referenceHeight<=0)return false;
 const [sx,sy,w,h]=rect,scale=height/referenceHeight;c.drawImage(image,sx,sy,w,h,x+(sx-ax)*scale,y+(sy-ay)*scale,w*scale,h*scale);return true;
}
window.AshenAmbientArt={drawAmbient,draw:drawAmbient};
})();
