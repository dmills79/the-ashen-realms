import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source=readFileSync(new URL('../environment.js',import.meta.url),'utf8');
function setup(){
 const noop=()=>{},calls=[],images=[];let allocations=0;
 const ctx=new Proxy({drawImage:(...args)=>calls.push(args),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),createPattern:()=>({})},{get:(o,k)=>o[k]??noop});
 const math=Object.create(Math);math.random=()=>{throw Error('Rendering must not consume game randomness')};
 const sandbox={window:{},Math:math,document:{createElement:()=>{allocations++;return {getContext:()=>ctx}}},Image:class{constructor(){images.push(this)}}};
 vm.runInNewContext(source,sandbox);
 const map={w:12,h:12,tiles:Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>y===6?'path':x===6?'water':'forest'))};
 return {api:sandbox.window.AshenEnvironment,map,ctx,images,calls,allocations:()=>allocations};
}
test('landscape surfaces are cached, cropped to the view, and never mutate map geometry',()=>{
 const {api,map,ctx,calls,allocations}=setup(),before=JSON.stringify(map);
 assert.equal(api.draw(ctx,map,'wild',24,24,100,90),true);const built=allocations();
 for(let i=0;i<20;i++)api.draw(ctx,map,'wild',24,24,100,90);
 assert.equal(allocations(),built);assert.equal(JSON.stringify(map),before);
 assert.deepEqual(calls.at(-1).slice(1),[48,48,200,180,0,0,100,90]);
});
test('illustrated material loading rebuilds the surface once; unsupported interiors retain their renderer',()=>{
 const {api,map,ctx,images,allocations}=setup();api.draw(ctx,map,'wild',0,0,100,100);const before=allocations();
 images[1].onload();api.draw(ctx,map,'wild',0,0,100,100);assert.ok(allocations()>before);
 const ready=allocations();api.draw(ctx,map,'wild',0,0,100,100);assert.equal(allocations(),ready);
 assert.equal(api.draw(ctx,map,'crypt',0,0,100,100),false);assert.equal(api.draw(ctx,map,'inn',0,0,100,100),false);
});
test('decorations are deterministic, avoid road corridors, and never change collisions',()=>{
 const {api,map}=setup(),before=JSON.stringify(map),trees=api.getDecorations(map,'wild');assert.ok(trees.length>0);
 assert.equal(api.getDecorations(map,'wild'),trees);
 for(const tree of trees){const x=Math.floor(tree.x),y=Math.floor(tree.y);assert.equal(map.tiles[y][x],'forest');assert.ok(Math.abs(y-6)>1)}
 assert.equal(JSON.stringify(map),before);
});
test('water and mist animate without gameplay RNG; unavailable tree art yields to existing art',()=>{
 const {api,map,ctx}=setup();for(let i=0;i<10;i++)api.animate(ctx,map,'wild',0,0,288,288,i*50);
 assert.equal(api.tree(ctx,20,20),false);assert.equal(api.handles('forest'),true);assert.equal(api.handles('altar'),false);
});
