/* Presentation preferences are deliberately separate from adventure saves. */
(function(){
'use strict';
const KEY='ashen-realms-presentation-v1';
const defaults={sound:true,zoom:.75,motionPaused:false};
let preferences={...defaults};
try{
 const stored=JSON.parse(localStorage.getItem(KEY));
 if(stored&&typeof stored==='object'){
  if(typeof stored.sound==='boolean')preferences.sound=stored.sound;
  if([.75,.9,1.1,1.35].includes(stored.zoom))preferences.zoom=stored.zoom;
  if(typeof stored.motionPaused==='boolean')preferences.motionPaused=stored.motionPaused;
 }
}catch(e){/* Storage restrictions never prevent starting or continuing a game. */}
function apply(){document.documentElement.classList.toggle('title-motion-paused',preferences.motionPaused)}
function save(update){
 preferences={...preferences,...update};apply();
 try{localStorage.setItem(KEY,JSON.stringify(preferences))}catch(e){/* Preferences still work for this session. */}
}
apply();
window.AshenTitle={preferences:()=>({...preferences}),save};
})();
