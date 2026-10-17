import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const cycleOne='artifacts/mobile-expansion/cycle-1';
const cycleTwo='artifacts/mobile-expansion/cycle-2';
mkdirSync(cycleOne,{recursive:true});mkdirSync(cycleTwo,{recursive:true});
test.use({hasTouch:true});

async function startMobileAdventure(page,viewport){
  await page.setViewportSize(viewport);
  await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.99});
  await page.goto('/');
  await page.evaluate(()=>{window.AshenRealms.newGame('Touchwarden','Human','Fighter');window.AshenRealms.closeModal()});
  await expect(page.locator('html')).toHaveClass(/world-explore/);
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
}

async function expectInsideViewport(page,selector){
  const viewport=page.viewportSize(),boxes=await page.locator(selector).evaluateAll(nodes=>nodes.filter(node=>getComputedStyle(node).visibility!=='hidden'&&getComputedStyle(node).display!=='none').map(node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));
  expect(boxes.length,selector+' has visible boxes').toBeGreaterThan(0);
  for(const box of boxes){
    expect(box.width,selector+' width').toBeGreaterThan(0);
    expect(box.height,selector+' height').toBeGreaterThan(0);
    expect(box.left,selector+' left').toBeGreaterThanOrEqual(-1);
    expect(box.top,selector+' top').toBeGreaterThanOrEqual(-1);
    expect(box.right,selector+' right').toBeLessThanOrEqual(viewport.width+1);
    expect(box.bottom,selector+' bottom').toBeLessThanOrEqual(viewport.height+1);
  }
}

async function expectNoPageOverflow(page){
  const overflow=await page.evaluate(()=>({html:document.documentElement.scrollWidth-window.innerWidth,body:document.body.scrollWidth-window.innerWidth}));
  expect(overflow.html).toBeLessThanOrEqual(0);
  expect(overflow.body).toBeLessThanOrEqual(0);
}

async function expectDockHitTestable(page){
  const controls=page.locator('.mobilepad button');
  await expect(controls).toHaveCount(6);
  for(const button of await controls.all()){
    const box=await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    const hit=await button.evaluate((node,{x,y})=>document.elementFromPoint(x,y)?.closest('button')===node,{x:box.x+box.width/2,y:box.y+box.height/2});
    expect(hit,'touch control is topmost at its center').toBe(true);
  }
}

async function inspectModal(page,name,open){
  await open();
  await expect(page.locator('#overlay')).not.toHaveClass(/hidden/);
  await expectInsideViewport(page,'#overlay');
  await expectInsideViewport(page,'#modal');
  await page.locator('#modal').evaluate(node=>node.scrollTop=node.scrollHeight);
  const lastButton=page.locator('#modal button').last();
  await expect(lastButton).toBeVisible();
  const viewport=page.viewportSize(),box=await lastButton.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);
  expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+1);
  await page.evaluate(()=>window.AshenRealms.closeModal());
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  return name;
}

for(const viewport of [{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  test(`mobile exploration and modal layout at ${viewport.width}x${viewport.height}`,async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await startMobileAdventure(page,viewport);
    await expectNoPageOverflow(page);
    await expectInsideViewport(page,'#game');
    if(viewport.width<900){
      await expect(page.locator('.mobilepad')).toBeVisible();
      await expectInsideViewport(page,'.mobilepad');
      await expectDockHitTestable(page);
    }else await expect(page.locator('.mobilepad')).toBeHidden();
    await page.screenshot({path:`${cycleOne}/${viewport.width}x${viewport.height}-world.png`});

    await inspectModal(page,'inventory',()=>page.evaluate(()=>window.AshenRealms.openInventory()));
    await inspectModal(page,'party',()=>page.locator('#worldPartyBtn').click());
    await inspectModal(page,'journal',()=>page.locator('#worldJournalBtn').click());
    await inspectModal(page,'shop',()=>page.evaluate(()=>window.AshenRealms.openShop('forge')));
    await inspectModal(page,'dialogue',()=>page.evaluate(()=>window.AshenRealms.action('acolyte')));
    await page.evaluate(()=>window.AshenRealms.openInventory());
    await page.screenshot({path:`${cycleOne}/${viewport.width}x${viewport.height}-inventory.png`});
    await page.evaluate(()=>{window.AshenRealms.closeModal();window.AshenRealms.beginCombat(['orc','shaman'])});
    await expect(page.locator('html')).toHaveClass(/cinematic-battle/);
    await expectInsideViewport(page,'#battlePanel');
    await expectNoPageOverflow(page);
    await page.screenshot({path:`${cycleOne}/${viewport.width}x${viewport.height}-combat.png`});
    expect(errors).toEqual([]);
  });
}

test('touch controls repeat movement, stop on release and expose pressed feedback',async({page})=>{
  await startMobileAdventure(page,{width:390,height:844});
  const route=await page.evaluate(()=>{
    const state=window.AshenRealms.getState();
    return [{name:'up',dx:0,dy:-1},{name:'down',dx:0,dy:1},{name:'left',dx:-1,dy:0},{name:'right',dx:1,dy:0}]
      .find(({dx,dy})=>[1,2,3].every(step=>window.AshenRealms.walkable(state.location,state.x+dx*step,state.y+dy*step)));
  });
  expect(route).toBeTruthy();
  const button=page.locator(`[data-dir="${route.name}"]`),start=await page.evaluate(()=>window.AshenRealms.getState());
  await button.dispatchEvent('pointerdown',{pointerId:11,pointerType:'touch',isPrimary:true});
  await expect(button).toHaveClass(/is-pressed/);
  await page.waitForTimeout(380);
  await button.dispatchEvent('pointerup',{pointerId:11,pointerType:'touch',isPrimary:true});
  await expect(button).not.toHaveClass(/is-pressed/);
  const released=await page.evaluate(()=>window.AshenRealms.getState());
  expect(Math.abs(released.x-start.x)+Math.abs(released.y-start.y)).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(260);
  expect(await page.evaluate(()=>window.AshenRealms.getState())).toMatchObject({x:released.x,y:released.y});
});

test('touch action is contextual and mobile navigation opens inventory',async({page})=>{
  await startMobileAdventure(page,{width:390,height:844});
  await page.evaluate(()=>window.AshenRealms.test.modifyGame(game=>{game.location='town';game.x=10;game.y=15;game.dir='up'}));
  const action=page.locator('#mobileAction');
  await expect(action).toHaveText('TALK');
  await page.screenshot({path:`${cycleTwo}/390x844-contextual-talk.png`});
  await action.tap();
  await expect(page.locator('#overlay')).not.toHaveClass(/hidden/);
  await expect(page.locator('#modal')).toContainText('HAVENMERE JOB BOARD');
  await page.evaluate(()=>window.AshenRealms.closeModal());
  await page.locator('#mobileMenu').tap();
  await expect(page.locator('#modal')).toContainText("ADVENTURER'S SATCHEL");
  await expect(page.locator('#modal button').last()).toHaveCSS('min-height','44px');
  await page.screenshot({path:`${cycleTwo}/390x844-touch-inventory.png`});
});

test('combat remains fully touch operable with comfortable command targets',async({page})=>{
  await startMobileAdventure(page,{width:390,height:844});
  await page.evaluate(()=>window.AshenRealms.beginCombat(['orc']));
  await expect(page.locator('.mobilepad')).toBeHidden();
  const attack=page.locator('#battlePanel [data-c="attack"]');
  await expect(attack).toBeVisible();
  const attackBox=await attack.boundingBox();
  expect(attackBox.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:`${cycleTwo}/390x844-combat-commands.png`});
  await attack.tap();
  const target=page.locator('#battlePanel [data-c^="target:"]').first();
  await expect(target).toBeVisible();
  const targetBox=await target.boundingBox();
  expect(targetBox.height).toBeGreaterThanOrEqual(44);
  await target.tap();
  await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getCombat()?.events?.length||window.AshenRealms.getCombat()?.log?.length||0)).toBeGreaterThan(0);
});
