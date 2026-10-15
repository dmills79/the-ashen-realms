/* Saved game-time service. Advance only from simulation updates, never rendering calls. */
(function(){
'use strict';
function legacy(steps){const p=((Number(steps)||0)%480+480)%480;return p<240?360+p*3:p<360?1080+(p-240)*1.5:p<440?(1260+(p-360)*6)%1440:300+(p-440)*1.5}
function normalize(value,steps=0){
 if(value==null)return {minutes:legacy(steps),day:1,rate:2};
 if(typeof value!=='object'||!Number.isFinite(value.minutes)||value.minutes<0||value.minutes>=1440||!Number.isSafeInteger(value.day)||value.day<1||!Number.isFinite(value.rate)||value.rate<0||value.rate>60)throw Error('Invalid world clock');
 return {minutes:value.minutes,day:value.day,rate:value.rate};
}
function advance(clock,elapsed,active=true){if(!active||!clock)return;const delta=Math.max(0,Math.min(1000,Number(elapsed)||0))*clock.rate/1000,total=clock.minutes+delta;clock.day+=Math.floor(total/1440);clock.minutes=total%1440}
function read(clock){
 const minutes=clock?.minutes??540;let phase,blend=0;
 if(minutes>=300&&minutes<420){phase='dawn';blend=(minutes-300)/120}
 else if(minutes>=420&&minutes<720)phase='morning';
 else if(minutes>=720&&minutes<1080)phase='afternoon';
 else if(minutes>=1080&&minutes<1200){phase='dusk';blend=(minutes-1080)/120}
 else phase='night';
 const ambient=phase==='night'?.26:phase==='dawn'?.26*(1-blend):phase==='dusk'?.26*blend:0;
 return {phase,blend,ambient,hour:Math.floor(minutes/60),label:String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(Math.floor(minutes%60)).padStart(2,'0')};
}
function battleLighting(clock){const t=read(clock);if(t.phase==='dawn')return {from:'night',to:'day',blend:t.blend};if(t.phase==='dusk')return t.blend<.5?{from:'day',to:'evening',blend:t.blend*2}:{from:'evening',to:'night',blend:(t.blend-.5)*2};return {from:t.phase==='night'?'night':'day',to:t.phase==='night'?'night':'day',blend:0}}
function world(value,steps=0){
 if(value==null)return {clock:normalize(null,steps),objects:{}};
 if(typeof value!=='object'||Array.isArray(value))throw Error('Invalid world state');
 const objects=value.objects??{};if(typeof objects!=='object'||objects===null||Array.isArray(objects))throw Error('Invalid object state');
 return {...value,clock:normalize(value.clock,steps),objects};
}
window.AshenWorldTime={normalize,advance,read,battleLighting,world};
})();
