import { PhysicsSimulation } from '../shared/physics.js';
import { PHYSICS_DT } from '../shared/constants.js';

const sim = new PhysicsSimulation();
sim.prepareServe('player1');
sim.launchServe('player1', 0);

console.log('Initial ball pos:', sim.ball.pos, 'vel:', sim.ball.vel);

for (let i = 0; i < 90; i++) {
  const res = sim.step(PHYSICS_DT, 4);
  console.log(`step ${i}: z=${sim.ball.pos.z.toFixed(3)}, y=${sim.ball.pos.y.toFixed(3)}, vz=${sim.ball.vel.z.toFixed(2)}, vy=${sim.ball.vel.y.toFixed(2)}, serverBounce=${sim.ball.hasBouncedOnServerSide}, recvBounce=${sim.ball.hasBouncedOnReceiverSide}`);
  if (sim.ball.hasBouncedOnReceiverSide) {
    console.log('SUCCESS: Bounced on receiver side at step', i);
    break;
  }
  if (res.pointEnded) {
    console.log('POINT ENDED at step', i, 'reason:', res.pointReason);
    break;
  }
}
