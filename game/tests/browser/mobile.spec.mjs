import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const cycleOne='artifacts/mobile-expansion/cycle-1';
mkdirSync(cycleOne,{recursive:true});

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
