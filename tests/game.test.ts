import assert from 'assert';
import { PhysicsSimulation } from '../shared/physics.js';
import { RuleEngine } from '../shared/rules.js';
import { TableTennisAI } from '../shared/ai.js';
import {
  TABLE_HEIGHT,
  BALL_RADIUS,
  POINTS_TO_WIN,
  WIN_BY_MARGIN,
  PHYSICS_DT,
  PLAYER_PADDLE_Z,
  OPPONENT_PADDLE_Z
} from '../shared/constants.js';

console.log('=== RUNNING TABLE TENNIS GAME UNIT & SIMULATION TESTS ===\n');

// TEST 1: Rules Engine Scoring & Deuce
console.log('Test 1: Testing Rules Engine (11 points, win by 2, deuce service)...');
{
  const rules = new RuleEngine();
  rules.reset('player1');

  assert.strictEqual(rules.score.player1, 0);
  assert.strictEqual(rules.score.player2, 0);
  assert.strictEqual(rules.serve.server, 'player1');

  // Point 1: P1 scores
  let res = rules.awardPoint('player1');
  assert.strictEqual(res.score.player1, 1);
  assert.strictEqual(rules.serve.server, 'player1'); // still P1 serving (point 1 of 2)

  // Point 2: P1 scores -> service rotates to player2
  res = rules.awardPoint('player1');
  assert.strictEqual(res.score.player1, 2);
  assert.strictEqual(rules.serve.server, 'player2'); // rotated to P2

  // Simulate to 10 - 10 (Deuce)
  for (let i = 0; i < 8; i++) rules.awardPoint('player1');
  for (let i = 0; i < 10; i++) rules.awardPoint('player2');
  assert.strictEqual(rules.score.player1, 10);
  assert.strictEqual(rules.score.player2, 10);
  assert.strictEqual(res.gameOver, false);

  // At 10-10, service should rotate every point
  const serverAtDeuce1 = rules.serve.server;
  rules.awardPoint('player1'); // 11 - 10 (not game over, need 2 point lead)
  assert.strictEqual(rules.score.winner, null);
  assert.notStrictEqual(rules.serve.server, serverAtDeuce1); // rotated after 1 point!

  // 12 - 10: Game Over!
  res = rules.awardPoint('player1');
  assert.strictEqual(res.gameOver, true);
  assert.strictEqual(res.score.winner, 'player1');
  console.log('  -> Rules & Deuce tests PASSED!');
}

// TEST 2: Physics Simulation - Ball Table Bounce & Restitution
console.log('\nTest 2: Testing Table Bounce & Collision...');
{
  const sim = new PhysicsSimulation();
  sim.ball.pos = { x: 0, y: TABLE_HEIGHT + 0.30, z: 0.5 };
  sim.ball.vel = { x: 0, y: 0, z: 0 };
  sim.ball.active = true;

  let bounced = false;
  // Step simulation for 0.5 seconds
  for (let step = 0; step < 30; step++) {
    const res = sim.step(PHYSICS_DT, 4);
    if (res.soundEvents.some(s => s.type === 'table_hit')) {
      bounced = true;
      break;
    }
  }

  assert.strictEqual(bounced, true, 'Ball should collide and bounce off the table surface');
  assert.ok(sim.ball.vel.y > 0, 'Ball vertical velocity should be upward after bounce');
  console.log('  -> Table bounce & restitution tests PASSED!');
}

// TEST 3: Physics Simulation - Paddle Collision & Impulse
console.log('\nTest 3: Testing Paddle Collision & Impulse...');
{
  const sim = new PhysicsSimulation();
  // Ball moving towards player 1 paddle
  sim.ball.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z - 0.05 };
  sim.ball.vel = { x: 0, y: 0, z: 6.0 }; // moving towards +Z
  sim.ball.lastBounceSide = 'player1';
  sim.ball.active = true;

  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z };
  sim.paddle1.vel = { x: 0, y: 0, z: -2.0 }; // moving forward into the ball

  let paddleHit = false;
  for (let step = 0; step < 10; step++) {
    const res = sim.step(PHYSICS_DT, 4);
    if (res.soundEvents.some(s => s.type === 'paddle_hit')) {
      paddleHit = true;
      break;
    }
  }

  assert.strictEqual(paddleHit, true, 'Paddle should collide with ball');
  assert.ok(sim.ball.vel.z < 0, 'Ball should reverse direction towards opponent (-Z)');
  assert.strictEqual(sim.ball.lastHitter, 'player1', 'Ball last hitter should be player1');
  console.log('  -> Paddle collision & impulse tests PASSED!');
}

// TEST 4: Anti-tunneling at high speeds (Swept Substepping)
console.log('\nTest 4: Testing Anti-Tunneling at High Speed (15 m/s)...');
{
  const sim = new PhysicsSimulation();
  // Ball moving very fast towards paddle
  sim.ball.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z - 0.25 };
  sim.ball.vel = { x: 0, y: 0, z: 15.0 }; // 15 m/s
  sim.ball.lastBounceSide = 'player1';
  sim.ball.active = true;

  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z };
  sim.paddle1.vel = { x: 0, y: 0, z: 0 };

  let paddleHit = false;
  for (let step = 0; step < 15; step++) {
    const res = sim.step(PHYSICS_DT, 4);
    if (res.soundEvents.some(s => s.type === 'paddle_hit')) {
      paddleHit = true;
      break;
    }
  }

  assert.strictEqual(paddleHit, true, 'Fast ball must not tunnel through paddle');
  console.log('  -> Anti-tunneling verification PASSED!');
}

// TEST 5: AI Opponent Behavior Across Difficulties
console.log('\nTest 5: Testing AI Difficulties (Easy, Medium, Hard)...');
{
  const aiEasy = new TableTennisAI('easy');
  const aiHard = new TableTennisAI('hard');

  const ballIncoming: any = {
    pos: { x: 0.3, y: TABLE_HEIGHT + 0.2, z: -0.5 },
    vel: { x: 0.5, y: 1.0, z: -7.0 },
    active: true
  };

  const paddleEasy: any = { pos: { x: 0, y: TABLE_HEIGHT + 0.15, z: OPPONENT_PADDLE_Z }, vel: { x: 0, y: 0, z: 0 }, rot: { x: 0, y: 0, z: 0 } };
  const paddleHard: any = { pos: { x: 0, y: TABLE_HEIGHT + 0.15, z: OPPONENT_PADDLE_Z }, vel: { x: 0, y: 0, z: 0 }, rot: { x: 0, y: 0, z: 0 } };

  // Update over 300ms
  for (let i = 0; i < 18; i++) {
    aiEasy.update(PHYSICS_DT, ballIncoming, paddleEasy);
    aiHard.update(PHYSICS_DT, ballIncoming, paddleHard);
  }

  // Hard AI should have reacted much faster and moved further towards the ball's X position (0.3m)
  const hardDistMoved = Math.abs(paddleHard.pos.x);
  const easyDistMoved = Math.abs(paddleEasy.pos.x);

  assert.ok(hardDistMoved > easyDistMoved, `Hard AI (${hardDistMoved.toFixed(3)}) should move faster than Easy AI (${easyDistMoved.toFixed(3)})`);
  console.log(`  -> Hard AI moved: ${hardDistMoved.toFixed(3)}m, Easy AI moved: ${easyDistMoved.toFixed(3)}m`);
  console.log('  -> AI difficulty differentiation PASSED!');
}

// TEST 6: Legal Serve Trajectory & Two-Bounce Verification
console.log('\nTest 6: Testing Legal Downward Serve Trajectory...');
{
  const sim = new PhysicsSimulation();
  sim.prepareServe('player1');
  sim.launchServe('player1', 0);

  let bouncedServerSide = false;
  let bouncedReceiverSide = false;
  let faulted = false;

  for (let step = 0; step < 80; step++) {
    const res = sim.step(PHYSICS_DT, 4);
    if (sim.ball.hasBouncedOnServerSide) bouncedServerSide = true;
    if (sim.ball.hasBouncedOnReceiverSide) bouncedReceiverSide = true;
    if (res.pointEnded && res.pointReason?.includes('Fault')) {
      faulted = true;
      break;
    }
  }

  assert.strictEqual(bouncedServerSide, true, 'Serve must bounce on server half first');
  assert.strictEqual(bouncedReceiverSide, true, 'Serve must clear net and bounce on receiver half');
  assert.strictEqual(faulted, false, 'Legal serve must not fault');
  console.log('  -> Legal serve trajectory and bounce verification PASSED!');
}

console.log('\n=== ALL UNIT & PHYSICS TESTS COMPLETED SUCCESSFULLY! ===');
