import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const GAME_URL = 'https://games.cdn.famobi.com/html5games/t/table-tennis-world-tour/92a8f146/?fg_domain=play.famobi.com';

async function captureGameplay() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating directly to CDN game URL:', GAME_URL);
  await page.goto(GAME_URL, { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 6000));

  await page.screenshot({ path: path.resolve('scratch/famobi_game1.png') });
  console.log('Saved scratch/famobi_game1.png');

  // Let's click on the screen to progress through splash / start button
  console.log('Clicking screen center...');
  await page.mouse.click(640, 360);
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.resolve('scratch/famobi_game2.png') });
  console.log('Saved scratch/famobi_game2.png');

  // Click start / country select / play
  await page.mouse.click(640, 480);
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.resolve('scratch/famobi_game3.png') });
  console.log('Saved scratch/famobi_game3.png');

  await page.mouse.click(640, 520);
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.resolve('scratch/famobi_game4.png') });
  console.log('Saved scratch/famobi_game4.png');

  await browser.close();
}

captureGameplay().catch(console.error);
