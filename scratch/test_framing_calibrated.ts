import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testCalibrated() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // Override camera in SceneManager and inputController
  await page.evaluate(() => {
    const app = (window as any).gameApp;
    if (app) {
      const sm = app.sceneManager;
      sm.camera.fov = 45;
      sm.camera.position.set(0, 1.44, 3.05);
      sm.camera.lookAt(0, 0.74, -0.25);
      sm.camera.updateProjectionMatrix();
    }
  });

  // Start singleplayer match
  await page.click('#btn-start-vs-cpu-instant');
  await new Promise(r => setTimeout(r, 1200));

  // Re-apply camera & paddle position
  await page.evaluate(() => {
    const app = (window as any).gameApp;
    if (app) {
      const sm = app.sceneManager;
      sm.camera.fov = 45;
      sm.camera.position.set(0, 1.44, 3.05);
      sm.camera.lookAt(0, 0.74, -0.25);
      sm.camera.updateProjectionMatrix();

      // Test bat position at (0.25, 0.88, 1.84)
      app.spPhysics.paddle1.pos = { x: 0.25, y: 0.88, z: 1.84 };
      app.inputController.setPosition(0.25, 0.88, 1.84);
      sm.playerPaddle.updatePosition(0.25, 0.88, 1.84, -0.16, 0.08, -0.15);
      sm.render();
    }
  });

  await page.screenshot({ path: path.resolve('scratch/calibrated_test.png') });
  console.log('Saved scratch/calibrated_test.png');

  await browser.close();
}

testCalibrated().catch(console.error);
