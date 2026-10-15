import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.playwright-browsers');
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const directories=await readdir(process.env.PLAYWRIGHT_BROWSERS_PATH);
const revision=directories.find(n=>/^chromium-/.test(n));
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:path.join(process.env.PLAYWRIGHT_BROWSERS_PATH,revision,'chrome-win64','chrome.exe')}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>window.__ASHEN_TEST__=true);await page.goto(process.argv[2]||'http://127.0.0.1:8844');
 await page.evaluate(()=>{const a=window.AshenRealms;a.newGame('Benchmark','Human','Fighter');a.enterBuilding('tavern');a.test.modifyGame(g=>{g.x=11;g.world.clock.rate=0})});
 await page.waitForTimeout(1200);
 const pacing=await page.evaluate(()=>new Promise(resolve=>{const values=[];let previous=performance.now();function tick(now){values.push(now-previous);previous=now;if(values.length<180)requestAnimationFrame(tick);else{const total=values.reduce((a,b)=>a+b,0);values.sort((a,b)=>a-b);resolve({frames:180,medianMs:values[90],p95Ms:values[171],observedFps:180000/total})}}requestAnimationFrame(tick)}));
 const scenes={};for(const loc of ['tavern','town','wild','crypt'])scenes[loc]=await page.evaluate(loc=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.location=loc;g.x=loc==='town'?15:loc==='wild'?9:loc==='crypt'?3:8;g.y=loc==='wild'?16:loc==='crypt'?15:10});a.renderFrame();const values=[];for(let i=0;i<120;i++){const t=performance.now();a.renderFrame();values.push(performance.now()-t)}values.sort((a,b)=>a-b);return {medianMs:values[60],p95Ms:values[114]}},loc);
 const report={host:await page.evaluate(()=>navigator.userAgent),pacing,scenes,resources:await page.evaluate(()=>window.AshenRealms.getRenderResources()),limits:'Headless sample, JS render-call timings exclude GPU completion. Not a hardware-wide FPS guarantee.'};
 await mkdir(path.join(root,'artifacts/living-world'),{recursive:true});await writeFile(path.join(root,'artifacts/living-world/benchmark.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
