import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function verifyGameplayFeel() {
  console.log('=== STARTING COMPREHENSIVE GAMEPLAY VERIFICATION ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Desktop Match
  console.log('1. Navigating to desktop match...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Verify Main Menu is intact
  await page.screenshot({ path: path.resolve('scratch/verify_menu_preserved.png') });
  console.log('Saved scratch/verify_menu_preserved.png (UI Preserved)');

  // Click start match vs CPU
  console.log('Starting Singleplayer match...');
  await page.click('#btn-start-vs-cpu-instant');
  await new Promise(r => setTimeout(r, 1200));

  // Move mouse to position paddle comfortably on player side
  await page.mouse.move(960, 740);
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: path.resolve('scratch/verify_bat_clearance.png') });
  console.log('Saved scratch/verify_bat_clearance.png');

  // Wait for countdown to finish and serve to begin
  await new Promise(r => setTimeout(r, 2200));
  await page.screenshot({ path: path.resolve('scratch/verify_serve_stance.png') });
  console.log('Saved scratch/verify_serve_stance.png');

  // Simulate striking serve with mouse sweep
  const canvas = await page.$('#game-container canvas');
  const box = await canvas?.boundingBox();
  if (box) {
    const startX = box.x + box.width * 0.52;
    const startY = box.y + box.height * 0.75;
    await page.mouse.move(startX, startY);
    await new Promise(r => setTimeout(r, 100));
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 100));
    // Fast swipe forward towards opponent court
    await page.mouse.move(startX, startY - 140, { steps: 4 });
    await page.mouse.up();
  }

  // Wait for ball flight and table bounce
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.resolve('scratch/verify_rally_active.png') });
  console.log('Saved scratch/verify_rally_active.png');

  // 2. Laptop Viewport (1280x720)
  console.log('\n2. Testing Laptop Viewport (1280x720)...');
  await page.setViewport({ width: 1280, height: 720 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.resolve('scratch/verify_laptop_viewport.png') });
  console.log('Saved scratch/verify_laptop_viewport.png');

  // 3. Mobile Viewport (375x667)
  console.log('\n3. Testing Mobile Viewport (375x667)...');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.resolve('scratch/verify_mobile_viewport.png') });
  console.log('Saved scratch/verify_mobile_viewport.png');

  await browser.close();
  console.log('\n=== COMPREHENSIVE VERIFICATION COMPLETE ===');
}

verifyGameplayFeel().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
