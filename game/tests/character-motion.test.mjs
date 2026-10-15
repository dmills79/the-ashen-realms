import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source=new URL('../character-motion.js',import.meta.url);
function setup(manifest){
 const calls=[],created=[];
 class Image {constructor(){this.complete=true;this.naturalWidth=1024;this.naturalHeight=1024;created.push(this)} }
 const window={AshenMotionManifest:manifest,AshenAnimation:{timing:()=>({impact:480,duration:850,finish:900})}};
 const sandbox={window,Image};vm.runInNewContext(existsSync(source)?readFileSync(source,'utf8'):'',sandbox);
 const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){calls.push(args)}};
 return {a:window.AshenCharacterMotion,ctx,calls,created};
}
const frames=Array.from({length:24},(_,i)=>({rect:[i*10,20,8,40],anchor:[i*10+3,59]}));
const hero={ancestry:'Elf',role:'Wizard',appearance:'female',hp:12};
const walk={src:'walk.png',referenceHeight:40,frames,animations:{left:{frames:[1,5,9,13,17,21],duration:660},down:{frames:[0,4,8,12,16,20],duration:660}}};
const combat={src:'combat.png',referenceHeight:40,frames,classes:{Wizard:{windup:0,meleeimpact:1,castprepare:2,castrelease:3,hit:4,defend:5,death:6,rangedrelease:7}}};
test('distance gait selects the real directional pose and absolute foot anchor',()=>{
 const {a,ctx,calls}=setup({walk:{elf_wizard_female:walk}});
 assert.equal(a?.drawWalk(ctx,hero,100,200,{walking:true,direction:'left',gait:1,height:80}),true);
 assert.deepEqual(calls[0]?.slice(1),[130,20,8,40,94,122,16,80]);
});
test('customizations never borrow another ancestry or appearance sheet',()=>{
 const {a,ctx,calls}=setup({walk:{elf_wizard_female:walk}});
 assert.equal(a?.drawWalk(ctx,{...hero,appearance:'male'},0,0,{walking:true}),false);
 assert.equal(a?.drawWalk(ctx,{...hero,ancestry:'Dwarf'},0,0,{walking:true}),false);
 assert.equal(calls.length,0);
});
test('combat poses meet melee impact and projectile release, then expire',()=>{
 const {a,ctx,calls}=setup({combat:{elf_female:combat}});
 for(const [state,time,kind,x] of [['attack',479,'slash',0],['attack',480,'slash',10],['cast',169,'fire',20],['cast',170,'fire',30],['attack',170,'arrow',70],['death',10000,'slash',60]]){
  assert.equal(a?.drawAction(ctx,hero,0,0,{state,time,kind}),true);assert.equal(calls.at(-1)?.[1],x);
 }
 assert.equal(a?.drawAction(ctx,hero,0,0,{state:'hit',time:381}),false);
 assert.equal(a?.drawAction(ctx,hero,0,0,{state:'attack',time:900}),false);
});
test('bounded image cache keeps recently drawn identities and does not load unknown sheets',()=>{
 const assets={};for(let i=0;i<20;i++)assets['id'+i]={...walk,src:'sheet'+i+'.png'};
 const {a,ctx,created}=setup({walk:assets});
 for(let i=0;i<20;i++)a?.drawAsset(ctx,assets['id'+i],0,0,{frame:0});
 assert.equal(a?.debug().cached.length,12);
 const before=created.length;a?.drawAsset(ctx,assets.id19,0,0,{frame:0});assert.equal(created.length,before);
 assert.equal(a?.drawWalk(ctx,hero,0,0,{walking:true}),false);
});
test('unloaded images defer to fallback without drawing empty cells',()=>{
 const {a,ctx,calls,created}=setup({walk:{elf_wizard_female:walk}});
 a?.prepare([hero]);if(created[0])created[0].complete=false;
 assert.equal(a?.drawWalk(ctx,hero,0,0,{walking:true}),false);assert.equal(calls.length,0);
});

test('identity draw consumes decoded six pose motion while preserving static fallback',()=>{
 const {a,ctx,calls}=setup({walk:{elf_wizard_female:walk}});
 const window={AshenCharacterMotion:a};const sandbox={window,Image:class {constructor(){this.complete=true;this.naturalWidth=80;this.naturalHeight=160}},document:{addEventListener(){}}};
 vm.runInNewContext(readFileSync(new URL('../identity.js',import.meta.url),'utf8'),sandbox);
 assert.equal(window.AshenIdentity.draw(ctx,hero,100,200,{walking:true,direction:'left',gait:1,height:80}),true);
 assert.equal(calls[0].length,9);assert.equal(calls[0][1],130);
 calls.length=0;assert.equal(window.AshenIdentity.draw(ctx,hero,0,0,{walking:false,height:80}),true);
 assert.equal(calls[0].length,5);
});
test('seated ancestry uses genuine class-specific drink pose and does not borrow human art',()=>{
 const seated={...combat,src:'seated.png',classes:{Wizard:{idle:0,drink:1,converse:2}}};
 const {a,ctx,calls}=setup({seated:{elf_female:seated}});
 const window={AshenCharacterMotion:a};vm.runInNewContext(readFileSync(new URL('../seating-art.js',import.meta.url),'utf8'),{window,Image:class {constructor(){this.complete=true;this.naturalWidth=1024;this.naturalHeight=1024}}});
 assert.equal(window.AshenSeating.draw(ctx,hero,0,0,36,{state:'drink'}),true);assert.equal(calls[0][1],10);
 assert.equal(window.AshenSeating.draw(ctx,{...hero,ancestry:'Dwarf'},0,0,36),false);
});

test('preparation before manifest arrives warms the active identity exactly once',async()=>{
 let resolve;const ready=new Promise(r=>{resolve=r}),created=[];
 const window={};class Image {constructor(){created.push(this);this.complete=true;this.naturalWidth=100}}
 const sandbox={window,Image,fetch:()=>ready};vm.runInNewContext(readFileSync(source,'utf8'),sandbox);
 const a=window.AshenCharacterMotion;a.prepare([hero]);a.prepare([hero]);assert.equal(created.length,0);
 resolve({ok:true,json:async()=>({walk:{elf_wizard_female:walk}})});
 await new Promise(r=>setImmediate(r));assert.equal(created.length,1);assert.equal(created[0].src,'walk.png');
 a.prepare([hero]);assert.equal(created.length,1);
});
test('small viewports use a six-sheet texture budget',()=>{
 const window={innerWidth:600,AshenMotionManifest:{}};class Image {constructor(){this.complete=true;this.naturalWidth=100}}
 vm.runInNewContext(readFileSync(source,'utf8'),{window,Image});
 const a=window.AshenCharacterMotion,ctx={globalAlpha:1,save(){},restore(){},drawImage(){}};
 for(let i=0;i<10;i++)a.drawAsset(ctx,{...walk,src:'mobile'+i+'.png'},0,0);
 assert.equal(a.debug().cached.length,6);
});

const measurePath=new URL('../tools/measure-motion-atlases.mjs',import.meta.url);
const measurement=existsSync(measurePath)?await import(measurePath.href):{};
test('measurement ignores detached alpha specks and anchors to body feet',()=>{
 const width=30,height=40,data=new Uint8Array(width*height*4);
 for(let y=5;y<35;y++)for(let x=8;x<22;x++)data[(y*width+x)*4+3]=255;
 data[3]=255;data[((height-1)*width+width-1)*4+3]=255;
 const pose=measurement.measureCell?.({width,height,data},[0,0,30,40]);
 assert.deepEqual(pose?.rect,[6,3,18,34]);assert.deepEqual(pose?.anchor,[15,35]);
});
test('combat death preserves the common standing reference height',()=>{
 const width=160,height=160,data=new Uint8Array(width*height*4);
 for(let row=0;row<4;row++)for(let col=0;col<8;col++){
  const bottom=row*40+36,top=bottom-(col===6?8:28);
  for(let y=top;y<bottom;y++)for(let x=col*20+6;x<col*20+14;x++)data[(y*width+x)*4+3]=255;
 }
 const result=measurement.measureAtlas?.({width,height,data},'combat');
 assert.equal(result?.frames[6].referenceHeight,28);
 assert.equal(result?.frames[6].rect[3],12);
 assert.equal(result?.classes.Fighter.death,6);
});

test('PNG decoder reconstructs real Sub and Up scanline filters',async()=>{
 const {deflateSync}=await import('node:zlib');
 const chunk=(name,data)=>{const result=Buffer.alloc(data.length+12);result.writeUInt32BE(data.length);result.write(name,4);data.copy(result,8);return result};
 const header=Buffer.alloc(13);header.writeUInt32BE(2,0);header.writeUInt32BE(2,4);header[8]=8;header[9]=6;
 const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([1,11,22,33,255,33,33,33,0,2,1,1,1,0,1,1,1,0]))),chunk('IEND',Buffer.alloc(0))]);
 const image=measurement.decodePng(png);assert.equal(image.width,2);assert.equal(image.height,2);
 assert.deepEqual([...image.data],[11,22,33,255,44,55,66,255,12,23,34,255,45,56,67,255]);
});
test('incomplete atlas directories cannot publish a partial final manifest',async()=>{
 const {mkdtemp,readFile,readdir,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const directory=await mkdtemp(join(tmpdir(),'ashen-motion-measure-'));
 try{
  await assert.rejects(measurement.buildManifest({directory,gameRoot:directory}),/Incomplete or invalid atlases/);
  const report=JSON.parse(await readFile(join(directory,'measurement-report.json'),'utf8'));
  assert.equal(report.complete,false);assert.equal(report.errors.filter(e=>e.startsWith('Missing validated walk')).length,32);
  assert.equal((await readdir(directory)).includes('manifest.json'),false);
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('whole-sheet measurement retains a crossing boot while excluding neighboring head pixels',()=>{
 const width=80,height=240,data=new Uint8Array(width*height*4),paint=(x1,y1,x2,y2)=>{for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)data[(y*width+x)*4+3]=255};
 for(let row=0;row<6;row++){paint(8,row*40+4,20,row*40+32);paint(55,row*40+4,68,row*40+32)}
 paint(20,28,44,32);paint(39,8,56,13);
 const atlas=measurement.measureAtlas({width,height,data},'ambient'),first=atlas.frames[0];
 assert.deepEqual(first.rect,[6,2,40,32]);assert.deepEqual(first.anchor,[14,32]);
 assert.ok(first.exclusions.some(([x,y,length])=>x===39&&y===8&&length>=7));
 assert.equal(atlas.frames[1].anchor[1],32);
});
test('neighbor masks are built once and reused from a bounded isolated frame cache',()=>{
 const canvasCalls=[],canvases=[];const document={createElement(){const canvas={getContext(){return {drawImage(){},fillRect(...args){canvasCalls.push(args)}}}};canvases.push(canvas);return canvas}};
 const window={AshenMotionManifest:{}};class Image {constructor(){this.complete=true;this.naturalWidth=100}}
 vm.runInNewContext(readFileSync(source,'utf8'),{window,Image,document});
 const a=window.AshenCharacterMotion,draws=[],ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){draws.push(args)}};
 const asset={src:'overlap.png',referenceHeight:40,frames:[{rect:[0,0,8,40],anchor:[4,39],exclusions:[[1,1,2]]}]};
 assert.equal(a.drawAsset(ctx,asset,0,0),true);assert.equal(a.drawAsset(ctx,asset,0,0),true);
 assert.equal(canvases.length,1);assert.equal(canvasCalls.length,1);assert.equal(draws[0][0],canvases[0]);
 for(let i=0;i<60;i++)a.drawAsset(ctx,{...asset,src:'overlap'+i+'.png'},0,0);
 assert.equal(a.debug().isolated.length,48);
});

test('weak alpha bridges preserve complete contours without moving solid foot anchors',()=>{
 const width=80,height=240,data=new Uint8Array(width*height*4),paint=(x1,y1,x2,y2,alpha=255)=>{for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)data[(y*width+x)*4+3]=alpha};
 for(let row=0;row<6;row++){paint(8,row*40+4,20,row*40+32);paint(55,row*40+4,68,row*40+32)}
 paint(12,32,16,44,128);
 const atlas=measurement.measureAtlas({width,height,data},'ambient');
 assert.equal(atlas.frames.length,12);assert.equal(atlas.frames[0].anchor[1],32);
 assert.ok(atlas.frames[0].rect[1]+atlas.frames[0].rect[3]>34);
 paint(12,32,16,44,255);
 assert.throws(()=>measurement.measureAtlas({width,height,data},'ambient'),/Missing separate whole-body component/);
});

test('walking and combat overlays use exact transformed pose hand anchors',()=>{
 const pose={rect:[10,20,30,100],anchor:[25,120],hand:[40,70],weaponAngle:.4};const asset={src:'armed.png',referenceHeight:100,frames:[pose],animations:{right:{frames:[0]}},classes:{Wizard:{meleeimpact:0,windup:0,rangedrelease:0}}};
 const overlays=[],window={AshenMotionManifest:{walk:{elf_wizard_female:asset},combat:{elf_female:asset}},AshenEquipment:{draw:(...args)=>overlays.push(args)}};
 class Image {complete=true;naturalWidth=200}vm.runInNewContext(readFileSync(source,'utf8'),{window,Image});const ctx={globalAlpha:1,save(){},restore(){},drawImage(){}};
 window.AshenCharacterMotion.drawWalk(ctx,{...hero,gear:{weapon:'iron'}},100,200,{walking:true,direction:'right',height:100});assert.equal(overlays.length,1);assert.equal(overlays[0][4].hand.x,115);assert.equal(overlays[0][4].hand.y,150);assert.equal(overlays[0][4].angle,.4);
 window.AshenCharacterMotion.drawAction(ctx,{...hero,gear:{weapon:'iron'}},100,200,{state:'attack',time:480,height:100});assert.equal(overlays[1][4].pose,'meleeimpact');
 window.AshenCharacterMotion.drawAction(ctx,{...hero,gear:{weapon:'oakbow'}},100,200,{state:'attack',kind:'arrow',time:200,height:100});assert.equal(overlays.length,2);
});
test('motion debug records actual frame draws only in test mode and remains bounded',()=>{
 const window={__ASHEN_TEST__:true,AshenMotionManifest:{walk:{elf_wizard_female:walk},combat:{elf_female:combat}}};class Image {complete=true;naturalWidth=200}vm.runInNewContext(readFileSync(source,'utf8'),{window,Image});const ctx={globalAlpha:1,save(){},restore(){},drawImage(){}};
 for(let i=0;i<140;i++)window.AshenCharacterMotion.drawWalk(ctx,hero,0,0,{walking:true,direction:'left',gait:i/10});const trace=window.AshenCharacterMotion.debug().draws;assert.equal(trace?.length,128);assert.equal(trace.at(-1).tag,'walk');assert.equal(trace.at(-1).direction,'left');assert.equal(trace.at(-1).src,'walk.png');
 const regular=setup({walk:{elf_wizard_female:walk}});regular.a.drawWalk(regular.ctx,hero,0,0,{walking:true,direction:'left'});assert.equal(regular.a.debug().draws?.length??0,0);
});

test('death poses suppress floating held gear until a corpse hand is measured',()=>{
 const pose={rect:[0,0,80,20],anchor:[40,20]},asset={src:'corpse.png',referenceHeight:100,frames:[pose],classes:{Wizard:{death:0}}},overlays=[];
 const window={AshenMotionManifest:{combat:{elf_female:asset}},AshenEquipment:{draw:(...args)=>overlays.push(args)}};class Image {complete=true;naturalWidth=200}vm.runInNewContext(readFileSync(source,'utf8'),{window,Image});const ctx={globalAlpha:1,save(){},restore(){},drawImage(){}};
 window.AshenCharacterMotion.drawAction(ctx,{...hero,gear:{weapon:'iron'}},100,200,{state:'death',height:100});assert.equal(overlays.length,0);
 pose.hand=[60,15];window.AshenCharacterMotion.drawAction(ctx,{...hero,gear:{weapon:'iron'}},100,200,{state:'death',height:100});assert.equal(overlays.length,1);assert.equal(overlays[0][4].hand.x,120);assert.equal(overlays[0][4].hand.y,195);
});

test('five-frame atlases with extra bottom margin preserve all real poses without duplication',()=>{
 const width=160,height=320,data=new Uint8Array(width*height*4);
 for(let row=0;row<5;row++)for(let col=0;col<4;col++)for(let y=row*50+8;y<row*50+38;y++)for(let x=col*40+12;x<col*40+20+row;x++)data[(y*width+x)*4+3]=255;
 const atlas=measurement.measureAtlas({width,height,data},'walk',{rowCount:5});
 assert.equal(atlas.frames.length,20);assert.equal(atlas.layout.rows,5);assert.equal(atlas.frames[16].anchor[1],238);
 assert.deepEqual(atlas.animations.down.frames,[0,4,8,12,16]);
 assert.equal(new Set(atlas.measurement.filter((_,i)=>i%4===0).map(f=>f.shape)).size,5);
 assert.equal(new Set(Object.values(atlas.animations).flatMap(a=>a.frames)).size,20);
});

test('combat generation anchors held gear to each calibrated pose and omits corpse and built bow hands',()=>{
 const frames=Array.from({length:32},()=>({rect:[100,200,200,400],anchor:[200,600]})),asset={frames};
 measurement.annotateCombatHands?.(asset,'elf_female');
 assert.deepEqual(asset.frames[0].hand,[170,224]);assert.equal(asset.frames[0].weaponAngle,0);
 assert.deepEqual(asset.frames[1].hand,[292,300]);assert.equal(asset.frames[1].weaponAngle,Math.PI/2);
 assert.equal(asset.frames[6].hand,undefined);assert.equal(asset.frames[7].hand,undefined);
 assert.ok(asset.frames[8].hand);assert.ok(asset.frames[31].hand===undefined);
});

test('published combat attachment guides land on painted pixels across all identities',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/living_world/motion/manifest.json',import.meta.url),'utf8'));let anchored=0;
 for(const [identity,asset] of Object.entries(manifest.combat)){
  const image=measurement.decodePng(readFileSync(new URL('../'+asset.src,import.meta.url)));
  for(let i=0;i<asset.frames.length;i++){
   const frame=asset.frames[i];if([6,7].includes(i%8)){assert.equal(frame.hand,undefined);continue}
   assert.ok(frame.hand,identity+' missing hand for frame '+i);
   const x=Math.round(frame.hand[0]),y=Math.round(frame.hand[1]);
   assert.ok(image.data[(y*image.width+x)*4+3]>64,identity+' floating attachment for frame '+i);anchored++;
  }
 }
 assert.equal(anchored,192);
});
