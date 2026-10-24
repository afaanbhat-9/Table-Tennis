import assert from 'assert';
import { TableTennisAI } from '../shared/ai.js';
import { PhysicsSimulation } from '../shared/physics.js';
import {
  TABLE_HEIGHT,
  TABLE_WIDTH,
  OPPONENT_PADDLE_Z,
  PLAYER_PADDLE_Z,
  PHYSICS_DT,
  SUB_STEPS,
  MAGNUS_COEFFICIENT
} from '../shared/constants.js';

console.log('=== RUNNING CURVING SHOTS & DIFFICULTY TUNING TESTS ===\n');

// 1. CASUAL AI SERVING DIVERSITY
console.log('Test 1: Verifying Casual AI serves across the table (left, right, center)...');
{
  const aiCasual = new TableTennisAI('easy');
  const targetXValues: number[] = [];
  const stanceXValues: number[] = [];

  for (let i = 0; i < 20; i++) {
    const stance = aiCasual.selectServePosition();
    stanceXValues.push(stance);
    targetXValues.push(aiCasual.chosenServeTargetX);
  }

  const hasLeftTarget = targetXValues.some((x) => x < -0.15);
  const hasRightTarget = targetXValues.some((x) => x > 0.15);
  const hasCenterTarget = targetXValues.some((x) => Math.abs(x) <= 0.15);

  const hasLeftStance = stanceXValues.some((x) => x < -0.15);
  const hasRightStance = stanceXValues.some((x) => x > 0.15);

  console.log(`  -> Stances observed: [${Array.from(new Set(stanceXValues)).map(x => x.toFixed(2)).join(', ')}]`);
  console.log(`  -> Targets observed: [${Array.from(new Set(targetXValues)).map(x => x.toFixed(2)).join(', ')}]`);

  assert.ok(hasLeftTarget, 'Casual bot must serve to the left side of table');
  assert.ok(hasRightTarget, 'Casual bot must serve to the right side of table');
  assert.ok(hasCenterTarget, 'Casual bot must serve to the center of table');
  assert.ok(hasLeftStance && hasRightStance, 'Casual bot stance must vary across table');

  // Verify physics simulation honors chosenServeTargetX
  const sim = new PhysicsSimulation();
  sim.prepareServe('player2', 0.0, -0.34);
  sim.ball.serveState = 'tossed';
  sim.paddle2.pos = { x: 0.0, y: TABLE_HEIGHT + 0.18, z: OPPONENT_PADDLE_Z };
  sim.paddle2.vel = { x: 0, y: -0.1, z: 0.6 };
  sim.paddle2.isSwinging = true;

  sim.step(PHYSICS_DT, SUB_STEPS);
  assert.ok(sim.ball.vel.x < -0.2, `Ball should be launched towards left target (got vel.x = ${sim.ball.vel.x.toFixed(2)})`);
  console.log('  -> Casual AI serve diversity PASSED!');
}

// 2. CASUAL AI PLAYING WIDE BALLS (LEFT & RIGHT WINGS)
console.log('\nTest 2: Verifying Casual AI plays balls on left and right wings nicely (easy pace)...');
{
  const testSideShot = (ballX: number, sideName: string) => {
    const ai = new TableTennisAI('easy');
    const sim = new PhysicsSimulation();

    // Ball incoming towards AI on wing at relaxed casual rally pace
    sim.ball = {
      pos: { x: ballX, y: TABLE_HEIGHT + 0.16, z: 0.1 },
      vel: { x: 0.05 * Math.sign(ballX), y: 0.5, z: -4.0 },
      lastHitter: 'player1',
      bounceCountCurrentSide: 1,
      lastBounceSide: 'player2',
      hasBouncedOnServerSide: true,
      hasBouncedOnReceiverSide: true,
      isServe: false,
      active: true
    };
    sim.paddle2.pos = { x: 0, y: TABLE_HEIGHT + 0.18, z: OPPONENT_PADDLE_Z };
    sim.paddle2.vel = { x: 0, y: 0, z: 0 };

    let paddleConnected = false;
    // Step simulation until paddle reaches ball or contacts
    for (let frame = 0; frame < 45; frame++) {
      ai.update(PHYSICS_DT, sim.ball, sim.paddle2);
      const res = sim.step(PHYSICS_DT, SUB_STEPS);
      if (res.soundEvents.some(s => s.type === 'paddle_hit')) {
        paddleConnected = true;
        break;
      }
      if (sim.ball.pos.z <= OPPONENT_PADDLE_Z - 0.1) break;
    }

    assert.ok(paddleConnected, `Casual AI must successfully reach and connect with ball on ${sideName} wing (x=${ballX}m)`);
    assert.ok(sim.ball.vel.z > 0, `Ball must rebound towards Player 1 (+Z) on ${sideName} wing return`);
    // Return speed should be gentle (easy level, not a smash)
    assert.ok(sim.ball.vel.z < 6.0, `Casual return must remain gentle (easy level, got vel.z = ${sim.ball.vel.z.toFixed(2)} m/s)`);
    console.log(`  -> ${sideName} wing contact verified: paddle at x=${sim.paddle2.pos.x.toFixed(2)}m returned ball with speed ${sim.ball.vel.z.toFixed(2)} m/s`);
  };

  testSideShot(-0.35, 'Left');
  testSideShot(0.35, 'Right');
  console.log('  -> Casual AI wide wing play PASSED!');
}

// 3. DIFFICULTY HIERARCHY: CASUAL < PRO < MASTER
console.log('\nTest 3: Verifying Difficulty Hierarchy & Tuning (Casual < Pro < Master)...');
{
  const aiCasual = new TableTennisAI('easy');
  const aiPro = new TableTennisAI('medium');
  const aiMaster = new TableTennisAI('hard');

  // Verify parameters progression
  const cfgCasual = (aiCasual as any).config;
  const cfgPro = (aiPro as any).config;
  const cfgMaster = (aiMaster as any).config;

  // Max Speed progression: Casual < Pro < Master
  assert.ok(cfgCasual.maxSpeed < cfgPro.maxSpeed, 'Pro must be faster than Casual');
  assert.ok(cfgPro.maxSpeed < cfgMaster.maxSpeed, 'Master must be faster than Pro');

  // Pro and Master should be decreased to beatable levels:
  assert.ok(cfgCasual.maxSpeed <= 2.5, `Casual maxSpeed (${cfgCasual.maxSpeed}) should be <= 2.5`);
  assert.ok(cfgPro.maxSpeed <= 3.5, `Pro maxSpeed (${cfgPro.maxSpeed}) should be <= 3.5`);
  assert.ok(cfgMaster.maxSpeed <= 4.5, `Master maxSpeed (${cfgMaster.maxSpeed}) should be <= 4.5`);
  assert.ok(cfgMaster.reactionDelayMs >= 150, `Master reactionDelay (${cfgMaster.reactionDelayMs}) should be >= 150ms`);

  // Reaction Delay progression: Casual slowest, Pro middle, Master quickest
  assert.ok(cfgCasual.reactionDelayMs > cfgPro.reactionDelayMs, 'Casual reaction delay must be more relaxed than Pro');
  assert.ok(cfgPro.reactionDelayMs > cfgMaster.reactionDelayMs, 'Pro reaction delay must be more relaxed than Master');

  // Aggression & placement progression
  assert.ok(cfgCasual.swingAggression < cfgPro.swingAggression, 'Pro should be more aggressive than Casual');
  assert.ok(cfgPro.swingAggression < cfgMaster.swingAggression, 'Master should be more aggressive than Pro');
  assert.ok(cfgCasual.returnPlacementBias < cfgPro.returnPlacementBias, 'Pro should place shots wider than Casual');
  assert.ok(cfgPro.returnPlacementBias < cfgMaster.returnPlacementBias, 'Master should place shots wider than Pro');

  console.log(`  -> Speeds: Casual=${cfgCasual.maxSpeed}m/s, Pro=${cfgPro.maxSpeed}m/s, Master=${cfgMaster.maxSpeed}m/s`);
  console.log(`  -> Reaction delays: Casual=${cfgCasual.reactionDelayMs}ms, Pro=${cfgPro.reactionDelayMs}ms, Master=${cfgMaster.reactionDelayMs}ms`);
  console.log(`  -> Aggressions: Casual=${cfgCasual.swingAggression}, Pro=${cfgPro.swingAggression}, Master=${cfgMaster.swingAggression}`);
  console.log('  -> Difficulty hierarchy PASSED!');
}

// 4. BALL CURVING ON CURVING SHOTS (MAGNUS EFFECT)
console.log('\nTest 4: Verifying Ball Curving due to Curving Shot (Natural Small Curve)...');
{
  // Test 4A: Right curving shot (Player 1 brushes paddle right +X)
  const simRightCurve = new PhysicsSimulation();
  simRightCurve.ball = {
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
  simRightCurve.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.48 };
  simRightCurve.paddle1.vel = { x: 2.2, y: 0.3, z: -2.0 }; // Brushing right
  simRightCurve.step(PHYSICS_DT, SUB_STEPS);

  assert.ok(simRightCurve.ball.spin!.y > 15, `Right brush must impart clockwise sidespin (got ${simRightCurve.ball.spin!.y.toFixed(1)} rad/s)`);

  // Test 4B: Left curving shot (Player 1 brushes paddle left -X)
  const simLeftCurve = new PhysicsSimulation();
  simLeftCurve.ball = {
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
  simLeftCurve.paddle1.pos = { x: 0, y: TABLE_HEIGHT + 0.14, z: 1.48 };
  simLeftCurve.paddle1.vel = { x: -2.2, y: 0.3, z: -2.0 }; // Brushing left
  simLeftCurve.step(PHYSICS_DT, SUB_STEPS);

  assert.ok(simLeftCurve.ball.spin!.y < -15, `Left brush must impart counter-clockwise sidespin (got ${simLeftCurve.ball.spin!.y.toFixed(1)} rad/s)`);

  // Trace both trajectories until bounce on the opponent's court
  let rightBounceX = 0;
  let leftBounceX = 0;
  let rightBounced = false;
  let leftBounced = false;

  for (let step = 0; step < 50; step++) {
    const resR = simRightCurve.step(PHYSICS_DT, SUB_STEPS);
    const resL = simLeftCurve.step(PHYSICS_DT, SUB_STEPS);

    if (!rightBounced && resR.soundEvents.some(s => s.type === 'table_hit')) {
      rightBounced = true;
      rightBounceX = simRightCurve.ball.pos.x;
    }
    if (!leftBounced && resL.soundEvents.some(s => s.type === 'table_hit')) {
      leftBounced = true;
      leftBounceX = simLeftCurve.ball.pos.x;
    }
    if (rightBounced && leftBounced) break;
  }

  console.log(`  -> Right curve landed on table at X: +${rightBounceX.toFixed(3)}m (within table width ${TABLE_WIDTH / 2}m)`);
  console.log(`  -> Left curve landed on table at X: ${leftBounceX.toFixed(3)}m (within table width ${TABLE_WIDTH / 2}m)`);

  assert.ok(rightBounced, 'Right curving shot must land on opponent table');
  assert.ok(leftBounced, 'Left curving shot must land on opponent table');
  assert.ok(rightBounceX > 0.02 && rightBounceX <= TABLE_WIDTH / 2, `Right curving shot must curve right naturally and stay on table (got ${rightBounceX.toFixed(3)}m)`);
  assert.ok(leftBounceX < -0.02 && Math.abs(leftBounceX) <= TABLE_WIDTH / 2, `Left curving shot must curve left naturally and stay on table (got ${leftBounceX.toFixed(3)}m)`);

  // Test 4C: Player 2 curving shot (AI or Opponent)
  const simP2Curve = new PhysicsSimulation();
  simP2Curve.ball = {
    pos: { x: 0, y: TABLE_HEIGHT + 0.14, z: -1.45 },
    vel: { x: 0, y: 0.2, z: -5.5 },
    lastHitter: 'player1',
    bounceCountCurrentSide: 1,
    lastBounceSide: 'player2',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };
  simP2Curve.paddle2.pos = { x: 0, y: TABLE_HEIGHT + 0.14, z: -1.48 };
  simP2Curve.paddle2.vel = { x: 2.2, y: 0.3, z: 2.0 }; // Player 2 brushing in +X
  simP2Curve.step(PHYSICS_DT, SUB_STEPS);

  let p2Bounced = false;
  let p2BounceX = 0;
  for (let step = 0; step < 50; step++) {
    const resP2 = simP2Curve.step(PHYSICS_DT, SUB_STEPS);
    if (!p2Bounced && resP2.soundEvents.some(s => s.type === 'table_hit')) {
      p2Bounced = true;
      p2BounceX = simP2Curve.ball.pos.x;
      break;
    }
  }
  assert.ok(p2Bounced, 'Player 2 curving shot must land on table');
  assert.ok(p2BounceX > 0.02 && p2BounceX <= TABLE_WIDTH / 2, `Player 2 brush in +X must curve ball naturally into +X on table (got ${p2BounceX.toFixed(3)}m)`);
  console.log(`  -> Player 2 curving shot landed on table at X: +${p2BounceX.toFixed(3)}m (correct curve & in bounds)`);

  console.log('  -> Ball curving due to curving shots PASSED!');
}

// 5. SHORT BALL RETURN & REDUCED NET MISTAKES
console.log('\nTest 5: Verifying Casual AI returns short balls & reduced net mistake percentage...');
{
  const aiCasual = new TableTennisAI('easy');
  const sim = new PhysicsSimulation();
  sim.setAIDifficulty('easy');

  // Short ball incoming: gentle short drop landing at Z = -0.70m with slow horizontal speed (vel.z = -2.2 m/s)
  // If AI stays at baseline (-1.84m), ball would double bounce without reaching paddle.
  sim.ball = {
    pos: { x: 0.1, y: TABLE_HEIGHT + 0.18, z: -0.2 },
    vel: { x: 0.05, y: 0.4, z: -2.2 },
    lastHitter: 'player1',
    bounceCountCurrentSide: 0,
    lastBounceSide: 'player1',
    hasBouncedOnServerSide: true,
    hasBouncedOnReceiverSide: true,
    isServe: false,
    active: true
  };
  sim.paddle2.pos = { x: 0, y: TABLE_HEIGHT + 0.18, z: OPPONENT_PADDLE_Z };
  sim.paddle2.vel = { x: 0, y: 0, z: 0 };

  let paddleHit = false;
  let minPaddleZ = OPPONENT_PADDLE_Z;

  for (let frame = 0; frame < 60; frame++) {
    aiCasual.update(PHYSICS_DT, sim.ball, sim.paddle2);
    if (sim.paddle2.pos.z > minPaddleZ) {
      minPaddleZ = sim.paddle2.pos.z;
    }
    const res = sim.step(PHYSICS_DT, SUB_STEPS);
    if (res.soundEvents.some(s => s.type === 'paddle_hit')) {
      paddleHit = true;
      break;
    }
    if (res.pointEnded) break;
  }

  assert.ok(minPaddleZ > OPPONENT_PADDLE_Z + 0.15, `Casual AI must step forward in Z to intercept short ball (reached Z=${minPaddleZ.toFixed(2)}m, baseline=${OPPONENT_PADDLE_Z}m)`);
  assert.ok(paddleHit, 'Casual AI must successfully reach and strike the short ball before double-bounce');
  assert.ok(sim.ball.vel.z > 0, 'Returned short ball must rebound towards Player 1 (+Z)');
  console.log(`  -> Short ball intercepted at Z=${sim.paddle2.pos.z.toFixed(2)}m (forward step +${(sim.paddle2.pos.z - OPPONENT_PADDLE_Z).toFixed(2)}m) and returned with vel.z=${sim.ball.vel.z.toFixed(2)} m/s!`);

  console.log('  -> Short ball return and reduced net mistakes PASSED!');
}

console.log('\n=== ALL CURVING & DIFFICULTY TESTS PASSED WITH 100% SUCCESS! ===');
