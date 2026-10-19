import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS } from '../shared/constants.js';

const sim = new PhysicsSimulation();
const ai = new TableTennisAI('medium');

(sim as any).checkPaddleCollision = function(paddle: any, side: string) {
  const b = this.ball;
  const isP1 = side === 'player1';
  const dx = b.pos.x - paddle.pos.x;
  const dy = b.pos.y - paddle.pos.y;
  const dz = b.pos.z - paddle.pos.z;

  const radialDist = Math.hypot(dx, dy);
  const thickness = 0.16;

  if (radialDist <= 0.16 && Math.abs(dz) <= thickness) {
    const dirZ = isP1 ? -1 : 1;

    // Calibrated speed so ball lands cleanly inside opponent's court:
    // Forward speed 5.6 to 6.2 m/s gives distance ~2.2m from baseline (1.4m to net, 0.8m onto opponent table)
    const forwardPaddle = Math.max(0, -dirZ * paddle.vel.z);
    const forwardSpeed = 5.6 + forwardPaddle * 0.35;
    const aimY = 1.70 + Math.max(-0.2, (dy / 0.08) * 0.15);
    const aimX = (dx / 0.08) * 0.65 + paddle.vel.x * 0.3;

    b.vel.x = Math.max(-1.6, Math.min(1.6, aimX));
    b.vel.y = Math.max(1.60, Math.min(2.10, aimY));
    b.vel.z = dirZ * forwardSpeed;

    b.pos.z = paddle.pos.z + dirZ * (0.02 + 0.03);
    return { collided: true, intensity: 0.8 };
  }
  return { collided: false, intensity: 0 };
};

sim.prepareServe('player1');
sim.launchServe('player1', 0);

let rallies = 0;
for (let f = 0; f < 900; f++) {
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
    } else if (snd.type === 'table_hit') {
      console.log(`[Frame ${f}] Table bounce pos: (${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)})`);
    }
  }

  if (res.pointEnded) {
    console.log(`[Frame ${f}] Point ended: ${res.pointWinner} (${res.pointReason}) after ${rallies} hits!`);
    break;
  }
}
console.log(`Final total rallies: ${rallies}`);
