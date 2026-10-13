import {expect} from '@playwright/test';
export async function finishCreation(page,{name='Arden',role='Fighter',ancestry='Human'}={}){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('#heroName').fill(name);
 await page.getByRole('button',{name:`Choose ${ancestry} ancestry`,exact:true}).click();
 await page.locator('[data-action="next"]').click();
 await page.getByRole('button',{name:`Choose ${role} class`,exact:true}).click();
 await page.locator('[data-action="next"]').click();await page.locator('[data-action="roll-all"]').click();
 await expect(page.locator('[data-action="next"]')).toBeEnabled();
 await page.locator('[data-action="next"]').click();await page.locator('[data-action="next"]').click();
 await page.getByRole('button',{name:'BEGIN ADVENTURE →',exact:true}).click();
 await expect(page.locator('html')).toHaveClass(/world-explore/);await page.emulateMedia({reducedMotion:'no-preference'});
}
