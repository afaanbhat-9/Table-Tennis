import { PhysicsSimulation } from '../shared/physics.js';
import { TABLE_HEIGHT, BALL_RADIUS, GRAVITY, NET_Y_TOP } from '../shared/constants.js';

console.log('Testing Player 1 and Player 2 with unified analytic serve formula:\n');

for (const isP1 of [true, false]) {
  const dirZ = isP1 ? -1 : 1;
  const startZ = isP1 ? 1.50 : -1.50;
  const targetZ1 = isP1 ? 0.95 : -0.95;
  const receiverTargetZ = isP1 ? -0.80 : 0.80;

  for (const startX of [-0.30, 0.0, 0.30]) {
    const sim = new PhysicsSimulation();
    const forwardSpeed = 4.75;
    const t1 = Math.abs((startZ - targetZ1) / forwardSpeed);
    const y0 = 1.02;
    const vy = (TABLE_HEIGHT + BALL_RADIUS - y0 + 0.5 * (GRAVITY + 1.5) * t1 * t1) / t1;

    const tTotal = Math.abs((startZ - receiverTargetZ) / forwardSpeed);
    const targetX = -startX * 0.25;
    const rawVx = (targetX - startX) / tTotal;
    const vx = rawVx * 0.65;

    sim.ball.pos = { x: startX, y: y0, z: startZ };
    sim.ball.vel = { x: vx, y: vy, z: dirZ * forwardSpeed };
    sim.ball.spin = { x: dirZ * -18.0, y: 0, z: 0 };
    sim.ball.isServe = true;
    sim.ball.serveState = 'in_play';
    sim.ball.lastHitter = isP1 ? 'player1' : 'player2';
    sim.ball.active = true;

    let b1: { x: number; z: number } | null = null;
    let b2: { x: number; z: number } | null = null;
    let netY: number | null = null;

    for (let f = 0; f < 120; f++) {
      const prevZ = sim.ball.pos.z;
      const res = sim.step(1/60, 4);
      const currZ = sim.ball.pos.z;

      if ((prevZ <= 0 && currZ >= 0) || (prevZ >= 0 && currZ <= 0)) {
        netY = sim.ball.pos.y;
      }

      for (const s of res.soundEvents) {
        if (s.type === 'table_hit') {
          if (b1 === null) b1 = { x: s.pos.x, z: s.pos.z };
          else if (b2 === null) b2 = { x: s.pos.x, z: s.pos.z };
        }
      }

      if (b2 !== null) break;
    }

    const netOk = netY !== null && netY > NET_Y_TOP;
    const b1Ok = b1 !== null && (isP1 ? b1.z > 0 : b1.z < 0) && Math.abs(b1.x) < 0.76;
    const b2Ok = b2 !== null && (isP1 ? b2.z < 0 : b2.z > 0) && Math.abs(b2.x) < 0.76;
    const success = netOk && b1Ok && b2Ok;

    console.log(`${isP1 ? 'P1' : 'P2'} X=${startX}: b1=(${b1?.x.toFixed(2)}, ${b1?.z.toFixed(2)}) netY=${netY?.toFixed(3)} b2=(${b2?.x.toFixed(2)}, ${b2?.z.toFixed(2)}) -> ${success ? 'SUCCESS' : 'FAILED'}`);
  }
}
