import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, TABLE_HEIGHT, NET_Y_TOP } from '../shared/constants.js';

console.log('Testing AI serves with corrected receiverTargetZ:\n');

for (const stance of [-0.30, 0.0, 0.30]) {
  const sim = new PhysicsSimulation();
  sim.prepareServe('player2', stance);
  const isP1 = false;
  const dirZ = 1;
  const forwardSpeed = 5.2;
  const receiverTargetZ = isP1 ? -0.80 : 0.80;
  const tTotal = Math.abs((sim.ball.pos.z - receiverTargetZ) / forwardSpeed);
  const targetX = -stance * 0.25;
  const rawVx = (targetX - sim.ball.pos.x) / tTotal;
  const vx = rawVx * 0.65;
  const vy = -1.65;
  const vz = dirZ * forwardSpeed;

  sim.ball.vel = { x: vx, y: vy, z: vz };
  sim.ball.spin = { x: dirZ * -18.0, y: 0, z: 0 };
  sim.ball.isServe = true;
  sim.ball.serveState = 'in_play';
  sim.ball.active = true;

  let b1: { x: number; z: number } | null = null;
  let b2: { x: number; z: number } | null = null;
  let netY: number | null = null;

  for (let f = 0; f < 120; f++) {
    const prevZ = sim.ball.pos.z;
    const res = sim.step(1/60, SUB_STEPS);
    const currZ = sim.ball.pos.z;

    if ((prevZ <= 0 && currZ >= 0) || (prevZ >= 0 && currZ <= 0)) {
      netY = sim.ball.pos.y;
    }

    for (const snd of res.soundEvents) {
      if (snd.type === 'table_hit') {
        if (b1 === null) b1 = { x: snd.pos.x, z: snd.pos.z };
        else if (b2 === null) b2 = { x: snd.pos.x, z: snd.pos.z };
      }
    }

    if (b2 !== null) break;
    if (res.pointEnded) {
      console.log(`Failed at stance=${stance}: ${res.pointReason}`);
      break;
    }
  }

  console.log(`Stance=${stance}: b1=(${b1?.x.toFixed(2)}, ${b1?.z.toFixed(2)}) netY=${netY?.toFixed(3)} b2=(${b2?.x.toFixed(2)}, ${b2?.z.toFixed(2)}) OK`);
}
