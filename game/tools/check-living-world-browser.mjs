/* Diagnostic adapter: real Chromium and existing Playwright assertions in isolated
   contexts. This does not claim success for the canonical worker runner. */
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url),{chromium}=require('playwright'),{expect}=require('@playwright/test');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.playwright-browsers');
const revision=(await readdir(process.env.PLAYWRIGHT_BROWSERS_PATH)).find(n=>n.startsWith('chromium-'));
const launch=process.platform==='win32'?{executablePath:path.join(process.env.PLAYWRIGHT_BROWSERS_PATH,revision,'chrome-win64','chrome.exe')}:{};
const browser=await chromium.launch({headless:true,...launch}),cases=[],results=[];
const helper={expect};
vm.runInNewContext((await readFile(path.join(root,'tests/browser/creation-helpers.mjs'),'utf8')).replace(/^import .*;\r?$/mg,'').replaceAll('export ','')+';globalThis.result=finishCreation',helper);
for(const file of ['living-world','interiors','environment','combat','formation','ui','world-scenes']){
 const test=(name,fn)=>cases.push({file,name,fn});test.setTimeout=()=>{};
 const prefix=root.replaceAll('\\','/')+'artifacts/';
 const source=(await readFile(path.join(root,'tests/browser/'+file+'.spec.mjs'),'utf8')).replace(/^import .*;\r?$/mg,'').replaceAll("'artifacts/","'"+prefix).replaceAll('`artifacts/','`'+prefix);
 vm.runInNewContext(source,{test,expect,mkdirSync,finishCreation:helper.result,console,Buffer},{filename:file});
}
try{
 for(const {file,name,fn}of cases){
  if(process.argv[3]&&!name.includes(process.argv[3]))continue;
  const context=await browser.newContext({viewport:{width:1440,height:900},baseURL:process.argv[2]||'http://127.0.0.1:8844'}),page=await context.newPage();let timer;
  try{await Promise.race([fn({page}),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Diagnostic case exceeded 60s')),60000))]);results.push({file,name,passed:true});console.log('PASS '+file+' / '+name)}
  catch(e){results.push({file,name,passed:false,error:e.message});console.log('FAIL '+file+' / '+name+' / '+e.message)}
  finally{clearTimeout(timer);await context.close()}
 }
}finally{await browser.close()}
await mkdir(path.join(root,'artifacts/living-world'),{recursive:true});
await writeFile(path.join(root,process.argv[3]?'artifacts/living-world/F-browser-focused.json':'artifacts/living-world/F-browser-direct.json'),JSON.stringify({method:'Existing spec callbacks with Playwright assertions in isolated Chromium contexts; diagnostic adapter, not canonical worker runner.',results},null,2));
console.log(results.filter(r=>r.passed).length+'/'+results.length+' diagnostic browser cases passed');
if(results.some(r=>!r.passed))process.exitCode=1;
