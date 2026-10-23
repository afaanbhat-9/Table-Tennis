import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, TABLE_HEIGHT, PLAYER_PADDLE_Z, getMinPaddleY } from '../shared/constants.js';

const sim = new PhysicsSimulation();
const ai = new TableTennisAI('medium');

sim.prepareServe('player1');
sim.launchServe('player1', 0.1);

console.log('--- Simulating rally with realistic InputController paddle rotation ---');

let paddle1Pos = { x: 0, y: TABLE_HEIGHT + 0.12, z: PLAYER_PADDLE_Z };
let paddle1Rot = { x: -0.14, y: 0.0, z: -0.20 };
let paddle1Vel = { x: 0, y: 0, z: 0 };

for (let frame = 0; frame < 600; frame++) {
  const dt = 1/60;

  // Simulate InputController:
  if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.4) {
    const targetX = sim.ball.pos.x;
    const targetY = Math.max(TABLE_HEIGHT + 0.08, Math.min(TABLE_HEIGHT + 0.45, sim.ball.pos.y));
    const prevX = paddle1Pos.x;
    const prevY = paddle1Pos.y;
    paddle1Pos.x += (targetX - paddle1Pos.x) * 0.35;
    paddle1Pos.y += (targetY - paddle1Pos.y) * 0.35;
    paddle1Vel.x = (paddle1Pos.x - prevX) / dt;
    paddle1Vel.y = (paddle1Pos.y - prevY) / dt;
  } else {
    paddle1Vel.x = 0;
    paddle1Vel.y = 0;
  }

  // Exact tilt from InputController:
  const tableCloseness = Math.max(0, 1.0 - (paddle1Pos.z - 1.37) / 0.50);
  const targetTiltX = -0.14 - tableCloseness * 0.16;
  const targetTiltY = (paddle1Pos.x / 1.0) * 0.22;
  const targetTiltZ = -0.20 - (paddle1Pos.x / 1.0) * 0.30;
  paddle1Rot.x += (targetTiltX - paddle1Rot.x) * (1 - Math.exp(-24 * dt));
  paddle1Rot.y += (targetTiltY - paddle1Rot.y) * (1 - Math.exp(-24 * dt));
  paddle1Rot.z += (targetTiltZ - paddle1Rot.z) * (1 - Math.exp(-24 * dt));

  sim.paddle1.pos = { ...paddle1Pos };
  sim.paddle1.vel = { ...paddle1Vel };
  sim.paddle1.rot = { ...paddle1Rot };

  ai.update(dt, sim.ball, sim.paddle2);
  const res = sim.step(dt, SUB_STEPS);

  for (const snd of res.soundEvents) {
    if (snd.type === 'paddle_hit') {
      console.log(`[Frame ${frame}] HIT by ${sim.ball.lastHitter}! pos: (${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)}) vel: (${sim.ball.vel.x.toFixed(2)}, ${sim.ball.vel.y.toFixed(2)}, ${sim.ball.vel.z.toFixed(2)}) rotX: ${paddle1Rot.x.toFixed(3)}`);
    } else if (snd.type === 'table_hit') {
      console.log(`[Frame ${frame}] Table bounce at z = ${sim.ball.pos.z.toFixed(2)}, y = ${sim.ball.pos.y.toFixed(2)}`);
    }
  }

  if (res.pointEnded) {
    console.log(`[Frame ${frame}] Point ended! Winner: ${res.pointWinner} Reason: ${res.pointReason}`);
    break;
  }
}
