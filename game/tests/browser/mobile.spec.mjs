import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const cycleOne='artifacts/mobile-expansion/cycle-1';
const cycleTwo='artifacts/mobile-expansion/cycle-2';
const mobileUiTwo='artifacts/mobile-ui-2';
mkdirSync(cycleOne,{recursive:true});mkdirSync(cycleTwo,{recursive:true});mkdirSync(mobileUiTwo,{recursive:true});
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
  const controls=page.locator('#mobileJoystick,#mobileAction,#mobileMenu');
  await expect(controls).toHaveCount(3);
  for(const control of await controls.all()){
    const box=await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    const hit=await control.evaluate((node,{x,y})=>document.elementFromPoint(x,y)?.closest('#mobileJoystick,button')===node,{x:box.x+box.width/2,y:box.y+box.height/2});
    expect(hit,'touch control is topmost at its center').toBe(true);
  }
}

async function expectNoIntersection(page,first,second){
  const [a,b]=await Promise.all([page.locator(first).boundingBox(),page.locator(second).boundingBox()]);
  expect(a,first+' has a box').not.toBeNull();expect(b,second+' has a box').not.toBeNull();
  const overlaps=a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  expect(overlaps,`${first} does not overlap ${second}`).toBe(false);
}

async function placeInOpenWild(page,reach=7){
  return page.evaluate(reach=>{
    const a=window.AshenRealms,map=a.getMapData('wild');
    for(let y=1;y<map.h-1;y++)for(let x=1;x<map.w-1;x++){
      const clear=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];
      for(let step=2;step<=reach;step++)clear.push([step,0],[-step,0],[0,step],[0,-step]);
      if(clear.every(([dx,dy])=>a.walkable('wild',x+dx,y+dy))){
        a.test.modifyGame(game=>{game.location='wild';game.x=x;game.y=y;game.dir='down';game.world.clock.rate=0});
        return {x,y};
      }
    }
    throw new Error('No open joystick test cell found');
  },reach);
}

async function joystickGeometry(page){
  const box=await page.locator('#mobileJoystick').boundingBox();
  expect(box).not.toBeNull();
  return {x:box.x+box.width/2,y:box.y+box.height/2,radius:Math.min(box.width,box.height)/2};
}

async function startJoystick(page,vector,pointerId=41){
  const geometry=await joystickGeometry(page),joystick=page.locator('#mobileJoystick');
  await joystick.dispatchEvent('pointerdown',{pointerId,pointerType:'touch',isPrimary:pointerId===41,button:0,clientX:geometry.x,clientY:geometry.y});
  await joystick.dispatchEvent('pointermove',{pointerId,pointerType:'touch',isPrimary:pointerId===41,button:0,clientX:geometry.x+geometry.radius*vector.x,clientY:geometry.y+geometry.radius*vector.y});
  return geometry;
}

async function stopJoystick(page,pointerId=41,type='pointerup'){
  await page.locator('#mobileJoystick').dispatchEvent(type,{pointerId,pointerType:'touch',isPrimary:pointerId===41,button:0});
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

for(const viewport of [{width:844,height:390},{width:852,height:393},{width:932,height:430},{width:740,height:360},{width:390,height:844},{width:1440,height:900}]){
  test(`Mobile UI 2 layout remains unobstructed at ${viewport.width}x${viewport.height}`,async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await startMobileAdventure(page,viewport);
    await expectNoPageOverflow(page);
    await expectInsideViewport(page,'#game');
    const mobile=viewport.width<1025;
    if(mobile){
      await expect(page.locator('.mobilepad')).toBeVisible();
      await expectInsideViewport(page,'.mobilepad');
      await expectDockHitTestable(page);
      await expectInsideViewport(page,'#worldQuestBtn');await expectInsideViewport(page,'#worldMapBtn');await expectInsideViewport(page,'#mobileSettingsToggle');
      await expect.poll(async()=>(await page.locator('#worldMapBtn').boundingBox()).width).toBeLessThanOrEqual(50);
      await page.locator('#worldQuestBtn').tap();
      await expectNoIntersection(page,'#worldQuestBtn','#mobileJoystick');await expectNoIntersection(page,'#worldQuestBtn','#mobileAction');
      await page.screenshot({path:`${mobileUiTwo}/${viewport.width}x${viewport.height}-quest.png`});
      await page.locator('#worldQuestBtn').tap();await page.locator('#worldMapBtn').tap();
      await expectNoIntersection(page,'#worldMapBtn','#mobileJoystick');await expectNoIntersection(page,'#worldMapBtn','#mobileAction');
      await page.screenshot({path:`${mobileUiTwo}/${viewport.width}x${viewport.height}-map.png`});
      await page.locator('#worldMapBtn').tap();await page.evaluate(()=>window.AshenRealms.closeModal());
      await expect.poll(async()=>(await page.locator('#worldMapBtn').boundingBox()).width).toBeLessThanOrEqual(50);
    }else await expect(page.locator('.mobilepad')).toBeHidden();
    await page.screenshot({path:`${mobileUiTwo}/${viewport.width}x${viewport.height}-world.png`});

    await inspectModal(page,'inventory',()=>page.evaluate(()=>window.AshenRealms.openInventory()));
    await inspectModal(page,'party',async()=>{if(mobile){await page.locator('#mobileMenu').tap();await page.locator('#worldMobilePartyBtn').tap()}else await page.locator('#worldPartyBtn').click()});
    await inspectModal(page,'journal',async()=>{if(mobile){await page.locator('#mobileMenu').tap();await page.locator('#worldJournalBtn').tap()}else await page.locator('#worldJournalBtn').click()});
    await inspectModal(page,'shop',()=>page.evaluate(()=>window.AshenRealms.openShop('forge')));
    await inspectModal(page,'dialogue',()=>page.evaluate(()=>window.AshenRealms.action('acolyte')));
    await page.evaluate(()=>window.AshenRealms.openInventory());
    await page.screenshot({path:`${mobileUiTwo}/${viewport.width}x${viewport.height}-inventory.png`});
    await page.evaluate(()=>{window.AshenRealms.closeModal();window.AshenRealms.beginCombat(['orc','shaman'])});
    await expect(page.locator('html')).toHaveClass(/cinematic-battle/);
    await expectInsideViewport(page,'#battlePanel');
    await expectNoPageOverflow(page);
    await page.screenshot({path:`${mobileUiTwo}/${viewport.width}x${viewport.height}-combat.png`});
    expect(errors).toEqual([]);
  });
}

test('analog joystick moves in four directions and alternates diagonal grid steps',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  await expect(page.locator('[data-dir]')).toHaveCount(0);
  await expect(page.locator('#mobileJoystick')).toBeVisible();
  const origin=await placeInOpenWild(page);
  for(const vector of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
    await page.evaluate(origin=>window.AshenRealms.test.modifyGame(game=>{game.location='wild';game.x=origin.x;game.y=origin.y}),origin);
    await startJoystick(page,vector);
    await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getState())).toMatchObject({x:origin.x+vector.x,y:origin.y+vector.y});
    await stopJoystick(page);
  }
  await page.evaluate(origin=>window.AshenRealms.test.modifyGame(game=>{game.location='wild';game.x=origin.x;game.y=origin.y}),origin);
  await startJoystick(page,{x:.72,y:.72});
  await expect.poll(()=>page.evaluate(origin=>{const game=window.AshenRealms.getState();return game.x>origin.x&&game.y>origin.y},origin),{timeout:1200}).toBe(true);
  await stopJoystick(page);
});

test('joystick magnitude controls cadence and the dead zone remains still',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  const origin=await placeInOpenWild(page,8);
  await startJoystick(page,{x:.1,y:0});
  await page.waitForTimeout(320);
  expect(await page.evaluate(()=>window.AshenRealms.getState())).toMatchObject(origin);
  await stopJoystick(page);
  const distances=[];
  for(const magnitude of [.38,1]){
    await page.evaluate(origin=>window.AshenRealms.test.modifyGame(game=>{game.x=origin.x;game.y=origin.y}),origin);
    await startJoystick(page,{x:magnitude,y:0});
    await page.waitForTimeout(650);
    await stopJoystick(page);
    distances.push((await page.evaluate(()=>window.AshenRealms.getState())).x-origin.x);
  }
  expect(distances[0]).toBeGreaterThan(0);
  expect(distances[1]).toBeGreaterThan(distances[0]);
});

test('joystick recenters and stops on release cancellation blur visibility and modal open',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  await placeInOpenWild(page,8);
  const expectReset=async()=>{
    await expect.poll(()=>page.evaluate(()=>window.AshenRealms.test.joystick())).toMatchObject({pointerId:null,x:0,y:0,magnitude:0});
    expect(await page.locator('.joystick-knob').evaluate(node=>node.style.transform)).toBe('translate3d(0px, 0px, 0px)');
  };
  await startJoystick(page,{x:1,y:0});await stopJoystick(page);await expectReset();
  await startJoystick(page,{x:1,y:0});await stopJoystick(page,41,'pointercancel');await expectReset();
  await startJoystick(page,{x:1,y:0});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expectReset();
  await startJoystick(page,{x:1,y:0});await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expectReset();
  await startJoystick(page,{x:1,y:0});await page.evaluate(()=>window.AshenRealms.openInventory());await expectReset();
  await page.evaluate(()=>window.AshenRealms.closeModal());
});

test('joystick preserves collision animation and active-pointer ownership',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  const blocked=await page.evaluate(()=>{
    const a=window.AshenRealms,map=a.getMapData('wild'),dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(let y=1;y<map.h-1;y++)for(let x=1;x<map.w-1;x++)if(a.walkable('wild',x,y))for(const [dx,dy] of dirs)if(!a.walkable('wild',x+dx,y+dy)){
      a.test.modifyGame(game=>{game.location='wild';game.x=x;game.y=y;game.dir='down';game.world.clock.rate=0});return {x,y,dx,dy};
    }
    throw new Error('No collision fixture found');
  });
  await startJoystick(page,{x:blocked.dx,y:blocked.dy});
  await page.waitForTimeout(260);await stopJoystick(page);
  expect(await page.evaluate(()=>window.AshenRealms.getState())).toMatchObject({x:blocked.x,y:blocked.y});

  const origin=await placeInOpenWild(page);
  await startJoystick(page,{x:1,y:0});
  await expect.poll(()=>page.evaluate(origin=>window.AshenRealms.getState().x-origin.x,origin)).toBeGreaterThan(0);
  const motion=await page.evaluate(()=>{const a=window.AshenRealms,g=a.getState();return window.AshenAnimation.sample('wild:'+g.party[0].id,g.x,g.y,g.dir,performance.now())});
  expect(motion.direction).toBe('right');expect(motion.walking).toBe(true);
  const geometry=await joystickGeometry(page);
  await page.locator('#mobileJoystick').dispatchEvent('pointerdown',{pointerId:42,pointerType:'touch',isPrimary:false,button:0,clientX:geometry.x,clientY:geometry.y});
  expect(await page.evaluate(()=>window.AshenRealms.test.joystick())).toMatchObject({pointerId:41});
  await stopJoystick(page);
});

test('movement and contextual action accept independent pointers',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  await page.evaluate(()=>window.AshenRealms.test.modifyGame(game=>{game.location='town';game.x=10;game.y=15;game.dir='up';game.world.clock.rate=0}));
  await expect(page.locator('#mobileAction')).toHaveText('TALK');
  const geometry=await joystickGeometry(page);
  await page.evaluate(({x,y,radius})=>{
    const joystick=document.querySelector('#mobileJoystick'),action=document.querySelector('#mobileAction');
    joystick.dispatchEvent(new PointerEvent('pointerdown',{pointerId:41,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y,bubbles:true,cancelable:true}));
    joystick.dispatchEvent(new PointerEvent('pointermove',{pointerId:41,pointerType:'touch',isPrimary:true,button:0,clientX:x+radius,clientY:y,bubbles:true,cancelable:true}));
    action.dispatchEvent(new PointerEvent('pointerdown',{pointerId:72,pointerType:'touch',isPrimary:false,button:0,bubbles:true,cancelable:true}));
    action.click();
  },geometry);
  await expect(page.locator('#modal')).toContainText('HAVENMERE JOB BOARD');
  await expect.poll(()=>page.evaluate(()=>window.AshenRealms.test.joystick())).toMatchObject({pointerId:null});
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
  await page.locator('#worldBagBtn').tap();
  await expect(page.locator('#modal')).toContainText("ADVENTURER'S SATCHEL");
  await expect(page.locator('#modal button').last()).toHaveCSS('min-height','44px');
  await page.screenshot({path:`${cycleTwo}/390x844-touch-inventory.png`});
});

test('quest and minimap expand without leaving persistent panels open',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  const quest=page.locator('#worldQuestBtn'),map=page.locator('#worldMapBtn');
  await expect(quest).toHaveAttribute('aria-expanded','false');
  await expect(map).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('Tab');await expect(page.locator('html')).toHaveAttribute('data-mobile-surface','quest');await expect(quest).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Tab');await expect(page.locator('html')).not.toHaveAttribute('data-mobile-surface',/.+/);
  await quest.tap();
  await expect(page.locator('html')).toHaveAttribute('data-mobile-surface','quest');
  await expect(quest).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#worldQuestDesc')).toBeVisible();
  await map.tap();
  await expect(page.locator('html')).toHaveAttribute('data-mobile-surface','map');
  await expect(quest).toHaveAttribute('aria-expanded','false');
  await expect(map).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#worldMini')).toBeVisible();
  await map.tap();
  await expect(page.locator('#modal')).toContainText("THE CARTOGRAPHER'S MAP");
  await expect(page.locator('html')).not.toHaveAttribute('data-mobile-surface',/.+/);
});

test('BAG tray exposes inventory spells journal and party',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  const openTool=async(selector,text)=>{
    await page.locator('#mobileMenu').tap();
    await expect(page.locator('#mobileMenu')).toHaveAttribute('aria-expanded','true');
    await expect(page.locator('#mobileToolsTray')).toBeVisible();
    await page.locator(selector).tap();
    await expect(page.locator('#modal')).toContainText(text);
    await expect(page.locator('html')).not.toHaveAttribute('data-mobile-surface',/.+/);
    await page.evaluate(()=>window.AshenRealms.closeModal());
  };
  await openTool('#worldBagBtn',"ADVENTURER'S SATCHEL");
  await openTool('#worldSkillsBtn','THE SPELL GRIMOIRE');
  await openTool('#worldJournalBtn',"ADVENTURER'S JOURNAL");
  await openTool('#worldMobilePartyBtn','YOUR PARTY');
});

test('settings tray preserves save sound and help',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  const settings=page.locator('#mobileSettingsToggle');
  await settings.tap();
  await expect(settings).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#mobileSettingsTray')).toBeVisible();
  await page.locator('#worldSaveBtn').tap();
  await expect(page.locator('#toast')).toContainText('saved');
  expect(await page.evaluate(()=>localStorage.getItem('ashen-realms-v1.2-save'))).toBeTruthy();
  const soundBefore=await page.locator('#worldSoundBtn').textContent();
  await settings.tap();
  await page.locator('#worldSoundBtn').tap();
  await expect(page.locator('#worldSoundBtn')).not.toHaveText(soundBefore);
  await settings.tap();
  await page.locator('#worldMenuBtn').tap();
  await expect(page.locator('#modal')).toContainText("ADVENTURER'S MANUAL");
});

test('opening another surface or modal closes mobile HUD state',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  await page.locator('#worldQuestBtn').tap();
  await page.locator('#mobileMenu').tap();
  await expect(page.locator('html')).toHaveAttribute('data-mobile-surface','tools');
  await expect(page.locator('#worldQuestBtn')).toHaveAttribute('aria-expanded','false');
  await page.locator('#worldBagBtn').tap();
  await expect(page.locator('#overlay')).not.toHaveClass(/hidden/);
  await expect(page.locator('html')).not.toHaveAttribute('data-mobile-surface',/.+/);
  await expect(page.locator('#mobileMenu')).toHaveAttribute('aria-expanded','false');
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

test('rotating with a tray open preserves controls and safe-area offsets',async({page})=>{
  await startMobileAdventure(page,{width:844,height:390});
  await page.locator('#mobileMenu').tap();
  await page.evaluate(()=>{const root=document.documentElement;root.style.setProperty('--safe-left','24px');root.style.setProperty('--safe-right','20px');root.style.setProperty('--safe-bottom','18px')});
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('html')).toHaveAttribute('data-mobile-surface','tools');
  await expectInsideViewport(page,'#mobileToolsTray');await expectInsideViewport(page,'.mobilepad');
  const positions=await page.evaluate(()=>{const box=id=>{const r=document.querySelector(id).getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom}};return {joystick:box('#mobileJoystick'),bag:box('#mobileMenu'),tray:box('#mobileToolsTray')}});
  expect(positions.joystick.left).toBeGreaterThanOrEqual(23);expect(positions.bag.right).toBeLessThanOrEqual(371);expect(positions.tray.right).toBeLessThanOrEqual(371);expect(positions.joystick.bottom).toBeLessThanOrEqual(827);
  await expectNoIntersection(page,'#mobileToolsTray','#mobileJoystick');
  await page.screenshot({path:`${mobileUiTwo}/390x844-rotated-tools-safe-area.png`});
});

test('mobile combat spells inventory journal settings and Lantern Road remain reachable',async({page})=>{
  await startMobileAdventure(page,{width:852,height:393});
  await page.evaluate(()=>{const a=window.AshenRealms;a.newGame('Emberwise','Elf','Wizard');a.closeModal();a.test.modifyGame(game=>{game.flags.lanternQuest=true;game.world.objects['wild:lantern-west']={active:true}})});
  const openTool=async selector=>{await page.locator('#mobileMenu').tap();await page.locator(selector).tap()};
  await openTool('#worldBagBtn');await expect(page.locator('#modal')).toContainText("ADVENTURER'S SATCHEL");await page.evaluate(()=>window.AshenRealms.closeModal());
  await openTool('#worldSkillsBtn');await expect(page.locator('#modal')).toContainText('THE SPELL GRIMOIRE');await page.evaluate(()=>window.AshenRealms.closeModal());
  await openTool('#worldJournalBtn');await expect(page.locator('#modal')).toContainText('The Lantern Road');await expect(page.locator('#modal')).toContainText('Progress: 1/3');await page.evaluate(()=>window.AshenRealms.closeModal());
  await page.locator('#mobileSettingsToggle').tap();await expect(page.locator('#mobileSettingsTray')).toBeVisible();await page.screenshot({path:`${mobileUiTwo}/852x393-settings.png`});await page.locator('#worldMenuBtn').tap();await expect(page.locator('#modal')).toContainText("ADVENTURER'S MANUAL");await page.evaluate(()=>window.AshenRealms.closeModal());
  await page.evaluate(()=>window.AshenRealms.beginCombat(['orc']));
  await page.locator('[data-nav="spells"]').tap();await expect(page.locator('[data-c="ability:bolt"]')).toBeVisible();
  await page.locator('[data-c="ability:bolt"]').tap();await page.locator('[data-c="target:e0"]').tap();
  await expect(page.locator('.event-action')).toContainText('Arcane Bolt');
  await page.screenshot({path:`${mobileUiTwo}/852x393-combat-spell.png`});
});

test('Mobile UI 2 delivery version is current',async({page,request})=>{
  const code=await request.get('/game.js');expect(code.headers()['x-ashen-realms-version']).toBe('1.9.0');
  await page.goto('/');await expect(page.locator('footer')).toContainText('v1.9');
});

test('versioned browser delivery revalidates code and caches artwork',async({request})=>{
  const code=await request.get('/game.js');
  expect(code.status()).toBe(200);
  expect(code.headers()['x-ashen-realms-version']).toBe('1.9.0');
  expect(code.headers()['cache-control']).toContain('no-cache');
  expect(code.headers().etag).toBeTruthy();
  const unchanged=await request.get('/game.js',{headers:{'If-None-Match':code.headers().etag}});
  expect(unchanged.status()).toBe(304);
  const artwork=await request.get('/assets/battle_town.jpg');
  expect(artwork.status()).toBe(200);
  expect(artwork.headers()['cache-control']).toContain('max-age=86400');
});
