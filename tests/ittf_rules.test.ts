import { PhysicsSimulation } from '../shared/physics.js';
import { RuleEngine } from '../shared/rules.js';
import {
  TABLE_HEIGHT,
  TABLE_LENGTH,
  TABLE_WIDTH,
  NET_Y_TOP,
  NET_HEIGHT,
  BALL_RADIUS,
  SUB_STEPS,
  PHYSICS_DT,
  POINTS_TO_WIN,
  WIN_BY_MARGIN
} from '../shared/constants.js';

import assert from 'node:assert';

console.log('=== RUNNING OFFICIAL ITTF TABLE TENNIS LAWS & SCENARIOS SUITE ===\n');

// 1. ITTF Regulation Table & Net Dimensions
console.log('Scenario 1: Verifying ITTF Regulation Table & Net Proportions...');
{
  assert(TABLE_LENGTH === 2.74, `Table length must be 2.74m (got ${TABLE_LENGTH})`);
  assert(TABLE_WIDTH === 1.525, `Table width must be 1.525m (got ${TABLE_WIDTH})`);
  assert(TABLE_HEIGHT === 0.76, `Table height must be 0.76m (got ${TABLE_HEIGHT})`);
  assert(NET_HEIGHT === 0.1525, `Net height must be 0.1525m (got ${NET_HEIGHT})`);
  assert(Math.abs(NET_Y_TOP - (TABLE_HEIGHT + NET_HEIGHT)) < 0.001, 'Net top must equal TABLE_HEIGHT + NET_HEIGHT');
  console.log('  -> Scenario 1 PASSED: Regulation dimensions verified (2.74m x 1.525m x 0.76m, Net 15.25cm)');
}

// 2. ITTF Ball Drop Bounce Test (30cm drop yields ~23cm bounce)
console.log('\nScenario 2: Verifying ITTF 30cm Drop Rebound Standard (~23cm)...');
{
  const sim = new PhysicsSimulation();
  const dropHeight = TABLE_HEIGHT + BALL_RADIUS + 0.30; // 30cm above table surface
  sim.ball = {
    pos: { x: 0, y: dropHeight, z: 0.5 },
    vel: { x: 0, y: 0, z: 0 },
    lastHitter: 'player1',
    bounceCountCurrentSide: 0,
    lastBounceSide: null,
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };

  let maxBounceApexY = 0;
  let bounced = false;

  for (let f = 0; f < 80; f++) {
    const res = sim.step(1/120, SUB_STEPS);
    if (res.soundEvents.some(s => s.type === 'table_hit')) {
      bounced = true;
    }
    if (bounced && sim.ball.vel.y < 0) {
      maxBounceApexY = sim.ball.pos.y;
      break;
    }
  }

  const bounceHeightM = maxBounceApexY - (TABLE_HEIGHT + BALL_RADIUS);
  const bounceHeightCm = bounceHeightM * 100;

  assert(bounceHeightCm >= 20.0 && bounceHeightCm <= 25.5, `ITTF bounce from 30cm must be ~23cm (got ${bounceHeightCm.toFixed(1)}cm)`);
  console.log(`  -> Scenario 2 PASSED: 30cm drop rebounded to ${bounceHeightCm.toFixed(1)}cm (ITTF 23-26cm regulation range)`);
}

// 3. Legal Serve Progression (Server Half -> Net Crossing -> Receiver Half)
console.log('\nScenario 3: Verifying Legal Service Sequence...');
{
  const sim = new PhysicsSimulation();
  sim.prepareServe('player1');
  sim.launchServe('player1', 0, 1.0);

  let bouncedServer = false;
  let bouncedReceiver = false;
  let serveCompleted = false;

  for (let f = 0; f < 100; f++) {
    const res = sim.step(PHYSICS_DT, SUB_STEPS);
    if (sim.ball.hasBouncedOnServerSide && !bouncedServer) {
      bouncedServer = true;
    }
    if (sim.ball.hasBouncedOnReceiverSide && !bouncedReceiver) {
      bouncedReceiver = true;
      serveCompleted = !sim.ball.isServe;
      break;
    }
    if (res.pointEnded) break;
  }

  assert(bouncedServer, 'Ball must bounce on server half first');
  assert(bouncedReceiver, 'Ball must bounce on receiver half second');
  assert(serveCompleted, 'Serve must transition to legal rally play');
  console.log('  -> Scenario 3 PASSED: Legal serve bounced server court -> receiver court cleanly');
}

// 4. Service Fault: Missing Server Half
console.log('\nScenario 4: Verifying Service Fault (Direct to Receiver Court)...');
{
  const sim = new PhysicsSimulation();
  sim.prepareServe('player1');
  // Ball directly launched to receiver side without server bounce
  sim.ball.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: 0.8 };
  sim.ball.vel = { x: 0, y: 1.0, z: -5.0 }; // flies directly across net
  sim.ball.serveState = 'in_play';
  sim.ball.hasBouncedOnServerSide = false;

  let pointEnded = false;
  let winner = '';
  let reason = '';

  for (let f = 0; f < 60; f++) {
    const res = sim.step(PHYSICS_DT, SUB_STEPS);
    if (res.pointEnded) {
      pointEnded = true;
      winner = res.pointWinner || '';
      reason = res.pointReason || '';
      break;
    }
  }

  assert(pointEnded, 'Point must end when server misses server court');
  assert(winner === 'player2', 'Receiver (Player 2) must be awarded the point');
  assert(reason.includes('Service Fault'), `Reason must indicate service fault (got ${reason})`);
  console.log(`  -> Scenario 4 PASSED: Direct serve to receiver half called as fault (${reason})`);
}

// 5. ITTF Service Let: Net Clip with Legal Receiver Landing
console.log('\nScenario 5: Verifying ITTF Service Let (Net Tape Graze -> Re-serve)...');
{
  const sim = new PhysicsSimulation();
  sim.prepareServe('player1');
  sim.ball.hasBouncedOnServerSide = true;
  sim.ball.hasBouncedOnReceiverSide = false;
  sim.ball.serveState = 'in_play';
  sim.ball.netTouched = true; // Simulated net graze

  // Place ball descending onto receiver's table half
  sim.ball.pos = { x: 0, y: TABLE_HEIGHT + BALL_RADIUS + 0.04, z: -0.60 };
  sim.ball.vel = { x: 0, y: -1.5, z: -3.0 };

  let isLet = false;
  for (let f = 0; f < 10; f++) {
    const res = sim.step(PHYSICS_DT, SUB_STEPS);
    if (res.isLet) {
      isLet = true;
      break;
    }
  }

  assert(isLet, 'Net clip landing on receiver court must trigger ITTF Let');
  assert(sim.ball.isServe === true, 'Ball must reset to serve mode');
  console.log('  -> Scenario 5 PASSED: Service Let correctly triggered with no point penalty');
}

// 6. Rally: Double Bounce Detection
console.log('\nScenario 6: Verifying Double Bounce Point Award...');
{
  const sim = new PhysicsSimulation();
  // Ball bounced once on Player 1 side
  sim.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + BALL_RADIUS + 0.05, z: 0.60 },
    vel: { x: 0, y: -1.2, z: 1.0 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 1,
    lastBounceSide: 'player1',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };

  let doubleBounced = false;
  let winner = '';
  let reason = '';
  for (let f = 0; f < 10; f++) {
    const res = sim.step(PHYSICS_DT, SUB_STEPS);
    if (res.pointEnded) {
      doubleBounced = true;
      winner = res.pointWinner || '';
      reason = res.pointReason || '';
      break;
    }
  }

  assert(doubleBounced === true, 'Double bounce must end the point');
  assert(winner === 'player2', 'Player 2 must win point on Player 1 double bounce');
  assert(reason === 'Double Bounce', `Reason must be Double Bounce (got ${reason})`);
  console.log('  -> Scenario 6 PASSED: Double bounce awarded point to opponent');
}

// 7. ITTF Illegal Volley (Striking In-Play Ball Before Table Bounce)
console.log('\nScenario 7: Verifying Illegal Volley Rule...');
{
  const sim = new PhysicsSimulation();
  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.12, z: 0.90 }; // inside table court
  sim.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.12, z: 0.88 },
    vel: { x: 0, y: 0, z: 4.0 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 0, // Has NOT bounced on Player 1 court yet!
    lastBounceSide: 'player2',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };

  const res = sim.step(PHYSICS_DT, SUB_STEPS);

  assert(res.pointEnded === true, 'Striking ball before bounce inside court is an illegal volley');
  assert(res.pointWinner === 'player2', 'Opponent must win point on illegal volley');
  assert(res.pointReason!.includes('Illegal Volley'), `Reason must specify Illegal Volley (got ${res.pointReason})`);
  console.log(`  -> Scenario 7 PASSED: Illegal volley penalizes volleyer (${res.pointReason})`);
}

// 8. Ball Hit Past Baseline Touching Paddle Scores Out For Hitter
console.log('\nScenario 8: Verifying Ball Past Baseline Touching Paddle Scores Out For Hitter...');
{
  const sim = new PhysicsSimulation();
  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.55 }; // Behind table
  sim.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.50 }, // Ball already past end line
    vel: { x: 0, y: 0, z: 4.5 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 0,
    lastBounceSide: 'player2',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };

  const res = sim.step(PHYSICS_DT, SUB_STEPS);

  assert(res.pointEnded === true, 'Point must end');
  assert(res.pointWinner === 'player1', 'Player 1 must win point because Player 2 hit it out');
  assert(res.pointReason === 'Player 2 Out', `Reason must be Player 2 Out (got ${res.pointReason})`);
  console.log('  -> Scenario 8 PASSED: Out ball touching paddle awarded point to receiver');
}

// 9. ITTF 11-Point Game Rule & Win by 2 Margin
console.log('\nScenario 9: Verifying 11-Point Regulation Scoring and Margin of 2...');
{
  const rules = new RuleEngine();
  rules.reset('player1');

  // Score up to 10-9
  for (let i = 0; i < 10; i++) rules.awardPoint('player1');
  for (let i = 0; i < 9; i++) rules.awardPoint('player2');

  assert.strictEqual(rules.score.player1, 10);
  assert.strictEqual(rules.score.player2, 9);
  assert.strictEqual(rules.score.winner, null, 'Game must not end at 10-9');

  // Player 1 scores 11th point (11-9, margin = 2)
  const res = rules.awardPoint('player1');
  assert.strictEqual(res.gameOver, true, 'Game must conclude at 11-9 (2-point lead)');
  assert.strictEqual(rules.score.winner, 'player1', 'Player 1 must be winner');
  console.log('  -> Scenario 9 PASSED: Standard 11-point win concluded with margin of 2');
}

// 10. ITTF Deuce Service Alternation Every 1 Point
console.log('\nScenario 10: Verifying Deuce (10-10) Service Alternation Every 1 Point...');
{
  const rules = new RuleEngine();
  rules.reset('player1');

  // Play to 10-10 (20 points played)
  for (let i = 0; i < 10; i++) rules.awardPoint('player1');
  for (let i = 0; i < 10; i++) rules.awardPoint('player2');

  assert.strictEqual(rules.totalPointsPlayed, 20);

  // At 10-10, server should be player1
  const serverAt20 = rules.serve.server;

  // Next point (21 total points played) -> server MUST alternate!
  rules.awardPoint('player1');
  const serverAt21 = rules.serve.server;
  assert.notStrictEqual(serverAt21, serverAt20, 'At deuce, server must alternate every 1 point');

  // Next point (22 total points played) -> server alternates back!
  rules.awardPoint('player2');
  const serverAt22 = rules.serve.server;
  assert.strictEqual(serverAt22, serverAt20, 'At deuce, server must alternate every 1 point');

  console.log('  -> Scenario 10 PASSED: Deuce service alternated strictly every 1 point');
}

// 11. Initial Server Preservation (Player 2 Starting Server)
console.log('\nScenario 11: Verifying Starting Server Preservation for Player 2...');
{
  const rules = new RuleEngine();
  rules.reset('player2');

  assert.strictEqual(rules.serve.server, 'player2', 'Starting server must be player2');

  // After 1 point, still player2 (rotates every 2 points)
  rules.awardPoint('player1');
  assert.strictEqual(rules.serve.server, 'player2');

  // After 2 points, alternates to player1
  rules.awardPoint('player1');
  assert.strictEqual(rules.serve.server, 'player1');

  console.log('  -> Scenario 11 PASSED: Initial server preserved and rotated correctly');
}

// 12. Sustained Multi-Shot Game Simulation
console.log('\nScenario 12: Verifying Sustained Rally Cycle...');
{
  const sim = new PhysicsSimulation();
  sim.prepareServe('player1');
  sim.launchServe('player1', 0, 1.0);

  let rallyShots = 0;
  for (let f = 0; f < 300; f++) {
    // Player 1 tracks
    if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.4) {
      sim.paddle1.pos.x += (sim.ball.pos.x - sim.paddle1.pos.x) * 0.45;
      sim.paddle1.pos.y += (sim.ball.pos.y - sim.paddle1.pos.y) * 0.45;
    }
    // Player 2 tracks
    if (sim.ball.vel.z < 0 && sim.ball.pos.z < -0.4) {
      sim.paddle2.pos.x += (sim.ball.pos.x - sim.paddle2.pos.x) * 0.45;
      sim.paddle2.pos.y += (sim.ball.pos.y - sim.paddle2.pos.y) * 0.45;
    }

    const res = sim.step(PHYSICS_DT, SUB_STEPS);
    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit') rallyShots++;
    }

    if (rallyShots >= 4) break;
    if (res.pointEnded) break;
  }

  assert(rallyShots >= 4, `Must achieve at least 4 consecutive hits (got ${rallyShots})`);
  console.log(`  -> Scenario 12 PASSED: Successfully sustained ${rallyShots} continuous hits in rally`);
}

console.log('\n=== ALL 12 ITTF LAWS & REGULATION SCENARIOS PASSED WITH 100% ACCURACY! ===');
