import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function playtest() {
  console.log('=== STARTING LIVE GAMEPLAY PLAYTEST & SCREENSHOT VERIFICATION ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Navigate to game
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // 2. Start Single Player VS CPU
  console.log('Clicking Play vs CPU button (#btn-start-vs-cpu-instant)...');
  await page.click('#btn-start-vs-cpu-instant');

  console.log('Match launched! Waiting for countdown (3, 2, 1, SERVE)...');
  await new Promise(r => setTimeout(r, 3500));

  // 3. Capture initial serve stance
  const screenshotPath1 = path.join(process.cwd(), 'scratch', 'court_overhaul_serve.png');
  await page.screenshot({ path: screenshotPath1 });
  console.log(`Saved serve stance screenshot to: ${screenshotPath1}`);

  // 4. Simulate player striking serve: click / flick forward
  console.log('Simulating mouse stroke to toss and strike serve...');
  const canvas = await page.$('#game-container canvas');
  const canvasBox = await canvas?.boundingBox();

  if (canvasBox) {
    const midX = canvasBox.x + canvasBox.width * 0.5;
    const bottomY = canvasBox.y + canvasBox.height * 0.72;

    // Move pointer to paddle position
    await page.mouse.move(midX, bottomY);
    await new Promise(r => setTimeout(r, 100));

    // Click to toss ball
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 150));
    await page.mouse.up();

    // Wait for toss apex and stroke forward
    await new Promise(r => setTimeout(r, 280));
    await page.mouse.move(midX, bottomY - 120, { steps: 5 }); // fast upward/forward stroke
  }

  // Wait 1.5s for ball flight and table bounce
  await new Promise(r => setTimeout(r, 1500));

  // 5. Capture active rally
  const screenshotPath2 = path.join(process.cwd(), 'scratch', 'court_rally_active.png');
  await page.screenshot({ path: screenshotPath2 });
  console.log(`Saved active rally screenshot to: ${screenshotPath2}`);

  // Check scoreboard and HUD visibility
  const scoreboardText = await page.$eval('#hud-scoreboard', el => el.textContent?.trim());
  console.log(`Live Scoreboard: ${scoreboardText}`);

  await browser.close();
  console.log('\n=== PLAYTEST COMPLETED SUCCESSFULLY! ===');
}

playtest().catch(err => {
  console.error('Playtest failed:', err);
  process.exit(1);
});
