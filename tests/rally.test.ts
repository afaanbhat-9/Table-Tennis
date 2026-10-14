import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, TABLE_HEIGHT, NET_Y_TOP, TABLE_MIN_Z, TABLE_MAX_Z } from '../shared/constants.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log('=== RUNNING RALLY & INTUITIVE HIT VERIFICATION TESTS ===\n');

// Test 1: Automatic Hit on Contact (No flick required)
console.log('Test 1: Verifying automatic hit when paddle is in ball path (no flick)...');
{
  const sim = new PhysicsSimulation();
  // Place paddle at Z = 1.45, zero velocity (stationary)
  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: 1.45 };
  sim.paddle1.vel = { x: 0, y: 0, z: 0 };
  sim.paddle1.isSwinging = false;
  sim.paddle1.swingPhase = 'idle';

  // Ball approaching Player 1
  sim.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.15, z: 1.40 },
    vel: { x: 0, y: 0.5, z: 6.0 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 1,
    lastBounceSide: 'player1',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };

  const res = sim.step(1/60, SUB_STEPS);
  const hit = res.soundEvents.some(s => s.type === 'paddle_hit');
  assert(hit, 'Stationary paddle must produce a valid hit on ball intersection');
  assert(sim.ball.vel.z < -4.0, 'Ball must be returned towards Player 2 with forward velocity');
  assert(sim.ball.lastHitter === 'player1', 'lastHitter must update to player1');
  console.log('  -> Passed (Stationary paddle returned ball with vel.z =', sim.ball.vel.z.toFixed(2), 'm/s)');
}

// Test 2: Net Clearance Guarantee
console.log('\nTest 2: Verifying return trajectory clears net (y > NET_Y_TOP)...');
{
  const sim = new PhysicsSimulation();
  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.12, z: 1.45 };
  sim.paddle1.vel = { x: 0, y: 0, z: 0 };

  sim.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.12, z: 1.42 },
    vel: { x: 0, y: 0.2, z: 5.5 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 1,
    lastBounceSide: 'player1',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };

  sim.step(1/60, SUB_STEPS);

  // Trace ball until it reaches the net plane (z = 0)
  let clearedNet = false;
  let heightAtNet = 0;
  for (let f = 0; f < 60; f++) {
    const prevZ = sim.ball.pos.z;
    sim.step(1/60, SUB_STEPS);
    if (prevZ >= 0 && sim.ball.pos.z <= 0) {
      clearedNet = sim.ball.pos.y > NET_Y_TOP;
      heightAtNet = sim.ball.pos.y;
      break;
    }
  }

  assert(clearedNet, `Return must clear net (Height: ${heightAtNet.toFixed(3)}m, Net Top: ${NET_Y_TOP.toFixed(3)}m)`);
  console.log(`  -> Passed (Ball height at net: ${heightAtNet.toFixed(3)}m, ${(heightAtNet - NET_Y_TOP) * 100}cm above net)`);
}

// Test 3: Ball Lands in Opponent Court
console.log('\nTest 3: Verifying return bounce lands legally on opponent table...');
{
  const sim = new PhysicsSimulation();
  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.12, z: 1.45 };
  sim.paddle1.vel = { x: 0, y: 0, z: 0 };

  sim.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.12, z: 1.42 },
    vel: { x: 0, y: 0.2, z: 5.5 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 1,
    lastBounceSide: 'player1',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };

  sim.step(1/60, SUB_STEPS);

  let firstBounceZ = 0;
  let bouncedOnOpponentSide = false;
  for (let f = 0; f < 80; f++) {
    const res = sim.step(1/60, SUB_STEPS);
    for (const snd of res.soundEvents) {
      if (snd.type === 'table_hit') {
        firstBounceZ = sim.ball.pos.z;
        bouncedOnOpponentSide = firstBounceZ < 0 && firstBounceZ >= TABLE_MIN_Z;
        break;
      }
    }
    if (bouncedOnOpponentSide) break;
  }

  assert(bouncedOnOpponentSide, `Ball must bounce on opponent table half (bounced at z = ${firstBounceZ.toFixed(2)})`);
  console.log(`  -> Passed (Return landed at z = ${firstBounceZ.toFixed(2)}m inside opponent table)`);
}

// Test 4: Sustained Multi-Shot Rally (Player vs AI)
console.log('\nTest 4: Verifying sustained multi-shot rally (4+ hits)...');
{
  const sim = new PhysicsSimulation();
  const ai = new TableTennisAI('hard');

  sim.prepareServe('player2');
  sim.launchServe('player2', 0);

  let hits = 0;
  for (let f = 0; f < 300; f++) {
    const dt = 1/60;

    // Simulate responsive player tracking
    if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.3) {
      sim.paddle1.pos.x += (sim.ball.pos.x - sim.paddle1.pos.x) * 0.35;
      sim.paddle1.pos.y += (sim.ball.pos.y - sim.paddle1.pos.y) * 0.35;
    }

    ai.update(dt, sim.ball, sim.paddle2);
    const res = sim.step(dt, SUB_STEPS);

    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit') hits++;
    }

    if (hits >= 4) break;
    if (res.pointEnded) break;
  }

  assert(hits >= 4, `Rally must sustain at least 4 shots (completed: ${hits})`);
  console.log(`  -> Passed (Successfully completed ${hits} consecutive rally shots!)`);
}

// Test 5: Out of bounds ball is not penalized as illegal volley
console.log('\nTest 5: Verifying ball past baseline touching paddle scores as Out for hitter...');
{
  const sim = new PhysicsSimulation();
  sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: 1.55 };

  // Ball hit by Player 2 is already past table end (z > TABLE_MAX_Z)
  sim.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.15, z: TABLE_MAX_Z + 0.05 },
    vel: { x: 0, y: 0, z: 4.0 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 0,
    lastBounceSide: 'player2',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: false,
    isServe: false,
    active: true
  };

  const res = sim.step(1/60, SUB_STEPS);
  assert(res.pointEnded === true, 'Point must end');
  assert(res.pointWinner === 'player1', 'Player 1 must win point because Player 2 hit it out');
  assert(res.pointReason === 'Player 2 Out', `Reason must be Player 2 Out, got: ${res.pointReason}`);
  console.log('  -> Passed (Correctly awarded point to Player 1: Player 2 Out)');
}

console.log('\n=== ALL RALLY & INTUITIVE HIT TESTS PASSED! ===');
