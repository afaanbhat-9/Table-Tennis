import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testWallAndScoreboard() {
  console.log('Testing updated wall (no door/ladder) and anime scoreboard...');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Start singleplayer match
  await page.click('#btn-start-vs-cpu-instant');
  await new Promise(r => setTimeout(r, 1500));

  // Position paddle naturally
  await page.mouse.move(960, 740);
  await new Promise(r => setTimeout(r, 500));

  // Screenshot full court with new wall and anime scoreboard
  const fullPath = path.resolve('scratch/court_anime_scoreboard_wall.png');
  await page.screenshot({ path: fullPath });
  console.log(`Saved screenshot: ${fullPath}`);

  // Crop / focus on top scoreboard
  const scoreboardEl = await page.$('.scoreboard-container');
  if (scoreboardEl) {
    const sbPath = path.resolve('scratch/scoreboard_anime_close.png');
    await scoreboardEl.screenshot({ path: sbPath });
    console.log(`Saved scoreboard close-up: ${sbPath}`);
  }

  await browser.close();
  console.log('Test completed.');
}

testWallAndScoreboard().catch(console.error);
