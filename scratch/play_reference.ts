import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const GAME_URL = 'https://table-tennis-world-tour.game-files.crazygames.com/table-tennis-world-tour/3/index.html';

async function playReference() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Navigating directly to game frame:', GAME_URL);
  await page.goto(GAME_URL, { waitUntil: 'networkidle0', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  await page.screenshot({ path: path.resolve('scratch/ref_step1.png') });
  console.log('Saved scratch/ref_step1.png');

  // Find canvas or buttons
  const canvas = await page.$('canvas');
  console.log('Found canvas:', !!canvas);

  // Click center of screen to dismiss start screen / select country
  await page.mouse.click(640, 360);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.resolve('scratch/ref_step2.png') });
  console.log('Saved scratch/ref_step2.png');

  // Click again to proceed past country select or menu
  await page.mouse.click(640, 500);
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.resolve('scratch/ref_step3.png') });
  console.log('Saved scratch/ref_step3.png');

  // Click start match
  await page.mouse.click(640, 550);
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.resolve('scratch/ref_gameplay.png') });
  console.log('Saved scratch/ref_gameplay.png');

  await browser.close();
}

playReference().catch(console.error);
