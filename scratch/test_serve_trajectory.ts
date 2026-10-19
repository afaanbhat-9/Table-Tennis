import { PhysicsSimulation } from '../shared/physics.js';
import { SUB_STEPS, TABLE_HEIGHT, NET_Y_TOP } from '../shared/constants.js';

function simulateServeTrajectory(isP1: boolean, startX: number, startY: number, startZ: number, targetX: number, forwardSpeed: number = 5.2) {
  const sim = new PhysicsSimulation();
  const dirZ = isP1 ? -1 : 1;
  const vz = dirZ * forwardSpeed;
  const vy = -1.65;
  const tTotal = Math.abs((startZ - (-dirZ * 0.75)) / vz);
  // Naturally scale lateral deflection so ball lands safely on table
  const maxLateralAngle = 0.45;
  const rawVx = (targetX - startX) / tTotal;
  const vx = Math.max(-maxLateralAngle * forwardSpeed, Math.min(maxLateralAngle * forwardSpeed, rawVx * 0.65));

  sim.ball.pos = { x: startX, y: startY, z: startZ };
  sim.ball.vel = { x: vx, y: vy, z: vz };
  sim.ball.spin = { x: dirZ * -15, y: 0, z: 0 };
  sim.ball.isServe = true;
  sim.ball.serveState = 'in_play';
  sim.ball.lastHitter = isP1 ? 'player1' : 'player2';
  sim.ball.active = true;

  let b1: { x: number; z: number } | null = null;
  let b2: { x: number; z: number } | null = null;
  let netY: number | null = null;
  let netClipped = false;

  for (let f = 0; f < 120; f++) {
    const prevZ = sim.ball.pos.z;
    const res = sim.step(1/60, SUB_STEPS);
    const currZ = sim.ball.pos.z;

    if ((prevZ >= 0 && currZ <= 0) || (prevZ <= 0 && currZ >= 0)) {
      netY = sim.ball.pos.y;
    }

    for (const snd of res.soundEvents) {
      if (snd.type === 'table_hit') {
        if (b1 === null) b1 = { x: snd.pos.x, z: snd.pos.z };
        else if (b2 === null) b2 = { x: snd.pos.x, z: snd.pos.z };
      }
      if (snd.type === 'net_hit') {
        netClipped = true;
      }
    }

    if (b2 !== null) break;
    if (res.pointEnded) {
      return { success: false, reason: res.pointReason, b1, b2, netY, netClipped };
    }
  }

  const netOk = netY !== null && netY >= NET_Y_TOP + 0.02 && !netClipped;
  const b1Ok = b1 !== null && (isP1 ? (b1.z > 0 && b1.z < 1.37) : (b1.z < 0 && b1.z > -1.37)) && Math.abs(b1.x) < 0.76;
  const b2Ok = b2 !== null && (isP1 ? (b2.z < 0 && b2.z > -1.37) : (b2.z > 0 && b2.z < 1.37)) && Math.abs(b2.x) < 0.76;
  const success = netOk && b1Ok && b2Ok;

  return { success, b1, b2, netY, netClipped };
}

console.log('Testing with scaled lateral angle for P1:');
for (const startX of [-0.32, 0.0, 0.32]) {
  for (const targetX of [-0.25, 0.0, 0.25]) {
    const res = simulateServeTrajectory(true, startX, TABLE_HEIGHT + 0.16, 1.50, targetX);
    console.log(`P1 from X=${startX} to targetX=${targetX}: success=${res.success} b1=(${res.b1?.x.toFixed(2)}, ${res.b1?.z.toFixed(2)}) netY=${res.netY?.toFixed(3)} b2=(${res.b2?.x.toFixed(2)}, ${res.b2?.z.toFixed(2)})`);
  }
}

console.log('\nTesting with scaled lateral angle for P2:');
for (const startX of [-0.32, 0.0, 0.32]) {
  for (const targetX of [-0.25, 0.0, 0.25]) {
    const res = simulateServeTrajectory(false, startX, TABLE_HEIGHT + 0.16, -1.50, targetX);
    console.log(`P2 from X=${startX} to targetX=${targetX}: success=${res.success} b1=(${res.b1?.x.toFixed(2)}, ${res.b1?.z.toFixed(2)}) netY=${res.netY?.toFixed(3)} b2=(${res.b2?.x.toFixed(2)}, ${res.b2?.z.toFixed(2)})`);
  }
}
