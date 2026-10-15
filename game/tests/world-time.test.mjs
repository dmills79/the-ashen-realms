import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const path=new URL('../world-time.js',import.meta.url),s={window:{}};vm.runInNewContext(existsSync(path)?readFileSync(path,'utf8'):'',s);const a=s.window.AshenWorldTime;
test('time wraps midnight and pauses without fast-forwarding a hidden tab',()=>{const c=a?.normalize?.({minutes:1439,day:1,rate:2});a?.advance?.(c,1000,true);assert.equal(c?.minutes,1);assert.equal(c?.day,2);a?.advance?.(c,600000,false);assert.equal(c?.minutes,1);a?.advance?.(c,600000,true);assert.equal(c?.minutes,3)});
test('dawn morning afternoon dusk and night have distinct readable phases',()=>{assert.equal(a?.read?.({minutes:330})?.phase,'dawn');assert.equal(a?.read?.({minutes:600})?.phase,'morning');assert.equal(a?.read?.({minutes:900})?.phase,'afternoon');assert.equal(a?.read?.({minutes:1140})?.phase,'dusk');assert.equal(a?.read?.({minutes:1380})?.phase,'night');assert.ok((a?.read?.({minutes:1380})?.ambient??1)<=.3)});
test('legacy step lighting migrates to the same daylight or night period',()=>{assert.equal(a?.read?.(a?.normalize?.(null,100))?.phase,'morning');assert.equal(a?.read?.(a?.normalize?.(null,380))?.phase,'night');assert.throws(()=>a.normalize({minutes:NaN,day:1,rate:2}))});
