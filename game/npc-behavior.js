/* Lightweight deterministic NPC routines. Simulation owns paths; rendering only reads. */
(function(){
'use strict';
const definitions={
 tavern:[{id:'wayfarer-traveler',kind:'visitor',role:'Rogue',name:'Wayfarer Traveler',spawn:[8,12],route:[[10,10],[11,6],[11,9],[8,12]],hours:[7,23],exit:true}],
 town:[{id:'market-guard',kind:'patrol',role:'Fighter',name:'Havenmere Watch',spawn:[15,14],route:[[18,14],[18,16],[15,16],[15,14]],hours:[0,24]}],
 inn:[{id:'inn-traveler',kind:'visitor',role:'Cleric',name:'Resting Traveler',spawn:[8,12],route:[[9,6],[10,9],[8,12]],hours:[7,22],exit:true}]
};
let roster=[],scene=null,elapsed=0,accumulator=0,respawn=0;
function findPath(start,goal,passable,w,h){
 if(start.x===goal.x&&start.y===goal.y)return [];
 if(!passable(goal.x,goal.y))return [];
 const queue=[start],parents=new Map([[start.x+','+start.y,null]]);
 for(let i=0;i<queue.length&&i<w*h;i++){const p=queue[i];for(const [dx,dy]of[[0,1],[1,0],[0,-1],[-1,0]]){const x=p.x+dx,y=p.y+dy,key=x+','+y;if(x<0||y<0||x>=w||y>=h||parents.has(key)||!passable(x,y))continue;parents.set(key,p);const next={x,y};if(x===goal.x&&y===goal.y){const path=[next];let prev=p;while(prev.x!==start.x||prev.y!==start.y){path.unshift(prev);prev=parents.get(prev.x+','+prev.y)}return path}queue.push(next)}}
 return [];
}
function enter(loc){if(scene===loc)return;scene=loc;roster=[];accumulator=0;respawn=0}
function update(loc,dt,{clock,player,map,walkable},active=true){
 enter(loc);if(!active)return;const delta=Math.max(0,Math.min(250,dt));elapsed+=delta;accumulator+=delta;if(accumulator<220)return;accumulator=0;
 const hour=clock.minutes/60;
 for(const d of definitions[loc]||[]){
  if(roster.some(e=>e.id===d.id)||elapsed<respawn||hour<d.hours[0]||hour>=d.hours[1])continue;
  if(Math.abs(player.x-d.spawn[0])+Math.abs(player.y-d.spawn[1])<=2||!walkable(d.spawn[0],d.spawn[1]))continue;
  roster.push({...d,x:d.spawn[0],y:d.spawn[1],dir:'up',state:'walking',index:0,path:[],wait:0,ambient:true,hero:{id:d.id,role:d.role,ancestry:'Human',appearance:'male',hp:1,gear:{}}});
 }
 const occupied=(x,y,self)=>roster.some(e=>e!==self&&(e.x===x&&e.y===y||e.previous&&elapsed-e.movedAt<180&&e.previous.x===x&&e.previous.y===y));
 for(const e of roster){
  if(elapsed<e.wait){e.state=e.conversing?'conversing':e.index===2?'conversing':'idle';continue}e.conversing=false;
  if(hour<e.hours[0]||hour>=e.hours[1]){if(e.exit)e.index=e.route.length-1}
  const goal=e.route[e.index],pass=(x,y)=>!(player.x===x&&player.y===y)&&!(player.visualX===x&&player.visualY===y)&&!occupied(x,y,e)&&walkable(x,y);
  if(e.x===goal[0]&&e.y===goal[1]){
   if(e.exit&&e.index===e.route.length-1){e.gone=true;respawn=elapsed+18000;continue}
   e.state=e.index===1?'working':'idle';e.index=(e.index+1)%e.route.length;e.wait=elapsed+3500;continue;
  }
  // Replan one short route at a time; player occupancy may invalidate the next cell.
  if(!e.path.length||!pass(e.path[0].x,e.path[0].y))e.path=findPath(e,{x:goal[0],y:goal[1]},pass,map.w,map.h);
  const next=e.path.shift();if(!next){e.state='idle';continue}
  e.previous={x:e.x,y:e.y};e.movedAt=elapsed;e.dir=next.x>e.x?'right':next.x<e.x?'left':next.y>e.y?'down':'up';e.x=next.x;e.y=next.y;e.state='walking';
 }
 roster=roster.filter(e=>!e.gone);
}
function entities(loc){return loc===scene?roster:[]}
function blocks(loc,x,y){return loc===scene&&roster.some(e=>e.x===x&&e.y===y||e.previous&&elapsed-e.movedAt<180&&e.previous.x===x&&e.previous.y===y)}
function talk(id){const e=roster.find(e=>e.id===id);if(e){e.path=[];e.wait=elapsed+4000;e.conversing=true;e.state='conversing'}}
function decorate(list,clock,now){return list.map(e=>{const seconds=now/1000;if(e.kind==='keeper')return {...e,state:clock.minutes>=480&&clock.minutes<1380?'working':'idle',pose:Math.floor(seconds/2)%3};if(e.seated)return {...e,state:Math.floor(seconds/5)%3===1?'drinking':'sitting',pose:Math.floor(seconds/3)%3};return {...e,state:'idle'}})}
window.AshenNPCs={definitions,findPath,update,entities,blocks,talk,decorate,clear:()=>{scene=null;roster=[]},inspect:()=>({scene,count:roster.length,elapsed})};
})();
