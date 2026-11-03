import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\musht\\.gemini\\antigravity\\brain\\9697cb81-d446-41f8-a2c1-8b0da39cac6f';

async function main() {
  console.log('Launching Chrome to inspect new Anime Scoreboard...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  page.on('console', msg => console.log('[Browser Console]', msg.type(), msg.text()));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Click start CPU to enter game
  await page.click('#btn-start-vs-cpu-instant');
  await new Promise(r => setTimeout(r, 600));

  // 1. Capture default scoreboard
  const sbElement = await page.$('#main-scoreboard');
  if (sbElement) {
    const defaultShot = path.join(ARTIFACT_DIR, 'anime_scoreboard_default.png');
    await sbElement.screenshot({ path: defaultShot });
    console.log(`Saved default scoreboard screenshot: ${defaultShot}`);
  }

  // 2. Trigger Point Increase for Player 1 (0 -> 1)
  console.log('Triggering point increase for Player 1...');
  await page.evaluate(() => {
    const app = window.gameApp;
    if (app && app.uiManager) {
      app.uiManager.updateScoreboard({ player1: 1, player2: 0, winner: null }, 'player1');
    }
  });

  // Capture immediately mid-animation (~120ms)
  await new Promise(r => setTimeout(r, 120));
  if (sbElement) {
    const p1AnimShot = path.join(ARTIFACT_DIR, 'anime_scoreboard_p1_scored.png');
    await sbElement.screenshot({ path: p1AnimShot });
    console.log(`Saved P1 scored animation screenshot: ${p1AnimShot}`);
  }

  // Also full page screenshot
  const fullPageShotP1 = path.join(ARTIFACT_DIR, 'gameplay_with_anime_scoreboard_p1.png');
  await page.screenshot({ path: fullPageShotP1 });
  console.log(`Saved full gameplay screenshot: ${fullPageShotP1}`);

  // Wait for animation to settle
  await new Promise(r => setTimeout(r, 1000));

  // 3. Trigger Point Increase for Player 2 (1 -> 1)
  console.log('Triggering point increase for Player 2...');
  await page.evaluate(() => {
    const app = window.gameApp;
    if (app && app.uiManager) {
      app.uiManager.updateScoreboard({ player1: 1, player2: 1, winner: null }, 'player2');
    }
  });

  await new Promise(r => setTimeout(r, 120));
  if (sbElement) {
    const p2AnimShot = path.join(ARTIFACT_DIR, 'anime_scoreboard_p2_scored.png');
    await sbElement.screenshot({ path: p2AnimShot });
    console.log(`Saved P2 scored animation screenshot: ${p2AnimShot}`);
  }

  // 4. Test Mobile Viewport (412x915)
  console.log('Testing Mobile Viewport...');
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 300));
  if (sbElement) {
    const mobileShot = path.join(ARTIFACT_DIR, 'anime_scoreboard_mobile.png');
    await sbElement.screenshot({ path: mobileShot });
    console.log(`Saved mobile scoreboard screenshot: ${mobileShot}`);
  }

  // 5. Verify SoundManager state
  const soundChecks = await page.evaluate(() => {
    const app = window.gameApp;
    if (!app || !app.soundManager) return null;
    const sm = app.soundManager;
    return {
      hasPlayPaddleHit: typeof sm.playPaddleHit === 'function',
      playCountdownCode: sm.playCountdown.toString(),
      playTableBounceCode: sm.playTableBounce.toString(),
      playScoreCode: sm.playScore.toString(),
      playButtonClickCode: sm.playButtonClick.toString(),
      playGameOverCode: sm.playGameOver.toString()
    };
  });

  console.log('Sound Manager Inspection:', {
    hasPlayPaddleHit: soundChecks?.hasPlayPaddleHit,
    isCountdownSilenced: soundChecks?.playCountdownCode.includes('Silenced'),
    isTableBounceSilenced: soundChecks?.playTableBounceCode.includes('Silenced'),
    isScoreSilenced: soundChecks?.playScoreCode.includes('Silenced'),
    isButtonClickSilenced: soundChecks?.playButtonClickCode.includes('Silenced')
  });

  await browser.close();
  console.log('All browser inspections completed successfully!');
}

main().catch(err => {
  console.error('Error running browser test:', err);
  process.exit(1);
});
