import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function inspectReferenceGame() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Navigating to crazygames URL...');
  try {
    await page.goto('https://www.crazygames.com/game/table-tennis-world-tour', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Find iframe containing the game
    const iframes = page.frames();
    console.log(`Found ${iframes.length} frames`);
    for (const frame of iframes) {
      console.log('Frame URL:', frame.url());
    }

    await page.screenshot({ path: path.resolve('scratch/ref_page.png') });
    console.log('Saved scratch/ref_page.png');
  } catch (e) {
    console.error('Error loading reference game:', e);
  } finally {
    await browser.close();
  }
}

inspectReferenceGame().catch(console.error);
