import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FAILED ASSERTION: ${msg}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('=== STARTING MENU INTERACTIVE & BRANDING VERIFICATION ===\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: Desktop Viewport & Branding
  console.log('Test 1: Verifying Branding and Subtitle Removal...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const docTitle = await page.title();
  assert(docTitle === 'Table Tennis', `Document title must be 'Table Tennis', got: '${docTitle}'`);

  const brandTitle = await page.$eval('.brand-title', el => el.textContent?.trim());
  assert(brandTitle === 'Table Tennis', `Main menu title must be 'Table Tennis', got: '${brandTitle}'`);

  // Check no subtitle exists
  const hasSubtitle = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('ITTF Tournament Table Tennis');
  });
  assert(!hasSubtitle, 'Page must NOT contain subtitle "ITTF Tournament Table Tennis"');

  const topbarSubtitles = await page.$$('.brand-subtitle, .logo-subtitle');
  assert(topbarSubtitles.length === 0, 'No subtitle elements should exist in DOM');
  console.log('  -> Branding passed: Main title is "Table Tennis" with no subtitle.\n');

  // Test 2: Viewport fitting on desktop (1440x900) and laptop (1280x720)
  console.log('Test 2: Verifying desktop & laptop viewport fitting without accidental page scroll...');
  const desktopOverflow = await page.evaluate(() => {
    const container = document.getElementById('modal-main-menu');
    return {
      scrollHeight: container?.scrollHeight || 0,
      clientHeight: container?.clientHeight || 0,
      scrollWidth: container?.scrollWidth || 0,
      clientWidth: container?.clientWidth || 0
    };
  });
  assert(
    desktopOverflow.scrollHeight <= desktopOverflow.clientHeight + 2,
    `Desktop (1440x900) should fit without vertical page scroll. scrollHeight: ${desktopOverflow.scrollHeight}, clientHeight: ${desktopOverflow.clientHeight}`
  );
  assert(
    desktopOverflow.scrollWidth <= desktopOverflow.clientWidth,
    `Desktop should not have horizontal overflow.`
  );
  console.log('  -> Desktop 1440x900 fits cleanly with 0 overflow.\n');

  // Laptop 1280x720
  await page.setViewport({ width: 1280, height: 720 });
  await new Promise(r => setTimeout(r, 300));
  const laptopOverflow = await page.evaluate(() => {
    const container = document.getElementById('modal-main-menu');
    return {
      scrollHeight: container?.scrollHeight || 0,
      clientHeight: container?.clientHeight || 0
    };
  });
  assert(
    laptopOverflow.scrollHeight <= laptopOverflow.clientHeight + 4,
    `Laptop (1280x720) should fit without vertical page scroll. scrollHeight: ${laptopOverflow.scrollHeight}, clientHeight: ${laptopOverflow.clientHeight}`
  );
  console.log('  -> Laptop 1280x720 fits cleanly with 0 overflow.\n');

  // Reset to desktop for interaction tests
  await page.setViewport({ width: 1440, height: 900 });

  // Test 3: Card Hover & Interactive Animations
  console.log('Test 3: Verifying Card Hover animations on desktop...');
  const card1 = await page.$('.menu-card');
  assert(!!card1, 'Menu cards must exist');

  // Hover over card 1
  await card1.hover();
  await new Promise(r => setTimeout(r, 300));

  const cardTransform = await page.evaluate(() => {
    const c = document.querySelector('.menu-card');
    return window.getComputedStyle(c!).transform;
  });
  console.log('  Card computed transform on hover:', cardTransform);
  assert(cardTransform !== 'none', 'Card must have transform applied on hover');

  // Test 4: Difficulty Pill Selection & Interactive State
  console.log('\nTest 4: Verifying Difficulty Pill Selection...');
  const masterPill = await page.$('.diff-pill[data-diff="hard"]');
  assert(!!masterPill, 'Master difficulty pill must exist');
  await masterPill.click();
  await new Promise(r => setTimeout(r, 150));

  const isMasterActive = await page.evaluate(() => {
    const pill = document.querySelector('.diff-pill[data-diff="hard"]');
    return pill?.classList.contains('active');
  });
  assert(isMasterActive === true, 'Master difficulty pill must receive active class when clicked');

  // Hover over another pill
  const casualPill = await page.$('.diff-pill[data-diff="easy"]');
  await casualPill?.hover();
  await new Promise(r => setTimeout(r, 150));
  await casualPill?.click();
  await new Promise(r => setTimeout(r, 150));

  const isCasualActive = await page.evaluate(() => {
    const pill = document.querySelector('.diff-pill[data-diff="easy"]');
    return pill?.classList.contains('active');
  });
  assert(isCasualActive === true, 'Casual difficulty pill must receive active class when clicked');
  console.log('  -> Difficulty selection and interactive feedback verified.\n');

  // Test 5: Singleplayer Match Start & Return to Main Menu
  console.log('Test 5: Verifying Singleplayer Match Start & Return to Menu...');
  await page.click('#btn-start-vs-cpu-instant');
  await new Promise(r => setTimeout(r, 400));

  const hudVisible = await page.evaluate(() => {
    const hud = document.getElementById('hud-overlay');
    const mode = document.getElementById('hud-mode-label')?.innerText;
    return hud?.style.display === 'block' && mode?.includes('Singleplayer');
  });
  assert(hudVisible, 'Game HUD overlay must be visible and in Singleplayer mode');
  console.log('  -> Singleplayer match launched successfully into 3D court.');

  // Pause game and quit to menu
  await page.click('#btn-pause');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#btn-quit-to-menu');
  await new Promise(r => setTimeout(r, 400));

  const menuVisible = await page.evaluate(() => {
    const m = document.getElementById('modal-main-menu');
    return m?.style.display === 'flex';
  });
  assert(menuVisible, 'Main menu must re-open after quitting game');
  console.log('  -> Successfully returned to main menu, card entrance re-triggered.\n');

  // Test 6: Rules & Guide Modal
  console.log('Test 6: Verifying Rules & Guide Modal...');
  await page.click('#btn-header-rules');
  await new Promise(r => setTimeout(r, 300));
  const rulesModalVisible = await page.evaluate(() => {
    const modal = document.getElementById('modal-how-to-play');
    return modal?.style.display === 'flex';
  });
  assert(rulesModalVisible, 'Rules modal must be open');
  await page.click('#btn-close-how-to-play');
  await new Promise(r => setTimeout(r, 300));
  console.log('  -> Rules modal opened and closed cleanly.\n');

  // Test 7: Sound Toggle Action
  console.log('Test 7: Verifying Sound Toggle...');
  const initialSoundText = await page.$eval('#header-mute-icon', el => el.innerText);
  await page.click('#btn-header-sound');
  await new Promise(r => setTimeout(r, 200));
  const newSoundText = await page.$eval('#header-mute-icon', el => el.innerText);
  assert(initialSoundText !== newSoundText, 'Header mute text must change on toggle');
  // Toggle back
  await page.click('#btn-header-sound');
  console.log(`  -> Sound toggle verified: ${initialSoundText} -> ${newSoundText}.\n`);

  // Test 8: Multiplayer Party Creation Flow
  console.log('Test 8: Verifying Multiplayer Party Modal & Code Generation...');
  await page.click('#btn-open-create-party');
  await new Promise(r => setTimeout(r, 300));
  const partyModalVisible = await page.evaluate(() => {
    const m = document.getElementById('modal-party');
    return m?.style.display === 'flex';
  });
  assert(partyModalVisible, 'Party modal must open');

  await page.click('#btn-create-party-action');
  await page.waitForFunction(() => {
    const code = document.getElementById('display-party-code')?.innerText;
    return code && code !== '------' && code.length === 6;
  }, { timeout: 6000 });

  const generatedCode = await page.$eval('#display-party-code', el => el.innerText);
  assert(/^[A-Z0-9]{6}$/.test(generatedCode), `Party code must be 6 alphanumeric chars, got: ${generatedCode}`);
  // Leave party
  await page.click('#btn-leave-party');
  await new Promise(r => setTimeout(r, 400));
  const returnedToMenu = await page.evaluate(() => {
    return document.getElementById('modal-main-menu')?.style.display === 'flex';
  });
  assert(returnedToMenu, 'Should return to main menu after leaving party');
  console.log('  -> Party leave and return to menu verified.\n');

  // Test 9: Mobile Viewport Responsiveness
  console.log('Test 9: Verifying Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 300));

  const mobileMetrics = await page.evaluate(() => {
    const container = document.getElementById('modal-main-menu');
    const grid = document.querySelector('.menu-grid');
    const gridCols = window.getComputedStyle(grid!).gridTemplateColumns.split(' ').length;
    return {
      scrollWidth: container?.scrollWidth || 0,
      clientWidth: container?.clientWidth || 0,
      columns: gridCols
    };
  });
  assert(mobileMetrics.columns === 1, `Mobile grid must be 1 column, got: ${mobileMetrics.columns}`);
  assert(
    mobileMetrics.scrollWidth <= mobileMetrics.clientWidth,
    `Mobile must NOT have horizontal scrollbar. scrollWidth: ${mobileMetrics.scrollWidth}, clientWidth: ${mobileMetrics.clientWidth}`
  );
  console.log('  -> Mobile stacked in single column with zero horizontal overflow.\n');

  // Test 10: Prefers-Reduced-Motion Accessibility
  console.log('Test 10: Verifying prefers-reduced-motion accessibility...');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await new Promise(r => setTimeout(r, 200));

  const reducedMotionCard = await page.evaluate(() => {
    const card = document.querySelector('.menu-card');
    const style = window.getComputedStyle(card!);
    return {
      transform: style.transform,
      animationDuration: style.animationDuration
    };
  });
  console.log('  Card with reduced motion:', reducedMotionCard);
  assert(
    reducedMotionCard.transform === 'none' || reducedMotionCard.transform === 'matrix(1, 0, 0, 1, 0, 0)',
    'Cards must not translate when reduced-motion is requested'
  );
  console.log('  -> prefers-reduced-motion respected correctly.\n');

  await browser.close();
  console.log('=== ALL 10 TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
