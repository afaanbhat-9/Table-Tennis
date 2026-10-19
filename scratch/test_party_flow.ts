import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testPartyFlow() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Click on "Create Party (Host)" button
  await page.click('#btn-open-create-party');
  await new Promise(r => setTimeout(r, 400));

  // Click on "Generate Party Code"
  await page.click('#btn-create-party-action');
  
  // Wait up to 5 seconds for lobby code to appear
  await page.waitForFunction(() => {
    const code = document.getElementById('display-party-code')?.innerText;
    return code && code !== '------' && code.length === 6;
  }, { timeout: 6000 });

  const partyCode = await page.$eval('#display-party-code', el => el.innerText);
  console.log('Successfully created party room with code:', partyCode);

  await page.screenshot({ path: 'scratch/screenshot_party_created.png' });
  await browser.close();
}

testPartyFlow().then(() => {
  console.log('Party flow test passed!');
  process.exit(0);
}).catch(err => {
  console.error('Party flow test failed:', err);
  process.exit(1);
});
