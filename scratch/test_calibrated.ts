import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, PLAYER_PADDLE_Z, TABLE_HEIGHT } from '../shared/constants.js';

// Monkey patch checkPaddleCollision to test calibrated return arc
const sim = new PhysicsSimulation();
const ai = new TableTennisAI('medium');

(sim as any).checkPaddleCollision = function(paddle: any, side: string) {
  const b = this.ball;
  const isP1 = side === 'player1';
  const dx = b.pos.x - paddle.pos.x;
  const dy = b.pos.y - paddle.pos.y;
  const dz = b.pos.z - paddle.pos.z;

  const radialDist = Math.hypot(dx, dy);
  const thickness = 0.15;

  if (radialDist <= 0.14 && Math.abs(dz) <= thickness) {
    const dirZ = isP1 ? -1 : 1;

    // Calibrated return arc
    const forwardSpeed = 6.8 + Math.max(0, -dirZ * paddle.vel.z) * 0.5;
    // Guaranteed net clearance with topspin arc
    const aimY = 2.1 + Math.max(-0.4, (dy / 0.08) * 0.3) + Math.max(0, paddle.vel.y * 0.25);
    const aimX = (dx / 0.08) * 0.7 + paddle.vel.x * 0.25;

    b.vel.x = Math.max(-1.8, Math.min(1.8, aimX));
    b.vel.y = Math.max(1.8, Math.min(3.0, aimY));
    b.vel.z = dirZ * forwardSpeed;

    b.pos.z = paddle.pos.z + dirZ * (0.012 / 2 + 0.02 + 0.02);
    return { collided: true, intensity: 0.8 };
  }
  return { collided: false, intensity: 0 };
};

sim.prepareServe('player1');
sim.launchServe('player1', 0.1);

console.log('Testing calibrated arc...');
let rallyCount = 0;

for (let frame = 0; frame < 900; frame++) {
  const dt = 1/60;

  // Auto-track player 1 paddle
  if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.4) {
    sim.paddle1.pos.x += (sim.ball.pos.x - sim.paddle1.pos.x) * 0.3;
    sim.paddle1.pos.y += (sim.ball.pos.y - sim.paddle1.pos.y) * 0.3;
  }

  ai.update(dt, sim.ball, sim.paddle2);
  const res = sim.step(dt, SUB_STEPS);

  for (const snd of res.soundEvents) {
    if (snd.type === 'paddle_hit') {
      rallyCount++;
      console.log(`[Frame ${frame}] HIT #${rallyCount}! Hitter: ${sim.ball.lastHitter} pos: (${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)})`);
    } else if (snd.type === 'table_hit') {
      console.log(`[Frame ${frame}] Table bounce at z = ${sim.ball.pos.z.toFixed(2)} on side: ${sim.ball.pos.z > 0 ? 'P1' : 'P2'}`);
    }
  }

  if (res.pointEnded) {
    console.log(`[Frame ${frame}] Point ended! Winner: ${res.pointWinner} Reason: ${res.pointReason}`);
    break;
  }
}

console.log(`Total rally shots completed: ${rallyCount}`);
