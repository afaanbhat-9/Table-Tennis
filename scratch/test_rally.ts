import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, PLAYER_PADDLE_Z, TABLE_HEIGHT } from '../shared/constants.js';

// Let's test continuous rallies with an auto-tracking player paddle simulating human mouse control
const sim = new PhysicsSimulation();
const ai = new TableTennisAI('medium');

sim.prepareServe('player1');
sim.launchServe('player1', 0.1);

console.log('Player 1 serves to CPU...');

let rallyCount = 0;
let gameOver = false;

for (let frame = 0; frame < 600; frame++) {
  const dt = 1/60;

  // Simulate human player tracking the ball:
  // When ball is coming to player 1 (vel.z > 0), player moves paddle towards ball X and Y
  if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.5) {
    const targetX = sim.ball.pos.x;
    const targetY = Math.max(TABLE_HEIGHT + 0.08, Math.min(TABLE_HEIGHT + 0.45, sim.ball.pos.y));
    sim.paddle1.pos.x += (targetX - sim.paddle1.pos.x) * 0.25;
    sim.paddle1.pos.y += (targetY - sim.paddle1.pos.y) * 0.25;
  } else {
    // Return to center
    sim.paddle1.pos.x += (0 - sim.paddle1.pos.x) * 0.1;
    sim.paddle1.pos.y += (TABLE_HEIGHT + 0.18 - sim.paddle1.pos.y) * 0.1;
  }

  // AI update
  ai.update(dt, sim.ball, sim.paddle2);

  const res = sim.step(dt, SUB_STEPS);

  for (const snd of res.soundEvents) {
    if (snd.type === 'paddle_hit') {
      rallyCount++;
      console.log(`[Frame ${frame}] HIT #${rallyCount}! Hitter: ${sim.ball.lastHitter} Ball pos: (${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)}) Vel: (${sim.ball.vel.x.toFixed(2)}, ${sim.ball.vel.y.toFixed(2)}, ${sim.ball.vel.z.toFixed(2)})`);
    } else if (snd.type === 'table_hit') {
      console.log(`[Frame ${frame}] Table bounce at z = ${sim.ball.pos.z.toFixed(2)}`);
    }
  }

  if (res.pointEnded) {
    console.log(`[Frame ${frame}] Point ended! Winner: ${res.pointWinner} Reason: ${res.pointReason}`);
    gameOver = true;
    break;
  }
}

console.log(`Total rally shots completed: ${rallyCount}`);
