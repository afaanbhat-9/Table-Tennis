import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testFix() {
  console.log('=== TESTING FIX: WINDOW POINTERMOVE LISTENER ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000/?mode=singleplayer&diff=medium', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const scoreboardBox = await page.evaluate(`
    (() => {
      const sb = document.querySelector('.scoreboard-container');
      if (!sb) return null;
      const r = sb.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    })()
  `) as any;

  // Apply the fix dynamically in page to verify:
  await page.evaluate(`
    (() => {
      const app = window.__gameApp;
      if (!app) return;
      window.addEventListener('pointermove', (e) => {
        app.inputController.handlePointerMove(e.clientX, e.clientY);
      }, { passive: true });
    })()
  `);

  if (!scoreboardBox) {
    console.error('Scoreboard not found!');
    await browser.close();
    return;
  }

  const midY = scoreboardBox.top + scoreboardBox.height / 2;
  const startX = scoreboardBox.left - 30;
  const endX = scoreboardBox.right + 30;

  const results = [];
  for (let x = startX; x <= endX; x += 10) {
    await page.mouse.move(x, midY);
    await new Promise(r => setTimeout(r, 16));

    const stepInfo = await page.evaluate(`
      (() => {
        const currX = ${x};
        const sbLeft = ${scoreboardBox.left};
        const sbRight = ${scoreboardBox.right};
        const isInside = currX >= sbLeft && currX <= sbRight;
        const app = window.__gameApp;
        const targetPos = app ? { ...app.inputController.targetPos } : null;
        return {
          x: currX,
          isInside: isInside,
          targetPos: targetPos
        };
      })()
    `) as any;

    results.push(stepInfo);
  }

  const insideSteps = results.filter((r: any) => r.isInside);
  const targetXValuesInside = insideSteps.map((s: any) => s.targetPos?.x.toFixed(4));
  const uniqueXValuesInside = Array.from(new Set(targetXValuesInside));
  console.log(`Inside scoreboard steps: ${insideSteps.length}`);
  console.log(`Unique paddle target X values with window listener: ${uniqueXValuesInside.length}`);
  console.log(`Sample target X values:`, uniqueXValuesInside.slice(0, 10));

  if (uniqueXValuesInside.length >= 25) {
    console.log('\n✅ VERIFIED: With window pointermove listener, the bat NEVER gets stuck! It tracks smoothly across every step!');
  } else {
    console.log('\n❌ Still stuck!');
  }

  await browser.close();
}

testFix().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
