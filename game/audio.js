/* Gesture-gated playback, independent music/effect levels and bounded crossfades. */
(function(){
'use strict';
const KEY='ashen-realms-audio-v1';let settings={music:.55,effects:.7};
try{const stored=JSON.parse(localStorage.getItem(KEY));for(const key of ['music','effects'])if(Number.isFinite(stored?.[key])&&stored[key]>=0&&stored[key]<=1)settings[key]=stored[key]}catch(e){}
const nodes=new Set();let current=null,theme='',fade=null;
function configure(key,value){if(!['music','effects'].includes(key)||!Number.isFinite(value))return;settings[key]=Math.min(1,Math.max(0,value));try{localStorage.setItem(KEY,JSON.stringify(settings))}catch(e){}if(current)current.volume=settings.music*.65}
function stop(){clearInterval(fade);fade=null;for(const node of nodes){node.pause();node.removeAttribute('src');node.load()}nodes.clear();current=null;theme=''}
function play(key){
 if(key===theme&&current){if(current.paused)current.play().catch(()=>{});return current}
 clearInterval(fade);fade=null;
 // Rapid map changes retain at most one outgoing track.
 for(const node of nodes)if(node!==current){node.pause();node.removeAttribute('src');node.load();nodes.delete(node)}
 const previous=current,startVolume=previous?.volume||0;
 const next=new Audio('assets/audio/overhaul/'+key+'.wav');next.loop=true;next.preload='auto';next.volume=0;nodes.add(next);current=next;theme=key;
 next.play().catch(()=>{});const started=performance.now();
 fade=setInterval(()=>{const t=Math.min(1,(performance.now()-started)/1300);next.volume=settings.music*.65*t;if(previous)previous.volume=startVolume*(1-t);if(t===1){clearInterval(fade);fade=null;if(previous){previous.pause();previous.removeAttribute('src');previous.load();nodes.delete(previous)}}},50);
 return next;
}
window.AshenAudio={play,stop,configure,preferences:()=>({...settings}),debug:()=>({theme,active:nodes.size,volume:current?.volume||0,paused:current?.paused??true})};
})();
