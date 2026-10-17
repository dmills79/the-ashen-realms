import {test,expect} from '@playwright/test';
import {finishCreation} from './creation-helpers.mjs';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/overnight',{recursive:true});

test('female Elf Wizard identity survives review, HUD, combat and reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});
 await page.goto('/');await page.getByRole('button',{name:'Begin a New Adventure',exact:true}).click();
 await page.getByRole('button',{name:'FEMALE',exact:true}).click();
 await page.getByRole('button',{name:'Choose Elf ancestry',exact:true}).click();
 await page.locator('[data-action="next"]').click();await page.getByRole('button',{name:'Choose Wizard class',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="next"]').click();
 await page.locator('[data-action="roll-all"]').click();await expect(page.locator('[data-action="next"]')).toBeEnabled();
 await page.locator('[data-action="next"]').click();await page.locator('[data-action="next"]').click();
 await expect(page.locator('.lineage-portrait img')).toHaveAttribute('src','assets/identity/elf_wizard_female.png');
 expect(await page.locator('.lineage-portrait img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.locator('[data-action="next"]').click();
 await expect(page.locator('#worldPartyRoster img')).toHaveAttribute('src','assets/identity/elf_wizard_female.png');
 await page.reload();await page.evaluate(()=>window.AshenRealms.load());
 expect(await page.evaluate(()=>window.AshenRealms.getState().party[0].appearance)).toBe('female');
 await page.evaluate(()=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.party[0].poison=2;g.party[0].stats[1]=20});a.beginCombat(['slime'])});
 await expect(page.locator('.cinema-member img')).toHaveAttribute('src','assets/identity/elf_wizard_female.png');
 await expect(page.locator('.cinema-stat.experience')).toContainText('to go');
 await expect(page.locator('.condition-poison')).toHaveCount(1);
 await expect(page.locator('.condition-guard')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('crypt entry back and Escape preserve quests, supplies, steps and saved adventure',async({page})=>{
 await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});await page.goto('/');
 await page.evaluate(()=>{const a=window.AshenRealms;a.newGame('Scout','Human','Rogue');a.test.modifyGame(g=>{g.location='wild';g.x=36;g.y=22});a.save()});
 const before=await page.evaluate(()=>window.AshenRealms.getState()),saved=await page.evaluate(()=>localStorage.getItem('ashen-realms-v1.2-save'));
 await page.evaluate(()=>window.AshenRealms.move(1,0));await expect(page.locator('#modal')).toHaveAttribute('data-screen','location-entry');
 expect(await page.evaluate(()=>window.AshenRealms.getState().flags.ritual)).toBe(false);
 await expect(page.locator('.arrival-adventurer')).toBeVisible();
 expect((await page.locator('.arrival-adventurer').boundingBox()).width).toBeGreaterThan(20);
 await expect.poll(()=>page.locator('.arrival-adventurer').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.screenshot({path:'artifacts/overnight/crypt-arrival.png'});
 await page.getByRole('button',{name:'← GO BACK',exact:true}).click();
 const afterBack=await page.evaluate(()=>window.AshenRealms.getState());
 expect(afterBack.world.clock.minutes).toBeGreaterThanOrEqual(before.world.clock.minutes);
 afterBack.world.clock.minutes=before.world.clock.minutes;
 expect(afterBack).toEqual({...before,dir:'right'});
 expect(await page.evaluate(()=>localStorage.getItem('ashen-realms-v1.2-save'))).toBe(saved);
 await page.evaluate(()=>window.AshenRealms.move(1,0));await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>window.AshenRealms.getState().location)).toBe('wild');
 expect(await page.evaluate(()=>window.AshenRealms.getState().x)).toBe(36);
 await page.evaluate(()=>window.AshenRealms.move(1,0));await page.getByRole('button',{name:'CONTINUE →',exact:true}).click();
 expect(await page.evaluate(()=>window.AshenRealms.getState().location)).toBe('crypt');
 expect(await page.evaluate(()=>window.AshenRealms.getState().flags.ritual)).toBe(true);
 await page.evaluate(()=>window.AshenRealms.action('exit'));expect(await page.evaluate(()=>window.AshenRealms.getState().location)).toBe('wild');
});

test('directional painted bodies face all four directions without changing movement speed',async({page})=>{
 await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});await page.goto('/');
 await page.evaluate(()=>window.AshenRealms.newGame('Scout','Elf','Wizard',null,null,'female'));
 for(const [dx,dy,direction] of [[0,-1,'up'],[1,0,'right'],[0,1,'down'],[-1,0,'left']]){
  await page.evaluate(({dx,dy})=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.location='wild';g.x=10;g.y=15});a.move(dx,dy)},{dx,dy});
  await expect.poll(()=>page.evaluate(direction=>window.AshenIdentity.debug().draws.some(d=>d.direction===direction&&d.appearance==='female'&&d.id==='wizard'),direction)).toBe(true);
 }
});

test('seven soundscapes load, crossfade, mute and persist volume separately from saves',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});await page.goto('/');
 await page.getByRole('button',{name:'SETTINGS',exact:false}).click();
 await page.locator('#musicVolume').fill('30');await page.locator('#effectsVolume').fill('40');
 expect(await page.evaluate(()=>window.AshenAudio.preferences())).toEqual({music:.3,effects:.4});
 await page.evaluate(()=>window.AshenRealms.newGame('Listener','Human','Fighter'));
 for(const key of ['title','tavern','havenmere','wilderness','crypt','combat','boss']){
  await page.evaluate(key=>window.AshenAudio.play(key),key);
  await expect.poll(()=>page.evaluate(()=>window.AshenAudio.debug().paused)).toBe(false);
  expect(await page.evaluate(()=>window.AshenAudio.debug().active)).toBeLessThanOrEqual(2);
 }
 await page.evaluate(()=>window.AshenAudio.stop());expect(await page.evaluate(()=>window.AshenAudio.debug().active)).toBe(0);
 await page.reload();expect(await page.evaluate(()=>window.AshenAudio.preferences())).toEqual({music:.3,effects:.4});
 expect(errors).toEqual([]);
});

test('Rogue hides for a later backstab; field skill and equipment affect real state',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});await page.goto('/');
 await page.evaluate(()=>{const a=window.AshenRealms;a.newGame('Rook','Halfling','Rogue');a.test.modifyGame(g=>{g.party[0].stats[1]=24;g.party[0].hp=g.party[0].maxHp=300;g.party[0].mp=g.party[0].maxMp=100})});
 await page.evaluate(()=>window.AshenRealms.spellbook());await page.locator('[data-action^="cast:"][data-action$=":silent"]').click();
 expect(await page.evaluate(()=>window.AshenRealms.getState().party[0].silentSteps)).toBe(12);await page.keyboard.press('Escape');
 await page.evaluate(()=>{const a=window.AshenRealms;a.beginCombat(['slime']);a.test.modifyCombat(c=>{c.enemies[0].hp=c.enemies[0].maxHp=300;c.enemies[0].ac=1})});
 await page.locator('[data-c="skills"]').click();await expect(page.locator('[data-c="ability:backstab"]')).toBeDisabled();await page.locator('[data-c="ability:hide"]').click();
 await expect(page.locator('.condition-hidden')).toHaveCount(1);await expect(page.locator('[data-c="attack"]')).toBeVisible();
 await page.locator('[data-c="skills"]').click();await expect(page.locator('[data-c="ability:backstab"]')).toBeEnabled();await page.locator('[data-c="ability:backstab"]').click();await page.locator('[data-c="target:e0"]').click();
 await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getCombat().enemies[0].hp)).toBe(278);
 expect(await page.evaluate(()=>window.AshenRealms.getState().party[0].mp)).toBe(96);await expect(page.locator('.condition-hidden')).toHaveCount(0);
 await page.evaluate(()=>{const a=window.AshenRealms;a.test.modifyCombat(c=>c.enemies[0].hp=0);a.test.resolveWin()});await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>window.AshenRealms.getState().party[0].hidden)).toBeUndefined();
 await page.evaluate(()=>{const a=window.AshenRealms;a.test.modifyGame(g=>{g.bag.runestaff=1;g.bag.silvermail=1});a.openInventory()});
 await expect(page.locator('.equipped-slot')).toHaveCount(2);await page.locator('[data-action="use:runestaff"]').click();await page.locator('[data-action="member:0"]').click();
 await expect(page.locator('.equipped-slot')).toContainText(['Runestaff','No armor']);
 expect(await page.evaluate(()=>window.AshenRealms.getAbilities()[0].known)).toContain('runeflare');
 await page.locator('[data-action="use:silvermail"]').click();await page.locator('[data-action="member:0"]').click();await expect(page.locator('.equipped-character header')).toContainText('AC 21');
 await page.screenshot({path:'artifacts/overnight/equipment.png'});
 await page.locator('[data-action^="unequip:"][data-action$=":weapon"]').click();expect(await page.evaluate(()=>window.AshenRealms.getState().bag.runestaff)).toBe(1);expect(await page.evaluate(()=>window.AshenRealms.getAbilities()[0].known)).not.toContain('runeflare');
 expect(errors).toEqual([]);
});

test('all 32 ancestry/class/appearance identities render their own painted bodies',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});await page.goto('/');
 for(const ancestry of ['Human','Elf','Dwarf','Halfling'])for(const role of ['Fighter','Rogue','Wizard','Cleric'])for(const appearance of ['male','female']){
  await page.evaluate(({ancestry,role,appearance})=>window.AshenRealms.newGame('Identity',ancestry,role,null,null,appearance),{ancestry,role,appearance});
  await expect.poll(()=>page.evaluate(({ancestry,role,appearance})=>window.AshenIdentity.debug().draws.some(d=>d.ancestry===ancestry&&d.id===role.toLowerCase()&&d.appearance===appearance&&d.direction==='up'),{ancestry,role,appearance})).toBe(true);
 }
 expect(errors).toEqual([]);
});

test('both rune seals still unlock the Warden and the main quest completes',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});await page.goto('/');
 await page.evaluate(()=>{const a=window.AshenRealms;a.newGame('Questkeeper','Dwarf','Cleric');a.action('elder');a.closeModal();a.test.modifyGame(g=>{g.location='wild';g.x=36;g.y=22});a.move(1,0)});
 await page.locator('[data-action="enter"]').click();
 for(const seal of ['leverA','leverB']){await page.evaluate(seal=>window.AshenRealms.action(seal),seal);await page.keyboard.press('Escape')}
 expect(await page.evaluate(()=>window.AshenRealms.getState().flags.gate)).toBe(true);
 await page.evaluate(()=>window.AshenRealms.action('altar'));await page.locator('[data-action="fight"]').click();
 await expect(page.locator('html')).toHaveClass(/cinematic-battle/);
 await page.screenshot({path:'artifacts/overnight/crypt-combat.png'});
 await page.evaluate(()=>{const a=window.AshenRealms;a.test.modifyCombat(c=>c.enemies.forEach(e=>e.hp=0));a.test.resolveWin()});await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>window.AshenRealms.getState().flags.boss)).toBe(true);expect(await page.evaluate(()=>window.AshenRealms.getState().bag.ember)).toBe(1);
 await page.evaluate(()=>{const a=window.AshenRealms;a.action('exit');a.action('elder')});await page.locator('[data-action="seal"]').click();
 expect(await page.evaluate(()=>window.AshenRealms.getState().flags.ending)).toBe('seal');await page.reload();await page.evaluate(()=>window.AshenRealms.load());
 expect(await page.evaluate(()=>window.AshenRealms.getState().flags.ending)).toBe('seal');expect(errors).toEqual([]);
});
