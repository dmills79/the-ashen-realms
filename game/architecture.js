/* Town silhouettes, props and their independent floor footprints share actor depth. */
(function(){
'use strict';
const T=24,lists=new WeakMap(),fallbacks=new Map();
const routes=new Set(['path','plaza','bridge','door','exitDoor','townGate','cryptGate']);
const seed=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+71*74.7)*43758.5453;return n-Math.floor(n)};
function forScene(map,loc){
 if(loc!=='town'||!map)return [];
 if(lists.has(map))return lists.get(map);
 const list=(map.buildings||[]).map((b,i)=>({type:'sceneProp',architecture:true,id:'building-'+i,x:b.x,y:b.y+b.h,depth:b.y+b.h,bounds:[b.x,b.y,b.w,b.h],building:b,footprints:[]}));
 const add=(id,sprite,x,y,width,height=null,solid=false,legacy=false)=>{
  const h=height||width*2,footprint=[Math.floor(x),Math.floor(y),1,1];
  const tile=map.tiles?.[footprint[1]]?.[footprint[0]],entry=(map.buildings||[]).some(b=>footprint[0]===b.doorX&&Math.abs(footprint[1]-b.doorY)<=1);
  const safe=legacy||!routes.has(tile)&&!entry&&!(footprint[0]===28&&footprint[1]===16);
  list.push({type:'sceneProp',architecture:true,id,x,y:y+1,depth:y+1,propSprite:sprite,width,height,variant:seed(x,y),bounds:[x+.5-width/48,y+1-h/24,width/24,h/24],footprints:solid&&safe?[footprint]:[]});
 };
 const props=map.props||{};
 for(const [group,sprite,width,height,solid,legacy] of [
  ['lamps','lantern',18,null,true,false],['cart','wagon',42,null,true,true],['crates','crates',20,null,true,false],['benches','bench',29,null,true,false],['flowerbeds','flowers',30,null,false,false],['hedges','fence',28,null,false,false],['trees','tree',56,56,true,true],['market','market',55,43,true,true],['well','barrels',28,null,true,true],['banners','banner',28,48,false,false],['veggie','flowers',25,null,false,false]
 ])for(const [i,[x,y]] of (props[group]||[]).entries())add(group+'-'+i,sprite,x,y,width,height,solid,legacy);
 if(map.w&&map.h){
  add('town-fountain','fountain',19.5,16,63,53);
  add('forge-horse','horse',8.5,9,42);
  add('market-dog','dog',17.5,18,20);
  add('cottage-flowers','flowers',7,4.7,25);
  add('town-gate','gate',28,16,150,106);
 }
 lists.set(map,list);return list;
}
function blocks(map,loc,x,y){return forScene(map,loc).some(p=>p.footprints.some(([px,py,w,h])=>x>=px&&x<px+w&&y>=py&&y<py+h))}
function draw(c,p,sx,sy){
 if(!p.building){
  const x=(p.x+.5)*T-sx,y=p.depth*T-sy;
  if(p.propSprite==='tree')return window.AshenEnvironment?.tree(c,x,y,56,1,p.variant)||false;
  if(p.propSprite==='gate')return window.AshenEnvironment?.gate(c,x,y)||false;
  if(p.propSprite==='banner')return window.AshenWorldArt?.draw(c,'banner',x,y,p.width,p.height)||false;
  const drawn=window.AshenPresentation?.piece(c,p.propSprite,x,y,p.width,p.height);
  if(drawn&&p.propSprite==='lantern')window.AshenPresentation?.flame(c,x-3,y-21,3,performance.now());
  return drawn||false;
 }
 const [x,y,w,h]=p.bounds,b=p.building;
 if(window.AshenPresentation?.piece(c,b.room,(x+w/2)*T-sx,(y+h)*T-sy,w*T,h*T)){
  if(['smith','tavern','bakery','cottage'].includes(b.room))window.AshenPresentation.smoke?.(c,(x+w*.7)*T-sx,(y+h*.14)*T-sy,performance.now());
  return true;
 }
 if(!fallbacks.has(b.room)){const image=new Image();image.decoding='async';image.src='assets/havenmere/'+b.room+'.png';fallbacks.set(b.room,image)}
 const image=fallbacks.get(b.room);if(!image.complete||!image.naturalWidth)return false;
 c.drawImage(image,x*T-sx,y*T-sy,w*T,h*T);return true;
}
window.AshenArchitecture={forScene,blocks,draw};
})();
