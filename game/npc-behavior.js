/* Lightweight deterministic NPC routines. Simulation owns paths; rendering only reads. */
(function(){
'use strict';
const definitions={
 tavern:[{id:'wayfarer-traveler',kind:'visitor',role:'Rogue',name:'Wayfarer Traveler',spawn:[8,12],route:[{at:[10,10],action:'idle',duration:1500},{at:[11,6],action:'working',duration:4000},{at:[15,9],seat:[14,9],action:'drinking',duration:9000},{at:[8,12],action:'exit'}],hours:[7,23],exit:true}],
 inn:[{id:'inn-traveler',kind:'visitor',role:'Cleric',name:'Resting Traveler',spawn:[8,12],route:[{at:[9,6],action:'conversing',duration:3500},{at:[8,10],seat:[7,10],action:'drinking',duration:9000},{at:[8,12],action:'exit'}],hours:[7,22],exit:true}],
 town:[
  {id:'market-guard',kind:'patrol',role:'Fighter',name:'Havenmere Watch',spawn:[15,14],route:[[18,14],[18,16],[15,16],[15,14]],hours:[0,24]},
  {id:'north-lane-traveler',kind:'visitor',role:'Rogue',name:'North Lane Traveler',spawn:[6,5],route:[{at:[13,9],action:'idle'},{at:[14,11],action:'conversing'},{at:[6,5],action:'exit'}],hours:[7,20],exit:true},
  {id:'lantern-row-traveler',kind:'visitor',role:'Cleric',name:'Lantern Row Traveler',spawn:[24,11],route:[{at:[16,13],action:'idle'},{at:[18,13],action:'conversing'},{at:[24,11],action:'exit'}],hours:[8,22],exit:true},
  {id:'south-lane-resident',kind:'visitor',role:'Fighter',name:'South Lane Resident',spawn:[6,19],route:[{at:[17,19],action:'idle'},{at:[18,20],action:'idle'},{at:[6,19],action:'exit'}],hours:[9,19],exit:true}
 ]
};
let roster=[],scene=null,elapsed=0,accumulator=0,checkingActor=null;
const respawn=new Map();
function findPath(start,goal,passable,w,h){
 if(start.x===goal.x&&start.y===goal.y)return [];
 if(!passable(goal.x,goal.y))return [];
 const queue=[start],parents=new Map([[start.x+','+start.y,null]]);
 for(let i=0;i<queue.length&&i<w*h;i++){const p=queue[i];for(const [dx,dy]of[[0,1],[1,0],[0,-1],[-1,0]]){const x=p.x+dx,y=p.y+dy,key=x+','+y;if(x<0||y<0||x>=w||y>=h||parents.has(key)||!passable(x,y))continue;parents.set(key,p);const next={x,y};if(x===goal.x&&y===goal.y){const path=[next];let prev=p;while(prev.x!==start.x||prev.y!==start.y){path.unshift(prev);prev=parents.get(prev.x+','+prev.y)}return path}queue.push(next)}}
 return [];
}

function enter(loc){if(scene===loc)return;scene=loc;roster=[];accumulator=0;respawn.clear()}
function waypoint(e){const p=e.route[e.index];return Array.isArray(p)?{at:p,action:'idle',duration:3500}:p}
function occupies(e,x,y){return e.x===x&&e.y===y||e.seated&&e.stand.x===x&&e.stand.y===y||e.previous&&elapsed-e.movedAt<180&&e.previous.x===x&&e.previous.y===y}
function update(loc,dt,{clock,player,map,walkable},active=true){
 enter(loc);if(!active)return;const delta=Math.max(0,Math.min(250,Number(dt)||0));elapsed+=delta;accumulator+=delta;if(accumulator<220)return;accumulator=0;
 const hour=clock.minutes/60;
 const playerAt=(x,y)=>player.x===x&&player.y===y||player.visualX===x&&player.visualY===y;
 const occupied=(x,y,self)=>roster.some(e=>e!==self&&occupies(e,x,y));
 const floor=(x,y,self)=>{const previous=checkingActor;checkingActor=self;try{return walkable(x,y)}finally{checkingActor=previous}};
 for(const d of definitions[loc]||[]){
  if(roster.some(e=>e.id===d.id)||elapsed<(respawn.get(d.id)||0)||hour<d.hours[0]||hour>=d.hours[1])continue;
  if(Math.abs(player.x-d.spawn[0])+Math.abs(player.y-d.spawn[1])<=2||occupied(...d.spawn)||!floor(...d.spawn,null))continue;
  roster.push({...d,x:d.spawn[0],y:d.spawn[1],dir:'up',state:'walking',index:0,path:[],wait:0,ambient:true,hero:{id:d.id,role:d.role,ancestry:'Human',appearance:'male',hp:1,gear:{}}});
 }
 for(const e of roster){
  const pass=(x,y)=>!playerAt(x,y)&&!occupied(x,y,e)&&floor(x,y,e);
  if(e.exit&&(hour<e.hours[0]||hour>=e.hours[1])&&!e.departing){e.departing=true;e.index=e.route.length-1;e.path=[];e.wait=0;e.conversing=false}
  if(e.seated){
   if(elapsed<e.wait){e.state=e.conversing?'conversing':e.seatAction;continue}
   if(!pass(e.stand.x,e.stand.y))continue;
   const stand=e.stand;e.previous={x:e.x,y:e.y};e.movedAt=elapsed;e.x=stand.x;e.y=stand.y;e.seated=false;delete e.stand;e.path=[];e.state='idle';continue;
  }
  if(elapsed<e.wait){e.state=e.conversing?'conversing':e.activity;continue}e.conversing=false;
  const goal=waypoint(e);
  if(e.x===goal.at[0]&&e.y===goal.at[1]){
   if(goal.action==='exit'||e.exit&&e.index===e.route.length-1){e.gone=true;respawn.set(e.id,elapsed+18000);continue}
   if(goal.seat){
    const [x,y]=goal.seat;
    if(playerAt(x,y)||occupied(x,y,e)){e.state='idle';continue}
    e.stand={x:e.x,y:e.y};e.x=x;e.y=y;e.seated=true;e.dir='down';e.seatAction=goal.action||'sitting';
   }
   e.activity=goal.action||'idle';e.state=e.activity;e.index=(e.index+1)%e.route.length;e.path=[];e.wait=elapsed+(goal.duration??3500);continue;
  }
  // Replan against both gameplay cells and short-lived visual movement reservations.
  if(!e.path.length||!pass(e.path[0].x,e.path[0].y))e.path=findPath(e,{x:goal.at[0],y:goal.at[1]},pass,map.w,map.h);
  const next=e.path.shift();if(!next){e.state='idle';continue}
  e.previous={x:e.x,y:e.y};e.movedAt=elapsed;e.dir=next.x>e.x?'right':next.x<e.x?'left':next.y>e.y?'down':'up';e.x=next.x;e.y=next.y;e.state='walking';
 }
 roster=roster.filter(e=>!e.gone);
}
function entities(loc){return loc===scene?roster:[]}
function blocks(loc,x,y){return loc===scene&&roster.some(e=>e!==checkingActor&&occupies(e,x,y))}
function talk(id){const e=roster.find(e=>e.id===id);if(e&&!e.departing){e.path=[];e.wait=elapsed+4000;e.conversing=true;e.state='conversing'}}
function decorate(list,clock,now){return list.map(e=>{const seconds=now/1000;if(e.kind==='keeper')return {...e,state:clock.minutes>=480&&clock.minutes<1380?'working':'idle',pose:Math.floor(seconds/2)%3};if(e.seated)return {...e,state:Math.floor(seconds/5)%3===1?'drinking':'sitting',pose:Math.floor(seconds/3)%3};return {...e,state:'idle'}})}
window.AshenNPCs={definitions,findPath,update,entities,blocks,talk,decorate,clear:()=>{scene=null;roster=[];respawn.clear();checkingActor=null},inspect:()=>({scene,count:roster.length,elapsed})};
})();
