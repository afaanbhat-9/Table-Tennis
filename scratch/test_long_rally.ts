import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS } from '../shared/constants.js';

const sim = new PhysicsSimulation();
const ai = new TableTennisAI('medium');

sim.prepareServe('player2');
sim.launchServe('player2', 0);

let rallies = 0;
for (let f = 0; f < 600; f++) {
  const dt = 1/60;

  if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.3) {
    sim.paddle1.pos.x += (sim.ball.pos.x - sim.paddle1.pos.x) * 0.35;
    sim.paddle1.pos.y += (sim.ball.pos.y - sim.paddle1.pos.y) * 0.35;
  }

  ai.update(dt, sim.ball, sim.paddle2);
  const res = sim.step(dt, SUB_STEPS);

  for (const snd of res.soundEvents) {
    if (snd.type === 'paddle_hit') {
      rallies++;
      console.log(`[Frame ${f}] Paddle hit #${rallies} by ${sim.ball.lastHitter} pos: (${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)})`);
    }
  }

  if (res.pointEnded) {
    console.log(`[Frame ${f}] Point ended: ${res.pointWinner} (${res.pointReason}) after ${rallies} hits!`);
    break;
  }
}
