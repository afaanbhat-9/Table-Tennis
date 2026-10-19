import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function captureHover() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Hover over Card 1
  const card1 = await page.$('.menu-card');
  if (card1) {
    await card1.hover();
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.resolve('scratch/inspect_card_hover.png') });
    console.log('Saved scratch/inspect_card_hover.png');
  }

  await browser.close();
}

captureHover().catch(console.error);
