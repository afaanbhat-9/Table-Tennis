import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runBrowserPlaytest() {
  console.log('=== STARTING BROWSER PLAYTEST: BAT ANGLE & RETURN TRAJECTORY ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Navigate to game with Single Player VS CPU
  console.log('1. Navigating to http://localhost:3000/?mode=singleplayer&diff=medium');
  await page.goto('http://localhost:3000/?mode=singleplayer&diff=medium', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Wait for 3, 2, 1, SERVE countdown to complete
  console.log('2. Waiting for countdown to finish and serve to begin...');
  await new Promise(r => setTimeout(r, 3500));

  // 3. Inspect bat tilt at resting / serve stance
  const batStateReady = await page.evaluate(() => {
    const app = (window as any).__gameApp;
    if (!app) return null;
    return {
      paddle1Rot: { ...app.spPhysics.paddle1.rot },
      paddle1Pos: { ...app.spPhysics.paddle1.pos },
      ballPos: { ...app.spPhysics.ball.pos },
      phase: app.spPhase
    };
  });
  console.log('3. Ready Stance Bat State:', batStateReady);

  const screenshot1 = path.join(process.cwd(), 'scratch', 'bat_ready_stance.png');
  await page.screenshot({ path: screenshot1 });
  console.log(`Saved screenshot to: ${screenshot1}`);

  // 4. Toss and strike serve
  console.log('4. Performing serve click and forward stroke...');
  const canvas = await page.$('#game-container canvas');
  const canvasBox = await canvas?.boundingBox();

  if (canvasBox) {
    const midX = canvasBox.x + canvasBox.width * 0.5;
    const bottomY = canvasBox.y + canvasBox.height * 0.72;

    await page.mouse.move(midX, bottomY);
    await new Promise(r => setTimeout(r, 100));

    // Click to toss ball
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 120));
    await page.mouse.up();

    // Wait for toss apex and forward stroke
    await new Promise(r => setTimeout(r, 260));
    await page.mouse.move(midX, bottomY - 140, { steps: 8 });
  }

  // 5. Track ball trajectory across the court
  console.log('5. Tracking ball flight over the net and into receiver court...');
  const milestones: any[] = [];
  let bouncesOnPlayerSide = false;

  for (let step = 0; step < 40; step++) {
    await new Promise(r => setTimeout(r, 50));
    const sample = await page.evaluate(() => {
      const app = (window as any).__gameApp;
      if (!app) return null;
      const b = app.spPhysics.ball;
      return {
        pos: { x: b.pos.x, y: b.pos.y, z: b.pos.z },
        vel: { x: b.vel.x, y: b.vel.y, z: b.vel.z },
        lastBounceSide: b.lastBounceSide,
        lastHitter: b.lastHitter,
        active: b.active
      };
    });

    if (sample) {
      milestones.push(sample);
      // Check if after crossing net or hitting, ball bounced incorrectly
    }
  }

  console.log(`Recorded ${milestones.length} trajectory milestones during rally.`);
  const tableHits = milestones.filter((m, i, arr) => {
    if (i === 0) return false;
    return Math.abs(m.pos.y - 0.78) < 0.04 && arr[i-1].vel.y < 0 && m.vel.y > 0;
  });
  console.log('Table bounce samples identified:', tableHits.length);

  const screenshot2 = path.join(process.cwd(), 'scratch', 'bat_active_rally.png');
  await page.screenshot({ path: screenshot2 });
  console.log(`Saved screenshot to: ${screenshot2}`);

  // 6. Test paddle height adaptation: move mouse up and down on screen and inspect rot.x
  console.log('6. Testing paddle height-dependent tilt in browser...');
  const tiltMeasurements = [];

  for (const yOffset of [0.45, 0.60, 0.75, 0.88]) {
    if (canvasBox) {
      const testX = canvasBox.x + canvasBox.width * 0.5;
      const testY = canvasBox.y + canvasBox.height * yOffset;
      await page.mouse.move(testX, testY);
      await new Promise(r => setTimeout(r, 120));

      const tiltSample = await page.evaluate(() => {
        const app = (window as any).__gameApp;
        if (!app) return null;
        return {
          posY: app.inputController.currentPaddle.pos.y,
          rotX: app.inputController.currentPaddle.rot.x,
          rotY: app.inputController.currentPaddle.rot.y
        };
      });
      tiltMeasurements.push({ screenYFraction: yOffset, ...tiltSample });
    }
  }
  console.log('Tilt measurements across screen heights:', tiltMeasurements);

  const screenshot3 = path.join(process.cwd(), 'scratch', 'bat_tilt_verified.png');
  await page.screenshot({ path: screenshot3 });
  console.log(`Saved screenshot to: ${screenshot3}`);

  await browser.close();
  console.log('\n=== BROWSER PLAYTEST FINISHED SUCCESSFULLY! ===');
}

runBrowserPlaytest().catch(err => {
  console.error('Browser playtest failed:', err);
  process.exit(1);
});
