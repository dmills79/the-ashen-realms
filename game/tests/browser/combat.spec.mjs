import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const screenshots='artifacts/visual-overhaul';
mkdirSync(screenshots,{recursive:true});

async function encounter(page){
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.6});
  await page.goto('/');
  await page.evaluate(()=>{
    const api=window.AshenRealms;
    api.newGame('Arden','Human','Fighter');
    api.action('cleric');api.closeModal();api.action('rogue');api.closeModal();
    api.test.setLevel(0,5);
    api.test.modifyGame(g=>{
      g.location='wild';g.x=9;g.y=16;
      g.party[0].stats[1]=20;
      g.party.forEach((h,i)=>{h.id='hero-'+i;h.maxHp=200;h.hp=160;h.maxMp=100;h.mp=100});
    });
    api.beginCombat(['slime','wolf','orc']);
    api.test.modifyCombat(c=>c.enemies.forEach(e=>{e.hp=e.maxHp=500}));
  });
  await expect(page.locator('html')).toHaveClass(/cinematic-battle/);
  await expect(page.locator('[data-c="attack"]')).toBeVisible();
  return errors;
}

async function layout(page){
  const metrics=await page.evaluate(()=>{
    const rect=selector=>{
      const r=document.querySelector(selector).getBoundingClientRect();
      return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    return {field:rect('#game'),panels:['.cinema-title','.cinema-party','.cinema-foes','#battlePanel'].map(rect),
      width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollHeight};
  });
  const {field,panels,width,height,scroll}=metrics;
  expect(field.width).toBeGreaterThan(width*.6);
  expect(field.height).toBeGreaterThanOrEqual(height<=550?125:height<=700?120:240);
  expect(scroll).toBeLessThanOrEqual(height+1);
  for(const p of panels){
    expect(p.width).toBeGreaterThan(0);expect(p.height).toBeGreaterThan(0);
    expect(p.x).toBeGreaterThanOrEqual(0);expect(p.right).toBeLessThanOrEqual(width+1);
    expect(p.bottom).toBeLessThanOrEqual(height+1);
    expect(Math.min(field.right,p.right)-Math.max(field.x,p.x)>1&&Math.min(field.bottom,p.bottom)-Math.max(field.y,p.y)>1).toBe(false);
  }
  await expect(page.locator('.sidepane')).toBeHidden();
  await expect(page.locator('#worldHud')).toBeHidden();
  await expect(page.locator('.cinema-member')).toHaveCount(3);
  for(const card of await page.locator('.cinema-member').all()){
    await expect(card.locator('img')).toBeVisible();
    await expect(card.locator('small')).toContainText('LV');
    const box=await card.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    const party=await page.locator('.cinema-party').boundingBox();
    expect(box.y+box.height).toBeLessThanOrEqual(party.y+party.height+1);
  }
  const command=page.locator('[data-c="attack"]');
  await expect(command).toBeVisible();
  const box=await command.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(height);
  const controls=await page.locator('.battle-controls').boundingBox();
  for(const button of await page.locator('[data-c]').all()){
    const bounds=await button.boundingBox();
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(controls.y+controls.height+1);
  }
}

for(const viewport of [{width:1440,height:900},{width:1920,height:1080},{width:1024,height:768},{width:390,height:844},{width:360,height:640},{width:844,height:390},{width:640,height:360}]){
  test(`combat layouts and party HUD at ${viewport.width}×${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    const errors=await encounter(page);
    for(const mode of ['expanded','windowed']){
      await layout(page);
      await page.screenshot({path:`${screenshots}/${viewport.width}-${viewport.height}-${mode}.png`});
      await page.locator('#cinemaMinimize').click();
      await expect(page.locator('html')).toHaveClass(mode==='expanded'?/cinema-compact/:/cinematic-battle/);
    }
    expect(errors).toEqual([]);
  });
}

test('keyboard critical attack, death, consumable healing and turn progression',async({page})=>{
  const errors=await encounter(page);
  await page.evaluate(()=>{Math.random=()=>.999;window.AshenRealms.test.modifyCombat(c=>{c.enemies[0].hp=1})});
  await page.keyboard.press('1');
  await expect(page.locator('[data-c="target:e0"]')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('.event-critical')).toContainText('Arden → Mire Slime');
  await expect(page.locator('.event-death')).toContainText('Mire Slime falls');
  await expect(page.locator('[data-c="item"]')).toBeVisible();
  await page.locator('[data-c="item"]').click();await page.locator('[data-c="item:ration"]').click();
  await expect(page.locator('.event-heal')).toHaveCount(3);
  expect(await page.evaluate(()=>window.AshenRealms.getState().bag.ration)).toBe(2);
  await expect(page.locator('.battle-round')).toContainText('ROUND 1');
  expect(errors).toEqual([]);
});

test('log scroll, escaping and focus survive command updates and view changes',async({page})=>{
  const errors=await encounter(page);
  await page.evaluate(()=>{
    window.AshenRealms.test.modifyCombat(c=>{
      c.log=Array.from({length:80},(_,i)=>({id:80-i,round:1,type:'hit',s:'<b>Escaped event</b> '+i,important:false}));c.eventSequence=80;
    });
  });
  const history=page.locator('.battlehistory');
  await expect(history.locator('li')).toHaveCount(80);
  await expect(history.locator('b')).toHaveCount(0);
  expect(await history.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  await history.evaluate(el=>{el.scrollTop=0});
  await page.locator('[data-c="skills"]').click();
  expect(await history.evaluate(el=>el.scrollTop)).toBe(0);
  await expect(page.locator('[data-c="ability:power"]')).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await history.evaluate(el=>el.scrollTop)).toBe(0);
  await page.locator('#cinemaMinimize').click();
  expect(await history.evaluate(el=>el.scrollTop)).toBe(0);
  await page.locator('[data-log-follow]').click();
  expect(await history.evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight)).toBeLessThan(2);
  const dimensions=await page.evaluate(()=>[innerHeight,document.documentElement.scrollHeight]);
  expect(dimensions[1]).toBeLessThanOrEqual(dimensions[0]+1);
  expect(errors).toEqual([]);
});

test('conditions, resizing during a spell, victory and return to exploration',async({page})=>{
  const errors=await encounter(page);
  await page.evaluate(()=>window.AshenRealms.test.modifyGame(g=>{g.party[1].poison=2;g.party[2].protectedThroughRound=2}));
  await expect(page.locator('.condition-poison')).toHaveAttribute('aria-label','Poison: 2 damage at the start of the next 2 turns.');
  await expect(page.locator('.condition-ward')).toHaveAttribute('aria-label','Protected: halves incoming damage through round 2.');
  await page.locator('[data-c="skills"]').click();await page.locator('[data-c="ability:sweep"]').click();
  await page.setViewportSize({width:640,height:360});
  await expect(page.locator('[data-c="attack"]')).toBeVisible();
  await layout(page);
  await page.evaluate(()=>{const api=window.AshenRealms;api.test.modifyCombat(c=>c.enemies.forEach(e=>e.hp=0));api.test.resolveWin()});
  await expect(page.locator('html')).toHaveClass(/world-explore/);
  await expect(page.locator('#battlePanel')).toBeHidden();
  await expect(page.locator('#worldHud')).toBeVisible();
  await page.keyboard.press('Escape');
  const before=await page.evaluate(()=>window.AshenRealms.getState().x);
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(()=>window.AshenRealms.getState().x)).toBe(before+1);
  expect(errors).toEqual([]);
});
