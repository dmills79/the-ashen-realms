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
test('tree footprints are deterministic, avoid road corridors, and leave navigation tiles unchanged',()=>{
 const {api,map}=setup(),before=JSON.stringify(map),trees=api.getDecorations(map,'wild');assert.ok(trees.length>0);
 assert.equal(api.getDecorations(map,'wild'),trees);
 for(const tree of trees){const x=Math.floor(tree.x),y=Math.floor(tree.y);assert.equal(map.tiles[y][x],'forest');assert.ok(Math.abs(y-6)>1);assert.equal(api.blocks(map,'wild',x,y),true)}
 assert.equal(JSON.stringify(map),before);
});
test('water and mist animate without gameplay RNG; unavailable tree art yields to existing art',()=>{
 const {api,map,ctx}=setup();for(let i=0;i<10;i++)api.animate(ctx,map,'wild',0,0,288,288,i*50);
 assert.equal(api.tree(ctx,20,20),false);assert.equal(api.handles('forest'),true);assert.equal(api.handles('altar'),true);assert.equal(api.handles('insideWall'),false);for(let x=0;x<map.w;x++)assert.equal(api.blocks(map,'wild',x,6),false);
});

test('authored transition plans respect exact road cells and protect bridge approaches',()=>{
 const {api,map}=setup();map.id='wild';map.tiles[6][6]='bridge';const before=JSON.stringify(map);
 const plan=api.transitions?.(map,'wild');assert.ok(Array.isArray(plan),'authored transition plan');
 assert.ok(plan.length>0);for(const edge of plan){assert.ok(['path','water'].includes(map.tiles[edge.y][edge.x]));assert.ok(edge.width<=8,'only narrow edge art; cell centers stay readable');assert.notEqual(map.tiles[edge.y][edge.x],'bridge');}
 assert.equal(JSON.stringify(map),before);assert.equal(api.transitions(map,'wild'),plan);
});
test('transition art loading invalidates terrain once and rotations stay cached',()=>{
 const {api,map,ctx,images,allocations}=setup();api.draw(ctx,map,'town',0,0,100,100);const before=allocations();
 const image=images.find(i=>i.src.endsWith('/terrain_edges.png'));assert.ok(image,'transition art requested');Object.assign(image,{complete:true,naturalWidth:1536,naturalHeight:1024});image.onload();
 api.draw(ctx,map,'town',0,0,100,100);assert.ok(allocations()>before);const built=allocations();for(let i=0;i<3;i++)api.draw(ctx,map,'town',0,0,100,100);assert.equal(allocations(),built);
});

test('tree species is stable in world space while its screen position scrolls',()=>{
 const {api,map,images,ctx,calls}=setup();for(const image of images){image.naturalWidth=64;image.naturalHeight=96;image.onload?.();}
 const tree=api.getDecorations(map,'wild')[0];assert.ok(Number.isFinite(tree.variant),'world variant seed');
 api.tree(ctx,120,90,80,1,tree.variant);const first=calls.at(-1)[0];api.tree(ctx,40,25,80,1,tree.variant);assert.equal(calls.at(-1)[0],first);
});

function roundedPolygon(loop){const points=[],mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});for(let i=0;i<loop.length;i++){const a=mid(loop[(i+loop.length-1)%loop.length],loop[i]),b=loop[i],d=mid(b,loop[(i+1)%loop.length]);for(let j=0;j<12;j++){const t=j/12,u=1-t;points.push({x:u*u*a.x+2*u*t*b.x+t*t*d.x,y:u*u*a.y+2*u*t*b.y+t*t*d.y})}}return points;}
function inContours(loops,x,y){let inside=false;for(const loop of loops){const polygon=roundedPolygon(loop);for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside}}return inside;}
test('rounded marching contours preserve every wet and dry cell center including diagonal saddles',()=>{
 const {api}=setup();assert.equal(typeof api.contours,'function');
 for(let bits=0;bits<512;bits++){const m={w:3,h:3,tiles:Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>bits&(1<<(y*3+x))?'water':'grass'))},before=JSON.stringify(m),loops=api.contours(m,'water');
 for(let y=0;y<3;y++)for(let x=0;x<3;x++)assert.equal(inContours(loops,(x+.5)*24,(y+.5)*24),m.tiles[y][x]==='water','center '+bits+':'+x+','+y);assert.equal(JSON.stringify(m),before);assert.equal(api.contours(m,'water'),loops);
 }
});
test('river continues beneath the bridge while rounded trail preserves crossing approaches',()=>{
 const {api}=setup(),m={w:9,h:9,tiles:Array.from({length:9},(_,y)=>Array.from({length:9},(_,x)=>x>=3&&x<=5?(y===4?'bridge':'water'):y===4?'path':'grass'))},before=JSON.stringify(m);
 const water=api.contours?.(m,'water'),road=api.contours?.(m,'road');assert.ok(water&&road);
 for(let y=0;y<9;y++)for(let x=0;x<9;x++){assert.equal(inContours(water,(x+.5)*24,(y+.5)*24),['water','bridge'].includes(m.tiles[y][x]));if(y===4)assert.equal(inContours(road,(x+.5)*24,108),true);}
 assert.equal(JSON.stringify(m),before);const edges=api.transitions(m,'wild');assert.ok(edges.some(p=>Math.abs(Math.sin(p.angle))>.1&&Math.abs(Math.cos(p.angle))>.1),'edge art follows curved tangents');
});

test('cached trail and river painting actually uses quadratic contour masks rather than tile rectangles',()=>{
 const {api,map,ctx}=setup(),curves=[];ctx.quadraticCurveTo=(...args)=>curves.push(args);api.draw(ctx,map,'wild',0,0,100,100);assert.ok(curves.length>0);const built=curves.length;api.draw(ctx,map,'wild',0,0,100,100);assert.equal(curves.length,built,'curves are rasterized only on cache build');
});
