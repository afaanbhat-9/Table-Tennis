import { PhysicsSimulation } from '../shared/physics.js';
import { TableTennisAI } from '../shared/ai.js';
import { SUB_STEPS, TABLE_HEIGHT, NET_Y_TOP, PLAYER_PADDLE_Z, PADDLE_HITBOX_RADIUS, PADDLE_RADIUS } from '../shared/constants.js';

// Monkey patch physics with our proposed fixes:
const originalCheck = (PhysicsSimulation.prototype as any).checkPaddleCollision;

(PhysicsSimulation.prototype as any).getPaddleNormal = function(rot: any, isP1: boolean) {
  const baseZ = isP1 ? -1 : 1;
  const cx = Math.cos(rot.x);
  const sx = Math.sin(rot.x);
  const cy = Math.cos(rot.y);
  const sy = Math.sin(rot.y);

  const nx = -sy * cx;
  const ny = -baseZ * sx;
  const nz = baseZ * cy * cx;

  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
};

(PhysicsSimulation.prototype as any).checkPaddleCollision = function(paddle: any, side: any, prevPos: any) {
  const b = this.ball;
  const isP1 = side === 'player1';
  const dirZ = isP1 ? -1 : 1;

  const isServeToss = b.isServe && (b.serveState === 'tossed' || b.serveState === 'held');
  const hitRadius = isServeToss ? (0.15 + 0.16) : PADDLE_HITBOX_RADIUS;
  const thickness = isServeToss ? (0.05 + 0.08) : 0.28;

  let dx = b.pos.x - paddle.pos.x;
  let dy = b.pos.y - paddle.pos.y;
  let dz = b.pos.z - paddle.pos.z;

  const effectiveDy = dy * 0.45;
  let radialDist = Math.hypot(dx, effectiveDy);
  let isHit = radialDist <= hitRadius && Math.abs(dz) <= thickness;

  if (isHit) {
    if (b.isServe && b.lastHitter === side) {
      return originalCheck.call(this, paddle, side, prevPos);
    }

    const normal = this.getPaddleNormal(paddle.rot, isP1);

    const forwardStroke = Math.max(0, dirZ * paddle.vel.z);
    const lateralStroke = Math.hypot(paddle.vel.x, paddle.vel.y);
    const strokeIntensity = forwardStroke + lateralStroke * 0.25;
    const isSmash = strokeIntensity >= 3.5 || paddle.isSwinging;

    let forwardSpeed: number;
    if (strokeIntensity < 0.35 && !paddle.isSwinging) {
      forwardSpeed = 4.68;
    } else if (isSmash) {
      forwardSpeed = Math.min(8.15, 5.50 + strokeIntensity * 0.40);
    } else {
      forwardSpeed = 4.80 + strokeIntensity * 0.28;
    }

    let newVz = dirZ * forwardSpeed;

    const swipeAimAngle = paddle.vel.x * 0.22 + (dx / PADDLE_RADIUS) * 0.22;
    const courtCentering = -b.pos.x * 0.50;
    let newVx = swipeAimAngle + courtCentering;
    newVx = Math.max(-1.45, Math.min(1.45, newVx));

    const distToNet = Math.abs(b.pos.z);
    const avgForwardSpeed = forwardSpeed * 0.90;
    const timeToNet = Math.max(0.10, Math.min(0.50, distToNet / (avgForwardSpeed || 1)));
    const effectiveG = 9.81 + 2.0;
    const targetNetHeight = NET_Y_TOP + 0.038;
    const minVyToClear = (targetNetHeight - b.pos.y + 0.5 * effectiveG * timeToNet * timeToNet) / timeToNet;

    const targetLandingZ = isP1 ? -0.85 : 0.85;
    const distToLanding = Math.abs(b.pos.z - targetLandingZ);
    const timeToLand = Math.max(0.22, Math.min(0.70, distToLanding / (avgForwardSpeed || 1)));
    const landingSurfaceY = TABLE_HEIGHT + 0.02;
    const targetVyForLanding = (landingSurfaceY - b.pos.y + 0.5 * effectiveG * timeToLand * timeToLand) / timeToLand;

    const tiltInfluence = normal.y * 3.2;
    const strokeInfluence = Math.max(-0.4, Math.min(1.2, paddle.vel.y * 0.30));
    let newVy = targetVyForLanding + tiltInfluence + strokeInfluence;

    if (isSmash || forwardSpeed >= 7.2) {
      newVy = Math.max(minVyToClear, Math.min(1.45, newVy));
    } else {
      const clampedMinVy = b.pos.y > (NET_Y_TOP + 0.12) ? Math.max(0.70, minVyToClear) : Math.max(1.60, minVyToClear);
      newVy = Math.max(clampedMinVy, Math.min(2.55, Math.max(clampedMinVy, newVy)));
    }

    const swipeSidespin = (paddle.vel.x * 20.0) + (dx / PADDLE_RADIUS) * 15.0;
    const spinY = Math.max(-150, Math.min(150, swipeSidespin));
    const swipeTopspin = 25.0 + paddle.vel.y * 22.0;
    const spinX = Math.max(-150, Math.min(150, swipeTopspin));

    b.spin = { x: spinX, y: spinY, z: 0 };
    b.vel.x = Math.max(-2.2, Math.min(2.2, newVx));
    b.vel.y = newVy;
    b.vel.z = newVz;

    b.pos.z = paddle.pos.z + normal.z * (0.02 + 0.02);

    const intensity = Math.min(1.0, Math.hypot(b.vel.x, b.vel.y, b.vel.z) / 9.5);
    return { collided: true, intensity };
  }

  return { collided: false, intensity: 0 };
};

console.log('=== TESTING CONSECUTIVE RALLIES ===');

const sim = new PhysicsSimulation();
const ai = new TableTennisAI('medium');

sim.prepareServe('player1');
sim.launchServe('player1', 0.1);

let paddle1Pos = { x: 0, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z };
let paddle1Rot = { x: 0.0, y: 0.0, z: -0.20 };
let paddle1Vel = { x: 0, y: 0, z: 0 };

let hitCount = 0;
let bounceCount = 0;
let bouncedOnPlayerSide = false;

for (let frame = 0; frame < 600; frame++) {
  const dt = 1/60;

  // Simulate InputController with updated tilt formula:
  if (sim.ball.vel.z > 0 && sim.ball.pos.z > 0.4) {
    const targetX = sim.ball.pos.x;
    const targetY = Math.max(TABLE_HEIGHT + 0.08, Math.min(TABLE_HEIGHT + 0.45, sim.ball.pos.y));
    const prevX = paddle1Pos.x;
    const prevY = paddle1Pos.y;
    paddle1Pos.x += (targetX - paddle1Pos.x) * 0.35;
    paddle1Pos.y += (targetY - paddle1Pos.y) * 0.35;
    paddle1Vel.x = (paddle1Pos.x - prevX) / dt;
    paddle1Vel.y = (paddle1Pos.y - prevY) / dt;
  } else {
    paddle1Vel.x = 0;
    paddle1Vel.y = 0;
  }

  // Updated InputController tilt:
  const heightFromNet = paddle1Pos.y - NET_Y_TOP;
  const targetTiltX = -Math.max(-0.06, Math.min(0.12, heightFromNet * 0.35));
  const targetTiltY = (paddle1Pos.x / 1.0) * 0.22;
  const targetTiltZ = -0.20 - (paddle1Pos.x / 1.0) * 0.30;
  paddle1Rot.x += (targetTiltX - paddle1Rot.x) * (1 - Math.exp(-24 * dt));
  paddle1Rot.y += (targetTiltY - paddle1Rot.y) * (1 - Math.exp(-24 * dt));
  paddle1Rot.z += (targetTiltZ - paddle1Rot.z) * (1 - Math.exp(-24 * dt));

  sim.paddle1.pos = { ...paddle1Pos };
  sim.paddle1.vel = { ...paddle1Vel };
  sim.paddle1.rot = { ...paddle1Rot };

  ai.update(dt, sim.ball, sim.paddle2);
  const res = sim.step(dt, SUB_STEPS);

  for (const snd of res.soundEvents) {
    if (snd.type === 'paddle_hit') {
      hitCount++;
      console.log(`[Frame ${frame}] HIT #${hitCount} by ${sim.ball.lastHitter}! pos: (${sim.ball.pos.x.toFixed(2)}, ${sim.ball.pos.y.toFixed(2)}, ${sim.ball.pos.z.toFixed(2)})`);
    } else if (snd.type === 'table_hit') {
      bounceCount++;
      const side = sim.ball.pos.z > 0 ? 'P1 side' : 'P2 side';
      console.log(`[Frame ${frame}] Bounce #${bounceCount} on ${side} at z = ${sim.ball.pos.z.toFixed(2)}`);
    }
  }

  if (res.pointEnded) {
    console.log(`[Frame ${frame}] Point ended! Winner: ${res.pointWinner} (${res.pointReason})`);
    break;
  }
}

console.log(`\nTotal hits: ${hitCount}, Total bounces: ${bounceCount}`);
