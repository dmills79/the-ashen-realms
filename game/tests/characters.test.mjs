import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildManifest,readPng,registerFrames} from '../tools/character-assets.mjs';

const manifest=JSON.parse(readFileSync(new URL('../assets/characters_v2/manifest.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../sprites.js',import.meta.url),'utf8');
const states=['idle','walk','attack','cast','hit','death'];

function harness(){
  let now=0;const images=[];
  const sandbox={window:{AshenCharacterManifest:manifest},performance:{now:()=>now},Image:class{
    complete=true;naturalWidth=1448;constructor(){images.push(this)}
  }};
  vm.createContext(sandbox);new vm.Script(source).runInContext(sandbox);
  return {api:sandbox.window.AshenSprites,images,advance:ms=>{now+=ms}};
}

test('all four classes and twelve enemy families have registered transparent sheets',()=>{
  assert.deepEqual(Object.keys(manifest.characters).sort(),['fighter','rogue','wizard','cleric','goblin','shaman','orc','warboss','bandit','sentinel','boss','bone','wolf','slime','wisp','bat'].sort());
  for(const [id,asset] of Object.entries(manifest.characters)){
    const png=readPng(readFileSync(new URL('../assets/'+asset.src,import.meta.url)));
    assert.equal(png.width,asset.width,id);assert.equal(png.height,asset.height,id);
    assert.equal(asset.frames.length,12,id);
    assert.deepEqual(Object.keys(asset.animations),states,id);
    for(const frame of asset.frames){
      const [x,y,w,h]=frame.rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=png.width&&y+h<=png.height,id);
      assert.ok(frame.anchor[0]>=x&&frame.anchor[0]<=x+w,id);assert.equal(frame.anchor[1],y+h,id);
    }
  }
});

test('generated browser manifest matches the source manifest and PNG registration',()=>{
  const sandbox={window:{}};vm.createContext(sandbox);
  new vm.Script(readFileSync(new URL('../character-assets.js',import.meta.url),'utf8')).runInContext(sandbox);
  assert.equal(JSON.stringify(sandbox.window.AshenCharacterManifest),JSON.stringify(manifest));
  assert.equal(JSON.stringify(buildManifest()),JSON.stringify(manifest));
});

test('idle and walking loop by elapsed time; actions and defeat hold their final frame',()=>{
  const {api}=harness(),asset=manifest.characters.fighter;
  for(const state of states){
    const animation=asset.animations[state];
    assert.equal(api.animationFrame(asset,state,0),animation.frames[0]);
    assert.equal(api.animationFrame(asset,state,animation.duration*.75),animation.frames[1]);
    assert.equal(api.animationFrame(asset,state,animation.duration*2),animation.loop?animation.frames[0]:animation.frames[1]);
  }
});

test('texture loading is lazy and missing or failed artwork returns control to the fallback',()=>{
  const {api,images}=harness();assert.equal(images.length,4);
  api.prepare(['wolf','wolf']);assert.equal(images.length,5);
  const noop=()=>{},ctx={globalAlpha:1,save:noop,restore:noop,translate:noop,scale:noop,drawImage:noop};
  assert.equal(api.draw(ctx,'not-a-character',0,0,{shadow:false}),false);
  images.at(-1).naturalWidth=0;assert.equal(api.draw(ctx,'wolf',0,0,{shadow:false}),false);
});

test('hit reactions expire and death reactions are presentation-only',()=>{
  const {api,advance}=harness();api.react('hero','hit');advance(200);assert.equal(api.reaction('hero').state,'hit');
  advance(181);assert.equal(api.reaction('hero'),null);
  api.react('enemy','death');advance(5000);assert.equal(api.reaction('enemy').state,'death');
  api.clear();assert.equal(api.reaction('enemy'),null);
});

test('all poses preserve standing scale and place their ground anchor at the requested point',()=>{
  const {api}=harness(),calls=[];const noop=()=>{};
  const ctx={globalAlpha:1,save:noop,restore:noop,translate:(...args)=>calls.push(['translate',...args]),scale:(...args)=>calls.push(['scale',...args]),drawImage:(...args)=>calls.push(['image',...args])};
  for(const state of states){
    calls.length=0;api.draw(ctx,'fighter',120,220,{state,time:700,height:76,facing:'left',shadow:false});
    assert.deepEqual(calls[0],['translate',120,220]);assert.deepEqual(calls[1],['scale',-1,1]);
    const args=calls[2],asset=manifest.characters.fighter,scale=76/asset.referenceHeight;
    assert.equal(args[9],args[5]*scale);assert.equal(args[7]+args[9],0);
  }
});

test('frame registration preserves long weapons and excludes neighboring bodies',()=>{
  const width=400,height=300,pixels=new Uint8Array(width*height*4);
  const fill=(x,y,w,h)=>{for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)pixels[(py*width+px)*4+3]=255};
  for(let row=0;row<3;row++)for(let col=0;col<4;col++)fill(col*100+35,row*100+25,30,50);
  fill(60,20,3,8);fill(61,20,90,3);
  const frames=registerFrames({width,height,pixels});
  assert.equal(frames.length,12);
  assert.equal(frames[0].rect[0]+frames[0].rect[2],151);
  assert.ok(frames[0].exclusions.some(([x,y])=>x===135&&y===25));
  assert.ok(!frames[0].exclusions.some(([,y])=>y===20));
});
