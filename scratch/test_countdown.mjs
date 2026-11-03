import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => !!window.__gameApp);

  const outDir = 'C:\\Users\\musht\\.gemini\\antigravity\\brain\\9697cb81-d446-41f8-a2c1-8b0da39cac6f';

  await page.evaluate(() => {
    window.__gameApp.uiManager.showHUD('singleplayer', 'YOU', 'CPU');
    const el = document.getElementById('countdown-digit');
    el.style.lineHeight = '1.25';
    el.style.padding = '0.15em 0.35em';
    el.style.display = 'inline-block';
  });

  for (const digit of [3, 2, 1]) {
    await page.evaluate((d) => {
      window.__gameApp.uiManager.showCountdown(d);
    }, digit);

    await new Promise(r => setTimeout(r, 450));

    await page.screenshot({ path: path.join(outDir, `fixed_countdown_${digit}.png`) });
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
