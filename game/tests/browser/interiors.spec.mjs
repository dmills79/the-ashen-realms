import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/interiors',{recursive:true});

async function begin(page){
 await page.addInitScript(()=>{window.__ASHEN_TEST__=true});
 await page.goto('/');
 await page.evaluate(()=>window.AshenRealms.newGame('Interior Inspector','Human','Fighter'));
 await page.waitForFunction(()=>window.AshenInteriors.ready());
}

test('every authored floor, exit and NPC conversation point is reachable',async({page})=>{
 await begin(page);
 const audits=await page.evaluate(()=>{
  const api=window.AshenRealms,results=[];
  for(const loc of Object.keys(window.AshenInteriors.scenes)){
   api.enterBuilding(loc);const map=api.getMapData(loc),queue=[[8,10]],seen=new Set(['8,10']);
   while(queue.length){const [x,y]=queue.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const xx=x+dx,yy=y+dy,key=xx+','+yy;
    if(!seen.has(key)&&api.walkable(loc,xx,yy)){seen.add(key);queue.push([xx,yy])}
   }}
   const unreachable=[];for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++)if(api.walkable(loc,x,y)&&!seen.has(x+','+y))unreachable.push([x,y]);
   const inaccessible=api.test.entities().filter(e=>{
    const x=e.talk?.x??e.x,y=e.talk?.y??e.y;
    return ![[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((x+dx)+','+(y+dy)));
   }).map(e=>e.name);
   const unblocked=window.AshenInteriors.scenes[loc].props.flatMap(p=>{
    const [x,y,w,h]=p.footprint,result=[];
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(api.walkable(loc,xx,yy))result.push(p.id);
    return result;
   });
   results.push({loc,exit:seen.has('8,13'),unreachable,inaccessible,unblocked});
  }
  return results;
 });
 for(const result of audits){expect(result.exit,result.loc).toBe(true);expect(result.unreachable,result.loc).toEqual([]);expect(result.inaccessible,result.loc).toEqual([]);expect(result.unblocked,result.loc).toEqual([])}
});

test('bar collisions, seated patrons, recruitment, merchant and south exit work',async({page})=>{
 await begin(page);
 await page.evaluate(()=>{const a=window.AshenRealms;a.enterBuilding('tavern');for(let i=0;i<4;i++)a.move(0,-1)});
 expect(await page.evaluate(()=>[window.AshenRealms.getState().x,window.AshenRealms.getState().y])).toEqual([8,6]);
 await page.evaluate(()=>window.AshenRealms.move(0,-1));
 expect(await page.evaluate(()=>window.AshenRealms.getState().y)).toBe(6);
 await page.evaluate(()=>window.AshenRealms.interact());
 await expect(page.locator('#modal')).toContainText('TAVERN KEEPER');
 await page.evaluate(()=>{const a=window.AshenRealms;a.closeModal();a.test.modifyGame(g=>{g.x=2;g.y=7;g.dir='right'});a.interact()});
 await expect(page.locator('#modal')).toContainText('PELLA');
 await page.evaluate(()=>{const a=window.AshenRealms;a.closeModal();a.test.modifyGame(g=>{g.x=11;g.y=7;g.dir='right'});a.interact()});
 await expect(page.locator('#modal')).toContainText('ROOK');
 expect(await page.evaluate(()=>window.AshenRealms.getState().party.some(h=>h.name==='Rook'))).toBe(true);
 await page.evaluate(()=>{const a=window.AshenRealms;a.closeModal();a.test.modifyGame(g=>{g.x=8;g.y=12});a.move(0,1)});
 expect(await page.evaluate(()=>window.AshenRealms.getMap())).toBe('town');
});

test('interior legacy saves relocate out of furniture without losing progress',async({page})=>{
 await begin(page);
 await page.evaluate(()=>{const a=window.AshenRealms;a.enterBuilding('tavern');a.test.modifyGame(g=>{g.x=5;g.y=5;g.gold=172;g.flags.elder=true;g.bag.runestaff=2});a.save();a.load()});
 const saved=await page.evaluate(()=>{const a=window.AshenRealms,g=a.getState();return {walkable:a.walkable(g.location,g.x,g.y),gold:g.gold,elder:g.flags.elder,staff:g.bag.runestaff,name:g.party[0].name}});
 expect(saved).toEqual({walkable:true,gold:172,elder:true,staff:2,name:'Interior Inspector'});
 await page.reload();await page.evaluate(()=>window.AshenRealms.load());
 expect(await page.evaluate(()=>window.AshenRealms.getState().gold)).toBe(172);
});

for(const viewport of [{width:1440,height:900},{width:390,height:844}])test(`room rendering and HUD at ${viewport.width}px and every zoom`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.setViewportSize(viewport);await begin(page);
 for(const loc of ['tavern','hall','smith','inn','chapel','cottage','bakery']){
  await page.evaluate(loc=>window.AshenRealms.enterBuilding(loc),loc);
  await page.waitForFunction(loc=>({hall:['scholar'],smith:['smith_npc'],inn:['innkeeper','pilgrim'],chapel:['pilgrim'],cottage:['farmer'],bakery:['baker_npc'],tavern:[]}[loc]).every(name=>window.AshenPresentation.debug().ready.includes(name)),loc);
  await page.screenshot({path:`artifacts/interiors/${viewport.width}-${loc}.png`});
 }
 await page.evaluate(()=>window.AshenRealms.enterBuilding('tavern'));
 for(let i=0;i<4;i++){
  const audit=await page.evaluate(()=>{
   const a=window.AshenRealms,before=JSON.stringify(a.getState()),map=JSON.stringify(a.getMapData('tavern'));
   const random=Math.random;let calls=0;Math.random=()=>{calls++;return .5};
   try{for(let i=0;i<8;i++)a.renderFrame()}finally{Math.random=random}
   return {sameState:before===JSON.stringify(a.getState()),sameMap:map===JSON.stringify(a.getMapData('tavern')),calls,zoom:a.getZoom()};
  });
  expect(audit.sameState).toBe(true);expect(audit.sameMap).toBe(true);expect(audit.calls).toBe(0);
  for(const [x,y] of [[1,10],[16,10],[8,6],[8,12]]){
   const visible=await page.evaluate(([x,y])=>{
    const a=window.AshenRealms;a.test.modifyGame(g=>{g.x=x;g.y=y});a.renderFrame();
    const v=a.test.interiorView(),scale=480/v.viewW,px=(x*24+12-v.scrollX)*scale,py=(y*24+22-v.scrollY)*scale;
    const r=document.getElementById('game').getBoundingClientRect(),cssScale=Math.max(r.width/480,r.height/288);
    const physical={left:r.left+r.width/2+(px-480/2-8*scale)*cssScale,right:r.left+r.width/2+(px-480/2+8*scale)*cssScale,top:r.top+r.height/2+(py-288/2-40*scale)*cssScale,bottom:r.top+r.height/2+(py-288/2)*cssScale};
    const hudOverlap=r.width<r.height&&['#worldPartyBtn','#worldQuestBtn','.world-map'].some(selector=>{
     const element=document.querySelector(selector);if(!element)return false;const h=element.getBoundingClientRect();
     return Math.min(physical.right,h.right)>Math.max(physical.left,h.left)&&Math.min(physical.bottom,h.bottom)>Math.max(physical.top,h.top);
    });
    return {x:px,y:py,left:(480-v.visibleW)/2,right:(480+v.visibleW)/2,top:(288-v.visibleH)/2,bottom:(288+v.visibleH)/2,hudOverlap};
   },[x,y]);
   expect(visible.x).toBeGreaterThan(visible.left+5);expect(visible.x).toBeLessThan(visible.right-5);
   expect(visible.y).toBeGreaterThan(visible.top+25);expect(visible.y).toBeLessThan(visible.bottom);expect(visible.hudOverlap).toBe(false);
  }
  await page.evaluate(()=>window.AshenRealms.test.modifyGame(g=>{g.x=8;g.y=10}));
  await expect(page.locator('#worldBagBtn')).toBeVisible();await expect(page.locator('#worldPartyBtn')).toBeVisible();await expect(page.locator('#worldSaveBtn')).toBeVisible();
  await page.screenshot({path:`artifacts/interiors/${viewport.width}-tavern-zoom-${audit.zoom}.png`});
  await page.evaluate(()=>document.getElementById('zoomBtn').click());
 }
 expect(errors).toEqual([]);
});
