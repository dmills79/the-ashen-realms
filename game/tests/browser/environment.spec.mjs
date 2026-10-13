import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/environment-overhaul',{recursive:true});

for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`continuous landscape preserves geometry and state at ${viewport.width}px`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(viewport);
  await page.addInitScript(()=>{window.__ASHEN_TEST__=true});await page.goto('/');
  await page.evaluate(()=>{window.AshenRealms.newGame('Arden','Human','Fighter');window.AshenRealms.closeModal()});
  for(const [loc,x,y] of [['town',15,15],['wild',19,16],['wild',7,16],['wild',37,22],['camp',16,11],['crypt',9,15]]){
   const result=await page.evaluate(({loc,x,y})=>{
    const api=window.AshenRealms,map=api.getMapData(loc),before=JSON.stringify(map);
    api.test.modifyGame(g=>{g.location=loc;g.x=x;g.y=y});
    const state=JSON.stringify(api.getState()),walk=map.tiles.map((row,y)=>row.map((_,x)=>api.walkable(loc,x,y)));
    const random=Math.random;let calls=0;Math.random=()=>{calls++;return .5};
    const start=performance.now();api.renderFrame();const buildMs=performance.now()-start;
    for(let i=0;i<10;i++)api.renderFrame();Math.random=random;
    return {sameMap:before===JSON.stringify(map),sameState:state===JSON.stringify(api.getState()),sameCollision:JSON.stringify(walk)===JSON.stringify(map.tiles.map((row,y)=>row.map((_,x)=>api.walkable(loc,x,y)))),calls,buildMs};
   },{loc,x,y});
   expect(result.sameMap).toBe(true);expect(result.sameState).toBe(true);expect(result.sameCollision).toBe(true);expect(result.calls).toBe(0);
   expect(result.buildMs).toBeLessThan(1500);
   await page.screenshot({path:`artifacts/environment-overhaul/${viewport.width}-${loc}-${x}-${y}.png`});
  }
  expect(errors).toEqual([]);
 });
}

test('river bridge and settlement transitions retain their original walkable routes',async({page})=>{
 await page.addInitScript(()=>{window.__ASHEN_TEST__=true});await page.goto('/');
 await page.evaluate(()=>{window.AshenRealms.newGame('Arden','Human','Fighter');window.AshenRealms.closeModal()});
 expect(await page.evaluate(()=>{
  const a=window.AshenRealms;
  return [20,21,22,23].every(x=>a.walkable('wild',x,16))&&!a.walkable('wild',21,15);
 })).toBe(true);
 await page.evaluate(()=>window.AshenRealms.test.modifyGame(g=>{g.location='town';g.x=27;g.y=16}));
 await page.keyboard.press('ArrowRight');
 await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getMap())).toBe('wild');
 await page.evaluate(()=>window.AshenRealms.test.modifyGame(g=>{g.location='wild';g.x=8;g.y=16}));
 await page.waitForTimeout(200);await page.keyboard.press('ArrowLeft');
 await expect.poll(()=>page.evaluate(()=>window.AshenRealms.getMap())).toBe('town');
 await page.evaluate(()=>window.AshenRealms.save());
 const saved=await page.evaluate(()=>window.AshenRealms.getState());
 await page.reload();await page.evaluate(()=>window.AshenRealms.load());
 expect(await page.evaluate(()=>window.AshenRealms.getState().location)).toBe(saved.location);
});
