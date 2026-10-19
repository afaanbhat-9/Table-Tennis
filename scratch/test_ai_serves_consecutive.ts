import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, TABLE_HEIGHT, NET_Y_TOP } from '../shared/constants.js';

console.log('=== VERIFYING CONSECUTIVE AI SERVES ACROSS VARIED STANCES ===\n');

const ai = new TableTennisAI('hard');

for (let serveIdx = 1; serveIdx <= 6; serveIdx++) {
  const sim = new PhysicsSimulation();
  const serveX = ai.selectServePosition();
  sim.prepareServe('player2', serveX);

  console.log(`Serve #${serveIdx}:`);
  console.log(`  AI chosen stance X = ${serveX.toFixed(3)}m (${serveX < -0.15 ? 'Backhand stance' : serveX > 0.15 ? 'Forehand stance' : 'Center stance'})`);
  console.log(`  Paddle pos: (${sim.paddle2.pos.x.toFixed(3)}, ${sim.paddle2.pos.y.toFixed(3)}, ${sim.paddle2.pos.z.toFixed(3)})`);
  console.log(`  Ball pos:   (${sim.ball.pos.x.toFixed(3)}, ${sim.ball.pos.y.toFixed(3)}, ${sim.ball.pos.z.toFixed(3)})`);

  // Hold phase: paddle and ball stay stable
  for (let f = 0; f < 30; f++) {
    ai.update(1/60, sim.ball, sim.paddle2);
    sim.updateServeBall('player2');
  }

  // Toss serve
  const snd = sim.tossServe('player2');
  console.log(`  Toss initiated! Initial vel.y = ${sim.ball.vel.y.toFixed(2)}m/s`);

  let struck = false;
  let serverBounceZ: number | null = null;
  let receiverBounceZ: number | null = null;
  let netHeight: number | null = null;
  let netClipped = false;

  for (let f = 0; f < 180; f++) {
    const prevZ = sim.ball.pos.z;
    ai.update(1/60, sim.ball, sim.paddle2);
    const res = sim.step(1/60, SUB_STEPS);
    const currZ = sim.ball.pos.z;

    if ((prevZ <= 0 && currZ >= 0) || (prevZ >= 0 && currZ <= 0)) {
      netHeight = sim.ball.pos.y;
    }

    for (const s of res.soundEvents) {
      if (s.type === 'paddle_hit' && !struck) {
        struck = true;
        console.log(`  Ball struck by AI racket at frame ${f}! paddle pos=(${sim.paddle2.pos.x.toFixed(2)}, ${sim.paddle2.pos.y.toFixed(2)}, ${sim.paddle2.pos.z.toFixed(2)}) ball vel=(${sim.ball.vel.x.toFixed(2)}, ${sim.ball.vel.y.toFixed(2)}, ${sim.ball.vel.z.toFixed(2)})`);
      }
      if (s.type === 'table_hit') {
        if (serverBounceZ === null) {
          serverBounceZ = s.pos.z;
        } else if (receiverBounceZ === null) {
          receiverBounceZ = s.pos.z;
        }
      }
      if (s.type === 'net_hit') {
        netClipped = true;
      }
    }

    if (receiverBounceZ !== null) {
      break;
    }
    if (res.pointEnded) {
      console.log(`  FAILED: point ended early with reason: ${res.pointReason}`);
      break;
    }
  }

  const success = struck && serverBounceZ !== null && serverBounceZ < 0 && receiverBounceZ !== null && receiverBounceZ > 0 && netHeight !== null && netHeight > NET_Y_TOP && !netClipped;
  console.log(`  Result: struck=${struck}, serverBounce=${serverBounceZ?.toFixed(2)}m, netH=${netHeight?.toFixed(3)}m (netTop=${NET_Y_TOP.toFixed(3)}m), receiverBounce=${receiverBounceZ?.toFixed(2)}m -> ${success ? 'LEGAL SERVE PASSED' : 'FAILED'}\n`);
  if (!success) {
    process.exit(1);
  }
}

console.log('=== ALL CONSECUTIVE AI SERVES VERIFIED WITH 100% SUCCESS! ===');
