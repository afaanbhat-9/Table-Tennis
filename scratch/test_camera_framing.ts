import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

interface CameraConfig {
  name: string;
  camPos: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  paddleZ: number;
  paddleY: number;
}

const configs: CameraConfig[] = [
  {
    name: 'baseline_current',
    camPos: [0, 1.58, 3.25],
    lookAt: [0, 0.76, -0.35],
    fov: 42,
    paddleZ: 1.76,
    paddleY: 0.94
  },
  {
    name: 'framing_option_A_lower_closer',
    // Lower camera, closer to table, table fills view with natural depth
    camPos: [0, 1.35, 2.85],
    lookAt: [0, 0.74, -0.25],
    fov: 46,
    paddleZ: 1.82,
    paddleY: 0.90
  },
  {
    name: 'framing_option_B_reference_over_shoulder',
    // Over the shoulder angle matching Table Tennis World Tour
    camPos: [0, 1.42, 3.00],
    lookAt: [0, 0.75, -0.30],
    fov: 45,
    paddleZ: 1.84,
    paddleY: 0.91
  },
  {
    name: 'framing_option_C_wide_arcade',
    camPos: [0, 1.48, 3.10],
    lookAt: [0, 0.75, -0.30],
    fov: 44,
    paddleZ: 1.86,
    paddleY: 0.92
  }
];

async function runTest() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const cfg of configs) {
    console.log(`Testing config: ${cfg.name}...`);
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    // Inject camera & paddle override into the running page
    await page.evaluate((cfg) => {
      const app = (window as any).gameApp;
      if (app && app.sceneManager) {
        const sm = app.sceneManager;
        sm.camera.fov = cfg.fov;
        sm.camera.position.set(...cfg.camPos);
        sm.camera.lookAt(...cfg.lookAt);
        sm.camera.updateProjectionMatrix();

        // Also set paddle position
        sm.playerPaddle.updatePosition(0.25, cfg.paddleY, cfg.paddleZ, -0.16, 0.08, -0.15);
        sm.render();
      }
    }, cfg);

    // Click play to enter match
    await page.click('#btn-start-vs-cpu-instant');
    await new Promise(r => setTimeout(r, 1200));

    // Position camera & paddle in match
    await page.evaluate((cfg) => {
      const app = (window as any).gameApp;
      if (app && app.sceneManager) {
        const sm = app.sceneManager;
        sm.camera.fov = cfg.fov;
        sm.camera.position.set(...cfg.camPos);
        sm.camera.lookAt(...cfg.lookAt);
        sm.camera.updateProjectionMatrix();

        app.inputController.setPosition(0.25, cfg.paddleY, cfg.paddleZ);
        app.sceneManager.playerPaddle.updatePosition(0.25, cfg.paddleY, cfg.paddleZ, -0.16, 0.08, -0.15);
        sm.render();
      }
    }, cfg);

    const outPath = path.resolve(`scratch/${cfg.name}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${outPath}`);
  }

  await browser.close();
  console.log('All framing tests finished.');
}

runTest().catch(console.error);
