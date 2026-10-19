import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  const metrics = await page.evaluate(() => {
    const cols = document.querySelectorAll('.menu-column');
    const cards = document.querySelectorAll('.menu-card');
    return {
      col1Height: (cols[0] as HTMLElement).offsetHeight,
      col2Height: (cols[1] as HTMLElement).offsetHeight,
      card1Height: (cards[0] as HTMLElement).offsetHeight,
      card2Height: (cards[1] as HTMLElement).offsetHeight,
      card3Height: (cards[2] as HTMLElement).offsetHeight,
      card4Height: (cards[3] as HTMLElement).offsetHeight,
      col1Bottom: (cards[1] as HTMLElement).getBoundingClientRect().bottom,
      col2Bottom: (cards[3] as HTMLElement).getBoundingClientRect().bottom
    };
  });
  console.log('Metrics:', JSON.stringify(metrics, null, 2));
  await browser.close();
}

main().catch(console.error);
