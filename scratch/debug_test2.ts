import { PhysicsSimulation } from '../shared/physics.js';
import { TABLE_HEIGHT, SUB_STEPS, NET_Y_TOP } from '../shared/constants.js';

const sim = new PhysicsSimulation();
sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.12, z: 1.45 };
sim.paddle1.vel = { x: 0, y: 0, z: 0 };

sim.ball = {
  pos: { x: 0, y: TABLE_HEIGHT + 0.12, z: 1.42 },
  vel: { x: 0, y: 0.2, z: 5.5 },
  lastHitter: 'player2',
  bounceCountCurrentSide: 1,
  lastBounceSide: 'player1',
  hasBouncedOnServerSide: true,
  hasBouncedOnReceiverSide: true,
  isServe: false,
  active: true
};

const hitRes = sim.step(1/60, SUB_STEPS);
console.log('After hit step: vel =', sim.ball.vel, 'pos =', sim.ball.pos, 'active =', sim.ball.active, 'hitEvents =', hitRes.soundEvents);

let clearedNet = false;
let heightAtNet = 0;
for (let f = 0; f < 60; f++) {
  const prevZ = sim.ball.pos.z;
  const res = sim.step(1/60, SUB_STEPS);
  console.log(`f=${f}: z=${sim.ball.pos.z.toFixed(3)}, y=${sim.ball.pos.y.toFixed(3)}, vz=${sim.ball.vel.z.toFixed(3)}, vy=${sim.ball.vel.y.toFixed(3)}, pointEnded=${res.pointEnded}`);
  if (prevZ >= 0 && sim.ball.pos.z <= 0) {
    clearedNet = sim.ball.pos.y > NET_Y_TOP;
    heightAtNet = sim.ball.pos.y;
    console.log(`CROSS NET! height=${heightAtNet}, netTop=${NET_Y_TOP}, cleared=${clearedNet}`);
    break;
  }
  if (res.pointEnded) {
    console.log('Point ended early:', res.pointReason, res.pointWinner);
    break;
  }
}
