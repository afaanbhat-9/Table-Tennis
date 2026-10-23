import { PhysicsSimulation } from '../shared/physics.js';
import { TABLE_HEIGHT, NET_Y_TOP, SUB_STEPS, PADDLE_RADIUS, PADDLE_HITBOX_RADIUS, PLAYER_PADDLE_Z, OPPONENT_PADDLE_Z } from '../shared/constants.js';

console.log('=== TESTING NEW PHYSICS & PADDLE TILT IMPLEMENTATION ===');

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

    // Dynamic Net Clearance & Return Arc:
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

    // Bat tilt and vertical stroke influences
    const tiltInfluence = normal.y * 3.2;
    const strokeInfluence = Math.max(-0.4, Math.min(1.2, paddle.vel.y * 0.30));
    let newVy = targetVyForLanding + tiltInfluence + strokeInfluence;

    // Net clearance guarantee: ball clears net cleanly onto opponent court
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

const testCases = [
  {
    name: 'Off-center hit (dx = 0.13m, outer edge)',
    isP1: true,
    ball: { x: 0.13, y: 0.88, z: 1.45, vx: 0, vy: -0.2, vz: 4.8 },
    paddle: { x: 0.0, y: 0.88, z: 1.50, vx: 0.5, vy: 0.2, vz: -0.8, rx: 0.02, ry: 0.05, rz: -0.2 }
  },
  {
    name: 'Fast horizontal swipe (paddle.vel.x = 4.8 m/s)',
    isP1: true,
    ball: { x: 0.0, y: 0.90, z: 1.45, vx: 0, vy: -0.2, vz: 4.8 },
    paddle: { x: 0.0, y: 0.90, z: 1.50, vx: 4.8, vy: 0.2, vz: -0.8, rx: 0.0, ry: 0.05, rz: -0.2 }
  },
  {
    name: 'Forward reach over table (Z = 1.15m, low ball Y = 0.82m)',
    isP1: true,
    ball: { x: 0.0, y: 0.82, z: 1.10, vx: 0, vy: -0.4, vz: 4.2 },
    paddle: { x: 0.0, y: 0.82, z: 1.15, vx: 0.0, vy: 0.1, vz: -0.5, rx: 0.04, ry: 0.0, rz: -0.2 }
  },
  {
    name: 'Low ball below net (Y = 0.80m, Z = 1.55m)',
    isP1: true,
    ball: { x: 0.0, y: 0.80, z: 1.50, vx: 0, vy: -0.8, vz: 4.0 },
    paddle: { x: 0.0, y: 0.80, z: 1.55, vx: 0.0, vy: 0.2, vz: -0.6, rx: 0.05, ry: 0.0, rz: -0.2 }
  },
  {
    name: 'High ball above net (Y = 1.12m, Z = 1.55m, smash/topspin)',
    isP1: true,
    ball: { x: 0.0, y: 1.12, z: 1.50, vx: 0, vy: 0.2, vz: 4.5 },
    paddle: { x: 0.0, y: 1.12, z: 1.55, vx: 0.0, vy: 0.4, vz: -1.2, rx: -0.10, ry: 0.0, rz: -0.2 }
  },
  {
    name: 'Bat angled slightly upward (+0.08 rad)',
    isP1: true,
    ball: { x: 0.0, y: 0.86, z: 1.45, vx: 0, vy: -0.3, vz: 4.5 },
    paddle: { x: 0.0, y: 0.86, z: 1.50, vx: 0.0, vy: 0.2, vz: -0.8, rx: 0.08, ry: 0.0, rz: -0.2 }
  },
  {
    name: 'Bat angled slightly downward (-0.12 rad)',
    isP1: true,
    ball: { x: 0.0, y: 0.98, z: 1.45, vx: 0, vy: -0.2, vz: 4.5 },
    paddle: { x: 0.0, y: 0.98, z: 1.50, vx: 0.0, vy: 0.2, vz: -0.8, rx: -0.12, ry: 0.0, rz: -0.2 }
  },
  {
    name: 'Player 2 (Opponent) forehand return',
    isP1: false,
    ball: { x: 0.1, y: 0.90, z: -1.45, vx: 0, vy: -0.2, vz: -4.8 },
    paddle: { x: 0.1, y: 0.90, z: -1.50, vx: 0.2, vy: 0.3, vz: 0.8, rx: 0.10, ry: -0.15, rz: 0.18 }
  }
];

let allPassed = true;

for (const tc of testCases) {
  const sim = new PhysicsSimulation();
  const hitter = tc.isP1 ? 'player1' : 'player2';
  const opponent = tc.isP1 ? 'player2' : 'player1';

  sim.ball.pos = { ...tc.ball };
  sim.ball.vel = { x: tc.ball.vx, y: tc.ball.vy, z: tc.ball.vz };
  sim.ball.lastHitter = opponent;
  sim.ball.lastBounceSide = hitter;
  sim.ball.bounceCountCurrentSide = 1;
  sim.ball.active = true;

  const paddle = tc.isP1 ? sim.paddle1 : sim.paddle2;
  paddle.pos = { x: tc.paddle.x, y: tc.paddle.y, z: tc.paddle.z };
  paddle.vel = { x: tc.paddle.vx, y: tc.paddle.vy, z: tc.paddle.vz };
  paddle.rot = { x: tc.paddle.rx, y: tc.paddle.ry, z: tc.paddle.rz };

  let hitDetected = false;
  let firstBounceZ: number | null = null;
  let firstBounceSide: string | null = null;

  for (let f = 0; f < 60; f++) {
    const res = sim.step(1/60, SUB_STEPS);
    for (const snd of res.soundEvents) {
      if (snd.type === 'paddle_hit' && !hitDetected) {
        hitDetected = true;
      } else if (snd.type === 'table_hit' && hitDetected && firstBounceZ === null) {
        firstBounceZ = sim.ball.pos.z;
        firstBounceSide = sim.ball.pos.z > 0 ? 'player1' : 'player2';
      }
    }
    if (firstBounceZ !== null) break;
  }

  const expectedBounceSide = tc.isP1 ? 'player2' : 'player1';
  const success = hitDetected && firstBounceSide === expectedBounceSide;
  if (!success) allPassed = false;

  console.log(`[${success ? 'PASS' : 'FAIL'}] ${tc.name}`);
  console.log(`  Hit: ${hitDetected}, First bounce on: ${firstBounceSide} (z=${firstBounceZ?.toFixed(2)}), Expected: ${expectedBounceSide}`);
}

console.log(`\nAll scenarios passed: ${allPassed}`);
