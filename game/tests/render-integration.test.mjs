import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../game.js',import.meta.url),'utf8');
function load(name,sandbox){const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);vm.runInNewContext(source.slice(start,end),sandbox);return sandbox[name];}
test('customized combat action renders before the static identity fallback',()=>{
 const calls=[],s={ctx:{},mode:'combat',battleFX:{actorId:'hero',kind:'arrow'},illustratedActorState:()=>({state:'attack',time:330}),window:{AshenCharacterMotion:{drawAction:(...args)=>{calls.push(['action',args.at(-1)]);return true}},AshenIdentity:{draw:()=>{calls.push(['static']);return true}}}};
 const draw=load('drawIllustratedActor',s);assert.equal(draw({id:'hero',role:'Rogue',ancestry:'Elf',appearance:'female'},100,200,'ally',1.5),true);assert.equal(calls[0][0],'action');assert.equal(calls[0][1].kind,'arrow');assert.equal(calls[0][1].time,330);assert.equal(calls[0][1].height,127.5);assert.equal(calls.length,1);
});
test('ambient seated action art uses its seat foot while walking preserves identity animation fallback',()=>{
 const calls=[],s={ctx:{},performance:{now:()=>2000},window:{AshenAmbientArt:{drawAmbient:(...args)=>{calls.push(['pose',args]);return args[1].seated}},AshenGrounding:{shadow:()=>calls.push(['shadow'])}},drawSprite:(...args)=>calls.push(['sprite',args])};
 const draw=load('drawEntity',s),hero={role:'Rogue'},motion={walking:true,gait:2};draw({ambient:true,seated:true,state:'drinking',role:'Rogue',hero},40,60,motion);assert.equal(calls[0][0],'pose');assert.equal(calls[0][1][3],90);assert.equal(calls[0][1][4].height,34);assert.equal(calls.length,1);
 draw({ambient:true,state:'walking',role:'Rogue',hero},40,60,motion);assert.equal(calls.at(-1)[0],'sprite');assert.equal(calls.at(-1)[1].at(-1),motion);
});
