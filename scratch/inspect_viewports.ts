import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Desktop 1440x900 default state
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600)); // wait for entrance animation
  await page.screenshot({ path: path.resolve('scratch/inspect_desktop.png') });
  console.log('Saved scratch/inspect_desktop.png');

  // Capture Rules & Guide modal
  await page.click('#btn-header-rules');
  await new Promise(r => setTimeout(r, 350));
  await page.screenshot({ path: path.resolve('scratch/inspect_rules_modal.png') });
  console.log('Saved scratch/inspect_rules_modal.png');
  await page.click('#btn-close-how-to-play');
  await new Promise(r => setTimeout(r, 350));

  // Measure card dimensions
  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.menu-card'));
    return cards.map((c, i) => {
      const rect = c.getBoundingClientRect();
      return {
        card: i + 1,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        width: rect.width
      };
    });
  });
  console.log('Card metrics at 1440x900:', metrics);

  // 2. Hover over Card 1
  const card1 = await page.$('.menu-card:nth-child(1)');
  if (card1) {
    await card1.hover();
    await new Promise(r => setTimeout(r, 350));
    await page.screenshot({ path: path.resolve('scratch/inspect_hover_card1.png') });
    console.log('Saved scratch/inspect_hover_card1.png');
    const card1Transform = await page.evaluate(el => window.getComputedStyle(el).transform, card1);
    console.log('Card 1 hover transform:', card1Transform);
  }

  // 3. Hover over difficulty pill inside Card 1
  const pill = await page.$('.diff-pill[data-diff="hard"]');
  if (pill) {
    await pill.hover();
    await new Promise(r => setTimeout(r, 350));
    await page.screenshot({ path: path.resolve('scratch/inspect_hover_pill.png') });
    console.log('Saved scratch/inspect_hover_pill.png');

    const card1Transform = await page.$eval('.menu-card:nth-child(1)', el => window.getComputedStyle(el).transform);
    const pillTransform = await page.$eval('.diff-pill[data-diff="hard"]', el => window.getComputedStyle(el).transform);
    console.log('Card 1 (parent) transform when hovering pill:', card1Transform);
    console.log('Pill transform when hovered:', pillTransform);
  }

  // 4. Hover over Card 2
  const card2 = await page.$('.menu-card:nth-child(2)');
  if (card2) {
    await card2.hover();
    await new Promise(r => setTimeout(r, 350));
    try {
      await page.screenshot({ path: path.resolve('scratch/inspect_hover_card2.png') });
      console.log('Saved scratch/inspect_hover_card2.png');
    } catch (e: any) {
      console.warn('Could not write hover_card2:', e.message);
    }
    const card2Transform = await page.evaluate(el => window.getComputedStyle(el).transform, card2);
    console.log('Card 2 hover transform:', card2Transform);
  }

  // Move mouse away to reset
  await page.mouse.move(10, 10);
  await new Promise(r => setTimeout(r, 300));

  // 5. Laptop 1280x720
  await page.setViewport({ width: 1280, height: 720 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.resolve('scratch/inspect_laptop.png') });
  console.log('Saved scratch/inspect_laptop.png');

  const laptopMetrics = await page.evaluate(() => {
    const container = document.getElementById('modal-main-menu');
    return {
      scrollHeight: container?.scrollHeight,
      clientHeight: container?.clientHeight
    };
  });
  console.log('Laptop 1280x720 overflow check:', laptopMetrics);

  // 6. Mobile portrait 390x844
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.resolve('scratch/inspect_mobile.png') });
  console.log('Saved scratch/inspect_mobile.png');

  // 7. Mobile landscape 844x390
  await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.resolve('scratch/inspect_mobile_landscape.png') });
  console.log('Saved scratch/inspect_mobile_landscape.png');

  await browser.close();
  console.log('Done capturing all viewports and interactions.');
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
