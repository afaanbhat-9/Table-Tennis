import { PhysicsSimulation } from '../shared/physics.js';
import { SUB_STEPS, TABLE_HEIGHT, NET_Y_TOP, TABLE_MIN_Z, TABLE_MAX_Z } from '../shared/constants.js';

// Test serve trajectory from P1 and P2
for (const server of ['player1', 'player2'] as const) {
  for (const startX of [-0.35, 0.0, 0.35]) {
    const sim = new PhysicsSimulation();
    sim.prepareServe(server);
    // Move to startX
    if (server === 'player1') {
      sim.paddle1.pos.x = startX;
    } else {
      sim.paddle2.pos.x = startX;
    }
    sim.updateServeBall(server);

    // Toss serve
    sim.tossServe(server);

    // Let it descend slightly
    for (let i = 0; i < 22; i++) {
      sim.step(1/60, SUB_STEPS);
    }

    // Strike serve
    const isP1 = server === 'player1';
    const paddle = isP1 ? sim.paddle1 : sim.paddle2;
    paddle.vel.z = isP1 ? -3.0 : 3.0;
    paddle.isSwinging = true;

    let serverBounce = false;
    let serverBounceZ = 0;
    let receiverBounce = false;
    let receiverBounceZ = 0;
    let heightAtNet = 0;
    let netClipped = false;

    for (let f = 0; f < 100; f++) {
      const prevZ = sim.ball.pos.z;
      const res = sim.step(1/60, SUB_STEPS);
      const currZ = sim.ball.pos.z;

      if ((prevZ <= 0 && currZ >= 0) || (prevZ >= 0 && currZ <= 0)) {
        heightAtNet = sim.ball.pos.y;
      }

      for (const snd of res.soundEvents) {
        if (snd.type === 'table_hit') {
          if (!serverBounce) {
            serverBounce = true;
            serverBounceZ = snd.pos.z;
          } else if (!receiverBounce) {
            receiverBounce = true;
            receiverBounceZ = snd.pos.z;
          }
        }
        if (snd.type === 'net_hit') {
          netClipped = true;
        }
      }

      if (receiverBounce) break;
      if (res.pointEnded) {
        console.log(`Failed! ${server} at X=${startX}: Point ended with ${res.pointReason}`);
        break;
      }
    }

    console.log(`${server} at X=${startX}: serverBounceZ=${serverBounceZ.toFixed(2)}, netH=${heightAtNet.toFixed(3)} (netTop=${NET_Y_TOP.toFixed(3)}), receiverBounceZ=${receiverBounceZ.toFixed(2)}, success=${serverBounce && receiverBounce && heightAtNet > NET_Y_TOP}`);
  }
}
