import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, TABLE_HEIGHT, NET_Y_TOP } from '../shared/constants.js';

// Let's test rally physics simulation with calibrated minVyToClear
const sim = new PhysicsSimulation();
const ai = new TableTennisAI('hard');

// Prepare and launch serve cleanly
sim.prepareServe('player2');
sim.launchServe('player2', 0);

let hitCount = 0;
for (let f = 0; f < 600; f++) {
  const dt = 1/60;
  // Human paddle tracks ball accurately on player 1 side
  if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.2) {
    sim.paddle1.pos.x += (sim.ball.pos.x - sim.paddle1.pos.x) * 0.45;
    sim.paddle1.pos.y += (sim.ball.pos.y - sim.paddle1.pos.y) * 0.45;
  }
  ai.update(dt, sim.ball, sim.paddle2);
  const res = sim.step(dt, SUB_STEPS);

  for (const snd of res.soundEvents) {
    if (snd.type === 'paddle_hit') {
      hitCount++;
      console.log(`Hit #${hitCount} at frame ${f}: hitter=${sim.ball.lastHitter} pos=(${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)}) vel=(${sim.ball.vel.x.toFixed(2)}, ${sim.ball.vel.y.toFixed(2)}, ${sim.ball.vel.z.toFixed(2)})`);
    } else if (snd.type === 'table_hit') {
      console.log(`   Table bounce at frame ${f}: pos=(${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)})`);
    }
  }

  if (res.pointEnded) {
    console.log(`Point ended at frame ${f} after ${hitCount} hits: reason="${res.pointReason}" winner=${res.pointWinner}`);
    break;
  }
}
