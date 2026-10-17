import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const output='artifacts/mobile-expansion/cycle-4';
mkdirSync(output,{recursive:true});
test.use({hasTouch:true});

async function begin(page,viewport){
  await page.setViewportSize(viewport);
  await page.addInitScript(()=>{window.__ASHEN_TEST__=true;Math.random=()=>.99});
  await page.goto('/');
  await page.evaluate(()=>{window.AshenRealms.newGame('Lamplighter','Human','Fighter');window.AshenRealms.closeModal()});
  await expect(page.locator('html')).toHaveClass(/world-explore/);
}

async function standAt(page,x,y){
  await page.evaluate(([x,y])=>window.AshenRealms.test.modifyGame(game=>{game.location='wild';game.x=x;game.y=y;game.dir='up'}),[x,y]);
  await expect(page.locator('#locationText')).toHaveText('THE GLOAMWOOD ROAD');
}

async function acceptQuest(page){
  await page.evaluate(()=>window.AshenRealms.action('acolyte'));
  await expect(page.locator('#modal')).toContainText('Three waylanterns');
  await page.screenshot({path:`${output}/${page.viewportSize().width}-quest-offer.png`});
  await page.locator('#modal [data-action="accept"]').click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getState().flags.lanternQuest)).toBe(true);
}

test('Lantern Road is touch playable, persistent and rewards only once',async({page})=>{
  await begin(page,{width:390,height:844});
  const action=page.locator('#mobileAction');
  await standAt(page,10,18);await expect(action).toHaveText('LIGHT');await action.tap();
  await expect(page.locator('#modal')).toContainText('chapel');
  expect(await page.evaluate(()=>window.AshenRealms.getState().world.objects['wild:lantern-west'])).toBeUndefined();
  await page.evaluate(()=>window.AshenRealms.closeModal());
  await acceptQuest(page);

  const sites=[[10,18,'wild:lantern-west'],[22,16,'wild:lantern-bridge'],[30,22,'wild:lantern-east']];
  for(let i=0;i<sites.length;i++){
    const [x,y,key]=sites[i];await standAt(page,x,y);await expect(action).toHaveText('LIGHT');await action.tap();
    await expect.poll(()=>page.evaluate(key=>window.AshenRealms.getState().world.objects[key]?.active,key)).toBe(true);
    if(i===0){await page.waitForTimeout(150);await page.screenshot({path:`${output}/390-lit-western-lantern.png`})}
    if(i===1){await page.evaluate(()=>window.AshenRealms.save(true));await page.evaluate(()=>window.AshenRealms.load());await expect.poll(()=>page.evaluate(()=>Object.values(window.AshenRealms.getState().world.objects).filter(o=>o.active).length)).toBe(2)}
    if(i===2)await page.evaluate(()=>window.AshenRealms.closeModal());
  }

  await page.locator('#worldJournalBtn').tap();
  await expect(page.locator('#modal')).toContainText('All 3 waylanterns are lit');
  await page.screenshot({path:`${output}/390-journal-ready.png`});
  await page.evaluate(()=>window.AshenRealms.closeModal());
  const before=await page.evaluate(()=>({gold:window.AshenRealms.getState().gold,ether:window.AshenRealms.getState().bag.ether}));
  await page.evaluate(()=>window.AshenRealms.action('acolyte'));
  await expect(page.locator('#modal')).toContainText('Reward: 30 gold · 1 Moonwater');
  await page.screenshot({path:`${output}/390-quest-complete.png`});
  const rewarded=await page.evaluate(()=>window.AshenRealms.getState());
  expect(rewarded.flags.lanternRoadComplete).toBe(true);expect(rewarded.gold).toBe(before.gold+30);expect(rewarded.bag.ether).toBe(before.ether+1);
  await page.evaluate(()=>{window.AshenRealms.closeModal();window.AshenRealms.action('acolyte')});
  const repeated=await page.evaluate(()=>window.AshenRealms.getState());
  expect(repeated.gold).toBe(rewarded.gold);expect(repeated.bag.ether).toBe(rewarded.bag.ether);
});

test('Lantern Road keeps its visual hierarchy on desktop',async({page})=>{
  await begin(page,{width:1440,height:900});await acceptQuest(page);
  for(const [x,y] of [[10,18],[22,16],[30,22]]){await standAt(page,x,y);await page.evaluate(()=>window.AshenRealms.interact());if(!(await page.locator('#overlay').getAttribute('class')).includes('hidden'))await page.evaluate(()=>window.AshenRealms.closeModal())}
  await standAt(page,30,22);await page.waitForTimeout(150);await page.screenshot({path:`${output}/1440-lantern-road.png`});
  await page.evaluate(()=>window.AshenRealms.action('acolyte'));
  await expect(page.locator('#modal')).toContainText('Reward: 30 gold · 1 Moonwater');
  await page.screenshot({path:`${output}/1440-quest-complete.png`});
});
