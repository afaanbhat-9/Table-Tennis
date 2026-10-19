import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FAMOBI_URL = 'https://play.famobi.com/table-tennis-world-tour';

async function testFamobi() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating to Famobi URL:', FAMOBI_URL);
  try {
    await page.goto(FAMOBI_URL, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.resolve('scratch/famobi_step1.png') });
    console.log('Saved scratch/famobi_step1.png');

    // Check frames
    for (const f of page.frames()) {
      console.log('Frame:', f.url());
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

testFamobi().catch(console.error);
