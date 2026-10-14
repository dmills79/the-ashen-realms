import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/formation',{recursive:true});

async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});await page.goto('/');
 await page.evaluate(()=>{const a=window.AshenRealms;a.newGame('Arden','Human','Fighter');a.test.addAlly('Wizard');a.test.addAlly('Cleric');a.test.modifyGame(g=>g.party.forEach((h,i)=>{h.id='member-'+i;h.stats=[16,20-i*2,14,16,16,12]}));a.save()});
 return errors;
}
test('actual party menu configures every member, restores focus and survives reload',async({page})=>{
 const errors=await setup(page);await page.locator('#worldPartyBtn').click();await page.getByRole('button',{name:'PARTY FORMATION',exact:true}).click();
 await expect(page.locator('.formation-member')).toHaveCount(3);
 await page.locator('[data-action="row:member-0:back"]').click();await expect(page.locator('[data-action="row:member-0:back"]')).toBeFocused();
 await page.locator('[data-action="row:member-1:front"]').click();await expect(page.locator('[data-action="row:member-1:front"]')).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:'artifacts/formation/party-formation.png'});await page.reload();await page.evaluate(()=>window.AshenRealms.load());
 expect(await page.evaluate(()=>window.AshenRealms.getState().party.map(h=>h.row))).toEqual(['back','front','back']);
 await page.evaluate(()=>window.AshenRealms.beginCombat(['wolf']));
 await expect(page.locator('.row-badge')).toHaveText(['BACK','FRONT','BACK']);
 const before=await page.evaluate(()=>window.AshenRealms.getCombat().queue);
 expect(await page.evaluate(()=>window.AshenRealms.setFormation('member-0','front'))).toBe(false);
 expect(await page.evaluate(()=>window.AshenRealms.getCombat().queue)).toEqual(before);
 expect(before[0].id).toBe('member-0'); // Fastest hero acts first even from the back row.
 expect(errors).toEqual([]);
});
for(const [phase,steps] of [['day',0],['evening',300],['night',400],['dusk-blend',260]]){
 test(`integrated ${phase} forest loads, preserves artwork and shows initiative on phones`,async({page})=>{
  const errors=await setup(page);await page.evaluate(steps=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.location='wild';g.steps=steps});a.beginCombat(['wolf','orc']);},steps);
  for(const name of ['day','evening','night'])expect((await page.request.get(`/assets/battle/forest_${name}.jpg`)).status()).toBe(200);
  await expect(page.locator('.initiative-actor.current img')).toBeVisible();await expect(page.locator('[data-c=attack] small')).toBeVisible();
  await page.waitForFunction(()=>window.AshenIdentity.debug().draws.some(d=>d.mode==='combat')||window.AshenIdentity.debug().draws.length>0);
  await page.screenshot({path:`artifacts/formation/forest-${phase}.png`});
  await page.setViewportSize({width:390,height:844});await expect(page.locator('.turn-order')).toBeVisible();await expect(page.locator('.row-badge').first()).toBeVisible();
  expect(await page.locator('.row-badge').first().evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right})).toBe(true);
  expect(errors).toEqual([]);
 });
}
test('normal encounter plays through items, guarding, spells, attacks and victory',async({page})=>{
 test.setTimeout(60000);const errors=await setup(page);
 await page.evaluate(()=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.location='wild';g.party=g.party.slice(0,2);g.party.forEach(h=>{h.hp=10;h.maxHp=100;h.mp=h.maxMp=50})});a.beginCombat(['slime']);a.test.modifyCombat(c=>{c.enemies[0].hp=c.enemies[0].maxHp=28;c.enemies[0].atk=-1;c.enemies[0].dmg=1;c.enemies[0].dex=-2})});
 await page.locator('[data-c=item]').click();await page.locator('[data-c="item:potion"]').click();await page.locator('[data-c="ally:member-0"]').click();await expect(page.locator('.event-heal')).toContainText('Arden');
 await expect(page.locator('.turntext strong')).toHaveText('Wizard');await page.locator('[data-c=skills]').click();await page.locator('[data-c="ability:bolt"]').click();await page.locator('[data-c="target:e0"]').click();
 await expect(page.locator('.event-action')).toContainText('Arcane Bolt');await expect(page.locator('.turntext strong')).toHaveText('Arden');await page.locator('[data-c=guard]').click();await expect(page.locator('.condition-guard')).toHaveCount(1);
 await expect(page.locator('.turntext strong')).toHaveText('Wizard');await page.locator('[data-c=skills]').click();await page.locator('[data-c="ability:bolt"]').click();await page.locator('[data-c="target:e0"]').click();
 await expect(page.locator('.turntext strong')).toHaveText('Arden');await page.locator('[data-c=attack]').click();await page.locator('[data-c="target:e0"]').click();
 await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getMode())).toBe('explore');
 const state=await page.evaluate(()=>window.AshenRealms.getState());expect(state.gold).toBeGreaterThan(45);expect(state.bag.potion).toBe(3);expect(state.party.every(h=>h.hp>0)).toBe(true);expect(state.party[1].mp).toBe(44);
 expect(errors).toEqual([]);
});
test('bow attacks use a projectile, and successful retreat preserves formation',async({page})=>{
 const errors=await setup(page);await page.evaluate(()=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.location='wild';g.party[0].row='back';g.party[0].gear.weapon='oakbow';g.party[1].row='front'});a.beginCombat(['orc'])});
 await page.locator('[data-c=attack]').click();await page.locator('[data-c="target:e0"]').click();
 expect(await page.evaluate(()=>window.AshenRealms.getBattleFX().kind)).toBe('arrow');
 await expect(page.locator('[data-c=flee]')).toBeVisible();await page.locator('[data-c=flee]').click();await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getMode())).toBe('explore');
 expect(await page.evaluate(()=>window.AshenRealms.getState().party.map(h=>h.row))).toEqual(['back','front','back']);expect(errors).toEqual([]);
});
test('defeat returns the party safely to Havenmere with saved formation intact',async({page})=>{
 const errors=await setup(page);await page.evaluate(()=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.location='wild';g.party.forEach(h=>h.hp=1)});a.beginCombat(['shaman']);a.test.modifyCombat(c=>{c.queue=[{side:'enemy',id:'e0',roll:30}];c.turn=0;c.round=3});a.test.runEnemy()});
 await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getMode())).toBe('explore');
 const state=await page.evaluate(()=>window.AshenRealms.getState());expect(state.location).toBe('town');expect(state.party.every(h=>h.hp>0)).toBe(true);expect(state.party.map(h=>h.row)).toEqual(['front','back','back']);expect(errors).toEqual([]);
});
