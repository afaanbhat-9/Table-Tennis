import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, PLAYER_PADDLE_Z, TABLE_HEIGHT } from '../shared/constants.js';

for (const diff of ['easy', 'medium', 'hard'] as const) {
  const sim = new PhysicsSimulation();
  const ai = new TableTennisAI(diff);

  // Serve by AI
  sim.prepareServe('player2');
  sim.launchServe('player2', 0);

  let hits = 0;
  for (let f = 0; f < 300; f++) {
    const dt = 1/60;

    // Simulate responsive human tracking
    if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.3) {
      sim.paddle1.pos.x += (sim.ball.pos.x - sim.paddle1.pos.x) * 0.35;
      sim.paddle1.pos.y += (sim.ball.pos.y - sim.paddle1.pos.y) * 0.35;
    }

    ai.update(dt, sim.ball, sim.paddle2);
    const res = sim.step(dt, SUB_STEPS);

    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit') hits++;
    }

    if (res.pointEnded) {
      console.log(`[Difficulty: ${diff}] Point ended at frame ${f}. Hits: ${hits}. Winner: ${res.pointWinner} (${res.pointReason})`);
      break;
    }
  }
}
