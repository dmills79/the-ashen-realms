/* Painted dungeon structure follows existing wall cells; it never creates collision. */
(function(){
'use strict';
const T=24,HEIGHT=35,SIDE_WIDTH=22,lists=new WeakMap(),atlas=new Image(),vertical=new Image();let artRevision=0;
// The wall body excludes transparent end padding and posts at tile joins.
const sources={north:[90,680,630,223],rubble:[1140,640,390,320]};
for(const [image,file] of [[atlas,'structural_atlas.png'],[vertical,'masonry_vertical.png']]){image.decoding='async';image.onload=()=>artRevision++;image.src='assets/living_world/'+file}
const decoded=image=>!!(image.complete&&image.naturalWidth>0),ready=()=>decoded(atlas)&&decoded(vertical);
function forScene(map){
 if(!map?.tiles)return [];
 if(lists.has(map))return lists.get(map);
 const props=[],wall=(x,y)=>map.tiles[y]?.[x]==='wall',floor=(x,y)=>{const tile=map.tiles[y]?.[x];return tile!==undefined&&tile!=='wall'};
 const add=(face,x,y,width,height,footprints,extra={})=>{
  props.push({type:'sceneProp',masonry:true,id:'masonry-'+face+'-'+x+'-'+y,face,x,y,depth:y+1,bounds:[x,y+1-height/T,width/T,height/T],footprints,...extra});
 };
 for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){
  if(!wall(x,y)||!floor(x,y+1))continue;
  const start=x;while(x+1<map.w&&wall(x+1,y)&&floor(x+1,y+1))x++;
  add('north',start,y,(x-start+1)*T,HEIGHT,[[start,y,x-start+1,1]]);
 }
 // Find vertical physical runs once, then give each floor row its own source
 // window and depth. Adjacent rows continue the painting instead of restarting it.
 for(let x=0;x<map.w;x++)for(let y=0;y<map.h;y++){
  const faceAt=yy=>{if(!wall(x,yy)||floor(x,yy+1))return null;const left=floor(x-1,yy),right=floor(x+1,yy);return left?'west':right?'east':null};
  const orientation=faceAt(y);if(!orientation)continue;
  const start=y;while(y+1<map.h&&faceAt(y+1)===orientation)y++;
  const rows=y-start+1,runId=x+':'+start+':'+orientation;
  for(let row=0;row<rows;row++)add('side',x+(T-SIDE_WIDTH)/(2*T),start+row,SIDE_WIDTH,T,[[x,start+row,1,1]],{runId,runHeight:rows*T,sourceOffset:row*T,mirror:orientation==='east'});
  if((x*7+start*11)%9===0){const h=12,w=h*sources.rubble[2]/sources.rubble[3];add('rubble',x+(T-w)/(2*T),start,w,h,[[x,start,1,1]])}
 }
 lists.set(map,props);return props;
}
function draw(c,p,sx,sy){
 if(!ready())return false;
 const [x,y,w,h]=p.bounds;
 if(p.face==='side'){
  // Actual PNG is 887x1773. Alpha bounds are [327,51,228,1671]; the
  // continuous body [335,190,215,1270] excludes terminal coping/end posts.
  const rx=vertical.naturalWidth*335/887,ry=vertical.naturalHeight*190/1773,rw=vertical.naturalWidth*215/887,rh=vertical.naturalHeight*1270/1773;
  const width=w*T,sourceScale=width/rw,period=rh*sourceScale;
  let remaining=h*T,offset=p.sourceOffset,destY=y*T-sy;
  c.save();if(p.mirror){c.translate((x+w)*T-sx,0);c.scale(-1,1)}
  while(remaining>.001){const local=offset%period,length=Math.min(remaining,period-local);c.drawImage(vertical,rx,ry+local/sourceScale,rw,length/sourceScale,p.mirror?0:x*T-sx,destY,width,length);remaining-=length;offset+=length;destY+=length}
  c.restore();return true;
 }
 const [rx,ry,rw,rh]=sources[p.face],ax=atlas.naturalWidth/1536,ay=atlas.naturalHeight/1024;
 const height=h*T,segmentWidth=height*rw/rh,total=w*T;
 for(let offset=0;offset<total-.001;offset+=segmentWidth){
  const width=Math.min(segmentWidth,total-offset),sourceWidth=width/segmentWidth*rw;
  c.drawImage(atlas,rx*ax,ry*ay,sourceWidth*ax,rh*ay,x*T-sx+offset,y*T-sy,width,height);
 }
 return true;
}
window.AshenMasonry={forScene,draw,ready,revision:()=>artRevision};
})();
