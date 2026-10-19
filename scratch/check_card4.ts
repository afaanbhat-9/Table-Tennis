import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const info = await page.evaluate(() => {
    const card4 = document.querySelector('.menu-column-info .menu-card:nth-child(2)') as HTMLElement;
    const header = card4.querySelector('.card-header') as HTMLElement;
    const grid = card4.querySelector('.rules-summary-grid') as HTMLElement;
    const tip = card4.querySelector('.rules-tip-strip') as HTMLElement;
    const box = card4.querySelector('.rule-box') as HTMLElement;

    const gridRect = grid.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const card4Rect = card4.getBoundingClientRect();

    return {
      card4Rect: { top: card4Rect.top, bottom: card4Rect.bottom, height: card4Rect.height },
      gridRect: { top: gridRect.top, bottom: gridRect.bottom, height: gridRect.height },
      tipRect: { top: tipRect.top, bottom: tipRect.bottom, height: tipRect.height },
      boxHeight: box.getBoundingClientRect().height,
      overlap: gridRect.bottom - tipRect.top,
      card4Style: {
        display: window.getComputedStyle(card4).display,
        justifyContent: window.getComputedStyle(card4).justifyContent,
        gap: window.getComputedStyle(card4).gap,
        padding: window.getComputedStyle(card4).padding
      }
    };
  });

  console.log('Card 4 Layout Info:', JSON.stringify(info, null, 2));

  // Also test at 1280x800 and 1366x768 and 1920x1080
  for (const vp of [{ w: 1280, h: 800 }, { w: 1366, h: 768 }, { w: 1920, h: 1080 }, { w: 1280, h: 720 }]) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await new Promise(r => setTimeout(r, 200));
    const vpOverlap = await page.evaluate(() => {
      const card4 = document.querySelector('.menu-column-info .menu-card:nth-child(2)') as HTMLElement;
      const grid = card4.querySelector('.rules-summary-grid') as HTMLElement;
      const tip = card4.querySelector('.rules-tip-strip') as HTMLElement;
      return {
        card4Height: card4.getBoundingClientRect().height,
        gridBottom: grid.getBoundingClientRect().bottom,
        tipTop: tip.getBoundingClientRect().top,
        overlap: grid.getBoundingClientRect().bottom - tip.getBoundingClientRect().top
      };
    });
    console.log(`Viewport ${vp.w}x${vp.h}:`, vpOverlap);
  }

  await browser.close();
}

test().catch(console.error);
