import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
function setup(){const calls=[],sandbox={window:{AshenAmbientManifest:{src:'poses.png',poses:{Rogue:{serve:{rect:[0,100,100,200],anchor:[50,280],referenceHeight:200},seatedDrink:{rect:[0,400,100,200],anchor:[50,580],referenceHeight:200}}}}},Image:class{complete=true;naturalWidth=200;naturalHeight=1200}};const path=new URL('../ambient-art.js',import.meta.url);vm.runInNewContext(existsSync(path)?readFileSync(path,'utf8'):'',sandbox);return {art:sandbox.window.AshenAmbientArt,ctx:{drawImage:(...args)=>calls.push(args)},calls}}
test('ambient art uses the seated action crop and measured foot anchor',()=>{const {art,ctx,calls}=setup();assert.equal(art?.drawAmbient(ctx,{role:'Rogue',hero:{ancestry:'Human',appearance:'male'},state:'drinking',seated:true},20,30,{height:40}),true);assert.deepEqual(calls[0].slice(1),[0,400,100,200,10,-6,20,40])});
test('standing work uses serving artwork but walking retains the directional identity renderer',()=>{const {art,ctx,calls}=setup();assert.equal(art?.drawAmbient(ctx,{role:'Rogue',state:'working'},20,30,{height:40}),true);assert.equal(calls[0][2],100);assert.equal(art?.drawAmbient(ctx,{role:'Rogue',state:'walking'},20,30),false);assert.equal(calls.length,1)});
test('ambient poses never replace an unmatched ancestry appearance or class',()=>{const {art,ctx,calls}=setup();for(const e of [{role:'Fighter',state:'working'},{role:'Rogue',hero:{ancestry:'Elf',appearance:'male'},state:'working'},{role:'Rogue',hero:{ancestry:'Human',appearance:'female'},state:'working'}])assert.equal(art?.drawAmbient(ctx,e,20,30),false);assert.equal(calls.length,0)});

test('emitted numeric pose indices including zero render with measured neighbor masks and no held gear',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/living_world/ambient_manifest.json',import.meta.url),'utf8')),canvases=[],masked=[],draws=[],equipment=[];
 const window={AshenAmbientManifest:manifest,AshenMotionManifest:{},AshenEquipment:{draw:(...args)=>equipment.push(args)}};
 const document={createElement(){const canvas={getContext(){return {drawImage(){},fillRect:(...args)=>masked.push(args)}}};canvases.push(canvas);return canvas}};
 class Image {complete=true;naturalWidth=1000;naturalHeight=2400}
 const sandbox={window,document,Image};vm.runInNewContext(readFileSync(new URL('../character-motion.js',import.meta.url),'utf8'),sandbox);vm.runInNewContext(readFileSync(new URL('../ambient-art.js',import.meta.url),'utf8'),sandbox);
 const ctx={globalAlpha:1,save(){},restore(){},drawImage:(...args)=>draws.push(args)},e={role:'Rogue',hero:{ancestry:'Human',appearance:'male',gear:{weapon:'iron'}},state:'drinking'};
 assert.equal(window.AshenAmbientArt.drawAmbient(ctx,e,20,30),true);assert.equal(manifest.poses.Rogue.drink,0);assert.equal(draws[0][0],canvases[0]);assert.equal(masked.length,manifest.frames[0].exclusions.length);
 assert.equal(window.AshenAmbientArt.drawAmbient(ctx,{...e,seated:true},20,30),true);assert.equal(draws[1][0],canvases[1]);assert.equal(equipment.length,0);
 const count=canvases.length;window.AshenAmbientArt.drawAmbient(ctx,e,20,30);assert.equal(canvases.length,count);
});
