import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testSticking() {
  console.log('=== INVESTIGATING BAT STICKING IN BROWSER ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000/?mode=singleplayer&diff=medium', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Check where the scoreboard is located in screen coordinates
  const scoreboardBox = await page.evaluate(() => {
    const sb = document.querySelector('.scoreboard-container');
    if (!sb) return null;
    const r = sb.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  });

  console.log('Scoreboard container bounding box:', scoreboardBox);

  // Install a probe on window and domElement to count pointermove events
  await page.evaluate(() => {
    (window as any).domElementMoveEvents = 0;
    (window as any).windowMoveEvents = 0;
    (window as any).paddlePositions = [];

    const container = document.getElementById('game-container')!;
    container.addEventListener('pointermove', () => {
      (window as any).domElementMoveEvents++;
    }, { passive: true });

    window.addEventListener('pointermove', (e) => {
      (window as any).windowMoveEvents++;
      const target = (e.target as HTMLElement)?.className || (e.target as HTMLElement)?.id || (e.target as HTMLElement)?.tagName;
      (window as any).lastPointerTarget = target;
    }, { passive: true });
  });

  if (!scoreboardBox) {
    console.error('Scoreboard not found!');
    await browser.close();
    return;
  }

  // 1. Move mouse outside the scoreboard (e.g. at Y = 400)
  console.log('\n--- Test 1: Moving mouse across unobstructed canvas (Y = 400) ---');
  await page.mouse.move(scoreboardBox.left, 400);
  await page.mouse.move(scoreboardBox.right, 400, { steps: 20 });

  let counts1 = await page.evaluate(() => ({
    dom: (window as any).domElementMoveEvents,
    win: (window as any).windowMoveEvents,
    target: (window as any).lastPointerTarget
  }));
  console.log('Unobstructed area counts:', counts1);

  // 2. Move mouse DIRECTLY ACROSS the scoreboard container (Y = scoreboard center)
  console.log('\n--- Test 2: Moving mouse DIRECTLY ACROSS the scoreboard container (Y = 25) ---');
  const midY = scoreboardBox.top + scoreboardBox.height / 2;
  const startX = scoreboardBox.left - 30;
  const endX = scoreboardBox.right + 30;

  // Reset counts
  await page.evaluate(() => {
    (window as any).domElementMoveEvents = 0;
    (window as any).windowMoveEvents = 0;
    (window as any).stuckFrames = 0;
    (window as any).movesInsideScoreboard = 0;
    (window as any).domMovesInsideScoreboard = 0;
  });

  // Track each step
  const results = [];
  for (let x = startX; x <= endX; x += 10) {
    await page.mouse.move(x, midY);
    await new Promise(r => setTimeout(r, 16));

    const stepInfo = await page.evaluate((currX, sb) => {
      const isInside = currX >= sb.left && currX <= sb.right;
      const app = (window as any).__gameApp;
      const targetPos = app ? { ...app.inputController.targetPos } : null;
      return {
        x: currX,
        isInside,
        lastTarget: (window as any).lastPointerTarget,
        targetPos
      };
    }, x, scoreboardBox);

    results.push(stepInfo);
  }

  const insideSteps = results.filter(r => r.isInside);
  console.log(`Steps inside scoreboard: ${insideSteps.length}`);
  console.log('Sample step inside scoreboard:', insideSteps[Math.floor(insideSteps.length / 2)]);

  // Check if targetPos changed during steps inside the scoreboard!
  const targetXValuesInside = insideSteps.map(s => s.targetPos?.x.toFixed(4));
  const uniqueXValuesInside = Array.from(new Set(targetXValuesInside));
  console.log(`Unique paddle target X values while cursor moved across scoreboard:`, uniqueXValuesInside);

  if (uniqueXValuesInside.length <= 1) {
    console.log('\n🚨 BUG REPRODUCED: The paddle target position was completely STUCK while moving across the scoreboard!');
  } else {
    console.log('Paddle position updated while over scoreboard.');
  }

  // 3. What about top-actions (pause and mute buttons)?
  const topActionsBox = await page.evaluate(() => {
    const el = document.querySelector('.top-actions');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  });
  console.log('\nTop-actions bounding box:', topActionsBox);

  if (topActionsBox) {
    console.log('--- Test 3: Moving mouse across top-actions buttons ---');
    const actionMidY = topActionsBox.top + topActionsBox.height / 2;
    const actionResults = [];
    for (let x = topActionsBox.left; x <= topActionsBox.right; x += 5) {
      await page.mouse.move(x, actionMidY);
      await new Promise(r => setTimeout(r, 16));
      const stepInfo = await page.evaluate(() => {
        const app = (window as any).__gameApp;
        return {
          lastTarget: (window as any).lastPointerTarget,
          targetPos: app ? { ...app.inputController.targetPos } : null
        };
      });
      actionResults.push(stepInfo);
    }
    const actionUniqueX = Array.from(new Set(actionResults.map(s => s.targetPos?.x.toFixed(4))));
    console.log(`Unique paddle target X values while cursor moved across top-actions:`, actionUniqueX);
    if (actionUniqueX.length <= 1) {
      console.log('🚨 BUG REPRODUCED on top-actions as well: Paddle was completely STUCK!');
    }
  }

  await browser.close();
}

testSticking().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
