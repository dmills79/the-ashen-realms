import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
function setup(file){const images=[],calls=[];const sandbox={window:{},Image:class{constructor(){images.push(this)}},document:{createElement:()=>({getContext:()=>({drawImage(){},translate(){},rotate(){}})})}};if(existsSync(new URL('../'+file,import.meta.url)))vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),sandbox);return {api:sandbox.window,images,calls};}
test('town architecture joins foot-depth pass with independent full sprite bounds',()=>{const {api}=setup('architecture.js'),map={buildings:[{x:3,y:2,w:5,h:6,room:'inn'}]},before=JSON.stringify(map);const p=api.AshenArchitecture?.forScene(map,'town')?.[0];assert.ok(p,'building drawable');assert.equal(p.type,'sceneProp');assert.equal(p.depth,8);assert.deepEqual(Array.from(p.bounds),[3,2,5,6]);assert.ok(7.5<p.depth&&8.5>p.depth);assert.equal(JSON.stringify(map),before)});
test('clean room structural walls sort independently only after both art dependencies load',()=>{const {api,images}=setup('interiors.js'),a=api.AshenInteriors;assert.equal(a.getProps('inn').filter(p=>p.prop.structural).length,0);for(const i of images){if(i.src.includes('room_inn')||i.src.includes('structural_atlas'))Object.assign(i,{complete:true,naturalWidth:1536,naturalHeight:1024});}const walls=a.getProps('inn').filter(p=>p.prop.structural);assert.equal(walls.length,12,'four horizontal spans and eight vertical one-cell depth slices');for(const p of walls){assert.ok(p.prop.footprint.every(Number.isFinite));assert.equal(p.prop.depth,p.prop.footprint[1]+p.prop.footprint[3]);}assert.equal(a.scenes.inn.walls.length,8);});

test('structural art follows wall roles without covering forge ovens or the cottage hearth',()=>{
 const {api,images}=setup('interiors.js'),a=api.AshenInteriors;
 for(const image of images)Object.assign(image,{complete:true,naturalWidth:1536,naturalHeight:1024});
 const structures=loc=>a.getProps(loc).filter(p=>p.prop.structural).map(p=>p.prop);
 assert.equal(structures('smith').length,0,'forge reserved floor is not a partition');
 assert.equal(structures('bakery').length,0,'oven reserved floor is not a partition');
 assert.equal(structures('cottage').length,1,'only the horizontal sleeping nook is separate architecture');
 assert.deepEqual(Array.from(structures('cottage')[0].footprint),[1,4,5,1]);
 const columns=structures('chapel');assert.equal(columns.length,4);
 assert.deepEqual(Array.from(columns,p=>Array.from(p.footprint)),[[1,4,2,2],[15,4,2,2],[1,9,1,2],[16,9,1,2]]);
 for(const p of columns){assert.equal(p.sprite,'column');assert.ok(p.bounds[3]>p.bounds[2]);assert.equal(p.depth,p.footprint[1]+p.footprint[3]);}
});

test('town solid furniture uses the same independent footprints as its rendered floor base',()=>{const {api}=setup('architecture.js'),m={buildings:[],props:{benches:[[3,7]],crates:[[6,8]],lamps:[[8,5]]}};assert.equal(api.AshenArchitecture.blocks?.(m,'town',3,7),true);assert.equal(api.AshenArchitecture.blocks?.(m,'town',4,7),false);const bench=api.AshenArchitecture.forScene(m,'town').find(p=>p.propSprite==='bench');assert.equal(bench?.depth,8);assert.equal(m.props.benches.length,1)});

test('new solid furniture keeps existing roads and entrance thresholds traversable',()=>{
 const {api}=setup('architecture.js'),tiles=Array.from({length:12},()=>Array(12).fill('grass'));tiles[7][3]='path';tiles[8][6]='plaza';
 const m={tiles,buildings:[{x:6,y:1,w:4,h:5,room:'hall',doorX:8,doorY:5}],props:{benches:[[3,7]],crates:[[6,8]],lamps:[[8,6]]}};
 for(const [x,y] of [[3,7],[6,8],[8,6]])assert.equal(api.AshenArchitecture.blocks(m,'town',x,y),false);
});
test('structural props sample measured alpha bounds rather than nominal atlas cells',()=>{
 const {api,images}=setup('interiors.js');for(const image of images)Object.assign(image,{complete:true,naturalWidth:1536,naturalHeight:1024});
 const calls=[],p=api.AshenInteriors.getProps('cottage').find(p=>p.prop.structural).prop;api.AshenInteriors.drawProp({drawImage:(...args)=>calls.push(args)},p,0,0);
 assert.deepEqual(calls[0].slice(1,5),[20,190,760,300]);assert.deepEqual(calls[0].slice(5),[24,72,120,48]);
});

test('inn vertical partitions paint one source continuously across two independent depth bands',()=>{
 const {api,images}=setup('interiors.js');for(const image of images)Object.assign(image,{complete:true,naturalWidth:1536,naturalHeight:1024});
 const parts=api.AshenInteriors.getProps('inn').filter(p=>p.prop.id==='structure-4-0'||p.prop.id==='structure-4-1').map(p=>p.prop),calls=[];assert.equal(parts.length,2);
 for(const p of parts)api.AshenInteriors.drawProp({drawImage:(...args)=>calls.push(args)},p,0,0);
 assert.equal(parts[0].depth+1,parts[1].depth);assert.ok(Math.abs(calls[0][2]+calls[0][4]-calls[1][2])<.00001,'source windows meet once');assert.equal(calls[0][6]+calls[0][8],calls[1][6],'painted depth bands meet without overlap');
 assert.ok(Math.abs(calls[0][4]+calls[1][4]-502)<.00001,'measured vertical timber is sampled exactly once');
});

test('tavern furniture initializes and stays cached without an upgraded room shell',()=>{
 const {api,images}=setup('interiors.js'),a=api.AshenInteriors;
 assert.equal(images.some(image=>image.src.includes('room_tavern')),false);
 const first=a.getProps('tavern');assert.ok(first.length>0,'original tavern furniture must initialize');assert.equal(first.length,a.scenes.tavern.props.length);assert.ok(first.some(p=>p.prop.id==='bar'));assert.ok(first.some(p=>p.prop.id==='west-table'));assert.equal(a.getProps('tavern'),first);
 for(const image of images)if(image.src.endsWith('structural_atlas.png')){Object.assign(image,{complete:true,naturalWidth:1536,naturalHeight:1024});image.onload();}
 assert.equal(a.getProps('tavern'),first);assert.equal(first.length,a.scenes.tavern.props.length);
});
