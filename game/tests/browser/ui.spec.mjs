import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const screenshots='artifacts/ui-inspection';
mkdirSync(screenshots,{recursive:true});

async function startAdventure(page){
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Begin a New Adventure',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Begin a New Adventure',exact:true}).click();
  await page.locator('#heroName').fill('UI Inspector');
  await page.locator('#heroClass').selectOption('Wizard');
  await page.getByRole('button',{name:'ENTER THE REALM →',exact:true}).click();
  await expect(page.locator('html')).toHaveClass(/world-explore/);
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
}

function collectErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url())});
  return errors;
}

async function startBattle(page){
  // Use the game's existing debug API to reach an encounter without random walking.
  await page.evaluate(()=>window.AshenRealms.beginCombat(['orc','shaman']));
  await expect(page.locator('html')).toHaveClass(/cinematic-battle/);
  await expect(page.locator('#battlePanel [data-c="attack"]')).toBeVisible();
}


async function expectCombatLayout(page){
  const selectors=['#game','.cinema-title','.cinema-party','.cinema-foes','#battlePanel'];
  const boxes=await page.evaluate(selectors=>selectors.map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {selector,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}),selectors);
  const field=boxes[0];
  for(const panel of boxes.slice(1)){
    expect(panel.width,panel.selector+' has width').toBeGreaterThan(0);
    expect(panel.height,panel.selector+' has height').toBeGreaterThan(0);
    const overlap=Math.min(field.right,panel.right)-Math.max(field.x,panel.x)>1&&Math.min(field.bottom,panel.bottom)-Math.max(field.y,panel.y)>1;
    expect(overlap,panel.selector+' must not overlap battlefield').toBe(false);
  }
  const controls=await page.locator('.battle-controls').boundingBox();
  for(const button of await page.locator('#battlePanel [data-c]').all()){
    const box=await button.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(controls.x-1);
    expect(box.y).toBeGreaterThanOrEqual(controls.y-1);
    expect(box.y+box.height).toBeLessThanOrEqual(controls.y+controls.height+1);
  }
  const dock=boxes.at(-1);
  expect(dock.bottom).toBeLessThanOrEqual(page.viewportSize().height+1);
}

test('desktop title, character creation, world, inventory, party and shop',async({page})=>{
  const errors=collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Begin a New Adventure',exact:true})).toBeVisible();
  await page.screenshot({path:screenshots+'/desktop-title.png'});
  await page.getByRole('button',{name:'Begin a New Adventure',exact:true}).click();
  await expect(page.locator('#heroClass')).toBeVisible();
  await page.screenshot({path:screenshots+'/desktop-character.png'});
  await page.locator('#heroName').fill('UI Inspector');
  await page.locator('#heroClass').selectOption('Wizard');
  await page.getByRole('button',{name:'ENTER THE REALM →',exact:true}).click();
  await expect(page.locator('html')).toHaveClass(/world-explore/);
  await page.screenshot({path:screenshots+'/desktop-world.png'});
  await page.getByRole('button',{name:'I INVENTORY',exact:true}).click();
  await expect(page.locator('#modal')).toContainText("ADVENTURER'S SATCHEL");
  await page.screenshot({path:screenshots+'/desktop-inventory.png'});
  await page.keyboard.press('Escape');
  await page.locator('#worldPartyBtn').click();
  await expect(page.locator('#modal')).toContainText('YOUR PARTY');
  await page.screenshot({path:screenshots+'/desktop-party.png'});
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.AshenRealms.openShop('forge'));
  await expect(page.locator('#modal')).toContainText('GARRICK’S FORGE');
  await page.screenshot({path:screenshots+'/desktop-shop.png'});
  await page.keyboard.press('Escape');
  const before=await page.evaluate(()=>window.AshenRealms.getState().party[0].name);
  await page.locator('#worldSaveBtn').click();
  await page.reload();
  await page.getByRole('button',{name:'Continue Saved Journey',exact:true}).click();
  await expect(page.locator('html')).toHaveClass(/world-explore/);
  expect(await page.evaluate(()=>window.AshenRealms.getState().party[0].name)).toBe(before);
  expect(errors).toEqual([]);
});

test('desktop combat commands, spells, items and compact mode',async({page})=>{
  const errors=collectErrors(page);
  await startAdventure(page);
  await startBattle(page);
  await expectCombatLayout(page);
  await page.screenshot({path:screenshots+'/desktop-combat.png'});
  await page.locator('#battlePanel [data-c="skills"]').click();
  await expect(page.locator('#battlePanel')).toContainText('Arcane Bolt');
  await page.screenshot({path:screenshots+'/desktop-spells.png'});
  await page.locator('#battlePanel [data-c="back"]').click();
  await page.locator('#battlePanel [data-c="item"]').click();
  await expect(page.locator('#battlePanel [data-c="item:ration"]')).toBeVisible();
  await page.screenshot({path:screenshots+'/desktop-combat-items.png'});
  await page.locator('#battlePanel [data-c="back"]').click();
  await page.locator('#cinemaMinimize').click();
  await expect(page.locator('html')).toHaveClass(/cinema-compact/);
  await expectCombatLayout(page);
  await page.screenshot({path:screenshots+'/desktop-combat-windowed.png'});
  expect(errors).toEqual([]);
});

test('phone portrait exploration and combat',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=collectErrors(page);
  await startAdventure(page);
  await page.screenshot({path:screenshots+'/phone-world.png'});
  await page.evaluate(()=>{window.AshenRealms.action('rogue');window.AshenRealms.closeModal();window.AshenRealms.action('cleric');window.AshenRealms.closeModal()});
  await startBattle(page);
  await expectCombatLayout(page);
  await page.screenshot({path:screenshots+'/phone-combat.png'});
  await page.locator('#battlePanel [data-c="skills"]').click();
  await expect(page.locator('#battlePanel')).toContainText(/Arcane Bolt|Shadowstep|Mend Wounds/);
  expect(errors).toEqual([]);
});

test('small landscape exploration and combat',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  const errors=collectErrors(page);
  await startAdventure(page);
  await page.screenshot({path:screenshots+'/landscape-world.png'});
  await startBattle(page);
  await expectCombatLayout(page);
  await page.screenshot({path:screenshots+'/landscape-combat.png'});
  await page.setViewportSize({width:640,height:360});
  await expectCombatLayout(page);
  await page.screenshot({path:screenshots+'/small-landscape-combat.png'});
  expect(errors).toEqual([]);
});
