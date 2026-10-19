import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS } from '../shared/constants.js';

let passed = 0;
let failed = 0;

for (let r = 0; r < 20; r++) {
  const sim = new PhysicsSimulation();
  const ai = new TableTennisAI('hard');

  sim.prepareServe('player2');
  sim.launchServe('player2', 0);

  let hits = 0;
  let reason = '';
  for (let f = 0; f < 300; f++) {
    const dt = 1/60;

    if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.3) {
      sim.paddle1.pos.x += (sim.ball.pos.x - sim.paddle1.pos.x) * 0.35;
      sim.paddle1.pos.y += (sim.ball.pos.y - sim.paddle1.pos.y) * 0.35;
    }

    ai.update(dt, sim.ball, sim.paddle2);
    const res = sim.step(dt, SUB_STEPS);

    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit') hits++;
    }

    if (hits >= 4) break;
    if (res.pointEnded) {
      reason = `${res.pointWinner} (${res.pointReason})`;
      break;
    }
  }

  if (hits >= 4) {
    passed++;
  } else {
    failed++;
    console.log(`Rally ${r} ended with ${hits} hits: ${reason}`);
  }
}

console.log(`Passed: ${passed}/20, Failed: ${failed}/20`);
