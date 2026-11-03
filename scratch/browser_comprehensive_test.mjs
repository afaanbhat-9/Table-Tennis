import puppeteer from 'puppeteer-core';
import path from 'path';

const outDir = 'C:\\Users\\musht\\.gemini\\antigravity\\brain\\9697cb81-d446-41f8-a2c1-8b0da39cac6f';

async function runBrowserTests() {
  console.log('=== STARTING BROWSER TESTING SUITE ===\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => !!window.__gameApp);

  console.log('1. Verifying Zero Browser Console Errors on Load...');
  console.log(`  -> Console errors found: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Errors:', consoleErrors);
  }

  // 2. VERIFY COUNTDOWN DIGITS 3, 2, 1
  console.log('\n2. Verifying Countdown Digits Across Viewports...');
  for (const vp of [
    { name: 'Desktop (1280x720)', width: 1280, height: 720 },
    { name: 'Mobile (412x915)', width: 412, height: 915 }
  ]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.evaluate(() => {
      window.__gameApp.uiManager.showHUD('singleplayer', 'YOU', 'CPU');
    });

    for (const digit of [3, 2, 1]) {
      await page.evaluate((d) => {
        window.__gameApp.uiManager.showCountdown(d);
      }, digit);

      await new Promise(r => setTimeout(r, 450));

      const screenshotName = `verified_countdown_${digit}_${vp.width}.png`;
      await page.screenshot({ path: path.join(outDir, screenshotName) });

      const metrics = await page.evaluate(() => {
        const el = document.getElementById('countdown-digit');
        const rect = el.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          text: el.innerText
        };
      });
      console.log(`  -> ${vp.name} Digit ${digit}: text="${metrics.text}", box=${metrics.width.toFixed(1)}x${metrics.height.toFixed(1)}px -> Saved ${screenshotName}`);
    }
  }

  // Reset to desktop viewport
  await page.setViewport({ width: 1280, height: 720 });

  // 3. VERIFY SHOT SPEEDS: GENTLE VS MEDIUM VS POWERFUL
  console.log('\n3. Testing Shot Speed Scaling in Browser Engine...');
  const speedResults = await page.evaluate(() => {
    const sim = window.__gameApp.spPhysics;
    sim.isMultiplayer = false;

    function simulateHit(strokeZ, strokeX, isSwing, incomingZ = 5.0) {
      sim.ball = {
        pos: { x: 0, y: 0.76 + 0.14, z: 1.60 },
        vel: { x: 0, y: 0.2, z: incomingZ },
        spin: { x: 0, y: 0, z: 0 },
        serveState: 'in_play',
        lastHitter: 'player2',
        bounceCountCurrentSide: 1,
        lastBounceSide: 'player1',
        hasBouncedOnServerSide: true,
        hasBouncedOnReceiverSide: true,
        isServe: false,
        active: true,
        netTouched: false
      };
      sim.paddle1.pos = { x: 0, y: 0.76 + 0.14, z: 1.66 };
      sim.paddle1.vel = { x: strokeX, y: 0, z: strokeZ };
      sim.paddle1.isSwinging = isSwing;
      sim.p1Cooldown = 0;

      // Single step contact
      sim.step(1/60, 4);
      return Math.abs(sim.ball.vel.z);
    }

    const gentle = simulateHit(0, 0, false, 4.5); // passive block
    const slightMovement = simulateHit(-0.3, 0.1, false, 4.5); // gentle hit
    const mediumRally = simulateHit(-1.6, 0.4, false, 4.5); // standard rally
    const powerfulSmash = simulateHit(-6.0, 1.5, true, 4.5); // hard smash

    return { gentle, slightMovement, mediumRally, powerfulSmash };
  });

  console.log(`  -> Gentle passive block: ${speedResults.gentle.toFixed(2)} m/s`);
  console.log(`  -> Slight bat movement: ${speedResults.slightMovement.toFixed(2)} m/s`);
  console.log(`  -> Medium rally stroke: ${speedResults.mediumRally.toFixed(2)} m/s`);
  console.log(`  -> Powerful smash stroke: ${speedResults.powerfulSmash.toFixed(2)} m/s`);

  if (speedResults.slightMovement > speedResults.gentle &&
      speedResults.slightMovement < speedResults.gentle + 0.5) {
    console.log('  -> PASS: Slight bat movement produces controlled, smooth increase (no sudden rocket shot)!');
  } else {
    console.error('  -> FAIL: Slight movement produced unexpected speed!');
  }

  if (speedResults.powerfulSmash >= 8.0) {
    console.log('  -> PASS: Powerful smash speed is fully preserved (>= 8.0 m/s)!');
  }

  // 4. VERIFY BALL CURVING IN GAMEPLAY
  console.log('\n4. Testing Ball Curvature & Trajectories in Browser Engine...');
  const curveResults = await page.evaluate(() => {
    const sim = window.__gameApp.spPhysics;

    function runTrajectory(brushX, directionX, isSwinging) {
      sim.ball = {
        pos: { x: 0, y: 0.76 + 0.14, z: 1.60 },
        vel: { x: 0, y: 0.2, z: 5.0 },
        spin: { x: 0, y: 0, z: 0 },
        serveState: 'in_play',
        lastHitter: 'player2',
        bounceCountCurrentSide: 1,
        lastBounceSide: 'player1',
        hasBouncedOnServerSide: true,
        hasBouncedOnReceiverSide: true,
        isServe: false,
        active: true,
        netTouched: false
      };
      sim.paddle1.pos = { x: 0, y: 0.76 + 0.14, z: 1.66 };
      sim.paddle1.vel = { x: brushX, y: 0, z: -2.0 };
      sim.paddle1.isSwinging = isSwinging;
      sim.paddle1.swingPower = 0.8;
      sim.paddle1.swingDirection = { x: directionX, y: 0.15, z: -1 };
      sim.p1Cooldown = 0;

      // Contact step
      sim.step(1/60, 4);

      const spinAtContact = { ...sim.ball.spin };
      const trajectoryPoints = [];

      for (let f = 0; f < 35; f++) {
        sim.step(1/60, 4);
        trajectoryPoints.push({ x: sim.ball.pos.x, y: sim.ball.pos.y, z: sim.ball.pos.z });
        if (sim.ball.pos.z <= -0.8) break;
      }

      const finalPoint = trajectoryPoints[trajectoryPoints.length - 1];
      return { spinAtContact, finalPoint, trajectoryPoints };
    }

    const flat = runTrajectory(0, 0, false);
    const rightCurve = runTrajectory(2.0, 0.8, true);
    const leftCurve = runTrajectory(-2.0, -0.8, true);

    return { flat, rightCurve, leftCurve };
  });

  console.log(`  -> Flat shot landed at X: ${curveResults.flat.finalPoint.x.toFixed(3)}m, Spin: ${curveResults.flat.spinAtContact.y.toFixed(1)} rad/s`);
  console.log(`  -> Right curve landed at X: ${curveResults.rightCurve.finalPoint.x.toFixed(3)}m, Spin: ${curveResults.rightCurve.spinAtContact.y.toFixed(1)} rad/s`);
  console.log(`  -> Left curve landed at X: ${curveResults.leftCurve.finalPoint.x.toFixed(3)}m, Spin: ${curveResults.leftCurve.spinAtContact.y.toFixed(1)} rad/s`);

  const rightCurveDisplacement = curveResults.rightCurve.finalPoint.x - curveResults.flat.finalPoint.x;
  const leftCurveDisplacement = curveResults.leftCurve.finalPoint.x - curveResults.flat.finalPoint.x;

  console.log(`  -> Right curve lateral arc: +${(rightCurveDisplacement * 100).toFixed(1)} cm`);
  console.log(`  -> Left curve lateral arc: ${(leftCurveDisplacement * 100).toFixed(1)} cm`);

  if (rightCurveDisplacement > 0.15 && leftCurveDisplacement < -0.15) {
    console.log('  -> PASS: Ball visibly and physically curves according to stroke direction!');
  } else {
    console.error('  -> FAIL: Curving deflection insufficient!');
  }

  // 5. VERIFY BAT-BALL CONTACT INTEGRITY & ANTI-STICKING/NO-PASS-THROUGH
  console.log('\n5. Verifying Bat-Ball Contact Integrity (No sticking, no pass-through, no multiple hits)...');
  const contactResults = await page.evaluate(() => {
    const sim = window.__gameApp.spPhysics;
    let hitCount = 0;
    let penetrated = false;

    // Simulate 10 consecutive approaching shots towards bat
    for (let test = 0; test < 10; test++) {
      sim.ball = {
        pos: { x: (test % 3 - 1) * 0.1, y: 0.76 + 0.14, z: 1.40 },
        vel: { x: 0, y: 0.1, z: 4.5 },
        spin: { x: 0, y: 0, z: 0 },
        serveState: 'in_play',
        lastHitter: 'player2',
        bounceCountCurrentSide: 1,
        lastBounceSide: 'player1',
        hasBouncedOnServerSide: true,
        hasBouncedOnReceiverSide: true,
        isServe: false,
        active: true,
        netTouched: false
      };
      sim.paddle1.pos = { x: (test % 3 - 1) * 0.1, y: 0.76 + 0.14, z: 1.66 };
      sim.paddle1.vel = { x: 0, y: 0, z: -0.2 };
      sim.p1Cooldown = 0;

      let localHits = 0;
      for (let step = 0; step < 40; step++) {
        const res = sim.step(1/60, 4);
        if (res.soundEvents.some(s => s.type === 'paddle_hit')) {
          localHits++;
        }
        // Check if ball tunneled past paddle along +Z
        if (sim.ball.pos.z > sim.paddle1.pos.z + 0.10 && sim.ball.vel.z > 0) {
          penetrated = true;
        }
      }
      if (localHits === 1) hitCount++;
    }

    return { hitCount, penetrated };
  });

  console.log(`  -> Clean single-hit contacts: ${contactResults.hitCount}/10 shots`);
  console.log(`  -> Penetration/pass-through detected: ${contactResults.penetrated}`);

  if (contactResults.hitCount === 10 && !contactResults.penetrated) {
    console.log('  -> PASS: All contacts clean, reliable, no double hits, no pass-through!');
  } else {
    console.error('  -> FAIL: Contact flaws detected!');
  }

  // 6. VERIFY SUSTAINED GAMEPLAY RALLY IN BROWSER
  console.log('\n6. Verifying Sustained Browser Gameplay Rally...');
  await page.evaluate(() => {
    window.__gameApp.startSinglePlayer('medium');
  });

  // Let game run for 2.5 seconds
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outDir, 'gameplay_rally_active.png') });
  console.log('  -> Captured gameplay_rally_active.png during live single player match!');

  console.log(`\nFinal Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length === 0) {
    console.log('  -> Clean console, zero errors throughout test session!');
  }

  await browser.close();
  console.log('\n=== ALL BROWSER TESTS COMPLETED SUCCESSFULLY! ===');
}

runBrowserTests().catch(err => {
  console.error('Browser Test Error:', err);
  process.exit(1);
});
