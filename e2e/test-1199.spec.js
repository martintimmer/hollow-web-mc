import { test, expect } from '@playwright/test';
test('1199 check', async ({ page }) => {
  page.on('console', msg => console.log('PAGE:', msg.text()));
  await page.goto('http://127.0.0.1:5400/?debugSnapshot=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(12000);
  const info = await page.evaluate(async () => {
    const s = window.__gameState;
    const b1199 = window.BLOCK_MAP?.get?.(1199);
    const b1211 = window.BLOCK_MAP?.get?.(1211);
    return {
      buildTag: window.__BUILD_TAG,
      b1199: b1199 ? {id:b1199.id, name:b1199.name, side:b1199.side, custom:b1199.customAssetId} : null,
      b1211: b1211 ? {id:b1211.id, name:b1211.name, side:b1211.side, custom:b1211.customAssetId} : null,
      entities: s?.customAssetEntities ? [...s.customAssetEntities.keys()].slice(0,10) : null,
      player: s?.player ? {x:s.player.x, y:s.player.y, z:s.player.z} : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'snapshots/e2e-1199.png' });
  console.log('screenshot done');
});
