import { PhysicsSimulation } from '../shared/physics.js';

const sim = new PhysicsSimulation();
sim.ball.pos = { x: 0, y: 0.80, z: 1.50 };
sim.ball.vel = { x: 0, y: -0.8, z: 4.0 };
sim.ball.lastHitter = 'player2';
sim.ball.lastBounceSide = 'player1';
sim.ball.active = true;

sim.paddle1.pos = { x: 0, y: 0.80, z: 1.55 };
sim.paddle1.vel = { x: 0, y: 0.2, z: -0.6 };
sim.paddle1.rot = { x: 0.05, y: 0, z: -0.2 };

for (let f = 0; f < 40; f++) {
  const res = sim.step(1/60, 4);
  console.log(`f=${f}: pos=(${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(3)}, ${sim.ball.pos.z.toFixed(2)}) vel=(${sim.ball.vel.x.toFixed(2)}, ${sim.ball.vel.y.toFixed(2)}, ${sim.ball.vel.z.toFixed(2)})`);
  for (const s of res.soundEvents) {
    console.log(`  --> EVENT: ${s.type}`);
  }
  if (res.pointEnded) {
    console.log(`  --> POINT ENDED: ${res.pointWinner} (${res.pointReason})`);
    break;
  }
}
