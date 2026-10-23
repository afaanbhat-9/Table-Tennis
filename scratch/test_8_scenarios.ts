import { PhysicsSimulation } from '../shared/physics.js';
import { TABLE_HEIGHT, NET_Y_TOP, SUB_STEPS, PADDLE_RADIUS, PLAYER_PADDLE_Z, OPPONENT_PADDLE_Z } from '../shared/constants.js';

console.log('=== TEST SCRIPT: 8 USER SCENARIOS ===');

// Let's create a test function that runs a shot and reports:
// 1. Outgoing velocity
// 2. Trajectory milestones (table clearance, net crossing, landing)
// 3. Whether it bounced on player side
// 4. Final outcome

function testShot(name: string, isP1: boolean, setup: {
  ballPos: { x: number; y: number; z: number };
  ballVel: { x: number; y: number; z: number };
  paddlePos: { x: number; y: number; z: number };
  paddleVel: { x: number; y: number; z: number };
  paddleRot: { x: number; y: number; z: number };
}) {
  console.log(`\n--- ${name} (${isP1 ? 'P1' : 'P2'}) ---`);
  const sim = new PhysicsSimulation();
  const hitter = isP1 ? 'player1' : 'player2';
  const opponent = isP1 ? 'player2' : 'player1';

  sim.ball.pos = { ...setup.ballPos };
  sim.ball.vel = { ...setup.ballVel };
  sim.ball.lastHitter = opponent;
  sim.ball.lastBounceSide = hitter;
  sim.ball.bounceCountCurrentSide = 1;
  sim.ball.active = true;

  const paddle = isP1 ? sim.paddle1 : sim.paddle2;
  paddle.pos = { ...setup.paddlePos };
  paddle.vel = { ...setup.paddleVel };
  paddle.rot = { ...setup.paddleRot };

  let hit = false;
  let bounceEvents: string[] = [];
  let netEvents: string[] = [];
  let pointResult = '';

  for (let f = 0; f < 90; f++) {
    const res = sim.step(1/60, SUB_STEPS);
    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit') {
        hit = true;
        console.log(`  [Hit] Vel: (${sim.ball.vel.x.toFixed(2)}, ${sim.ball.vel.y.toFixed(2)}, ${sim.ball.vel.z.toFixed(2)}) pos: (${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)})`);
      } else if (snd.type === 'table_hit') {
        const side = sim.ball.pos.z > 0 ? 'P1 side' : 'P2 side';
        bounceEvents.push(`Bounce on ${side} at z=${sim.ball.pos.z.toFixed(2)}, x=${sim.ball.pos.x.toFixed(2)}`);
      } else if (snd.type === 'net_hit') {
        netEvents.push(`Net hit at z=${sim.ball.pos.z.toFixed(2)}, y=${sim.ball.pos.y.toFixed(2)}`);
      }
    }
    if (res.pointEnded) {
      pointResult = `Point ended: winner=${res.pointWinner} (${res.pointReason})`;
      break;
    }
  }

  console.log(`  Bounces: ${bounceEvents.length ? bounceEvents.join(' -> ') : 'none'}`);
  if (netEvents.length) console.log(`  Net: ${netEvents.join(', ')}`);
  if (pointResult) console.log(`  Result: ${pointResult}`);
}

// 1. Forehand return (P1 right side, slight topspin)
testShot('1. Normal forehand return', true, {
  ballPos: { x: 0.25, y: 0.90, z: 1.50 },
  ballVel: { x: 0.1, y: -0.2, z: 4.8 },
  paddlePos: { x: 0.25, y: 0.90, z: 1.55 },
  paddleVel: { x: 0.5, y: 0.8, z: -1.2 },
  paddleRot: { x: -0.06, y: 0.1, z: -0.25 }
});

// 2. Backhand return (P1 left side)
testShot('2. Normal backhand return', true, {
  ballPos: { x: -0.25, y: 0.90, z: 1.50 },
  ballVel: { x: -0.1, y: -0.2, z: 4.8 },
  paddlePos: { x: -0.25, y: 0.90, z: 1.55 },
  paddleVel: { x: -0.5, y: 0.8, z: -1.2 },
  paddleRot: { x: -0.06, y: -0.1, z: 0.15 }
});

// 3. Bat angled slightly upward (open face chop/push)
testShot('3. Bat angled slightly upward (+0.08 rad)', true, {
  ballPos: { x: 0.0, y: 0.82, z: 1.45 },
  ballVel: { x: 0, y: -0.6, z: 4.2 },
  paddlePos: { x: 0.0, y: 0.82, z: 1.50 },
  paddleVel: { x: 0, y: 0.1, z: -0.6 },
  paddleRot: { x: 0.08, y: 0, z: -0.2 }
});

// 4. Bat angled slightly downward (closed face topspin)
testShot('4. Bat angled slightly downward (-0.14 rad)', true, {
  ballPos: { x: 0.0, y: 1.05, z: 1.45 },
  ballVel: { x: 0, y: 0.2, z: 4.5 },
  paddlePos: { x: 0.0, y: 1.05, z: 1.50 },
  paddleVel: { x: 0, y: 0.4, z: -1.0 },
  paddleRot: { x: -0.14, y: 0, z: -0.2 }
});

// 5. Fast incoming ball (vz = 6.5)
testShot('5. Fast incoming ball (vz = 6.5)', true, {
  ballPos: { x: 0.0, y: 0.92, z: 1.45 },
  ballVel: { x: 0, y: -0.1, z: 6.5 },
  paddlePos: { x: 0.0, y: 0.92, z: 1.50 },
  paddleVel: { x: 0, y: 0.2, z: -0.8 },
  paddleRot: { x: -0.04, y: 0, z: -0.2 }
});

// 6. Slow / low incoming ball (vz = 3.2, y = 0.80)
testShot('6. Slow / low incoming ball', true, {
  ballPos: { x: 0.0, y: 0.80, z: 1.35 },
  ballVel: { x: 0, y: -0.8, z: 3.2 },
  paddlePos: { x: 0.0, y: 0.80, z: 1.38 },
  paddleVel: { x: 0, y: 0.3, z: -0.5 },
  paddleRot: { x: 0.04, y: 0, z: -0.2 }
});

// 7. Shots toward left and right sides of opponent table
testShot('7a. Shot angled toward right side', true, {
  ballPos: { x: 0.1, y: 0.90, z: 1.50 },
  ballVel: { x: 0, y: -0.3, z: 4.8 },
  paddlePos: { x: 0.1, y: 0.90, z: 1.55 },
  paddleVel: { x: 2.5, y: 0.4, z: -1.0 },
  paddleRot: { x: -0.06, y: 0.18, z: -0.2 }
});

testShot('7b. Shot angled toward left side', true, {
  ballPos: { x: -0.1, y: 0.90, z: 1.50 },
  ballVel: { x: 0, y: -0.3, z: 4.8 },
  paddlePos: { x: -0.1, y: 0.90, z: 1.55 },
  paddleVel: { x: -2.5, y: 0.4, z: -1.0 },
  paddleRot: { x: -0.06, y: -0.18, z: 0.15 }
});

// Also test Player 2 (AI/Opponent side)
testShot('8a. Player 2 perspective return', false, {
  ballPos: { x: 0.0, y: 0.90, z: -1.50 },
  ballVel: { x: 0, y: -0.2, z: -4.8 },
  paddlePos: { x: 0.0, y: 0.90, z: -1.55 },
  paddleVel: { x: 0, y: 0.5, z: 1.0 },
  paddleRot: { x: 0.14, y: 0, z: 0.18 }
});
