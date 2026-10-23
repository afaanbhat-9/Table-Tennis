import { PhysicsSimulation } from '../shared/physics.js';
import { TABLE_HEIGHT, SUB_STEPS } from '../shared/constants.js';

console.log('=== TESTING DIFFERENT PADDLE Z POSITIONS & SHOTS ===');

for (const pZ of [1.60, 1.45, 1.35, 1.25, 1.15, 1.05, 0.95]) {
  const sim = new PhysicsSimulation();
  
  // Ball coming towards player 1 after bouncing on player 1's side at z = 0.8
  sim.ball.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: pZ - 0.05 };
  sim.ball.vel = { x: 0, y: 1.0, z: 5.0 };
  sim.ball.lastHitter = 'player2';
  sim.ball.lastBounceSide = 'player1';
  sim.ball.bounceCountCurrentSide = 1;
  sim.ball.active = true;

  const tableCloseness = Math.max(0, 1.0 - (pZ - 1.37) / 0.50);
  const targetTiltX = -0.14 - tableCloseness * 0.16;
  
  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: pZ };
  sim.paddle1.vel = { x: 0, y: 0.2, z: -1.0 }; // moving forward into shot
  sim.paddle1.rot = { x: targetTiltX, y: 0, z: -0.2 };

  // Step simulation for 1 second (60 frames)
  let hit = false;
  let bouncesOnP1Side = false;
  let landsOnOpponentSide = false;
  let hitNet = false;
  let bounceZ = 0;

  for (let f = 0; f < 60; f++) {
    const res = sim.step(1/60, SUB_STEPS);
    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit') {
        hit = true;
        console.log(`\n[Paddle Z = ${pZ.toFixed(2)}] Hit ball! Outgoing vel: (${sim.ball.vel.x.toFixed(2)}, ${sim.ball.vel.y.toFixed(2)}, ${sim.ball.vel.z.toFixed(2)}) normal: ${JSON.stringify((sim as any).getPaddleNormal(sim.paddle1.rot, true))}`);
      } else if (snd.type === 'table_hit') {
        bounceZ = sim.ball.pos.z;
        if (bounceZ > 0) {
          bouncesOnP1Side = true;
          console.log(`  -> ⚠️ BOUNCED ON PLAYER 1's SIDE AT Z = ${bounceZ.toFixed(2)}! (Table surface Y = ${(TABLE_HEIGHT + 0.02).toFixed(2)})`);
        } else {
          landsOnOpponentSide = true;
          console.log(`  -> Landed on opponent side at Z = ${bounceZ.toFixed(2)}`);
        }
      } else if (snd.type === 'net_hit') {
        hitNet = true;
        console.log(`  -> Hit net at Z = ${sim.ball.pos.z.toFixed(2)}!`);
      }
    }
    if (res.pointEnded) {
      console.log(`  -> Point ended: Winner ${res.pointWinner} (${res.pointReason})`);
      break;
    }
  }

  if (!bouncesOnP1Side && landsOnOpponentSide) {
    console.log(`  -> SUCCESS: Traveled over net cleanly onto opponent side!`);
  }
}
