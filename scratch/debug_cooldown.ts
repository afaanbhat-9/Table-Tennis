import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS } from '../shared/constants.js';

const ai = new TableTennisAI('hard');
const sim = new PhysicsSimulation();
sim.prepareServe('player2', -0.32);

for (let f = 0; f < 30; f++) {
  ai.update(1/60, sim.ball, sim.paddle2);
  sim.updateServeBall('player2');
}

sim.tossServe('player2');

for (let f = 0; f < 30; f++) {
  ai.update(1/60, sim.ball, sim.paddle2);
  const res = sim.step(1/60, SUB_STEPS);
  if (res.soundEvents.length > 0) {
    console.log(`f=${f}: p1Cd=${(sim as any).p1Cooldown} p2Cd=${(sim as any).p2Cooldown} snds=`, res.soundEvents);
  }
}
