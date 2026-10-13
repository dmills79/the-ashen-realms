import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/tavern-creator',{recursive:true});
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.addInitScript(()=>{window.__ASHEN_TEST__=true;window.__rngCalls=0;Math.random=()=>{const n=window.__rngCalls++;return ((n*7+3)%23)/23}});
 await page.goto('/');await page.getByRole('button',{name:'Begin a New Adventure',exact:true}).click();
 await expect(page.locator('#modal')).toHaveAttribute('data-stage','1');return errors;
}
const state=page=>page.evaluate(()=>window.AshenTavern.debug());
const next=page=>page.locator('[data-action="next"]').click();
async function rollAll(page,reduced=true){if(reduced)await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="roll-all"]').click();await expect(page.locator('[data-action="next"]')).toBeEnabled()}
for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[390,844],[360,640],[844,390],[640,360]]){
 test(`tavern stages, review and saved hero at ${width}×${height}`,async({page})=>{
  await page.setViewportSize({width,height});const errors=await setup(page);
  await expect(page.locator('#heroName')).toBeFocused();await page.locator('#heroName').fill('Arden');
  await page.getByRole('button',{name:'Choose Elf ancestry',exact:true}).click();
  expect((await state(page)).rolls).toHaveLength(0);
  for(let stage=1;stage<=5;stage++){
   if(stage===2)await page.getByRole('button',{name:'Choose Wizard class',exact:true}).click();
   if(stage===3){await rollAll(page);expect((await state(page)).dice.available).toBe(true);expect((await state(page)).dice.values).toEqual((await state(page)).rolls.at(-1).dice)}
   await expect(page.locator('#modal')).toHaveAttribute('data-stage',String(stage));
   const dimensions=await page.evaluate(()=>{const body=document.querySelector('.tavern-body'),b=document.querySelector('[data-action="next"]').getBoundingClientRect();return {fits:document.documentElement.scrollWidth<=innerWidth&&body.scrollWidth<=body.clientWidth+1,bottom:b.bottom,height:b.height}});
   expect(dimensions.fits).toBe(true);expect(dimensions.bottom).toBeLessThanOrEqual(height+1);expect(dimensions.height).toBeGreaterThanOrEqual(44);
   await page.screenshot({path:`artifacts/tavern-creator/${width}-${height}-stage-${stage}.png`});
   if(stage<5)await next(page);
  }
  const draft=await state(page);expect(await page.locator('[data-review-stat]').allTextContents()).toEqual(draft.preview.stats.map(String));
  await page.locator('[data-action="back"]').click();expect((await state(page)).rolls).toEqual(draft.rolls);await next(page);await next(page);
  await expect(page.locator('html')).toHaveClass(/world-explore/);const hero=await page.evaluate(()=>window.AshenRealms.getState().party[0]);
  expect(hero.stats).toEqual(draft.preview.stats);expect(hero.maxHp).toBe(draft.preview.maxHp);expect(hero.maxMp).toBe(draft.preview.maxMp);expect(hero.ancestryModifiers).toEqual([-1,2,-1,1,0,0]);expect(hero.ancestryRuleSet).toBe('tavern-v2');expect(errors).toEqual([]);
 });
}

test('physical dice travel, bounce and settle on the sampled faces for all six rolls',async({page})=>{
 const errors=await setup(page);await next(page);await next(page);await expect.poll(async()=>!!(await state(page)).dice?.tableReady).toBe(true);
 const calls=await page.evaluate(()=>window.__rngCalls);
 await page.locator('[data-action="roll-one"]').click();await page.waitForTimeout(180);
 await page.screenshot({path:'artifacts/tavern-creator/physical-dice-airborne.png'});const moving=await state(page);expect(moving.dice.busy).toBe(true);expect(moving.dice.positions.some(p=>p[1]>.6)).toBe(true);
 await expect.poll(async()=>(await state(page)).busy).toBe(false);
 let draft=await state(page);expect(draft.dice.values).toEqual(draft.rolls[0].dice);expect(await page.evaluate(()=>window.__rngCalls)).toBe(calls+4);
 await page.locator('[data-action="roll-all"]').click();await expect(page.locator('[data-action="next"]')).toBeEnabled();draft=await state(page);
 expect(await page.evaluate(()=>window.__rngCalls)).toBe(calls+24);expect(draft.rolls).toHaveLength(6);
 for(const [i,roll] of draft.rolls.entries()){
  await page.locator(`[data-action="show:${i}"]`).click();const current=await state(page);expect(current.dice.values).toEqual(roll.dice);expect(current.dice.discarded).toBe(roll.drop);expect(roll.score).toBe(roll.dice.reduce((a,b)=>a+b,0)-Math.min(...roll.dice));
 }
 await page.screenshot({path:'artifacts/tavern-creator/physical-dice-settled.png'});expect(errors).toEqual([]);
});

test('all ancestry/class bonuses apply once; going backwards preserves rolls and saves',async({page})=>{
 const errors=await setup(page);await next(page);await next(page);await rollAll(page);await next(page);
 const original=await state(page),calls=await page.evaluate(()=>window.__rngCalls);await page.evaluate(()=>localStorage.setItem('ashen-realms-v1.2-save','previous adventure'));
 const ancestries={Human:[0,0,0,0,0,0],Elf:[-1,2,-1,1,0,0],Dwarf:[1,-1,2,0,0,-1],Halfling:[-1,2,-1,0,0,1]},classes={Fighter:[1,0,1,0,0,0],Rogue:[0,1,0,0,0,1],Wizard:[0,0,0,1,1,0],Cleric:[0,0,1,0,1,0]};
 for(const [ancestry,mods] of Object.entries(ancestries)){
  await page.locator('[data-action="stage:1"]').click();await page.getByRole('button',{name:`Choose ${ancestry} ancestry`,exact:true}).click();
  for(const [role,training] of Object.entries(classes)){
   await page.locator('[data-action="stage:2"]').click();await page.getByRole('button',{name:`Choose ${role} class`,exact:true}).click();
   const draft=await state(page);expect(draft.rolls).toEqual(original.rolls);expect(draft.preview.stats).toEqual(draft.assigned.map((r,i)=>original.rolls[r].score+mods[i]+training[i]));
  }
 }
 expect(await page.evaluate(()=>window.__rngCalls)).toBe(calls);expect(await page.evaluate(()=>localStorage.getItem('ashen-realms-v1.2-save'))).toBe('previous adventure');expect(errors).toEqual([]);
});

test('unique swaps, keyboard editing, reduced motion and safe final names',async({page})=>{
 const errors=await setup(page);await page.locator('#heroName').fill('Arden');await page.keyboard.press('ArrowLeft');await page.keyboard.type('X');await expect(page.locator('#heroName')).toHaveValue('ArdeXn');
 await next(page);await next(page);await rollAll(page);await next(page);
 const original=await state(page);await page.locator('#assign0').selectOption(String(original.assigned[1]));const swapped=await state(page);expect(swapped.assigned[1]).toBe(original.assigned[0]);expect(new Set(swapped.assigned).size).toBe(6);
 await page.locator('[data-action="select:2"]').focus();await page.keyboard.press('Space');await page.locator('[data-action="apply:0"]').focus();await page.keyboard.press('Space');expect((await state(page)).assigned[0]).toBe(2);
 await page.keyboard.press('Escape');await expect(page.locator('#modal')).toHaveAttribute('data-stage','3');expect((await state(page)).rolls).toEqual(original.rolls);
 await page.locator('[data-action="stage:1"]').click();await page.locator('#heroName').fill('<img src=x>');await page.locator('[data-action="stage:4"]').click();await next(page);await expect(page.locator('.final-ledger h3').first()).toHaveText('<img src=x>');expect(errors).toEqual([]);
});

test('loss of WebGL is explicit and still preserves valid dice and creation',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){if(type==='webgl')return null;return original.call(this,type,...rest)}});
 const errors=await setup(page);await next(page);await next(page);await expect(page.locator('#diceNotice')).toContainText('3D rendering is unavailable');await rollAll(page);await next(page);await next(page);await next(page);await expect(page.locator('html')).toHaveClass(/world-explore/);expect(errors).toEqual([]);
});

test('leaving during a roll preserves sampled scores and cancels stale animation work',async({page})=>{
 const errors=await setup(page);await next(page);await next(page);const calls=await page.evaluate(()=>window.__rngCalls);
 await page.locator('[data-action="roll-all"]').click();await page.waitForTimeout(120);await page.keyboard.press('Escape');await expect(page.locator('#modal')).toHaveAttribute('data-stage','2');
 const interrupted=await state(page);expect(interrupted.rolls).toHaveLength(1);await page.waitForTimeout(1550);expect((await state(page)).rolls).toEqual(interrupted.rolls);expect(await page.evaluate(()=>window.__rngCalls)).toBe(calls+4);
 await next(page);await rollAll(page);const completed=await state(page);expect(completed.rolls[0]).toEqual(interrupted.rolls[0]);expect(completed.rolls).toHaveLength(6);expect(await page.evaluate(()=>window.__rngCalls)).toBe(calls+24);expect(errors).toEqual([]);
});

test('an interrupted WebGL context reports the loss while preserving all sampled outcomes',async({page})=>{
 const errors=await setup(page);await next(page);await next(page);await page.locator('[data-action="roll-all"]').click();await page.waitForTimeout(120);
 await page.evaluate(()=>document.getElementById('diceTable').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
 await expect(page.locator('#diceNotice')).toContainText('3D rendering was interrupted');await expect(page.locator('[data-action="next"]')).toBeEnabled();
 const draft=await state(page);expect(draft.dice.available).toBe(false);expect(draft.rolls).toHaveLength(6);for(const roll of draft.rolls)expect(roll.score).toBe(roll.dice.reduce((a,b)=>a+b,0)-Math.min(...roll.dice));
 await next(page);await next(page);await next(page);await expect(page.locator('html')).toHaveClass(/world-explore/);expect(errors).toEqual([]);
});
