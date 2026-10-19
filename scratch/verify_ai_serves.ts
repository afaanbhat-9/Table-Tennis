import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function verifyAIServes() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Inspect AI serve stances directly from game instance in browser
  const stances = await page.evaluate(() => {
    // @ts-ignore
    const app = window.app || (window as any).__tableTennisApp;
    // We can also test TableTennisAI directly in browser context
    return {
      hasWindow: true
    };
  });

  console.log('Browser initialized:', stances);
  await browser.close();
}

verifyAIServes().catch(console.error);
