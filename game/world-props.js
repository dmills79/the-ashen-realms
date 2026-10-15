/* Authored scenic footprints and foreground sprites, independent of painted floors. */
(function(){
'use strict';
const crypt=[];
function add(id,sprite,x,y,w,h,footprints){crypt.push({type:'sceneProp',id,sprite,x,y,depth:y+1,bounds:[x+.5-w/48,y+1-h/24,w/24,h/24],footprints})}
for(const [x,y,w] of [[4,6,37],[15,7,36],[4,24,37],[15,24,35]])add('tomb-'+x+'-'+y,'sarcophagus',x,y,w,32,[[x,y,1,1]]);
for(const [sprite,x,y,w,h] of [['statue',21,4,26,50],['statue',35,4,27,50],['pillar',20,22,32,58],['pillar',35,26,30,58]])add(sprite+'-'+x,sprite,x,y,w,h,[[x,y,1,1]]);
for(const [x,y] of [[8,11],[8,20],[28,13]]){add('arch-'+x+'-'+y,'arch',x+1.5,y-7/12,96,62,[[x,y,1,1],[x+3,y,1,1]]);crypt[crypt.length-1].depth=y+1}
const camp=[];
for(const [i,[x,y,w,h]]of [[5,4,5,4],[23,5,4,4],[5,15,6,4],[22,15,5,4]].entries())camp.push({type:'sceneProp',id:'tent-'+i,sprite:'camp_entry',x,y,depth:y+h,bounds:[x,y,w,h],footprints:[[x,y+1,w,h-1]]});
for(const [x,y]of [[7,3],[23,4],[18,9],[24,17]])camp.push({type:'sceneProp',id:'banner-'+x,sprite:'banner',x,y,depth:y+1.8,bounds:[x+.5-39/48,y+1.8-67/24,39/24,67/24],footprints:[[x,y+1,1,1]]});
for(const [x,y]of [[12,7],[19,14],[25,11]])camp.push({type:'sceneProp',id:'fire-'+x,sprite:'campfire',x,y,depth:y+1,bounds:[x+.5-38/48,y+1-34/24,38/24,34/24],footprints:[[x,y,1,1]]});
let campConfigured=false;
function forScene(loc,map){if(loc==='camp'&&map&&!campConfigured){for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++)if(map.tiles[y][x]==='barrel')camp.push({type:'sceneProp',id:'barrel-'+x+'-'+y,sprite:'barrels',x,y,depth:y+1,bounds:[x-.1,y-.4,1.2,1.5],footprints:[[x,y,1,1]]});campConfigured=true}return loc==='crypt'?crypt:loc==='camp'?camp:[]}

const blocks=(loc,x,y)=>forScene(loc).some(p=>p.footprints.some(([px,py,w,h])=>x>=px&&x<px+w&&y>=py&&y<py+h));
function draw(c,p,sx,sy,player){const [x,y,w,h]=p.bounds;if(['banner','campfire'].includes(p.sprite)){window.AshenWorldArt?.draw(c,p.sprite,(x+w/2)*24-sx,(y+h)*24-sy,w*24,h*24);return}window.AshenPresentation?.piece(c,p.sprite,(x+w/2)*24-sx,(y+h)*24-sy,w*24,h*24,p.sprite==='arch'&&player&&Math.abs(player.x-(p.x))<2&&Math.abs(player.y-p.y)<2?.35:1)}
window.AshenWorldProps={forScene,blocks,draw};
})();
