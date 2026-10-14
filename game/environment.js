/* Continuous world materials. Map tiles remain the sole authority for collision. */
(function(){
'use strict';
const T=24;let caches=new WeakMap();
const art={},decorations=new WeakMap();
for(const name of ['ancient_oak','woodland_ground','havenmere_gate']){
 const image=new Image();image.onload=()=>{art[name]=image;caches=new WeakMap()};image.src='assets/environment_v3/'+name+'.png';
}
for(const name of ['cobblestone','gravel','rock','cliff','oak','pine','willow','snag','fallen_log','ferns','brambles','heather','bridge']){const image=new Image();image.onload=()=>{art[name]=image;caches=new WeakMap()};image.src='assets/overhaul/'+name+'.png'}
const outdoors=new Set(['town','wild','camp']);
const roads=new Set(['path','plaza','townGate','cryptGate','bridge','fountain']);
const surfaces=new Set(['grass','grass2','forest','mountain','water','path','plaza','townGate','cryptGate','bridge','building','door','fence','fountain']);
const noise=(x,y,s=0)=>{const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)};
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function material(c,w,h,loc){
 c.fillStyle=loc==='camp'?'#34493c':loc==='town'?'#3c5943':'#304b40';c.fillRect(0,0,w,h);
 if(art.woodland_ground){
  const texture=document.createElement('canvas');texture.width=texture.height=512;texture.getContext('2d').drawImage(art.woodland_ground,0,0,512,512);
  c.save();c.globalAlpha=.72;c.fillStyle=c.createPattern(texture,'repeat');c.fillRect(0,0,w,h);c.restore();
 }
 // Large overlapping tonal fields span dozens of cells; no individual tile borders.
 for(let y=-100;y<h+100;y+=90)for(let x=-100;x<w+100;x+=90){
  const px=x+noise(x,y)*70,py=y+noise(x,y,2)*70,r=75+noise(x,y,3)*75;
  const g=c.createRadialGradient(px,py,0,px,py,r);
  g.addColorStop(0,noise(x,y,4)>.5?'#93a27028':'#071d252e');g.addColorStop(1,'#273b3000');c.fillStyle=g;c.fillRect(px-r,py-r,r*2,r*2);
 }
 for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){
  const n=noise(x,y,6);if(n<.75)continue;c.fillStyle=n>.7?'#c1b68b19':n<.3?'#0b25252c':'#64865b20';
  c.fillRect(x+noise(x,y,8)*3,y+noise(x,y,7)*3,.4+n*.7,.4+n*.5);
 }
}
function paintRoad(c,m,loc){
 if(loc==='wild'&&m.id==='wild'){
  c.save();c.lineJoin='round';c.lineCap='round';
  c.beginPath();
  for(let x=5.5*T;x<=20.5*T;x+=3){const y=(17+Math.sin((x/T-5.5)/15*Math.PI)*2)*T;if(x===5.5*T)c.moveTo(x,y);else c.lineTo(x,y)}
  c.lineTo(24.5*T,17*T);c.bezierCurveTo(26*T,18*T,24.3*T,21*T,25*T,23*T);
  c.bezierCurveTo(29*T,23.8*T,33*T,22.2*T,37.5*T,23*T);c.lineTo(42.5*T,23.5*T);
  c.strokeStyle='#4d5843';c.lineWidth=54;c.stroke();
  c.strokeStyle='#89775b';c.lineWidth=44;
  if(art.gravel){const texture=document.createElement('canvas');texture.width=texture.height=96;texture.getContext('2d').drawImage(art.gravel,0,0,96,96);c.strokeStyle=c.createPattern(texture,'repeat')}
  c.stroke();c.strokeStyle='#c5b18b18';c.lineWidth=28;c.stroke();c.restore();return;
 }
 c.save();c.beginPath();
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)if(roads.has(m.tiles[y][x])){
  const top=roads.has(m.tiles[y-1]?.[x]),bottom=roads.has(m.tiles[y+1]?.[x]),left=roads.has(m.tiles[y]?.[x-1]),right=roads.has(m.tiles[y]?.[x+1]);
  c.roundRect(x*T,y*T,T,T,[!top&&!left?5:0,!top&&!right?5:0,!bottom&&!right?5:0,!bottom&&!left?5:0]);
 }
 c.clip();c.fillStyle=loc==='town'?'#817965':loc==='camp'?'#665841':'#817357';c.fillRect(0,0,m.w*T,m.h*T);
 for(let y=0;y<m.h*T;y+=3)for(let x=0;x<m.w*T;x+=4){const n=noise(x,y,15);c.fillStyle=n>.5?'#d6c79c24':'#302d242f';ellipse(c,x+n*3,y+noise(x,y,16)*3,.5+n*1.5,.4+n*.6,c.fillStyle)}
 const surface=art[loc==='town'?'cobblestone':'gravel'];
 if(surface){const texture=document.createElement('canvas');texture.width=texture.height=96;texture.getContext('2d').drawImage(surface,0,0,96,96);c.fillStyle=c.createPattern(texture,'repeat');c.fillRect(0,0,m.w*T,m.h*T)}
 if(loc==='town'&&!surface){
  // World-aligned paving, independent of the navigation grid.
  c.lineWidth=.65;c.strokeStyle='#272c2c66';
  for(let y=0;y<m.h*T;y+=13){c.beginPath();c.moveTo(0,y);c.lineTo(m.w*T,y);c.stroke();for(let x=(y/13%2)*16;x<m.w*T;x+=32){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+13);c.stroke()}}
 }else if(!surface){
  c.strokeStyle='#322c2828';c.lineWidth=1;
  for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)if(roads.has(m.tiles[y][x])&&roads.has(m.tiles[y]?.[x+1])){
   for(const offset of [8,16]){c.beginPath();c.moveTo(x*T,y*T+offset);c.lineTo((x+1)*T+1,y*T+offset);c.stroke()}
  }
 }
 c.restore();
 // Soft verge stays inside road cells, preserving readable collision boundaries.
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
  if(!roads.has(m.tiles[y][x]))continue;
  for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
   const adjacent=m.tiles[y+dy]?.[x+dx];if(!['grass','grass2','forest'].includes(adjacent))continue;
   const sx=x*T,sy=y*T,vertical=dx!==0;
   const a=vertical?(dx<0?sx:sx+T):(dy<0?sy:sy+T),b=a-(dx+dy)*5;
   const g=vertical?c.createLinearGradient(a,0,b,0):c.createLinearGradient(0,a,0,b);
   g.addColorStop(0,'#365340b0');g.addColorStop(1,'#36534000');c.fillStyle=g;
   c.fillRect(vertical?Math.min(a,b):sx,vertical?sy:Math.min(a,b),vertical?5:T,vertical?T:5);
   // Uneven worn verges gently wander within each still-walkable corridor.
   c.fillStyle='#354d3e';c.beginPath();for(let k=0;k<=T;k+=2){const variation=3+2*Math.sin((vertical?sy+k:sx+k)/21)+noise(x,y,k)*2;const u=vertical?a-(dx*variation):sx+k,v=vertical?sy+k:a-(dy*variation);if(k===0)c.moveTo(u,v);else c.lineTo(u,v)}c.lineTo(vertical?a:sx+T,vertical?sy+T:a);c.lineTo(vertical?a:sx,vertical?sy:a);c.closePath();c.fill();
  }
 }
}
function paintRiver(c,m){
 if(m.id==='wild'){
  // A continuous curve follows the channel's cell centers. All blocked water centers
  // remain under water; traversable neighboring centers remain on dry banks.
  c.save();c.lineJoin='round';c.lineCap='round';c.beginPath();
  for(let y=-24;y<=29*T-24;y+=3){const x=(21.5+Math.sin((y/T-16)/7)*3)*T;if(y===-24)c.moveTo(x,y);else c.lineTo(x,y)}
  c.strokeStyle='#526b50';c.lineWidth=87;c.stroke();c.strokeStyle='#a6a17a';c.lineWidth=78;c.stroke();c.strokeStyle='#244f5d';c.lineWidth=71;c.stroke();
  c.strokeStyle='#183d4b';c.lineWidth=49;c.stroke();
  for(const offset of [-19,-7,10,22]){c.beginPath();for(let y=-24;y<=29*T-24;y+=3){const x=(21.5+Math.sin((y/T-16)/7)*3)*T+offset+Math.sin(y/18+offset)*1.8;if(y===-24)c.moveTo(x,y);else c.lineTo(x,y)}c.strokeStyle='#a1c8c51b';c.lineWidth=.8;c.stroke()}
  c.restore();
 }else for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)if(m.tiles[y][x]==='water'){
  const sx=x*T,sy=y*T;c.fillStyle='#193d49';c.fillRect(sx,sy,T,T);
  for(let i=0;i<6;i++){c.strokeStyle=i%2?'#78a5aa18':'#092d392a';c.lineWidth=1;c.beginPath();c.moveTo(sx+i*4,sy);c.bezierCurveTo(sx+i*4+3,sy+8,sx+i*4-3,sy+16,sx+i*4,sy+T);c.stroke()}
  for(const dx of [-1,1])if(m.tiles[y]?.[x+dx]!=='water'){
   const edge=sx+(dx>0?T:0),g=c.createLinearGradient(edge,0,edge-dx*8,0);
   c.fillStyle='#8d9475';c.beginPath();for(let k=0;k<=T;k+=2){const bend=4+3*Math.sin((sy+k)/38)+noise(x,y,k)*2;const px=edge-dx*bend;if(k===0)c.moveTo(px,sy+k);else c.lineTo(px,sy+k)}c.lineTo(edge,sy+T);c.lineTo(edge,sy);c.closePath();c.fill();
   g.addColorStop(0,'#b5ba947a');g.addColorStop(.3,'#5b7d6970');g.addColorStop(1,'#193d4900');c.fillStyle=g;c.fillRect(edge-(dx>0?8:0),sy,8,T);
  }
 }
 // One continuous deck across the existing crossing, including its path approach.
 if(m.tiles[16]?.[21]==='bridge'){
  const x=20*T,y=16*T,w=4*T,h=2*T;
  if(art.bridge){c.drawImage(art.bridge,x-5,y-15,w+10,h+24);return}
  c.fillStyle='#101d2590';c.fillRect(x-3,y+4,w+6,h);
  c.fillStyle='#685843';c.fillRect(x,y,w,h);
  for(let px=x;px<x+w;px+=7){c.fillStyle='#b4a17b';c.fillRect(px+1,y,5,h);c.fillStyle='#443c32';c.fillRect(px,y,1,h)}
  for(const yy of [y+1,y+h-3]){c.fillStyle='#342e28';c.fillRect(x-4,yy,w+8,3);c.fillStyle='#b4a583';c.fillRect(x-4,yy,w+8,1);for(let px=x;px<=x+w;px+=24){c.fillStyle='#433a2e';c.fillRect(px-2,yy-3,4,7)}}
 }
}
function paintVegetation(c,m){
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
  const tile=m.tiles[y][x],sx=x*T,sy=y*T;
  if(tile==='forest'){
   if(art.ferns&&noise(x,y,53)>.4)c.drawImage(art.ferns,sx+1,sy+7,18,16);
   if(art.brambles&&noise(x,y,54)>.86)c.drawImage(art.brambles,sx+6,sy+5,21,19);
   // Forest tiles are walkable: low fern clusters leave their centers open.
   for(let i=0;i<3;i++){
    const px=sx+3+noise(x,y,i)*18,py=sy+3+noise(y,x,i+8)*18;
    ellipse(c,px+2,py+2,5,2,'#091f2445');
    for(let j=-2;j<=2;j++){c.strokeStyle=j%2?'#6f896457':'#8b9e7170';c.lineWidth=.8;c.beginPath();c.moveTo(px,py+3);c.quadraticCurveTo(px+j*1.5,py-2,px+j*3,py-3+Math.abs(j));c.stroke()}
   }
  }
  if(['grass','grass2'].includes(tile)&&art.heather&&noise(x,y,55)>.96)c.drawImage(art.heather,sx+1,sy+13,18,11);
  if(tile==='mountain'){
   ellipse(c,sx+12,sy+17,15,8,'#142a2c55');
   const g=c.createLinearGradient(sx,sy,sx+T,sy+T);g.addColorStop(0,'#78837b');g.addColorStop(.45,'#4d605d');g.addColorStop(1,'#203436');
   c.fillStyle=g;c.beginPath();c.moveTo(sx,sy+T);c.lineTo(sx+noise(x,y)*6,sy+7);c.lineTo(sx+12,sy+2);c.lineTo(sx+T,sy+8);c.lineTo(sx+T,sy+T);c.fill();
   c.strokeStyle='#b8bbaa35';c.beginPath();c.moveTo(sx+2,sy+8);c.lineTo(sx+12,sy+3);c.lineTo(sx+22,sy+9);c.stroke();
  }
 }
}
function build(m,loc){
 const canvas=document.createElement('canvas');canvas.width=m.w*T*2;canvas.height=m.h*T*2;
 const c=canvas.getContext('2d');c.scale(2,2);material(c,m.w*T,m.h*T,loc);paintRoad(c,m,loc);paintRiver(c,m);paintVegetation(c,m);
 if(art.rock){c.save();c.beginPath();for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)if(m.tiles[y][x]==='mountain')c.rect(x*T,y*T,T,T);c.clip();const texture=document.createElement('canvas');texture.width=texture.height=160;texture.getContext('2d').drawImage(art.rock,0,0,160,160);c.fillStyle=c.createPattern(texture,'repeat');c.fillRect(0,0,m.w*T,m.h*T);
 if(art.cliff)for(let y=0;y<m.h;y+=2)for(let x=0;x<m.w;x+=2)if(m.tiles[y][x]==='mountain'){const w=55+noise(x,y)*30,h=w*.85;c.drawImage(art.cliff,x*T-w*.2,y*T-h*.15,w,h)}c.restore()}
 return canvas;
}
function draw(c,m,loc,sx,sy,w,h){
 if(!outdoors.has(loc))return false;
 let canvas=caches.get(m);if(!canvas){canvas=build(m,loc);caches.set(m,canvas)}
 const cw=Math.min(w,m.w*T-sx),ch=Math.min(h,m.h*T-sy);
 c.drawImage(canvas,sx*2,sy*2,cw*2,ch*2,0,0,cw,ch);return true;
}
function animate(c,m,loc,sx,sy,w,h,tick){
 if(!outdoors.has(loc))return;
 c.save();
 // River glints flow in world coordinates rather than resetting at tile borders.
 if(loc==='wild')for(let i=0;i<28;i++){
  const y=(noise(i,2)*m.h*T+tick*.13)%(m.h*T),row=m.tiles[Math.floor(y/T)],first=row.findIndex(tile=>tile==='water'),last=row.lastIndexOf('water'),x=(first+.2+noise(i,1)*Math.max(0,last-first+.6))*T;
  if(m.tiles[Math.floor(y/T)]?.[Math.floor(x/T)]!=='water'||x<sx||x>sx+w||y<sy||y>sy+h)continue;
  c.strokeStyle=`rgba(174,205,201,${.08+Math.sin(tick/35+i)*.04})`;c.lineWidth=.65;c.beginPath();c.moveTo(x-sx,y-sy);c.quadraticCurveTo(x-sx+2,y-sy+3,x-sx,y-sy+7);c.stroke();
 }
 // Slow sheets of mist are sparse and translucent; no random gameplay RNG calls.
 if(loc==='wild')for(let i=0;i<5;i++){
  const x=(noise(i,21)*m.w*T+tick*.025)%(m.w*T),y=noise(i,22)*m.h*T;
  if(x+100<sx||x-100>sx+w||y+25<sy||y-25>sy+h)continue;
  const g=c.createRadialGradient(x-sx,y-sy,1,x-sx,y-sy,95);g.addColorStop(0,'#c4d1c607');g.addColorStop(1,'#c4d1c600');c.fillStyle=g;c.save();c.translate(0,(y-sy)*.75);c.scale(1,.25);c.fillRect(x-sx-95,y-sy-95,190,190);c.restore();
 }
 c.restore();
}

function getDecorations(m,loc){
 if(!outdoors.has(loc))return [];
 let list=decorations.get(m);if(list)return list;
 list=[];
 if(loc==='wild')for(let y=2;y<m.h-2;y++)for(let x=2;x<m.w-2;x++){
  if(m.tiles[y][x]!=='forest'||noise(x,y,32)<.64)continue;
  let nearRoad=false;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(roads.has(m.tiles[y+dy]?.[x+dx]))nearRoad=true;
  if(!nearRoad)list.push({type:'landscape',x:x+.12,y:y+.15,height:43+noise(x,y,33)*12,...(noise(x,y,35)>.9?{prop:'fallen_log'}:{})});
 }
 decorations.set(m,list);return list;
}
function tree(c,x,y,height=52,alpha=1){
 if(!art.ancient_oak)return false;
 c.save();c.globalAlpha=alpha;
 ellipse(c,x+7,y+1,height*.34,height*.09,'#081b2360');
 const options=['oak','pine','willow','snag'];const chosen=options[Math.floor(noise(x,y,71)*options.length)];const image=art[chosen]||art.ancient_oak,width=height*image.naturalWidth/image.naturalHeight;
 c.drawImage(image,x-width/2,y-height,width,height);c.restore();return true;
}
function gate(c,x,y){
 if(!art.havenmere_gate)return false;
 ellipse(c,x+3,y-9,64,11,'#0b20244a');
 c.drawImage(art.havenmere_gate,x-75,y-106,150,100);return true;
}
window.AshenEnvironment={draw,animate,tree,gate,getDecorations,handles:tile=>surfaces.has(tile),noise};
})();
