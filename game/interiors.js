/* Authored interior scenes. Art bounds, floor footprints and interaction anchors
   are independent: a tall backrest must not block the tile behind its artwork. */
(function(){
'use strict';
const T=24;
const sprites={bar:[8,54,463,247],table:[476,74,354,228],chair:[869,54,150,247],bench:[1075,121,365,170],barrel:[88,337,240,331],crates:[417,355,317,318],bed:[791,307,268,385],anvil:[1107,362,318,329],forge:[8,673,378,373],workbench:[393,787,390,255],altar:[781,682,357,358],bookcase:[1168,684,263,361]};
// Bounds in tiles; footprint [x,y,width,height] is the occupied floor only.
const prop=(id,sprite,x,y,w,h,footprint,depth=y+h)=>({id,sprite,bounds:[x,y,w,h],footprint,depth});
const tradeSprites={bakeryCounter:[8,165,702,393],kneading:[726,136,515,420],gaming:[104,642,466,483],reception:[650,670,578,438]};
Object.assign(sprites,tradeSprites);
const scenes={
 tavern:{background:'tavern',walls:[],foreground:.84,props:[
  prop('bar','bar',4,4.35,7,2.2,[4,4,7,2],6),
  prop('west-chair','chair',4,6.1,1,1.65,[4,6,1,1],6.8),
  prop('west-table','table',3,7.35,3,1.9,[3,7,3,2],8.8),
  prop('west-bench','bench',3,9.3,3,1.25,[3,9,3,1],10),
  prop('east-chair','chair',13,6.1,1,1.65,[13,6,1,1],6.8),
  prop('east-table','table',12,7.35,3,1.9,[12,7,3,2],8.8),
  prop('east-bench','bench',12,9.3,3,1.25,[12,9,3,1],10),
  prop('south-table','gaming',3,10,2.7,1.85,[3,10,3,2],11.85),
  prop('south-chair','chair',2,10.5,1,1.5,[2,11,1,1],11.9),
  prop('ale','barrel',14.4,4.2,1.2,1.65,[15,5,1,1],5.8),
  prop('stores','crates',14.4,10.7,1.7,1.7,[15,11,1,1],12)
 ],lights:[[14.7,3,60,.045],[4.7,8,25,.025],[13.7,8,25,.025]]},
 hall:{background:0,walls:[],props:[
  prop('records-west','bookcase',3,4.6,1.6,2.3,[3,6,2,1],6.8),
  prop('records-east','bookcase',13.5,3.3,1.6,2.3,[14,5,1,1],5.8),
  prop('council-west','bench',3,9,3,1.3,[3,9,3,1]),
  prop('council-east','bench',12,9,3,1.3,[12,9,3,1])
 ],lights:[]},
 smith:{background:1,walls:[[13,3,4,2],[1,3,3,1]],props:[
  prop('forge','forge',13.2,2.2,3.2,3.7,[13,3,4,2],5.9),
  prop('tools','workbench',4,4.7,3,2,[4,5,3,2]),
  prop('anvil','anvil',12,6.4,1.6,1.8,[12,7,2,1]),
  prop('stock','crates',3,9.7,2,2,[3,10,2,2]),
  prop('quench','barrel',14.5,8.5,1.2,1.7,[15,9,1,1])
 ],lights:[[15,4,70,.055]]},
 inn:{background:2,walls:[[1,4,4,1],[13,4,4,1],[1,7,4,1],[13,7,4,1],[5,4,1,2],[12,4,1,2],[5,7,1,2],[12,7,1,2]],props:[
  prop('bed-nw','bed',2.5,4.8,1.6,2,[3,5,1,1]),
  prop('bed-ne','bed',13.5,4.8,1.6,2,[14,5,1,1]),
  prop('bed-sw','bed',2.5,8,1.6,2,[3,8,1,2]),
  prop('bed-se','bed',13.5,8,1.6,2,[14,8,1,2]),
  prop('communal','table',6,8.5,2.3,1.5,[6,9,2,1]),
  prop('communal-bench','bench',6,10,2.3,1,[6,10,2,1])
 ],lights:[]},
 chapel:{background:3,walls:[[1,4,2,2],[15,4,2,2],[1,9,1,2],[16,9,1,2]],props:[
  prop('altar','altar',7,3.5,3,2.4,[7,5,3,1],5.8),
  ...[8,10].flatMap(y=>[3,12].map(x=>prop('pew-'+x+'-'+y,'bench',x,y,3,1.2,[x,y,3,1])))
 ],lights:[[8.5,4.5,35,.025]]},
 cottage:{background:4,walls:[[1,4,5,1],[1,5,2,4],[13,3,3,1]],props:[
  prop('bed','bed',13,7.7,2,2.8,[13,8,2,3]),
  prop('supper','table',7,7.5,3,1.9,[7,8,3,1]),
  prop('chair','chair',6,7.4,1,1.5,[6,8,1,1]),
  prop('family-bench','bench',7,9.5,3,1.2,[7,10,3,1]),
  prop('winter-stores','crates',3,10.4,1.8,1.8,[3,11,2,1])
 ],lights:[[2,6.5,55,.045]]},
 bakery:{background:5,walls:[[13,3,4,2],[1,3,3,1]],props:[
  prop('kneading','kneading',4,7.7,3,1.9,[4,8,3,2]),
  prop('counter','bakeryCounter',6,4.6,5,1.75,[6,5,5,1],6),
  prop('flour','crates',3,4,1.8,1.8,[3,5,2,1]),
  prop('grain','barrel',14.5,10.2,1.2,1.7,[15,11,1,1])
 ],lights:[[15,4,65,.045]]}
};
// Measured transparent content rectangles in the 1536x1024 structural atlas.
const structureRects={timberHorizontal:[20,190,760,300],timberVertical:[869,27,92,502],column:[1210,45,230,490],stoneWall:[20,650,770,280],stoneCorner:[810,590,340,380],rubble:[1140,640,390,320]};
// Only actual partitions/columns leave the shell. Forge/oven reservations and
// the cottage boundary hearth remain authored artwork, not generic wall modules.
const structuralFootprints={inn:scenes.inn.walls,cottage:[scenes.cottage.walls[0]],chapel:scenes.chapel.walls};
const structures={};
for(const [loc,scene] of Object.entries(scenes)){
 scene.loc=loc;
 structures[loc]=(structuralFootprints[loc]||[]).flatMap(([x,y,w,h],i)=>{
  if(loc==='chapel'){
   const p=prop('column-'+i,'column',x,y-1.5,w,h+1.5,[x,y,w,h],y+h);
   p.structural=true;return [p];
  }
  // Side walls sort one floor row at a time: actors can pass on either side.
  const vertical=h>w,rows=vertical?h:1;
  return Array.from({length:rows},(_,row)=>{
   const yy=y+row,hh=vertical?1:h;
   const sprite=vertical?'timberVertical':'timberHorizontal';
   const top=vertical&&row>0?yy:yy-1,drawHeight=vertical&&row>0?hh:hh+1;
   const p=prop('structure-'+i+'-'+row,sprite,x,top,w,drawHeight,[x,yy,w,hh],yy+hh);
   // Slice a single complete partition through independent floor-depth bands.
   // Only the first band includes its raised northern silhouette.
   if(vertical)p.sourceSlice=[row===0?0:(row+1)/(h+1),drawHeight/(h+1)];
   p.structural=true;return p;
  });
 });
}
const images={};
for(const [key,file] of Object.entries({tavern:'tavern_shell.png',architecture:'architecture_atlas.png',furniture:'furniture_atlas.png',trade:'trade_atlas.png'})){
 const image=new Image();image.decoding='async';image.src='assets/interiors_v2/'+file;images[key]=image;
}
for(const loc of ['hall','smith','inn','chapel','cottage','bakery']){
 const image=new Image();image.decoding='async';image.onload=()=>refreshDrawLists();image.src='assets/living_world/room_'+loc+'.png';images['room_'+loc]=image;
}
{const image=new Image();image.decoding='async';image.onload=()=>refreshDrawLists();image.src='assets/living_world/structural_atlas.png';images.structural=image}
const ready=image=>image?.complete&&image.naturalWidth>0;
function configure(map){
 const scene=scenes[map.id];if(!scene)return;
 for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++)map.tiles[y][x]=x===0||x===map.w-1||y<3||y>=map.h-2?'insideWall':(['hall','smith','chapel','bakery'].includes(map.id)?'stoneFloor':'woodFloor');
 const block=([x,y,w,h])=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)map.tiles[yy][xx]='rack'};
 scene.walls.forEach(block);scene.props.forEach(p=>block(p.footprint));
 map.tiles[13][8]='exitDoor';map.tiles[12][8]='woodFloor';
}
function upgraded(scene){return !!(ready(images['room_'+scene.loc])&&ready(images.structural))}
function source(scene){
 if(upgraded(scene)){const image=images['room_'+scene.loc];return {image,x:0,y:0,w:image.naturalWidth,h:image.naturalHeight}}
 const image=images[typeof scene.background==='number'?'architecture':'tavern'];
 if(!ready(image))return null;
 if(scene.background==='tavern')return {image,x:0,y:0,w:image.naturalWidth,h:image.naturalHeight};
 const w=image.naturalWidth/3,h=image.naturalHeight/2;
 return {image,x:(scene.background%3)*w,y:Math.floor(scene.background/3)*h,w,h};
}
function background(c,map,loc,sx,sy){
 const scene=scenes[loc];if(!scene)return false;
 const s=source(scene);if(s)c.drawImage(s.image,s.x,s.y,s.w,s.h,-sx,-sy,map.w*T,map.h*T);
 return true;
}
const drawLists=new Map();
function getProps(loc){
 const scene=scenes[loc],state=!!scene&&upgraded(scene);let list=drawLists.get(loc);
 if(!list){list=[];drawLists.set(loc,list)}
 if(list.upgraded!==state){list.splice(0,list.length,...[...(scene?.props||[]),...(state?structures[loc]:[])].map(p=>({type:'interiorProp',x:p.bounds[0],y:p.depth,prop:p})));list.upgraded=state}
 return list;
}
function refreshDrawLists(){for(const loc of drawLists.keys())getProps(loc)}
function drawProp(c,prop,sx,sy){
 if(prop.structural){
  const image=images.structural;if(!ready(image))return;
  const [rx,ry,rw,rh]=structureRects[prop.sprite],scaleX=image.naturalWidth/1536,scaleY=image.naturalHeight/1024,[x,y,w,h]=prop.bounds;
  const [start,fraction]=prop.sourceSlice||[0,1];
  c.drawImage(image,rx*scaleX,(ry+rh*start)*scaleY,rw*scaleX,rh*fraction*scaleY,x*T-sx,y*T-sy,w*T,h*T);return;
 }
 const image=images[Object.hasOwn(tradeSprites,prop.sprite)?'trade':'furniture'];
 if(!ready(image))return;
 const [x,y,w,h]=prop.bounds;
 c.drawImage(image,...sprites[prop.sprite],x*T-sx,y*T-sy,w*T,h*T);
}
function foreground(c,map,loc,sx,sy){
 const scene=scenes[loc],s=scene&&source(scene);if(!s)return;
 // Only opaque south-wall wings are replayed; the open door remains unobstructed.
 const top=scene.foreground||.9;
 for(const [left,width] of [[0,.4],[.6,.4]])c.drawImage(s.image,s.x+s.w*left,s.y+s.h*top,s.w*width,s.h*(1-top),map.w*T*left-sx,map.h*T*top-sy,map.w*T*width,map.h*T*(1-top));
}
function lights(c,loc,sx,sy,tick){
 const scene=scenes[loc];if(!scene)return;
 c.save();c.globalCompositeOperation='screen';
 for(const [x,y,r,power] of scene.lights){
  const px=x*T-sx,py=y*T-sy,pulse=1+.08*Math.sin(tick/19+x);
  const g=c.createRadialGradient(px,py,0,px,py,r);
  g.addColorStop(0,`rgba(255,174,75,${power*pulse})`);g.addColorStop(1,'rgba(255,174,75,0)');
  c.fillStyle=g;c.fillRect(px-r,py-r,r*2,r*2);
 }
 c.restore();
}
window.AshenInteriors={scenes,sprites,configure,background,getProps,drawProp,foreground,lights,has:loc=>!!scenes[loc],ready:()=>[images.tavern,images.architecture,images.furniture,images.trade].every(ready)};
})();
