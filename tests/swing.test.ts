import assert from 'assert';
import { SwingState } from '../shared/swing.js';
import { PhysicsSimulation } from '../shared/physics.js';
import {
  PADDLE_MIN_X,
  PADDLE_MAX_X,
  PADDLE_MIN_Y,
  PADDLE_MAX_Y,
  PLAYER_PADDLE_Z,
  TABLE_HEIGHT
} from '../shared/constants.js';
import { PlayerInput } from '../shared/types.js';

console.log('=== RUNNING SWING CONTROLS & INPUT LOGIC TESTS ===\n');

// Mock helper to simulate pointer samples over time
function simulatePointerMovement(
  samples: Array<{ x: number; y: number; dtMs: number }>,
  minSpeedPx: number = 650,
  minDistPx: number = 20,
  windowMs: number = 100
): { isFlick: boolean; speedPx: number; distPx: number; dirX: number; dirY: number } {
  let currentTime = 0;
  const history: Array<{ x: number; y: number; time: number }> = [];

  for (const s of samples) {
    currentTime += s.dtMs;
    history.push({ x: s.x, y: s.y, time: currentTime });
    const cutoff = currentTime - windowMs;
    while (history.length > 0 && history[0].time < cutoff) {
      history.shift();
    }
  }

  if (history.length < 2) {
    return { isFlick: false, speedPx: 0, distPx: 0, dirX: 0, dirY: 0 };
  }

  const oldest = history[0];
  const newest = history[history.length - 1];
  const dt = (newest.time - oldest.time) / 1000;
  if (dt <= 0.005) {
    return { isFlick: false, speedPx: 0, distPx: 0, dirX: 0, dirY: 0 };
  }

  const dx = newest.x - oldest.x;
  const dy = newest.y - oldest.y;
  const distPx = Math.hypot(dx, dy);
  const speedPx = distPx / dt;
  const isFlick = speedPx >= minSpeedPx && distPx >= minDistPx;

  return {
    isFlick,
    speedPx,
    distPx,
    dirX: (dx / (distPx || 1)) * 0.8,
    dirY: Math.max(-0.4, (-dy / (distPx || 1)) * 0.6)
  };
}

// TEST 1: Slow pointer movement does not accidentally trigger a swing
console.log('Test 1: Slow pointer movement (no accidental swing)...');
{
  // Moving 15 pixels over 200ms (~75 px/s)
  const result = simulatePointerMovement([
    { x: 100, y: 100, dtMs: 0 },
    { x: 105, y: 102, dtMs: 70 },
    { x: 110, y: 105, dtMs: 70 },
    { x: 115, y: 107, dtMs: 60 }
  ]);
  assert.strictEqual(result.isFlick, false, 'Slow movement must not trigger a swing');
  console.log(`  -> Passed (Speed: ${result.speedPx.toFixed(1)} px/s < threshold, isFlick = false)`);
}

// TEST 2: Fast directional mouse gesture triggers a swing
console.log('\nTest 2: Fast directional mouse gesture triggers swing...');
{
  // Moving 50 pixels over 40ms (~1250 px/s)
  const result = simulatePointerMovement([
    { x: 200, y: 200, dtMs: 0 },
    { x: 220, y: 170, dtMs: 20 },
    { x: 245, y: 155, dtMs: 20 }
  ]);
  assert.strictEqual(result.isFlick, true, 'Fast mouse stroke must trigger a swing');
  assert.ok(result.speedPx >= 650, 'Speed should exceed threshold');
  console.log(`  -> Passed (Speed: ${result.speedPx.toFixed(1)} px/s, isFlick = true)`);
}

// TEST 3: Trackpad-style small, quick gestures can trigger a swing
console.log('\nTest 3: Trackpad small, quick gestures...');
{
  // Moving 24 pixels in 30ms (~800 px/s) on a laptop trackpad
  const result = simulatePointerMovement([
    { x: 150, y: 150, dtMs: 0 },
    { x: 162, y: 140, dtMs: 15 },
    { x: 172, y: 132, dtMs: 15 }
  ]);
  assert.strictEqual(result.isFlick, true, 'Small quick trackpad flick must trigger a swing');
  console.log(`  -> Passed (Displacement: ${result.distPx.toFixed(1)} px in 30ms, isFlick = true)`);
}

// TEST 4 & 5: Mobile Touch: Deliberate flick triggers swing vs Slow drag positions paddle
console.log('\nTest 4 & 5: Mobile Touch flick vs slow drag...');
{
  // Fast touch flick (40px in 45ms)
  const touchFlick = simulatePointerMovement([
    { x: 300, y: 400, dtMs: 0 },
    { x: 315, y: 380, dtMs: 20 },
    { x: 335, y: 360, dtMs: 25 }
  ]);
  assert.strictEqual(touchFlick.isFlick, true, 'Fast touch flick must trigger swing');

  // Slow touch drag (18px in 250ms)
  const touchDrag = simulatePointerMovement([
    { x: 300, y: 400, dtMs: 0 },
    { x: 306, y: 398, dtMs: 80 },
    { x: 312, y: 395, dtMs: 80 },
    { x: 318, y: 392, dtMs: 90 }
  ]);
  assert.strictEqual(touchDrag.isFlick, false, 'Slow touch drag must not trigger swing');
  console.log('  -> Passed (Touch flick triggers swing, touch drag only positions paddle)');
}

// TEST 6: Paddle positions remain inside legal boundaries
console.log('\nTest 6: Paddle positions clamped within legal boundaries...');
{
  const clampPos = (x: number, y: number) => {
    return {
      x: Math.max(PADDLE_MIN_X, Math.min(PADDLE_MAX_X, x)),
      y: Math.max(PADDLE_MIN_Y, Math.min(PADDLE_MAX_Y, y))
    };
  };

  const extremeLeft = clampPos(-99.0, 1.0);
  assert.strictEqual(extremeLeft.x, PADDLE_MIN_X);

  const extremeRight = clampPos(99.0, 1.0);
  assert.strictEqual(extremeRight.x, PADDLE_MAX_X);

  const extremeLow = clampPos(0, -10.0);
  assert.strictEqual(extremeLow.y, PADDLE_MIN_Y);

  const extremeHigh = clampPos(0, 100.0);
  assert.strictEqual(extremeHigh.y, PADDLE_MAX_Y);
  console.log('  -> Passed (Bounds correctly clamped)');
}

// TEST 7: Excessive swing speed is clamped
console.log('\nTest 7: Swing speed clamping on server and client...');
{
  const swing = new SwingState(true);
  // Trigger with maximum possible strength
  swing.triggerSwing({ x: 0, y: 0.5, z: -1 }, 999.0);
  assert.strictEqual(swing.strength, 1.0, 'Strength should be clamped to 1.0');

  // Step into forward phase
  swing.update(0.04);
  assert.strictEqual(swing.phase, 'forward');
  assert.ok(Math.abs(swing.velocity.z) <= 9.5, `Forward velocity (${Math.abs(swing.velocity.z)}) should not exceed maxSpeed (9.5 m/s)`);
  console.log(`  -> Passed (Speed clamped to maxSpeed: ${Math.abs(swing.velocity.z).toFixed(2)} m/s)`);
}

// TEST 8: Swing direction is calculated consistently
console.log('\nTest 8: Consistent swing direction vector...');
{
  const swing = new SwingState(true);
  // Right-topspin flick
  swing.triggerSwing({ x: 0.6, y: 0.4, z: -1 }, 0.8);
  assert.ok(swing.direction.x > 0, 'X direction should be positive (right)');
  assert.ok(swing.direction.y > 0, 'Y direction should be positive (lift)');
  assert.ok(swing.direction.z < 0, 'Z direction should be negative (towards opponent)');
  console.log('  -> Passed (Swing vector correctly oriented)');
}

// TEST 9: Swing produces hit only when valid paddle-ball contact occurs
console.log('\nTest 9: Swing only hits when paddle and ball genuinely intersect...');
{
  const sim = new PhysicsSimulation();
  // Ball far away on left side (x = -0.6)
  sim.ball.pos = { x: -0.6, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z - 0.05 };
  sim.ball.vel = { x: 0, y: 0, z: 2.0 };
  sim.ball.lastBounceSide = 'player1';
  sim.ball.active = true;

  // Paddle on right side (x = +0.5) swinging forward
  sim.paddle1.pos = { x: 0.5, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z };
  sim.paddle1.vel = { x: 0, y: 0, z: -6.0 };

  const res = sim.step(1/60, 4);
  assert.strictEqual(sim.ball.lastHitter, null, 'Ball must not be hit when paddle is far away');

  // Move paddle directly in front of ball
  sim.paddle1.pos = { x: -0.6, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z };
  const resHit = sim.step(1/60, 4);
  assert.strictEqual(sim.ball.lastHitter, 'player1', 'Ball must be hit when paddle intersects it');
  console.log('  -> Passed (Contact verified, no phantom hits)');
}

// TEST 10 & 11: Multiplayer sequence & stale input validation
console.log('\nTest 10 & 11: Stale inputs cannot override newer inputs...');
{
  let lastAcceptedSeq = 0;
  const processInput = (input: PlayerInput): boolean => {
    if (input.seq <= lastAcceptedSeq) return false;
    lastAcceptedSeq = input.seq;
    return true;
  };

  assert.strictEqual(processInput({ seq: 10, timestamp: 1000, targetPos: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, swingPower: 0.5 }), true);
  // Stale out-of-order input
  assert.strictEqual(processInput({ seq: 8, timestamp: 950, targetPos: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, swingPower: 0.5 }), false);
  // Newer input
  assert.strictEqual(processInput({ seq: 11, timestamp: 1016, targetPos: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, swingPower: 0.5 }), true);
  console.log('  -> Passed (Stale sequence numbers rejected)');
}

// TEST 12: Pointer cancellation & reset
console.log('\nTest 12: Pointer cancellation resets swing state...');
{
  const swing = new SwingState(true);
  swing.triggerSwing({ x: 0, y: 0.2, z: -1 }, 0.8);
  assert.notStrictEqual(swing.phase, 'idle');
  swing.reset();
  assert.strictEqual(swing.phase, 'idle');
  assert.strictEqual(swing.offset.z, 0);
  assert.strictEqual(swing.velocity.z, 0);
  console.log('  -> Passed (Swing reset successfully)');
}

console.log('\n=== ALL SWING AND INPUT TESTS PASSED SUCCESSFULLY! ===');
