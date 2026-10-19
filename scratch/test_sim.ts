import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS } from '../shared/constants.js';

const sim = new PhysicsSimulation();
const ai = new TableTennisAI('medium');

// Serve by AI (player 2)
sim.prepareServe('player2');
sim.launchServe('player2', 0);

console.log('Serve launched by Player 2:');
console.log('Ball initial pos:', sim.ball.pos, 'vel:', sim.ball.vel);

let hitDetected = false;
let pointEnded = false;
let winner = '';
let reason = '';

// Position player 1 paddle at center
sim.paddle1.pos = { x: 0, y: 0.85, z: 1.55 };

for (let frame = 0; frame < 180; frame++) {
  const dt = 1/60;
  // AI update
  ai.update(dt, sim.ball, sim.paddle2);

  const res = sim.step(dt, SUB_STEPS);
  if (res.soundEvents.some(s => s.type === 'paddle_hit')) {
    console.log(`Frame ${frame} PADDLE HIT! Ball pos:`, sim.ball.pos, 'vel:', sim.ball.vel);
    hitDetected = true;
  }
  if (res.soundEvents.some(s => s.type === 'table_hit')) {
    console.log(`Frame ${frame} TABLE HIT! Ball pos:`, sim.ball.pos, 'vel:', sim.ball.vel);
  }
  if (res.pointEnded) {
    pointEnded = true;
    winner = res.pointWinner || '';
    reason = res.pointReason || '';
    console.log(`Frame ${frame} POINT ENDED! Winner: ${winner} Reason: ${reason}`);
    break;
  }
}
console.log('Summary - Hit detected:', hitDetected, 'Point ended:', pointEnded, winner, reason);
