/* Continuous world materials. Map tiles remain the sole authority for collision. */
(function(){
'use strict';
const T=24;let caches=new WeakMap();
const art={},decorations=new WeakMap(),trunks=new WeakMap();let materialRevision=-1;
for(const name of ['ancient_oak','woodland_ground','havenmere_gate']){
 const image=new Image();image.onload=()=>{art[name]=image;caches=new WeakMap()};image.src='assets/environment_v3/'+name+'.png';
}
for(const name of ['cobblestone','gravel','rock','cliff','oak','pine','willow','snag','fallen_log','ferns','brambles','heather','bridge']){const image=new Image();image.onload=()=>{art[name]=image;caches=new WeakMap()};image.src='assets/overhaul/'+name+'.png'}
// Transparent 3x2 atlas: three north-facing strips followed by three NW corners.
// Rotations and feather masks are baked once per decoded atlas, never per frame.
const edgeArt=new Image(),edgeSprites=new Map(),edgePlans=new WeakMap(),contourCache=new WeakMap();
edgeArt.decoding='async';edgeArt.onload=()=>{edgeSprites.clear();caches=new WeakMap()};edgeArt.src='assets/living_world/terrain_edges.png';
const outdoors=new Set(['town','wild','camp']);
const roads=new Set(['path','plaza','townGate','cryptGate','bridge','fountain']);
const surfaces=new Set(['grass','grass2','forest','mountain','water','path','plaza','townGate','cryptGate','bridge','building','door','fence','fountain','barrel','altar','rune','exit']);
const noise=(x,y,s=0)=>{const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)};
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function material(c,w,h,loc){
 c.fillStyle=loc==='camp'?'#34493c':loc==='town'?'#3c5943':'#304b40';c.fillRect(0,0,w,h);
 if(art.woodland_ground){
  const texture=document.createElement('canvas');texture.width=texture.height=512;texture.getContext('2d').drawImage(art.woodland_ground,0,0,512,512);
  c.save();c.globalAlpha=.72;c.fillStyle=c.createPattern(texture,'repeat');c.fillRect(0,0,w,h);c.restore();
 }
 const forest=window.AshenMaterials?.texture('forest',256);if(forest){c.save();c.globalAlpha=loc==='wild'?.9:loc==='camp'?.55:.18;c.fillStyle=c.createPattern(forest,'repeat');c.fillRect(0,0,w,h);c.restore()}
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

// Marching squares samples navigation-cell centers at iso .5. Ambiguous diagonal
// samples remain separate islands, preserving both wet and dry center points.
function contours(m,kind){
 let entries=contourCache.get(m);if(!entries){entries=new Map();contourCache.set(m,entries)}
 if(entries.has(kind))return entries.get(kind);
 const filled=(x,y)=>kind==='water'?['water','bridge'].includes(m.tiles[y]?.[x]):roads.has(m.tiles[y]?.[x]);
 const pairs=[[],[[3,0]],[[0,1]],[[3,1]],[[1,2]],[[3,0],[1,2]],[[0,2]],[[3,2]],[[2,3]],[[2,0]],[[0,1],[2,3]],[[2,1]],[[1,3]],[[1,0]],[[0,3]],[]];
 const segments=[],key=p=>p.x+','+p.y;
 for(let y=-1;y<m.h;y++)for(let x=-1;x<m.w;x++){
  const values=[filled(x,y),filled(x+1,y),filled(x+1,y+1),filled(x,y+1)],code=values.reduce((n,v,i)=>n+(v?1<<i:0),0);
  if(!pairs[code].length)continue;
  const corners=[{x:(x+.5)*T,y:(y+.5)*T},{x:(x+1.5)*T,y:(y+.5)*T},{x:(x+1.5)*T,y:(y+1.5)*T},{x:(x+.5)*T,y:(y+1.5)*T}],edges=[{x:(x+1)*T,y:(y+.5)*T},{x:(x+1.5)*T,y:(y+1)*T},{x:(x+1)*T,y:(y+1.5)*T},{x:(x+.5)*T,y:(y+1)*T}];
  const positive=corners.filter((_,i)=>values[i]);
  for(const [ea,eb] of pairs[code]){
   let a=edges[ea],b=edges[eb];const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const inside=code===5||code===10?positive.reduce((best,p)=>Math.hypot(p.x-middle.x,p.y-middle.y)<Math.hypot(best.x-middle.x,best.y-middle.y)?p:best):{x:positive.reduce((n,p)=>n+p.x,0)/positive.length,y:positive.reduce((n,p)=>n+p.y,0)/positive.length};
   if((b.x-a.x)*(inside.y-a.y)-(b.y-a.y)*(inside.x-a.x)<0)[a,b]=[b,a];
   segments.push({a,b});
  }
 }
 const byStart=new Map(segments.map(s=>[key(s.a),s])),loops=[];
 while(byStart.size){const first=byStart.values().next().value,loop=[],start=key(first.a);let segment=first;
  while(segment){loop.push(segment.a);byStart.delete(key(segment.a));if(key(segment.b)===start)break;segment=byStart.get(key(segment.b));}
  if(loop.length>=3)loops.push(loop);
 }
 entries.set(kind,loops);return loops;
}
function contourPath(c,loops){
 c.beginPath();
 for(const loop of loops){const last=loop[loop.length-1],first=loop[0];c.moveTo((last.x+first.x)/2,(last.y+first.y)/2);
  for(let i=0;i<loop.length;i++){const p=loop[i],next=loop[(i+1)%loop.length];c.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2)}c.closePath();
 }
}
function contourSamples(loop){
 const samples=[];
 for(let i=0;i<loop.length;i++){
  const prev=loop[(i+loop.length-1)%loop.length],p=loop[i],next=loop[(i+1)%loop.length],a={x:(prev.x+p.x)/2,y:(prev.y+p.y)/2},b={x:(p.x+next.x)/2,y:(p.y+next.y)/2};
  for(let n=0;n<6;n++){const t=n/6,u=1-t;samples.push({x:u*u*a.x+2*u*t*p.x+t*t*b.x,y:u*u*a.y+2*u*t*p.y+t*t*b.y})}
 }
 return samples;
}

function paintRoad(c,m,loc){
 c.save();contourPath(c,contours(m,'road'));
 c.clip('evenodd');c.fillStyle=loc==='town'?'#817965':loc==='camp'?'#665841':'#817357';c.fillRect(0,0,m.w*T,m.h*T);
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
}

function paintRiver(c,m){
 c.save();contourPath(c,contours(m,'water'));
 c.clip('evenodd');c.fillStyle='#244f5d';c.fillRect(0,0,m.w*T,m.h*T);
 const water=window.AshenMaterials?.texture('stream',128);if(water){c.fillStyle=c.createPattern(water,'repeat');c.fillRect(0,0,m.w*T,m.h*T)}
 c.restore();
 paintTransitions(c,m,m.id);
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

function transitions(m,loc){
 let byLocation=edgePlans.get(m);if(!byLocation){byLocation=new Map();edgePlans.set(m,byLocation)}
 if(byLocation.has(loc))return byLocation.get(loc);
 const list=[];
 for(const kind of ['road','water'])for(const loop of contours(m,kind)){
  const samples=contourSamples(loop);let gap=0;
  for(let i=0;i<samples.length;i++){
   const a=samples[i],b=samples[(i+1)%samples.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(!length)continue;
   for(let distance=gap;distance<length;distance+=12){
    const t=distance/length,px=a.x+dx*t,py=a.y+dy*t,nx=-dy/length,ny=dx/length;
    const candidates=[];for(let yy=Math.floor(py/T)-1;yy<=Math.floor(py/T)+1;yy++)for(let xx=Math.floor(px/T)-1;xx<=Math.floor(px/T)+1;xx++){
     const tile=m.tiles[yy]?.[xx],matches=kind==='water'?tile==='water':['path','plaza'].includes(tile);if(matches)candidates.push({x:xx,y:yy,d:Math.hypot((xx+.5)*T-(px+nx*5),(yy+.5)*T-(py+ny*5))});
    }
    candidates.sort((p,q)=>p.d-q.d);const owner=candidates[0];if(!owner||owner.d>20)continue;
    if(kind==='road'&&[[0,-1],[1,0],[0,1],[-1,0]].some(([xx,yy])=>['bridge','door','exitDoor','townGate','cryptGate'].includes(m.tiles[owner.y+yy]?.[owner.x+xx])))continue;
    // Dress only a terrain boundary; masonry and bridge contacts stay clean.
    const outside=m.tiles[Math.floor((py-ny*5)/T)]?.[Math.floor((px-nx*5)/T)];
    if(!['grass','grass2','forest'].includes(outside))continue;
    list.push({x:owner.x,y:owner.y,px,py,angle:Math.atan2(dy,dx),cell:kind==='water'?2:loc==='town'?0:1,width:6});
   }
   gap=(gap-length)%12;if(gap<0)gap+=12;
  }
 }
 byLocation.set(loc,list);return list;
}
function edgeSprite(cell){
 if(edgeSprites.has(cell))return edgeSprites.get(cell);
 const canvas=document.createElement('canvas');canvas.width=48;canvas.height=12;
 const g=canvas.getContext('2d'),cw=edgeArt.naturalWidth/3,ch=edgeArt.naturalHeight/2;
 g.drawImage(edgeArt,cell%3*cw,Math.floor(cell/3)*ch,cw,ch,0,0,48,12);
 // Alpha comes from the authored artwork; no opaque band or generated gradient.
 edgeSprites.set(cell,canvas);return canvas;
}
function paintTransitions(c,m,loc){
 if(!edgeArt.complete||!edgeArt.naturalWidth)return;
 c.save();c.globalAlpha=.8;
 for(const p of transitions(m,loc)){c.save();c.translate(p.px,p.py);c.rotate(p.angle);c.drawImage(edgeSprite(p.cell),-12,-3,24,6);c.restore()}
 c.restore();
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
 const revision=window.AshenMaterials?.revision()??0;if(materialRevision!==revision){materialRevision=revision;caches=new WeakMap()}
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
  if(m.tiles[y][x]!=='forest'||noise(x,y,32)<.39)continue;
  let nearRoad=false;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(roads.has(m.tiles[y+dy]?.[x+dx]))nearRoad=true;
  if(!nearRoad)list.push({type:'landscape',x:x+.12,y:y+.15,height:73+noise(x,y,33)*31,variant:noise(x,y,71)});
 }
 decorations.set(m,list);return list;
}
function blocks(m,loc,x,y){if(loc!=='wild')return false;let cells=trunks.get(m);if(!cells){cells=new Set(getDecorations(m,loc).map(p=>Math.floor(p.x)+','+Math.floor(p.y)));trunks.set(m,cells)}return cells.has(x+','+y)}
function tree(c,x,y,height=52,alpha=1,variant=0){
 if(!art.ancient_oak)return false;
 c.save();c.globalAlpha=alpha;
 ellipse(c,x+7,y+1,height*.34,height*.09,'#081b2360');
 const options=['oak','pine','willow','snag'];const chosen=options[Math.min(options.length-1,Math.floor(Math.abs(variant%1)*options.length))];const image=art[chosen]||art.ancient_oak,width=height*image.naturalWidth/image.naturalHeight;
 c.drawImage(image,x-width/2,y-height,width,height);c.restore();return true;
}
function gate(c,x,y){
 if(!art.havenmere_gate)return false;
 ellipse(c,x+3,y-9,64,11,'#0b20244a');
 c.drawImage(art.havenmere_gate,x-75,y-106,150,100);return true;
}
window.AshenEnvironment={draw,animate,tree,gate,getDecorations,blocks,handles:tile=>surfaces.has(tile),noise,transitions,contours};
})();
