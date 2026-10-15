import {test,expect} from '@playwright/test';
async function begin(page){await page.addInitScript(()=>window.__ASHEN_TEST__=true);await page.goto('/');await page.evaluate(()=>{window.AshenRealms.newGame('Living World Inspector','Human','Fighter');window.AshenRealms.enterBuilding('tavern')});await page.waitForFunction(()=>window.AshenInteriors.ready());await page.waitForTimeout(200)}
test('player interpolates through real walk poses while seated Rook stays idle',async({page})=>{
 await begin(page);
 const result=await page.evaluate(async()=>{const a=window.AshenRealms,g=a.getState(),id='tavern:'+g.party[0].id;a.move(1,0);await new Promise(r=>setTimeout(r,80));const mid=window.AshenAnimation.sample(id,9,10,'right',performance.now());await new Promise(r=>setTimeout(r,140));const frames=window.AshenIdentity.debug().draws;return {mid,grid:a.getState().x,end:window.AshenAnimation.sample(id,9,10,'right',performance.now()).state,walk:frames.some(f=>f.src.includes('fighter_male_right_walk')&&f.state==='walk'),rookWalking:frames.some(f=>f.src.includes('halfling_rogue')&&f.state==='walk')}});
 expect(result.grid).toBe(9);expect(result.mid.x).toBeGreaterThan(8.2);expect(result.mid.x).toBeLessThan(8.9);expect(result.end).toBe('idle');expect(result.walk).toBe(true);expect(result.rookWalking).toBe(false);
});
test('combat damage waits for the shared attack impact',async({page})=>{
 await begin(page);await page.evaluate(()=>{const a=window.AshenRealms;a.beginCombat(['orc']);a.test.modifyCombat(c=>{c.enemies[0].hp=c.enemies[0].maxHp=200;c.queue=[{side:'ally',id:a.getState().party[0].id},{side:'enemy',id:c.enemies[0].id}];c.turn=0});window.savedRandom=Math.random;Math.random=()=>.99;a.battleAction('attack');a.battleAction('target:'+a.getCombat().enemies[0].id)});
 await page.waitForTimeout(320);expect(await page.evaluate(()=>window.AshenRealms.getCombat().enemies[0].hp)).toBe(200);
 await page.waitForTimeout(210);expect(await page.evaluate(()=>window.AshenRealms.getCombat().enemies[0].hp)).toBeLessThan(200);await page.evaluate(()=>Math.random=window.savedRandom);
});

test('facing a service gate operates it without recruiting the patron behind the player',async({page})=>{await begin(page);await page.evaluate(()=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.x=11;g.y=6;g.dir='up'});a.interact()});expect(await page.evaluate(()=>window.AshenRealms.walkable('tavern',11,5))).toBe(false);expect(await page.evaluate(()=>window.AshenRealms.getState().party.length)).toBe(1)});
