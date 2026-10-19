import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS } from '../shared/constants.js';

const ai = new TableTennisAI('hard');
const sim = new PhysicsSimulation();
const serveX = -0.32;
sim.prepareServe('player2', serveX);

for (let f = 0; f < 30; f++) {
  ai.update(1/60, sim.ball, sim.paddle2);
  sim.updateServeBall('player2');
}

sim.tossServe('player2');

for (let f = 0; f < 80; f++) {
  ai.update(1/60, sim.ball, sim.paddle2);
  const res = sim.step(1/60, SUB_STEPS);
  if (f >= 50 && f <= 75) {
    console.log(`f=${f}: z=${sim.ball.pos.z.toFixed(3)} y=${sim.ball.pos.y.toFixed(3)} vy=${sim.ball.vel.y.toFixed(3)} snds=${res.soundEvents.map(s => s.type + '@' + s.pos.z.toFixed(2)).join(',')}`);
  }
}
