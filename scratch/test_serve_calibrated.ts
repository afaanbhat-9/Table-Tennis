import { PhysicsSimulation } from '../shared/physics.js';
import { PHYSICS_DT, TABLE_HEIGHT, BALL_RADIUS, GRAVITY } from '../shared/constants.js';

const sim = new PhysicsSimulation();
sim.prepareServe('player1');

// Custom serve test
const isP1 = true;
const dirZ = -1;
const forwardSpeed = 4.95;
const targetZ1 = 1.05;
const t1 = Math.abs((sim.ball.pos.z - targetZ1) / forwardSpeed);
const vy = Math.min(-1.12, (TABLE_HEIGHT + BALL_RADIUS - sim.ball.pos.y + 0.5 * (GRAVITY + 1.5) * t1 * t1) / t1);

sim.ball.vel = {
  x: 0,
  y: vy,
  z: dirZ * forwardSpeed
};
sim.ball.spin = { x: -18, y: 0, z: 0 };
sim.ball.serveState = 'in_play';

console.log('Testing calibrated serve. Initial vy:', vy, 'vz:', sim.ball.vel.z);

let netCleared = false;
let receiverBounced = false;

for (let i = 0; i < 90; i++) {
  const prevZ = sim.ball.pos.z;
  const res = sim.step(PHYSICS_DT, 4);

  if (prevZ > 0 && sim.ball.pos.z <= 0) {
    console.log(`Crossed net at step ${i}: height = ${sim.ball.pos.y.toFixed(3)}m (Net top: 0.913m), netTouched = ${sim.ball.netTouched}`);
    netCleared = sim.ball.pos.y > 0.9125 && !sim.ball.netTouched;
  }

  if (sim.ball.hasBouncedOnReceiverSide) {
    console.log(`Bounced on receiver side at step ${i}: z = ${sim.ball.pos.z.toFixed(3)}m, isLet = ${res.isLet}`);
    receiverBounced = true;
    break;
  }
}

console.log('Result: Net cleared cleanly =', netCleared, ', Receiver bounced =', receiverBounced);
