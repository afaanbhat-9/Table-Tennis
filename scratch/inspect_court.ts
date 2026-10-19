import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function captureCourt() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Click start match vs computer
  await page.click('#btn-start-vs-cpu-instant');
  await new Promise(r => setTimeout(r, 1200));

  // Move mouse to position paddle naturally in the foreground (right side) matching reference
  await page.mouse.move(960, 660);
  await new Promise(r => setTimeout(r, 600));

  // Capture screenshot of the 3D court
  await page.screenshot({ path: path.resolve('scratch/court_current.png') });
  console.log('Saved scratch/court_current.png');

  await browser.close();
}

captureCourt().catch(console.error);
