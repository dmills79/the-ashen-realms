import {test,expect} from '@playwright/test';
import {finishCreation} from './creation-helpers.mjs';

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
