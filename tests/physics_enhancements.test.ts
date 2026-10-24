import assert from 'assert';
import { PhysicsSimulation } from '../shared/physics.js';
import {
  TABLE_HEIGHT,
  TABLE_WIDTH,
  TABLE_LENGTH,
  BLADE_RADIUS_Y,
  TABLE_SURFACE_CLEARANCE,
  PADDLE_TABLE_MIN_Y,
  PADDLE_FLOOR_MIN_Y,
  PLAYER_PADDLE_Z,
  OPPONENT_PADDLE_Z,
  getMinPaddleY,
  PHYSICS_DT,
  SUB_STEPS
} from '../shared/constants.js';

console.log('=== RUNNING PHYSICS ENHANCEMENTS & GAMEPLAY FIXES TESTS ===\n');

// TEST 1: Bat Clearance Over Table Surface
console.log('Test 1: Verifying bat clearance and table collision constraints...');
{
  // Test points directly over the table
  for (let x = -TABLE_WIDTH / 2; x <= TABLE_WIDTH / 2; x += 0.15) {
    for (let z = -TABLE_LENGTH / 2; z <= TABLE_LENGTH / 2; z += 0.25) {
      const minY = getMinPaddleY(x, z);
      const bladeBottomY = minY - BLADE_RADIUS_Y;
      assert.ok(
        bladeBottomY >= TABLE_HEIGHT,
        `Blade bottom (${bladeBottomY.toFixed(4)}m) must not sink into table surface (${TABLE_HEIGHT}m) at x=${x.toFixed(2)}, z=${z.toFixed(2)}`
      );
      assert.ok(
        minY >= PADDLE_TABLE_MIN_Y - 0.001,
        `Center height (${minY.toFixed(4)}m) must be >= table min Y (${PADDLE_TABLE_MIN_Y}m)`
      );
    }
  }

  // Test behind the table (Z > 1.37)
  const behindEdgeMinY = getMinPaddleY(0, 1.37);
  const deepBehindMinY = getMinPaddleY(0, 1.65);
  assert.ok(
    behindEdgeMinY > deepBehindMinY,
    `Behind table height should smoothly transition from ${behindEdgeMinY.toFixed(3)}m to ${deepBehindMinY.toFixed(3)}m`
  );
  assert.strictEqual(
    Math.round(deepBehindMinY * 100) / 100,
    Math.round(PADDLE_FLOOR_MIN_Y * 100) / 100,
    'Deep behind table should reach floor minimum height'
  );

  console.log('  -> Bat clearance verification PASSED! (No table clipping guaranteed)');
}

// TEST 2: Serve Ball Stance and Paddle Attachment
console.log('\nTest 2: Verifying serve ball placement on server side and paddle tracking...');
{
  const sim = new PhysicsSimulation();

  // 1. Prepare serve for Player 1
  sim.prepareServe('player1');
  assert.strictEqual(sim.ball.active, true, 'Serve ball must be active/visible');
  assert.strictEqual(sim.ball.isServe, true, 'isServe must be true');
  assert.strictEqual(sim.ball.serveState, 'held', 'serveState must be held');
  assert.strictEqual(sim.ball.lastHitter, 'player1', 'lastHitter must be player1');
  assert.ok(sim.ball.pos.z > 0, 'Ball must be on Player 1 half of the table');

  // Verify ball tracks paddle displacement
  const testPositions = [
    { x: -0.25, y: TABLE_HEIGHT + 0.18, z: PLAYER_PADDLE_Z },
    { x: 0.35, y: TABLE_HEIGHT + 0.25, z: PLAYER_PADDLE_Z - 0.05 },
    { x: 0.0, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z + 0.08 }
  ];

  for (const pos of testPositions) {
    sim.paddle1.pos = { ...pos };
    sim.paddle1.vel = { x: 0.5, y: -0.2, z: 0 };
    sim.updateServeBall('player1');

    assert.strictEqual(sim.ball.pos.x, pos.x, 'Ball X must track paddle X');
    assert.ok(sim.ball.pos.y > pos.y, 'Ball must sit above paddle center');
    assert.ok(sim.ball.pos.z < pos.z, 'Ball must sit in front of Player 1 paddle (closer to net)');
    assert.ok(sim.ball.pos.y >= TABLE_HEIGHT + 0.02, 'Ball must remain cleanly above table surface');
  }

  // Verify stepping while stationary keeps ball held
  for (let i = 0; i < 20; i++) {
    const res = sim.step(PHYSICS_DT, SUB_STEPS);
    assert.strictEqual(res.ball.serveState, 'held', 'Ball must remain held before stroke');
    assert.strictEqual(res.ball.active, true, 'Ball must remain active/visible');
  }

  // 2. Prepare serve for Player 2 (Opponent / AI)
  sim.prepareServe('player2');
  assert.strictEqual(sim.ball.active, true);
  assert.strictEqual(sim.ball.serveState, 'held');
  assert.strictEqual(sim.ball.lastHitter, 'player2');
  assert.ok(sim.ball.pos.z < 0, 'Ball must be on Player 2 half of the table');
  sim.paddle2.pos = { x: 0.20, y: TABLE_HEIGHT + 0.18, z: OPPONENT_PADDLE_Z };
  sim.updateServeBall('player2');
  assert.strictEqual(sim.ball.pos.x, 0.20);
  assert.ok(sim.ball.pos.z > OPPONENT_PADDLE_Z, 'Ball must sit in front of Player 2 paddle (closer to net)');

  console.log('  -> Serve ball placement and paddle tracking PASSED!');
}

// TEST 3: Serve Forward Stroke Release
console.log('\nTest 3: Verifying forward stroke serve release into normal play...');
{
  const sim = new PhysicsSimulation();
  sim.prepareServe('player1');

  // Trigger forward stroke on Player 1 paddle
  sim.paddle1.vel = { x: 0, y: 0.2, z: -2.5 }; // forward stroke
  sim.paddle1.isSwinging = true;

  const res = sim.step(PHYSICS_DT, SUB_STEPS);
  const paddleHit = res.soundEvents.some(s => s.type === 'paddle_hit');

  assert.strictEqual(paddleHit, true, 'Serve forward stroke must strike the ball');
  assert.strictEqual(sim.ball.serveState, 'in_play', 'Ball serveState must transition to in_play');
  assert.strictEqual(sim.ball.active, true, 'Ball must remain active');
  assert.ok(sim.ball.vel.z < 0, 'Ball must travel forward towards table (-Z)');
  assert.ok(sim.ball.vel.y < 0, 'Serve ball must strike downwards onto table first');

  console.log('  -> Serve release on stroke PASSED!');
}

// TEST 4: Stroke-Dependent Ball Speed
console.log('\nTest 4: Verifying stroke-dependent ball speed (gentle vs medium vs fast)...');
{
  function measureReturnSpeed(paddleVelZ: number, pointerSpeed: number): number {
    const sim = new PhysicsSimulation();
    sim.ball = {
      pos: { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.45 },
      vel: { x: 0, y: 0.2, z: 5.5 },
      lastHitter: 'player2',
      bounceCountCurrentSide: 1,
      lastBounceSide: 'player1',
      hasBouncedOnServerSide: true,
      hasBouncedOnReceiverSide: true,
      isServe: false,
      active: true
    };
    sim.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.48 };
    sim.paddle1.vel = { x: pointerSpeed, y: 0, z: paddleVelZ };

    sim.step(PHYSICS_DT, SUB_STEPS);
    return Math.abs(sim.ball.vel.z);
  }

  const gentleSpeed = measureReturnSpeed(0, 0); // Stationary touch
  const rallySpeed = measureReturnSpeed(-1.8, 0.4); // Standard rally forward stroke
  const smashSpeed = measureReturnSpeed(-6.5, 2.5); // Hard drive / fast smash

  console.log(`  -> Gentle return speed: ${gentleSpeed.toFixed(2)} m/s`);
  console.log(`  -> Standard rally speed: ${rallySpeed.toFixed(2)} m/s`);
  console.log(`  -> Smash stroke speed: ${smashSpeed.toFixed(2)} m/s`);

  assert.ok(gentleSpeed >= 4.6 && gentleSpeed <= 5.6, `Gentle speed (${gentleSpeed}) should be ~4.8-5.5 m/s`);
  assert.ok(rallySpeed > gentleSpeed, 'Rally stroke must be faster than gentle touch');
  assert.ok(smashSpeed > rallySpeed, 'Smash stroke must be faster than standard rally');
  assert.ok(smashSpeed >= 8.0, `Smash speed (${smashSpeed}) should be >= 8.0 m/s`);

  console.log('  -> Stroke-dependent ball speed verification PASSED!');
}

// TEST 5: Brushing Stroke Generates Spin and Magnus Aerodynamic Curve
console.log('\nTest 5: Verifying brushing stroke spin generation and Magnus curve...');
{
  // 1. Right sidespin brushing stroke
  const simSpin = new PhysicsSimulation();
  simSpin.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.45 },
    vel: { x: 0, y: 0.2, z: 5.5 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 1,
    lastBounceSide: 'player1',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };
  // Brush paddle horizontally to the right (+X)
  simSpin.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.48 };
  simSpin.paddle1.vel = { x: 3.0, y: 0, z: -1.5 };

  simSpin.step(PHYSICS_DT, SUB_STEPS);

  assert.ok(simSpin.ball.spin, 'Ball must possess spin vector');
  assert.ok(simSpin.ball.spin!.y > 30, `Right brushing stroke must generate clockwise sidespin (got ${simSpin.ball.spin!.y.toFixed(1)} rad/s)`);

  // 2. Flat hit (no brush) for comparison
  const simFlat = new PhysicsSimulation();
  simFlat.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.45 },
    vel: { x: 0, y: 0.2, z: 5.5 },
    lastHitter: 'player2',
    bounceCountCurrentSide: 1,
    lastBounceSide: 'player1',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };
  simFlat.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.48 };
  simFlat.paddle1.vel = { x: 0, y: 0, z: -1.5 };
  simFlat.step(PHYSICS_DT, SUB_STEPS);

  // Trace both trajectories until reaching Z = -0.5 (opponent table half)
  for (let step = 0; step < 40; step++) {
    simSpin.step(PHYSICS_DT, SUB_STEPS);
    simFlat.step(PHYSICS_DT, SUB_STEPS);
    if (simSpin.ball.pos.z <= -0.5) break;
  }

  const lateralCurve = simSpin.ball.pos.x - simFlat.ball.pos.x;
  console.log(`  -> Spinning ball X: ${simSpin.ball.pos.x.toFixed(3)}m, Flat ball X: ${simFlat.ball.pos.x.toFixed(3)}m`);
  console.log(`  -> Aerodynamic Magnus & bounce deflection: ${(lateralCurve * 100).toFixed(1)} cm`);

  assert.ok(lateralCurve > 0.03, `Brushing stroke must induce natural small lateral curve (> 3cm at mid-table, got ${(lateralCurve * 100).toFixed(1)}cm)`);
  assert.ok(Math.abs(simFlat.ball.pos.x) < 0.03, 'Flat stroke must remain centered without curving');

  console.log('  -> Ball spin and Magnus aerodynamic curve PASSED!');
}

console.log('\n=== ALL PHYSICS ENHANCEMENTS TESTS COMPLETED SUCCESSFULLY! ===');
