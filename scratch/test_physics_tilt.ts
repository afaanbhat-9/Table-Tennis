import { PhysicsSimulation } from '../shared/physics.js';
import { TABLE_HEIGHT, NET_Y_TOP, SUB_STEPS, PADDLE_RADIUS } from '../shared/constants.js';

console.log('=== TESTING PHYSICS BEHAVIOR WITH VARIOUS BAT ANGLES & VELOCITIES ===');

// Test matrix:
// 1. Low ball below net (Y = TABLE_HEIGHT + 0.05 = 0.81m)
// 2. Mid ball at net height (Y = NET_Y_TOP = 0.91m)
// 3. High ball above net (Y = 1.05m)
// 4. Forward reach over table (Z = 1.15m)
// 5. Baseline return (Z = 1.60m)
// 6. Fast incoming ball (vz = 6.5) vs slow ball (vz = 3.5)

const testCases = [
  { name: 'Low ball below net (Y=0.81m, Z=1.55m), open bat (+0.05)', ballY: 0.81, ballZ: 1.50, paddleZ: 1.55, rotX: 0.05, paddleVy: 0.0 },
  { name: 'Low ball below net (Y=0.81m, Z=1.55m), neutral bat (0.0)', ballY: 0.81, ballZ: 1.50, paddleZ: 1.55, rotX: 0.0, paddleVy: 0.0 },
  { name: 'Low ball below net (Y=0.81m, Z=1.55m), OLD closed bat (-0.20)', ballY: 0.81, ballZ: 1.50, paddleZ: 1.55, rotX: -0.20, paddleVy: 0.0 },
  { name: 'Mid ball at net (Y=0.91m, Z=1.55m), neutral bat (0.0)', ballY: 0.91, ballZ: 1.50, paddleZ: 1.55, rotX: 0.0, paddleVy: 0.0 },
  { name: 'High ball above net (Y=1.05m, Z=1.55m), topspin closed bat (-0.12)', ballY: 1.05, ballZ: 1.50, paddleZ: 1.55, rotX: -0.12, paddleVy: 0.0 },
  { name: 'Forward reach over table (Y=0.82m, Z=1.15m), neutral bat (0.0)', ballY: 0.82, ballZ: 1.10, paddleZ: 1.15, rotX: 0.0, paddleVy: 0.0 },
  { name: 'Forward reach over table (Y=0.82m, Z=1.15m), OLD tilt (-0.35)', ballY: 0.82, ballZ: 1.10, paddleZ: 1.15, rotX: -0.35, paddleVy: 0.0 },
];

for (const tc of testCases) {
  const sim = new PhysicsSimulation();
  sim.ball.pos = { x: 0, y: tc.ballY, z: tc.ballZ };
  sim.ball.vel = { x: 0, y: -0.5, z: 4.5 };
  sim.ball.lastHitter = 'player2';
  sim.ball.lastBounceSide = 'player1';
  sim.ball.bounceCountCurrentSide = 1;
  sim.ball.active = true;

  sim.paddle1.pos = { x: 0, y: tc.ballY, z: tc.paddleZ };
  sim.paddle1.vel = { x: 0, y: tc.paddleVy, z: -0.5 };
  sim.paddle1.rot = { x: tc.rotX, y: 0, z: -0.2 };

  let outcome = 'No contact';
  for (let f = 0; f < 60; f++) {
    const res = sim.step(1/60, SUB_STEPS);
    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit') {
        // hit
      } else if (snd.type === 'table_hit') {
        if (sim.ball.pos.z > 0) {
          outcome = `❌ Bounced on Player 1 side (z = ${sim.ball.pos.z.toFixed(2)})`;
        } else {
          outcome = `✅ Landed on Opponent side (z = ${sim.ball.pos.z.toFixed(2)})`;
        }
      } else if (snd.type === 'net_hit') {
        outcome = `⚠️ Hit Net (z = ${sim.ball.pos.z.toFixed(2)})`;
      }
    }
    if (res.pointEnded) break;
  }
  console.log(`${tc.name} => ${outcome}`);
}
