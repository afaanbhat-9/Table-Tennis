import { PhysicsSimulation } from '../shared/physics.js';
import { TABLE_HEIGHT, SUB_STEPS, PADDLE_RADIUS, PADDLE_HITBOX_RADIUS, TABLE_LENGTH } from '../shared/constants.js';

console.log('=== SYSTEMATIC INVESTIGATION OF BALL BOUNCING ON PLAYER SIDE ===');

const scenarios: Array<{
  name: string;
  setup: (sim: PhysicsSimulation) => void;
}> = [
  {
    name: 'Scenario 1: Off-center hit (dx = 0.13m, within hitbox 0.165m, > PADDLE_RADIUS*1.5 = 0.12m)',
    setup: (sim) => {
      sim.ball.pos = { x: 0.13, y: TABLE_HEIGHT + 0.15, z: 1.50 };
      sim.ball.vel = { x: 0, y: 0.5, z: 4.5 };
      sim.ball.lastHitter = 'player2';
      sim.ball.lastBounceSide = 'player1';
      sim.ball.bounceCountCurrentSide = 1;
      sim.ball.active = true;

      sim.paddle1.pos = { x: 0.0, y: TABLE_HEIGHT + 0.15, z: 1.55 };
      sim.paddle1.vel = { x: 0, y: 0.0, z: -0.5 };
      sim.paddle1.rot = { x: -0.14, y: 0, z: -0.2 };
    }
  },
  {
    name: 'Scenario 2: Fast horizontal swipe (paddle.vel.x = 4.8 m/s)',
    setup: (sim) => {
      sim.ball.pos = { x: 0.0, y: TABLE_HEIGHT + 0.15, z: 1.50 };
      sim.ball.vel = { x: 0, y: 0.5, z: 4.5 };
      sim.ball.lastHitter = 'player2';
      sim.ball.lastBounceSide = 'player1';
      sim.ball.bounceCountCurrentSide = 1;
      sim.ball.active = true;

      sim.paddle1.pos = { x: 0.0, y: TABLE_HEIGHT + 0.15, z: 1.55 };
      sim.paddle1.vel = { x: 4.8, y: 0.0, z: -0.5 };
      sim.paddle1.rot = { x: -0.14, y: 0, z: -0.2 };
    }
  },
  {
    name: 'Scenario 3: Forward reach over table (paddle Z = 1.10, ball at Z = 1.05, low ball Y = TABLE_HEIGHT + 0.06)',
    setup: (sim) => {
      sim.ball.pos = { x: 0.0, y: TABLE_HEIGHT + 0.06, z: 1.05 };
      sim.ball.vel = { x: 0, y: -0.5, z: 4.0 };
      sim.ball.lastHitter = 'player2';
      sim.ball.lastBounceSide = 'player1';
      sim.ball.bounceCountCurrentSide = 1;
      sim.ball.active = true;

      const tableCloseness = Math.max(0, 1.0 - (1.10 - 1.37) / 0.50);
      const targetTiltX = -0.14 - tableCloseness * 0.16;

      sim.paddle1.pos = { x: 0.0, y: TABLE_HEIGHT + 0.06, z: 1.10 };
      sim.paddle1.vel = { x: 0, y: 0.0, z: -0.5 };
      sim.paddle1.rot = { x: targetTiltX, y: 0, z: -0.2 };
    }
  },
  {
    name: 'Scenario 4: Downward bat angle (player pushed mouse slightly or bat tilted x = -0.35)',
    setup: (sim) => {
      sim.ball.pos = { x: 0.0, y: TABLE_HEIGHT + 0.15, z: 1.45 };
      sim.ball.vel = { x: 0, y: 0.2, z: 4.5 };
      sim.ball.lastHitter = 'player2';
      sim.ball.lastBounceSide = 'player1';
      sim.ball.bounceCountCurrentSide = 1;
      sim.ball.active = true;

      sim.paddle1.pos = { x: 0.0, y: TABLE_HEIGHT + 0.15, z: 1.50 };
      sim.paddle1.vel = { x: 0, y: -0.5, z: -0.5 };
      sim.paddle1.rot = { x: -0.35, y: 0, z: -0.2 };
    }
  },
  {
    name: 'Scenario 5: Ball contacted right at table edge (Z = 1.35, ball dropping Y = 0.82)',
    setup: (sim) => {
      sim.ball.pos = { x: 0.0, y: TABLE_HEIGHT + 0.06, z: 1.35 };
      sim.ball.vel = { x: 0, y: -1.2, z: 3.8 };
      sim.ball.lastHitter = 'player2';
      sim.ball.lastBounceSide = 'player1';
      sim.ball.bounceCountCurrentSide = 1;
      sim.ball.active = true;

      sim.paddle1.pos = { x: 0.0, y: TABLE_HEIGHT + 0.06, z: 1.37 };
      sim.paddle1.vel = { x: 0, y: 0.0, z: 0.0 };
      sim.paddle1.rot = { x: -0.14, y: 0, z: -0.2 };
    }
  },
  {
    name: 'Scenario 6: Low incoming ball returning to player side (Z = 1.55, Y = 0.78, paddle passive)',
    setup: (sim) => {
      sim.ball.pos = { x: 0.0, y: TABLE_HEIGHT + 0.02, z: 1.55 };
      sim.ball.vel = { x: 0, y: -1.5, z: 4.5 };
      sim.ball.lastHitter = 'player2';
      sim.ball.lastBounceSide = 'player1';
      sim.ball.bounceCountCurrentSide = 1;
      sim.ball.active = true;

      sim.paddle1.pos = { x: 0.0, y: TABLE_HEIGHT + 0.02, z: 1.58 };
      sim.paddle1.vel = { x: 0, y: 0.0, z: 0.0 };
      sim.paddle1.rot = { x: -0.14, y: 0, z: -0.2 };
    }
  }
];

for (const sc of scenarios) {
  console.log(`\n--- Running ${sc.name} ---`);
  const sim = new PhysicsSimulation();
  sc.setup(sim);

  let hitReported = false;
  let hitPos = { x: 0, y: 0, z: 0 };
  let hitVel = { x: 0, y: 0, z: 0 };
  let outcome = 'No table contact';

  for (let f = 0; f < 60; f++) {
    const res = sim.step(1/60, SUB_STEPS);
    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit') {
        hitReported = true;
        hitPos = { ...sim.ball.pos };
        hitVel = { ...sim.ball.vel };
        console.log(`  Hit! Pos: (${hitPos.x.toFixed(3)}, ${hitPos.y.toFixed(3)}, ${hitPos.z.toFixed(3)}) Vel: (${hitVel.x.toFixed(3)}, ${hitVel.y.toFixed(3)}, ${hitVel.z.toFixed(3)})`);
      } else if (snd.type === 'table_hit') {
        if (sim.ball.pos.z > 0) {
          outcome = `❌ BOUNCED BACK ON PLAYER 1's TABLE SIDE at z = ${sim.ball.pos.z.toFixed(3)}, y = ${sim.ball.pos.y.toFixed(3)}`;
        } else {
          outcome = `✅ Landed on Opponent side at z = ${sim.ball.pos.z.toFixed(3)}, y = ${sim.ball.pos.y.toFixed(3)}`;
        }
      } else if (snd.type === 'net_hit') {
        outcome = `⚠️ Hit Net at z = ${sim.ball.pos.z.toFixed(3)}, y = ${sim.ball.pos.y.toFixed(3)}`;
      }
    }
    if (res.pointEnded) {
      outcome += ` | Point Ended: ${res.pointWinner} (${res.pointReason})`;
      break;
    }
  }
  console.log(`  Outcome: ${outcome}`);
}
