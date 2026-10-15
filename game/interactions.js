/* Scene-local interactions and saved object flags; no inventory or quest rules live here. */
(function(){
'use strict';
const image=new Image();image.decoding='async';image.src='assets/living_world/interaction_atlas.png';
const art={gateClosed:[30,100,630,350],gateOpen:[675,10,195,440],chestClosed:[1000,128,500,323],chestOpen:[45,495,480,470],lantern:[640,470,270,520],notice:[1056,480,451,510]};
const extras={tavern:[
 {id:'service-gate',scene:'tavern',kind:'gate',name:'Service Gate',cell:[11,5],anchor:[11,6],open:true},
 {id:'linen-chest',scene:'tavern',kind:'container',name:'Linen Chest',cell:[13,11],anchor:[13,10]},
 {id:'hearth',scene:'tavern',kind:'hearth',name:'Stone Hearth',cell:[14,3],anchor:[14,4]},
 {id:'notice',scene:'tavern',kind:'note',name:'Wayfarer Notices',cell:[3,2],anchor:[3,3],text:'Keep the passage to the hearth clear. Return empty tankards to the bar. Travelers may rest by the fire.'}
]};
const cache=new Map(),key=o=>o.scene+':'+o.id;
const state=(o,world)=>world?.objects?.[key(o)]||{};
const isOpen=(o,world)=>state(o,world).open??o.open??false;
function blocked(o,world){return o.kind==='gate'?!isOpen(o,world):o.kind==='container'}
function seatApproach(loc,x,y,w){const scene=window.AshenInteriors?.scenes[loc];const solids=[...(scene?.walls||[]),...(scene?.props||[]).map(p=>p.footprint)];return [[x+w,y],[x-1,y],[x+w-1,y+1],[x+w-1,y-1]].find(([ax,ay])=>ax>0&&ax<17&&ay>=3&&ay<13&&!solids.some(([px,py,pw,ph])=>ax>=px&&ax<px+pw&&ay>=py&&ay<py+ph))||[x+w,y]}
function forScene(loc){if(cache.has(loc))return cache.get(loc);const list=[...(extras[loc]||[])];for(const p of window.AshenInteriors?.scenes[loc]?.props||[]){
 const [x,y,w]=p.footprint;const seat=['bench','chair'].includes(p.sprite)&&!p.id.includes('west-chair')&&!p.id.includes('east-chair');
 list.push({id:p.id,scene:loc,kind:seat?'seat':'inspect',name:seat?(p.sprite==='bench'?'Wooden Bench':'Wooden Chair'):p.sprite==='bar'?'Bar Counter':p.sprite.includes('table')||p.sprite==='gaming'?'Wooden Table':p.sprite,cell:[x+w-1,y],anchor:seat?seatApproach(loc,x,y,w):[x-1,y],text:'Handcrafted '+p.sprite+' with worn edges, old joinery and the marks of everyday use.'});
 }cache.set(loc,list);return list}
function nearby(loc,x,y,dx,dy,world){return forScene(loc).map(o=>{const [ax,ay]=o.anchor;return {object:o,d:Math.abs(ax-x)+Math.abs(ay-y),f:ax===x+dx&&ay===y+dy}}).filter(v=>v.d<=1).sort((a,b)=>Number(b.f)-Number(a.f)||a.d-b.d)[0]?.object||null}
function perform(o,world,player,occupied=()=>false){
 world.objects??={};const old=state(o,world),next={...old,discovered:true};
 if(o.kind==='gate'){const closing=isOpen(o,world);if(closing&&(player.x===o.cell[0]&&player.y===o.cell[1]||occupied(...o.cell)))return {blocked:true,text:'The passage is occupied.'};next.open=!closing;world.objects[key(o)]=next;return {text:next.open?'You open the service gate.':'You close the service gate.'}}
 if(o.kind==='seat'){if(old.occupied||occupied(...o.cell))return {blocked:true,text:'That seat is occupied.'};next.occupied=true;next.occupiedBy='player';world.seat={scene:o.scene,object:o.id,stand:{x:player.x,y:player.y},cell:{x:o.cell[0],y:o.cell[1]}};world.objects[key(o)]=next;return {seated:true,text:'You sit. E or movement to stand.'}}
 if(o.kind==='container'){next.open=!old.open;next.looted=true;world.objects[key(o)]=next;return {inspect:true,text:next.open?'Folded wool blankets and clean linens fill the chest. These belong to the tavern; you leave them in place.':'You close the linen chest.'}}
 if(o.kind==='hearth'){next.active=true;next.stokedAt=(world.clock?.day||1)*1440+(world.clock?.minutes||0)}
 world.objects[key(o)]=next;return {inspect:true,text:o.text||(o.kind==='hearth'?'You settle a split log among the glowing embers. Warmth gathers around the stone hearth.':'The workmanship speaks of years of ordinary life.')}
}
function stand(world){if(!world?.seat)return;const k=world.seat.scene+':'+world.seat.object;if(world.objects[k])world.objects[k]={...world.objects[k],occupied:false,occupiedBy:null};delete world.seat}
function blocks(loc,x,y,world){return forScene(loc).some(o=>o.cell?.[0]===x&&o.cell?.[1]===y&&blocked(o,world))}
function validate(world){
 for(const [k,v]of Object.entries(world.objects||{})){if(k.length>120||k.includes('__proto__')||!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid object state');for(const f of ['open','active','occupied','looted','discovered'])if(v[f]!==undefined&&typeof v[f]!=='boolean')throw Error('Invalid object flags');if(v.occupiedBy!==undefined&&v.occupiedBy!==null&&v.occupiedBy!=='player')throw Error('Invalid object occupant');if(v.stokedAt!==undefined&&(!Number.isFinite(v.stokedAt)||v.stokedAt<0))throw Error('Invalid object time')}
 if(world.seat){const s=world.seat;if(!['tavern','inn','hall','smith','chapel','cottage','bakery','town','wild','crypt','camp'].includes(s.scene)||typeof s.object!=='string'||![s.stand?.x,s.stand?.y,s.cell?.x,s.cell?.y].every(n=>Number.isInteger(n)&&n>=0&&n<64))throw Error('Invalid seat state')}return world;
}
function props(loc,world){if(loc!=='tavern')return [];return extras.tavern.filter(o=>['gate','container','note'].includes(o.kind)).map(o=>{const open=isOpen(o,world),bounds=o.kind==='gate'?(open?[10.85,4.6,.55,1.3]:[11,5.2,1,.7]):o.kind==='container'?(open?[12.75,10.1,1.5,1.5]:[12.75,10.6,1.5,1]):[2.5,.55,1,1.2];return {type:'interactiveProp',x:bounds[0],y:o.kind==='note'?1.75:o.kind==='gate'?5.95:11.6,object:o,bounds,frame:o.kind==='gate'?(open?'gateOpen':'gateClosed'):o.kind==='container'?(open?'chestOpen':'chestClosed'):'notice'}})}
function draw(c,p,sx,sy){if(!image.complete||!image.naturalWidth)return;const[x,y,w,h]=p.bounds;c.drawImage(image,...art[p.frame],x*24-sx,y*24-sy,w*24,h*24)}
function hint(o,world){return 'E · '+(o.kind==='gate'?(isOpen(o,world)?'CLOSE ':'OPEN '):o.kind==='seat'?'SIT · ':o.kind==='container'?(isOpen(o,world)?'CLOSE ':'OPEN '):'INSPECT · ')+o.name.toUpperCase()}
window.AshenInteractions={extras,state,blocked,blocks,forScene,nearby,perform,stand,validate,props,draw,hint,art};
})();
