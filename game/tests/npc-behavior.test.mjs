import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const path=new URL('../npc-behavior.js',import.meta.url),s={window:{}};vm.runInNewContext(existsSync(path)?readFileSync(path,'utf8'):'',s);const a=s.window.AshenNPCs;
test('pathfinding goes around furniture and never steps through an occupied cell',()=>{const path=a?.findPath?.({x:0,y:1},{x:3,y:1},(x,y)=>x>=0&&y>=0&&x<4&&y<3&&!(x===1&&y===1)&&!(x===2&&y===1),4,3);assert.ok(path?.length>3);assert.ok(path.every(p=>!(p.x===1&&p.y===1)&&!(p.x===2&&p.y===1)));assert.equal(path.at(-1).x,3)});
test('unreachable destinations return no route instead of walking through walls',()=>{assert.deepEqual(Array.from(a?.findPath?.({x:0,y:0},{x:2,y:0},()=>false,3,1)??['missing']),[])});

test('travelers wait outside a crowded entrance and reserve movement cells',()=>{
 a.clear();const map={w:18,h:14},clock={minutes:540},floor=(x,y)=>x>0&&x<17&&y>=3&&y<12||x===8&&y===12;
 a.update('tavern',250,{clock,player:{x:8,y:11},map,walkable:floor});assert.equal(a.entities('tavern').length,0);
 a.update('tavern',250,{clock,player:{x:11,y:10},map,walkable:floor});const e=a.entities('tavern')[0];assert.ok(e);assert.equal(e.x,8);assert.equal(e.y,11);assert.equal(a.blocks('tavern',8,12),true);
 for(let i=0;i<30;i++)a.update('tavern',250,{clock,player:{x:9,y:10},map,walkable:floor});assert.ok(a.entities('tavern').every(e=>e.x!==9||e.y!==10));
});

function seatingFixture(){
 const sandbox={window:{}};vm.runInNewContext(readFileSync(path,'utf8'),sandbox);const npc=sandbox.window.AshenNPCs;
 npc.definitions.fixture=[{id:'guest',kind:'visitor',role:'Rogue',spawn:[1,2],route:[{at:[3,2],seat:[3,1],action:'drinking',duration:1000},{at:[1,2],action:'exit'}],hours:[7,22],exit:true}];
 const input={clock:{minutes:600},player:{x:5,y:3},map:{w:7,h:5},walkable:(x,y)=>x>0&&x<6&&y>0&&y<4&&!(x===3&&y===1)&&!npc.blocks('fixture',x,y)};
 return {npc,input,tick:(n=1)=>{for(let i=0;i<n;i++)npc.update('fixture',250,input)}};
}
test('a traveler reaches a bench approach before sitting and reserves seat and stand tiles',()=>{
 const {npc,tick}=seatingFixture();tick();let e=npc.entities('fixture')[0];assert.equal(e.seated,undefined);assert.equal(e.x,2);tick();assert.equal(e.x,3);assert.equal(e.y,2);assert.equal(e.seated,undefined);tick();assert.equal(e.seated,true);assert.equal(e.x,3);assert.equal(e.y,1);assert.equal(npc.blocks('fixture',3,1),true);assert.equal(npc.blocks('fixture',3,2),true);assert.equal(e.state,'drinking');
});
test('scheduled departure stands before walking and releases the transient seat reservation',()=>{
 const {npc,input,tick}=seatingFixture();tick(3);assert.equal(npc.entities('fixture')[0].seated,true);input.clock.minutes=1380;tick();let e=npc.entities('fixture')[0];assert.equal(e.seated,false);assert.equal(e.x,3);assert.equal(e.y,2);tick(5);assert.equal(npc.entities('fixture').length,0);assert.equal(npc.blocks('fixture',3,1),false);assert.equal(npc.blocks('fixture',3,2),false);
});
test('an occupied bench does not manufacture a seated pose or block the exit route',()=>{
 const {npc,input,tick}=seatingFixture();input.player={x:3,y:1};tick(20);assert.ok(npc.entities('fixture').every(e=>!e.seated));input.clock.minutes=1380;tick(12);assert.equal(npc.entities('fixture').length,0);
});
test('closing a route after seating replans safely and clear releases every reservation',()=>{
 const {npc,input,tick}=seatingFixture();tick(3);input.clock.minutes=1380;const floor=input.walkable;input.walkable=(x,y)=>!(x===2&&y===2)&&floor(x,y);tick(20);assert.equal(npc.entities('fixture').length,0);npc.clear();assert.equal(npc.blocks('fixture',3,1),false);
});

test('authored tavern and inn benches complete real arrival seating and doorway departure',()=>{
 for(const [loc,staticActors]of [['tavern',[[4,7],[13,7],[8,4]]],['inn',[[7,6],[11,9]]]]){
  const sandbox={window:{},Image:class{}};vm.runInNewContext(readFileSync(new URL('../interiors.js',import.meta.url),'utf8'),sandbox);vm.runInNewContext(readFileSync(path,'utf8'),sandbox);const npc=sandbox.window.AshenNPCs,map={id:loc,w:18,h:14,tiles:Array.from({length:14},()=>Array(18).fill('woodFloor'))};sandbox.window.AshenInteriors.configure(map);
  const input={clock:{minutes:600},player:{x:1,y:11},map,walkable:(x,y)=>x>=0&&y>=0&&x<18&&y<14&&!['rack','insideWall'].includes(map.tiles[y][x])&&!(loc==='tavern'&&x===11&&y===5)&&!staticActors.some(([sx,sy])=>sx===x&&sy===y)&&!npc.blocks(loc,x,y)};
  let sawSeat=false,sawWork=false,left=false;
  for(let i=0;i<300;i++){npc.update(loc,250,input);const e=npc.entities(loc)[0];if(e){sawSeat||=e.seated===true;sawWork||=e.state==='working';if(e.seated)assert.equal(map.tiles[e.y][e.x],'rack');}else if(sawSeat){left=true;break}}
  assert.equal(sawSeat,true,loc+' reaches its real bench');assert.equal(left,true,loc+' leaves by its entrance');if(loc==='tavern')assert.equal(sawWork,true);
 }
});
