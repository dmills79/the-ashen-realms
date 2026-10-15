/* Presentation-only finite states and motion. Gameplay coordinates remain integers. */
(function(){
'use strict';
const actors=new Map(),STEP_MS=160;
function snap(id,x,y,direction='down',now=0){
 const value={x,y,fromX:x,fromY:y,toX:x,toY:y,direction,start:now,duration:0,distance:0,baseDistance:0,action:null};
 actors.delete(id);actors.set(id,value);if(actors.size>256)actors.delete(actors.keys().next().value);return value;
}
function at(e,now){const p=e.duration?Math.max(0,Math.min(1,(now-e.start)/e.duration)):1;return {x:e.fromX+(e.toX-e.fromX)*p,y:e.fromY+(e.toY-e.fromY)*p,p}}
function move(id,x,y,direction,now){
 let e=actors.get(id);if(!e)return snap(id,x,y,direction,now);
 const previous=at(e,now),distance=Math.hypot(x-e.toX,y-e.toY);
 if(distance>1.5||!Number.isFinite(distance))return snap(id,x,y,direction,now);
 if(distance===0){e.direction=direction;return e}
 e.baseDistance+=e.distance*previous.p;e.distance=Math.hypot(x-previous.x,y-previous.y);
 e.fromX=previous.x;e.fromY=previous.y;e.toX=x;e.toY=y;e.start=now;e.duration=STEP_MS;e.direction=direction;return e;
}
function sample(id,x,y,direction='down',now=0){
 let e=actors.get(id);if(!e)e=snap(id,x,y,direction,now);
 if(x!==e.toX||y!==e.toY)e=move(id,x,y,direction,now);else e.direction=direction;
 const p=at(e,now),walking=p.p<1;
 if(e.action&&e.action.state!=='death'&&now-e.action.start>=e.action.duration)e.action=null;
 const state=e.action?.state||(walking?'walk':'idle');
 return {x:p.x,y:p.y,state,direction:e.direction,walking,gait:(e.baseDistance+e.distance*p.p)*2,time:e.action?Math.max(0,now-e.action.start):now-e.start,velocity:walking?e.distance*24/(STEP_MS/1000):0};
}
function transition(id,state,now,duration=380){const e=actors.get(id);if(e)e.action={state,start:now,duration}}
const timing=()=>({duration:850,impact:480,finish:900});
function phase(elapsed,kind){const t=timing(kind);return {preparing:elapsed<170,projectile:Math.max(0,Math.min(1,(elapsed-170)/(t.impact-170))),impact:elapsed>=t.impact,recovering:elapsed>=650,done:elapsed>=t.finish,progress:Math.max(0,Math.min(1,elapsed/t.duration))}}
window.AshenAnimation={snap,move,sample,transition,timing,phase,clear:()=>actors.clear(),size:()=>actors.size};
})();
