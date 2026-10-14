import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/battle-reference',{recursive:true});

async function scene(page,role='Rogue'){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});await page.goto('/');
 await page.evaluate(role=>{const a=window.AshenRealms;a.newGame('Rook','Human',role);a.action('cleric');a.closeModal();a.test.addAlly('Wizard');a.test.setLevel(0,5);a.test.modifyGame(g=>{g.location='crypt';g.party.forEach((h,i)=>{h.id='member-'+i;h.stats=[16,20-i*2,14,16,16,14];h.hp=h.maxHp=150;h.mp=h.maxMp=40});g.party[0].gear.weapon='iron';g.party[2].name='Arden'});a.beginCombat(['wisp','bone','bone']);a.test.modifyCombat(c=>c.enemies.forEach(e=>e.hp=e.maxHp=200))},role);
 await expect(page.locator('[data-c=attack]')).toBeVisible();
 await expect.poll(()=>page.locator('.battle-art-card img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
 return errors;
}
for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:970,height:550}]){
 test(`reference layout and live action inspection at ${viewport.width}×${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);const errors=await scene(page);
  const boxes=await page.evaluate(()=>Object.fromEntries(['#game','.battle-events','.cinema-party','.battle-controls','#battleActionDetail','#battleTargetDetail'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}]})));
  expect(boxes['.battle-events'].x).toBeGreaterThanOrEqual(boxes['#game'].right-1);expect(boxes['.battle-events'].bottom).toBeLessThanOrEqual(boxes['.cinema-party'].y+1);
  expect(boxes['#battleActionDetail'].x).toBeGreaterThan(boxes['.battle-controls'].x);expect(boxes['#battleTargetDetail'].right).toBeLessThanOrEqual(viewport.width);
  await expect(page.locator('.combat-command-rail button')).toHaveCount(6);await expect(page.locator('.initiative-actor.enemy img')).toHaveCount(3);
  await expect(page.locator('#battleActionDetail')).toContainText('Ironblade');
  await page.locator('[data-c="ability:shadow"]').hover();await expect(page.locator('#battleActionDetail')).toContainText('Shadowstep');await expect(page.locator('#battleActionDetail')).toContainText('Advantage');
  expect(await page.evaluate(()=>window.AshenRealms.getState().party[0].mp)).toBe(40); // Inspection never spends a turn or resource.
  await page.screenshot({path:`artifacts/battle-reference/crypt-${viewport.width}-${viewport.height}.png`});
  await page.locator('[data-c=attack]').click();await page.locator('[data-c="target:e0"]').hover();await expect(page.locator('#battleTargetDetail')).toContainText('Grave Wisp');
  await expect(page.locator('#battleTargetDetail')).not.toContainText('Curse');await expect(page.locator('#battleTargetDetail')).not.toContainText('Ethereal');
  await page.keyboard.press('Escape');expect(errors).toEqual([]);
 });
}
test('spell rail selects real spells, previews damage and spends actual MP on use',async({page})=>{
 const errors=await scene(page,'Wizard');await page.locator('[data-nav=spells]').click();
 await page.locator('[data-c="ability:frost"]').focus();await expect(page.locator('#battleActionDetail')).toContainText('Frost Lance');await expect(page.locator('#battleActionDetail')).toContainText('2d6 + 6');
 await page.locator('[data-c="ability:bolt"]').click();await page.locator('[data-c="target:e0"]').click();
 await expect(page.locator('.event-action')).toContainText('Arcane Bolt');expect(await page.evaluate(()=>window.AshenRealms.getState().party[0].mp)).toBe(37);expect(errors).toEqual([]);
});
for(const viewport of [{width:390,height:844},{width:640,height:360}]){
 test(`mobile action details open and close at ${viewport.width}×${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);const errors=await scene(page);await page.locator('[data-c=skills]').click();
  await page.locator('[data-c="ability:backstab"]').hover();await page.locator('[data-inspect-toggle]').click();
  await expect(page.locator('#battleActionDetail')).toBeVisible();await expect(page.locator('#battleActionDetail')).toContainText('Requires Hidden');
  await page.locator('[data-inspect-toggle]').click();await expect(page.locator('#battleActionDetail')).toBeHidden();
  const state=await page.evaluate(()=>window.AshenRealms.getState());expect(state.party[0].mp).toBe(40);
  await page.screenshot({path:`artifacts/battle-reference/mobile-${viewport.width}-${viewport.height}.png`});expect(errors).toEqual([]);
 });
}
