import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const s={window:{}};try{vm.runInNewContext(readFileSync(new URL('../world-props.js',import.meta.url),'utf8'),s)}catch(e){if(e.code!=='ENOENT')throw e}
const a=s.window.AshenWorldProps;
test('crypt foreground portals leave their center open and block visible stone piers',()=>{assert.equal(a?.blocks('crypt',8,11),true);assert.equal(a?.blocks('crypt',10,11),false);assert.equal(a?.blocks('crypt',11,11),true)});
test('sarcophagi have floor collision independent of their tall artwork',()=>{assert.equal(a?.blocks('crypt',4,6),true);assert.equal(a?.blocks('crypt',4,5),false);assert.equal(a?.forScene('crypt').find(p=>p.sprite==='sarcophagus').depth,7)});
test('scenic props use foot-depth ordering without inventing collision for other scenes',()=>{assert.equal(a?.blocks('tavern',8,10),false);assert.equal(a?.forScene('crypt').every(p=>Number.isFinite(p.depth)&&p.bounds.length===4),true)});
