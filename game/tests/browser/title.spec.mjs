import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {finishCreation} from './creation-helpers.mjs';
mkdirSync('artifacts/title-overhaul',{recursive:true});
const begin='Begin a New Adventure',resume='Continue Saved Journey';
function errors(page){const result=[];page.on('pageerror',e=>result.push(e.message));return result}

for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[390,844],[360,640],[844,390],[640,360]]){
 test(`title menu, settings and keyboard at ${width}×${height}`,async({page})=>{
  const failures=errors(page);await page.setViewportSize({width,height});await page.goto('/');
  await expect(page.locator('#modal')).toHaveAttribute('data-screen','title-menu');
  await expect(page.getByRole('button',{name:resume,exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:begin,exact:true})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const button of await page.locator('.title-actions button').all()){
   const box=await button.boundingBox();expect(box.width).toBeGreaterThan(200);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
  }
  await page.screenshot({path:`artifacts/title-overhaul/${width}-${height}-title.png`});
  await page.locator('[data-action="settings"]').click();
  await expect(page.getByRole('switch',{name:'Sound and music'})).toBeFocused();
  await page.screenshot({path:`artifacts/title-overhaul/${width}-${height}-settings.png`});
  await page.keyboard.press('Escape');await expect(page.locator('#modal')).toHaveAttribute('data-screen','title-menu');
  await page.getByRole('button',{name:begin,exact:true}).focus();await page.keyboard.press('Space');
  await expect(page.locator('#heroName')).toBeVisible();
  await finishCreation(page);
  await expect(page.locator('html')).toHaveClass(/world-explore/);await expect(page.locator('#titleScene')).toBeHidden();
  expect(failures).toEqual([]);
 });
}

test('settings persist independently; Continue restores the existing adventure',async({page})=>{
 const failures=errors(page);await page.goto('/');
 await page.evaluate(()=>{window.AshenRealms.newGame('Rook','Human','Rogue');window.AshenRealms.closeModal();window.AshenRealms.save()});
 const save=await page.evaluate(()=>localStorage.getItem('ashen-realms-v1.2-save'));
 await page.reload();await expect(page.getByRole('button',{name:resume,exact:true})).toBeEnabled();
 await page.locator('[data-action="settings"]').click();
 await page.getByRole('switch',{name:'Sound and music'}).click();await expect(page.getByRole('switch',{name:'Sound and music'})).toHaveAttribute('aria-checked','false');
 await page.getByRole('switch',{name:'Title atmosphere'}).click();
 await page.locator('[data-action="zoom"]').click();
 expect(await page.evaluate(()=>localStorage.getItem('ashen-realms-v1.2-save'))).toBe(save);
 await page.reload();await expect(page.locator('html')).toHaveClass(/title-motion-paused/);
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.title-art')).animationName)).toBe('none');
 await page.locator('[data-action="settings"]').click();
 await expect(page.getByRole('switch',{name:'Sound and music'})).toHaveAttribute('aria-checked','false');
 await expect(page.locator('[data-action="zoom"]')).toHaveText('90%');
 await page.locator('[data-action="back"]').click();await expect(page.locator('[data-action="settings"]')).toBeFocused();
 await page.getByRole('button',{name:resume,exact:true}).click();
 await expect(page.locator('html')).toHaveClass(/world-explore/);
 expect(await page.evaluate(()=>window.AshenRealms.getState().party[0].name)).toBe('Rook');
 expect(await page.evaluate(()=>window.AshenRealms.getZoom())).toBe(.9);
 await expect(page.locator('#worldSoundBtn')).toHaveText('SOUND OFF');expect(failures).toEqual([]);
});

test('system reduced motion and unavailable new artwork preserve a working menu',async({page})=>{
 const failures=errors(page);await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/assets/title_v4/havenmere_night.png',route=>route.abort());await page.goto('/');
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.title-art')).animationName)).toBe('none');
 await page.locator('[data-action="help"]').click();await expect(page.locator('#modal')).toContainText("ADVENTURER'S MANUAL");
 await page.getByRole('button',{name:'Return to Title',exact:true}).click();
 await expect(page.getByRole('button',{name:begin,exact:true})).toBeVisible();expect(failures).toEqual([]);
});

test('restricted storage leaves New Game and presentation controls usable',async({page})=>{
 const failures=errors(page);
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Restricted storage')};Storage.prototype.setItem=()=>{throw Error('Restricted storage')}});
 await page.goto('/');await expect(page.getByRole('button',{name:resume,exact:true})).toBeDisabled();
 await page.locator('[data-action="settings"]').click();await page.getByRole('switch',{name:'Title atmosphere'}).click();
 await expect(page.getByRole('switch',{name:'Title atmosphere'})).toHaveAttribute('aria-checked','false');
 await page.locator('[data-action="back"]').click();await page.getByRole('button',{name:begin,exact:true}).click();
 await expect(page.locator('#heroName')).toBeVisible();expect(failures).toEqual([]);
});
