import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const screenshots='artifacts/character-overhaul';
mkdirSync(screenshots,{recursive:true});

async function setup(page,role='Fighter'){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>window.AshenSprites?.debug().ready.length)).toBe(4);
  await page.evaluate(role=>{
    const api=window.AshenRealms;api.newGame('Arden','Human',role);api.closeModal();
    api.test.modifyGame(g=>{g.party[0].stats[1]=20;g.party[0].hp=g.party[0].maxHp=300;g.party[0].mp=g.party[0].maxMp=100});
    const renderer=window.AshenSprites,draw=renderer.draw;
    window.__spriteDraws=[];
    renderer.draw=(ctx,id,x,y,options)=>{
      const result=draw(ctx,id,x,y,options);
      window.__spriteDraws.push({id,state:options?.state||'idle',height:options?.height,result});
      if(window.__spriteDraws.length>300)window.__spriteDraws.shift();return result;
    };
  },role);
  return errors;
}

async function drawn(page,id,state){
  await expect.poll(()=>page.evaluate(({id,state})=>window.__spriteDraws.some(d=>d.id===id&&d.state===state&&d.result),{id,state})).toBe(true);
}

test('all replacement characters and six animation states render in the atelier',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/characters.html');
  await expect(page.locator('#status')).toContainText('16 / 16 sheets ready');
  await expect(page.locator('article')).toHaveCount(16);
  await expect(page.locator('article img')).toHaveCount(4);
  for(const state of ['idle','walk','attack','cast','hit','death']){
    await page.locator(`[data-state="${state}"]`).click();
    await expect(page.locator(`[data-state="${state}"]`)).toHaveAttribute('aria-pressed','true');
    if(state==='death')await page.waitForTimeout(750);
    await page.screenshot({path:`${screenshots}/atelier-${state}.png`,fullPage:true});
  }
  expect(errors).toEqual([]);
});

test('new assets render in exploration and battle; real hits and deaths animate without extra turns',async({page})=>{
  const errors=await setup(page);
  await drawn(page,'fighter','idle');
  await page.keyboard.press('ArrowRight');await drawn(page,'fighter','walk');
  await page.evaluate(()=>{window.__spriteDraws=[];window.AshenRealms.move(1,0)});
  await drawn(page,'fighter','walk');
  await page.evaluate(()=>{
    const api=window.AshenRealms;api.action('cleric');api.closeModal();api.action('rogue');api.closeModal();
    api.test.modifyGame(g=>g.party.forEach((h,i)=>h.id='hero-'+i));
    api.beginCombat(['wolf','slime']);
    api.test.modifyCombat(c=>{c.enemies[0].hp=1;c.enemies[1].hp=c.enemies[1].maxHp=300});
  });
  await expect.poll(()=>page.evaluate(()=>window.AshenSprites.ready('wolf')&&window.AshenSprites.ready('slime'))).toBe(true);
  await drawn(page,'cleric','idle');await drawn(page,'rogue','idle');await drawn(page,'wolf','idle');await drawn(page,'slime','idle');
  await page.screenshot({path:screenshots+'/party-vs-wolf-slime.png'});
  await page.locator('[data-c="attack"]').click();await page.locator('[data-c="target:e0"]').click();
  await drawn(page,'fighter','attack');await drawn(page,'wolf','death');
  await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getCombat().turn)).toBe(1);
  await page.screenshot({path:screenshots+'/wolf-defeated.png'});
  const state=await page.evaluate(()=>window.AshenRealms.getState());
  expect(state.party.some(h=>'visualState' in h||'reaction' in h)).toBe(false);
  expect(errors).toEqual([]);
});

test('casting, hit reactions and shadow-scaled world NPCs use the new renderer',async({page})=>{
  const errors=await setup(page,'Wizard');
  await page.evaluate(()=>window.AshenRealms.action('campGate'));
  await expect.poll(()=>page.evaluate(()=>window.AshenSprites.ready('warboss'))).toBe(true);
  await drawn(page,'warboss','idle');
  expect(await page.evaluate(()=>window.__spriteDraws.filter(d=>d.id==='warboss'&&d.result).at(-1).height)).toBe(52);
  await page.evaluate(()=>{
    window.AshenRealms.beginCombat(['orc']);window.AshenRealms.test.modifyCombat(c=>c.enemies[0].hp=c.enemies[0].maxHp=300);
  });
  await expect.poll(()=>page.evaluate(()=>window.AshenSprites.ready('orc'))).toBe(true);
  await page.locator('[data-c="skills"]').click();await page.locator('[data-c="ability:bolt"]').click();await page.locator('[data-c="target:e0"]').click();
  await drawn(page,'wizard','cast');await drawn(page,'orc','hit');
  expect(errors).toEqual([]);
});

test('a missing replacement sheet preserves the original working character renderer',async({page})=>{
  await page.route('**/assets/characters_v2/fighter.png',route=>route.abort());
  const errors=await setupFallback(page);
  await expect(page.locator('html')).toHaveClass(/world-explore/);
  expect(await page.evaluate(()=>window.AshenSprites.ready('fighter'))).toBe(false);
  await page.keyboard.press('ArrowRight');
  await page.evaluate(()=>window.AshenRealms.beginCombat(['wolf']));
  await expect(page.locator('[data-c="attack"]')).toBeVisible();
  await page.locator('[data-c="attack"]').click();await expect(page.locator('[data-c="target:e0"]')).toBeVisible();
  expect(errors).toEqual([]);
});

async function setupFallback(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Math.random=()=>.6);
  await page.goto('/');
  await page.evaluate(()=>{window.AshenRealms.newGame('Arden','Human','Fighter');window.AshenRealms.closeModal()});
  return errors;
}
