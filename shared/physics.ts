import {
  BALL_RADIUS,
  TABLE_HEIGHT,
  TABLE_MIN_X,
  TABLE_MAX_X,
  TABLE_MIN_Z,
  TABLE_MAX_Z,
  NET_HEIGHT,
  NET_WIDTH,
  NET_Y_TOP,
  GRAVITY,
  AIR_DRAG,
  TABLE_RESTITUTION,
  PADDLE_RESTITUTION,
  NET_RESTITUTION,
  PADDLE_RADIUS,
  PADDLE_HITBOX_RADIUS,
  PADDLE_THICKNESS,
  PLAYER_PADDLE_Z,
  OPPONENT_PADDLE_Z,
  MAGNUS_COEFFICIENT,
  MAX_SPIN,
  SPIN_AIR_DECAY,
  SPIN_BOUNCE_DECAY,
  SPIN_BOUNCE_FRICTION,
  MIN_SERVE_RELEASE_SPEED,
  SERVE_BALL_OFFSET_Z,
  SERVE_BALL_OFFSET_Y,
  SERVE_TOSS_VELOCITY,
  SERVE_MIN_TOSS_RISE,
  PADDLE_CONTACT_COOLDOWN,
  PADDLE_FRICTION
} from './constants.js';
import {
  BallState,
  PaddleState,
  PlayerSide,
  SoundEvent,
  Vector3D
} from './types.js';

export interface PhysicsStepResult {
  ball: BallState;
  pointEnded: boolean;
  pointWinner?: PlayerSide;
  pointReason?: string;
  isLet?: boolean;
  soundEvents: SoundEvent[];
}

export class PhysicsSimulation {
  public ball: BallState;
  public paddle1: PaddleState;
  public paddle2: PaddleState;

  // Contact debouncing cooldowns (seconds)
  private p1Cooldown: number = 0;
  private p2Cooldown: number = 0;

  // Serve toss apex tracking for ITTF 16cm height validation
  private serveTossStartY: number = 0;
  private serveTossMaxY: number = 0;
  public serveTargetX: number | null = null;

  constructor() {
    this.ball = this.createDefaultBall();
    this.paddle1 = {
      pos: { x: 0, y: TABLE_HEIGHT + 0.12, z: PLAYER_PADDLE_Z },
      vel: { x: 0, y: 0, z: 0 },
      rot: { x: -0.12, y: 0, z: 0 }
    };
    this.paddle2 = {
      pos: { x: 0, y: TABLE_HEIGHT + 0.12, z: OPPONENT_PADDLE_Z },
      vel: { x: 0, y: 0, z: 0 },
      rot: { x: 0.12, y: 0, z: 0 }
    };
  }

  public createDefaultBall(): BallState {
    return {
      pos: { x: 0, y: TABLE_HEIGHT + 0.22, z: 1.20 },
      vel: { x: 0, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
      serveState: 'in_play',
      lastHitter: null,
      bounceCountCurrentSide: 0,
      lastBounceSide: null,
      hasBouncedOnServerSide: false,
      hasBouncedOnReceiverSide: false,
      isServe: false,
      active: false,
      netTouched: false
    };
  }

  /**
   * Prepares a legal serve stance above the server's table half.
   * The ball rests in the server's hand/in front of the paddle.
   */
  public prepareServe(server: PlayerSide, serveX?: number, serveTargetX?: number): void {
    this.serveTargetX = serveTargetX !== undefined ? serveTargetX : null;
    const isP1 = server === 'player1';
    const startX = serveX !== undefined ? serveX : 0.12 * (Math.random() - 0.5);
    const startY = TABLE_HEIGHT + 0.14;
    const paddleZ = isP1 ? PLAYER_PADDLE_Z : OPPONENT_PADDLE_Z;
    const dirZ = isP1 ? -1 : 1;
    const startZ = paddleZ + dirZ * SERVE_BALL_OFFSET_Z;

    this.ball = {
      pos: { x: startX, y: startY + SERVE_BALL_OFFSET_Y, z: startZ },
      vel: { x: 0, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
      serveState: 'held',
      lastHitter: server,
      bounceCountCurrentSide: 0,
      lastBounceSide: null,
      hasBouncedOnServerSide: false,
      hasBouncedOnReceiverSide: false,
      isServe: true,
      active: true,
      netTouched: false
    };

    if (isP1) {
      this.paddle1.pos = { x: startX, y: startY, z: PLAYER_PADDLE_Z };
      this.paddle1.vel = { x: 0, y: 0, z: 0 };
    } else {
      this.paddle2.pos = { x: startX, y: startY, z: OPPONENT_PADDLE_Z };
      this.paddle2.vel = { x: 0, y: 0, z: 0 };
    }

    this.p1Cooldown = 0;
    this.p2Cooldown = 0;
    this.serveTossStartY = this.ball.pos.y;
    this.serveTossMaxY = this.ball.pos.y;
    this.updateServeBall(server);
  }

  /**
   * Initiates authentic ITTF legal upward ball toss from stationary hand.
   * Rises >= 16cm under gravity before descending to be struck.
   */
  public tossServe(server: PlayerSide): SoundEvent | null {
    if (!this.ball.isServe || this.ball.serveState !== 'held') return null;

    this.ball.serveState = 'tossed';
    this.ball.vel = { x: 0, y: SERVE_TOSS_VELOCITY, z: 0 };
    this.ball.spin = { x: 0, y: 0, z: 0 };
    this.serveTossStartY = this.ball.pos.y;
    this.serveTossMaxY = this.ball.pos.y;

    return {
      type: 'toss',
      intensity: 0.7,
      pos: { ...this.ball.pos }
    };
  }

  /**
   * Smoothly updates held serve ball position relative to server paddle.
   */
  public updateServeBall(server: PlayerSide): void {
    if (!this.ball.isServe || this.ball.serveState !== 'held') return;

    const paddle = server === 'player1' ? this.paddle1 : this.paddle2;
    const dirZ = server === 'player1' ? -1 : 1;

    this.ball.pos.x = paddle.pos.x;
    this.ball.pos.y = Math.max(TABLE_HEIGHT + BALL_RADIUS + 0.05, paddle.pos.y + SERVE_BALL_OFFSET_Y);
    this.ball.pos.z = paddle.pos.z + dirZ * SERVE_BALL_OFFSET_Z;
    this.ball.vel.x = paddle.vel.x;
    this.ball.vel.y = paddle.vel.y;
    this.ball.vel.z = paddle.vel.z;
    this.ball.active = true;
  }

  /**
   * Hits a regulation serve: strikes downward onto server's half first,
   * rebounding over the net onto receiver's half.
   */
  public launchServe(server: PlayerSide, targetX: number = 0, speedMultiplier: number = 1.0): void {
    const isP1 = server === 'player1';
    const dirZ = isP1 ? -1 : 1;
    const forwardSpeed = (4.75 + (Math.random() - 0.5) * 0.15) * speedMultiplier;
    const targetZ1 = isP1 ? 0.95 : -0.95;
    const t1 = Math.max(0.08, Math.abs(this.ball.pos.z - targetZ1) / forwardSpeed);
    const tBounceToNet = Math.abs(targetZ1) / forwardSpeed;

    // Net clearance trajectory calculation:
    // First bounce on server court -> arcs over net tape with 4.8cm clearance -> lands safely in receiver court
    const tableSurfaceY = TABLE_HEIGHT + BALL_RADIUS;
    const targetNetY = NET_Y_TOP + BALL_RADIUS + 0.048; // 4.8cm clearance above ball-net contact threshold
    const requiredReboundVy = (targetNetY - tableSurfaceY + 0.5 * (GRAVITY + 0.5) * tBounceToNet * tBounceToNet) / tBounceToNet;
    const requiredImpactVy = requiredReboundVy / TABLE_RESTITUTION;
    const vy = -(requiredImpactVy - GRAVITY * t1);

    const receiverTargetZ = isP1 ? -0.85 : 0.85;
    const effectiveTargetX = targetX !== 0 ? targetX : (isP1 ? 0 : (Math.random() > 0.5 ? 0.38 : -0.38));
    const tTotal = Math.abs((this.ball.pos.z - receiverTargetZ) / forwardSpeed);
    const rawVx = (effectiveTargetX - this.ball.pos.x) / (tTotal || 0.44);
    const sideSpeed = Math.max(-0.45 * forwardSpeed, Math.min(0.45 * forwardSpeed, rawVx * 0.75));

    this.ball.vel = {
      x: sideSpeed,
      y: vy,
      z: dirZ * forwardSpeed
    };
    this.ball.spin = {
      x: 0,
      y: (effectiveTargetX - this.ball.pos.x) * 6.0,
      z: 0
    };
    this.ball.lastHitter = server;
    this.ball.isServe = true;
    this.ball.serveState = 'in_play';
    this.ball.hasBouncedOnServerSide = false;
    this.ball.hasBouncedOnReceiverSide = false;
    this.ball.active = true;
    this.ball.netTouched = false;
  }

  /**
   * Fixed-timestep numerical integration and continuous swept collision resolution.
   */
  public step(dt: number, subSteps: number = 4): PhysicsStepResult {
    const soundEvents: SoundEvent[] = [];

    // Decrement contact cooldowns
    if (this.p1Cooldown > 0) this.p1Cooldown = Math.max(0, this.p1Cooldown - dt);
    if (this.p2Cooldown > 0) this.p2Cooldown = Math.max(0, this.p2Cooldown - dt);

    // 1. Handle held serve state
    if (this.ball.isServe && this.ball.serveState === 'held') {
      const server = this.ball.lastHitter || 'player1';
      this.updateServeBall(server);

      // Check if server initiates strike or forward swing
      const paddle = server === 'player1' ? this.paddle1 : this.paddle2;
      const dirZ = server === 'player1' ? -1 : 1;
      const forwardStroke = dirZ * paddle.vel.z;
      const totalPaddleSpeed = Math.hypot(paddle.vel.x, paddle.vel.y, paddle.vel.z);
      const isDeliberateStroke = paddle.isSwinging || forwardStroke >= 0.08 || (totalPaddleSpeed >= 0.22 && forwardStroke >= 0.03);

      if (isDeliberateStroke) {
        const hit = this.checkPaddleCollision(paddle, server);
        if (hit.collided) {
          if (server === 'player1') {
            this.p1Cooldown = PADDLE_CONTACT_COOLDOWN;
          } else {
            this.p2Cooldown = PADDLE_CONTACT_COOLDOWN;
          }
          soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...this.ball.pos } });
          return { ball: this.ball, pointEnded: false, soundEvents };
        }
      }

      return { ball: this.ball, pointEnded: false, soundEvents };
    }

    if (!this.ball.active) {
      return { ball: this.ball, pointEnded: false, soundEvents };
    }

    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      const stepResult = this.subStep(subDt);

      for (const snd of stepResult.soundEvents) {
        soundEvents.push(snd);
      }

      if (stepResult.isLet) {
        return {
          ball: this.ball,
          pointEnded: false,
          isLet: true,
          pointReason: 'Service Let (Ball touched net and landed in court)',
          soundEvents
        };
      }

      if (stepResult.pointEnded) {
        return {
          ball: this.ball,
          pointEnded: true,
          pointWinner: stepResult.pointWinner,
          pointReason: stepResult.pointReason,
          soundEvents
        };
      }
    }

    return {
      ball: this.ball,
      pointEnded: false,
      soundEvents
    };
  }

  private subStep(dt: number): {
    pointEnded: boolean;
    pointWinner?: PlayerSide;
    pointReason?: string;
    isLet?: boolean;
    soundEvents: SoundEvent[];
  } {
    const soundEvents: SoundEvent[] = [];
    const b = this.ball;

    // Track toss apex and strike during serve toss
    if (b.isServe && b.serveState === 'tossed') {
      if (b.pos.y > this.serveTossMaxY) {
        this.serveTossMaxY = b.pos.y;
      }

      // Check server strike during toss
      const server = b.lastHitter || 'player1';
      const paddle = server === 'player1' ? this.paddle1 : this.paddle2;
      const hit = this.checkPaddleCollision(paddle, server);
      if (hit.collided) {
        soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...b.pos } });
        if (server === 'player1') {
          this.p1Cooldown = PADDLE_CONTACT_COOLDOWN;
        } else {
          this.p2Cooldown = PADDLE_CONTACT_COOLDOWN;
        }
        return { pointEnded: false, soundEvents };
      }

      // If toss fell back down below table without being struck -> Service Fault!
      if (b.pos.y < TABLE_HEIGHT + BALL_RADIUS && b.vel.y < 0) {
        const winner: PlayerSide = server === 'player1' ? 'player2' : 'player1';
        return {
          pointEnded: true,
          pointWinner: winner,
          pointReason: 'Service Fault (Missed serve toss)',
          soundEvents
        };
      }
    }

    // 1. Aerodynamic drag, Gravity, and 3D Vector Magnus force integration
    if (!b.spin) {
      b.spin = { x: 0, y: 0, z: 0 };
    }

    // Magnus aerodynamic curve force: F_magnus = magnusStrength * cross(ω, v)
    // - Topspin (spin.x > 0) dips the ball downward into table faster
    // - Backspin (spin.x < 0) creates upward aerodynamic lift so ball floats longer
    // - Sidespin (spin.y) curves the ball left/right across table
    const fMagnusX = -MAGNUS_COEFFICIENT * (b.spin.y * b.vel.z - (b.spin.z || 0) * b.vel.y);
    const fMagnusY = -MAGNUS_COEFFICIENT * b.spin.x * Math.abs(b.vel.z);
    const fMagnusZ = -MAGNUS_COEFFICIENT * (b.spin.x * b.vel.y - b.spin.y * b.vel.x);

    // Apply Magnus force and Gravity acceleration (g = -9.81)
    b.vel.x += fMagnusX * dt;
    b.vel.y += (fMagnusY - GRAVITY) * dt;
    b.vel.z += fMagnusZ * dt;

    // Air Resistance (Drag): slow ball gradually in flight: v = v * (1 - 0.15 * dt)
    const dragFactor = Math.max(0, 1.0 - AIR_DRAG * dt); // AIR_DRAG = 0.15
    b.vel.x *= dragFactor;
    b.vel.y *= dragFactor;
    b.vel.z *= dragFactor;

    // Decay spin in air
    const spinDamp = Math.max(0, 1.0 - SPIN_AIR_DECAY * dt);
    b.spin.x *= spinDamp;
    b.spin.y *= spinDamp;
    b.spin.z *= spinDamp;

    // Play corridor boundary constraint: allow generous room for curving shots and angled returns
    const maxPlaySideX = TABLE_MAX_X + 0.55; // ~1.31m
    if (Math.abs(b.pos.x) > maxPlaySideX) {
      b.vel.x += -Math.sign(b.pos.x) * 4.5 * dt;
    }

    const prevPos: Vector3D = { ...b.pos };
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    b.pos.z += b.vel.z * dt;

    // 2. Swept Continuous Table Surface Collision (Anti-Tunneling line segment)
    const surfaceY = TABLE_HEIGHT + BALL_RADIUS;
    const crossedTablePlane = (prevPos.y >= surfaceY && b.pos.y <= surfaceY) ||
      (b.pos.y <= surfaceY && b.pos.y >= TABLE_HEIGHT - 0.08 && b.vel.y < 0);

    if (crossedTablePlane) {
      // Swept impact fraction along line segment between previousBallPosition and currentBallPosition
      const dy = b.pos.y - prevPos.y;
      const tImpact = Math.abs(dy) > 1e-6 ? Math.max(0, Math.min(1, (surfaceY - prevPos.y) / dy)) : 0;
      const impactX = prevPos.x + tImpact * (b.pos.x - prevPos.x);
      const impactZ = prevPos.z + tImpact * (b.pos.z - prevPos.z);

      // Verify contact is within table playing surface
      const onTableX = impactX >= TABLE_MIN_X - BALL_RADIUS * 0.7 && impactX <= TABLE_MAX_X + BALL_RADIUS * 0.7;
      const onTableZ = impactZ >= TABLE_MIN_Z - BALL_RADIUS * 0.7 && impactZ <= TABLE_MAX_Z + BALL_RADIUS * 0.7;

      if (onTableX && onTableZ) {
        // Table Bounce Resolution: invert vertical velocity with restitution: v.y = -v.y * 0.85
        b.pos.y = surfaceY;
        b.vel.y = Math.abs(b.vel.y) * TABLE_RESTITUTION;

        // Spin transfer on bounce (mimicking real-world table tennis spin-kick):
        // Topspin accelerates the ball forward; backspin slows it down
        const flightDirZ = b.vel.z > 0 ? 1 : -1;
        const spinKickZ = flightDirZ * (b.spin.x * 0.0025);
        b.vel.z = b.vel.z * 0.96 + spinKickZ;
        // Sidespin kicks the ball laterally in the direction of the curve upon table contact
        const spinKickX = -flightDirZ * b.spin.y * SPIN_BOUNCE_FRICTION;
        b.vel.x = b.vel.x * 0.95 + spinKickX;

        // Decay spin by 20% (ω *= 0.8) on each bounce
        b.spin.x *= SPIN_BOUNCE_DECAY;
        b.spin.y *= SPIN_BOUNCE_DECAY;
        b.spin.z *= SPIN_BOUNCE_DECAY;

        soundEvents.push({
          type: 'table_hit',
          intensity: Math.min(1.0, Math.abs(b.vel.y) / 4.0),
          pos: { ...b.pos }
        });

        // Determine table half (Player 1 near side Z > 0, Player 2 far side Z < 0)
        const bounceSide: PlayerSide = b.pos.z > 0 ? 'player1' : 'player2';

        if (b.isServe) {
          const server = b.lastHitter;
          if (!b.hasBouncedOnServerSide) {
            if (bounceSide === server) {
              b.hasBouncedOnServerSide = true;
            } else {
              // Direct bounce on receiver's side without first hitting server's side -> Fault!
              const winner: PlayerSide = server === 'player1' ? 'player2' : 'player1';
              return {
                pointEnded: true,
                pointWinner: winner,
                pointReason: 'Service Fault (Missed server side)',
                soundEvents
              };
            }
          } else if (!b.hasBouncedOnReceiverSide) {
            const receiver = server === 'player1' ? 'player2' : 'player1';
            if (bounceSide === receiver) {
              // ITTF LET CHECK: If ball clipped net and landed legally on receiver's court
              if (b.netTouched) {
                b.isServe = true;
                b.serveState = 'held';
                b.hasBouncedOnServerSide = false;
                b.hasBouncedOnReceiverSide = false;
                b.netTouched = false;
                soundEvents.push({ type: 'let', intensity: 1.0, pos: { ...b.pos } });
                return {
                  pointEnded: false,
                  isLet: true,
                  pointReason: 'Service Let (Net clip, re-serve)',
                  soundEvents
                };
              }

              b.hasBouncedOnReceiverSide = true;
              b.isServe = false; // Serve legally in play!
              b.bounceCountCurrentSide = 1;
              b.lastBounceSide = receiver;
            } else {
              // Double bounce on server's half during serve
              const winner: PlayerSide = receiver;
              return {
                pointEnded: true,
                pointWinner: winner,
                pointReason: 'Service Fault (Double bounce on server side)',
                soundEvents
              };
            }
          }
        } else {
          // Rally Rules
          if (b.lastBounceSide === bounceSide) {
            b.bounceCountCurrentSide++;
            if (b.bounceCountCurrentSide >= 2) {
              // Double bounce on court!
              const winner: PlayerSide = bounceSide === 'player1' ? 'player2' : 'player1';
              return {
                pointEnded: true,
                pointWinner: winner,
                pointReason: 'Double Bounce',
                soundEvents
              };
            }
          } else {
            b.lastBounceSide = bounceSide;
            b.bounceCountCurrentSide = 1;
          }
        }
      }
    }

    // 3. Swept Net Collision & Tape Graze
    const crossedNet = (prevPos.z <= 0 && b.pos.z >= 0) || (prevPos.z >= 0 && b.pos.z <= 0);
    if (crossedNet) {
      const dz = b.pos.z - prevPos.z;
      const tNet = Math.abs(dz) > 1e-6 ? Math.max(0, Math.min(1, -prevPos.z / dz)) : 0;
      const netX = prevPos.x + tNet * (b.pos.x - prevPos.x);
      const netY = prevPos.y + tNet * (b.pos.y - prevPos.y);

      if (
        Math.abs(netX) <= NET_WIDTH / 2 &&
        netY >= TABLE_HEIGHT &&
        netY <= NET_Y_TOP + BALL_RADIUS
      ) {
        b.netTouched = true;

        if (netY >= NET_Y_TOP - 0.02) {
          // Net tape graze: slight slowdown, deflection over net
          b.vel.z *= 0.68;
          b.vel.y = Math.max(0.35, b.vel.y * 0.70);
          soundEvents.push({ type: 'net_hit', intensity: 0.5, pos: { ...b.pos } });
        } else {
          // Solid net hit: rebound backward
          b.pos.z = prevPos.z;
          b.vel.z = -b.vel.z * NET_RESTITUTION;
          b.vel.x *= 0.5;
          soundEvents.push({ type: 'net_hit', intensity: 0.85, pos: { ...b.pos } });
        }
      }
    }

    // 4. Swept Paddle Collision (Anti-Tunneling line segment)
    // Player 1 Paddle (Z > 0)
    if (this.p1Cooldown <= 0) {
      const isServeP1 = b.isServe && b.lastHitter === 'player1';
      const forwardStrokeP1 = -this.paddle1.vel.z;
      const totalSpeedP1 = Math.hypot(this.paddle1.vel.x, this.paddle1.vel.y, this.paddle1.vel.z);
      const canHitServeP1 = !isServeP1 || (this.paddle1.isSwinging || forwardStrokeP1 >= MIN_SERVE_RELEASE_SPEED || (totalSpeedP1 >= 0.22 && forwardStrokeP1 >= 0.03));
      const isApproachingP1 = b.vel.z > -0.5 || isServeP1;
      const crossesPlaneP1 = Math.max(b.pos.z, prevPos.z) >= this.paddle1.pos.z - 0.35;
      if (
        isApproachingP1 &&
        canHitServeP1 &&
        crossesPlaneP1
      ) {
        const hit = this.checkPaddleCollision(this.paddle1, 'player1', prevPos);
        if (hit.collided) {
          soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...b.pos } });

          // Volley check: If ball hasn't bounced on Player 1's side first
          const isBallAlreadyOut = Math.abs(b.pos.x) > TABLE_MAX_X || b.pos.z > TABLE_MAX_Z;
          if (!b.isServe && b.lastHitter === 'player2' && b.lastBounceSide !== 'player1') {
            if (isBallAlreadyOut) {
              return {
                pointEnded: true,
                pointWinner: 'player1',
                pointReason: 'Player 2 Out',
                soundEvents
              };
            } else {
              return {
                pointEnded: true,
                pointWinner: 'player2',
                pointReason: 'Illegal Volley (Hit before bounce)',
                soundEvents
              };
            }
          }

          b.lastHitter = 'player1';
          b.bounceCountCurrentSide = 0;
          b.lastBounceSide = null;
          b.netTouched = false;
          this.p1Cooldown = PADDLE_CONTACT_COOLDOWN;
        }
      }
    }

    // Player 2 Paddle (Z < 0)
    if (this.p2Cooldown <= 0) {
      const isServeP2 = b.isServe && b.lastHitter === 'player2';
      const forwardStrokeP2 = this.paddle2.vel.z;
      const totalSpeedP2 = Math.hypot(this.paddle2.vel.x, this.paddle2.vel.y, this.paddle2.vel.z);
      const canHitServeP2 = !isServeP2 || (this.paddle2.isSwinging || forwardStrokeP2 >= MIN_SERVE_RELEASE_SPEED || (totalSpeedP2 >= 0.22 && forwardStrokeP2 >= 0.03));
      const isApproachingP2 = b.vel.z < 0.5 || isServeP2;
      const crossesPlaneP2 = Math.min(b.pos.z, prevPos.z) <= this.paddle2.pos.z + 0.35;
      if (
        isApproachingP2 &&
        canHitServeP2 &&
        crossesPlaneP2
      ) {
        const hit = this.checkPaddleCollision(this.paddle2, 'player2', prevPos);
        if (hit.collided) {
          soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...b.pos } });

          // Volley check
          const isBallAlreadyOut = Math.abs(b.pos.x) > TABLE_MAX_X || b.pos.z < TABLE_MIN_Z;
          if (!b.isServe && b.lastHitter === 'player1' && b.lastBounceSide !== 'player2') {
            if (isBallAlreadyOut) {
              return {
                pointEnded: true,
                pointWinner: 'player2',
                pointReason: 'Player 1 Out',
                soundEvents
              };
            } else {
              return {
                pointEnded: true,
                pointWinner: 'player1',
                pointReason: 'Illegal Volley (Hit before bounce)',
                soundEvents
              };
            }
          }

          b.lastHitter = 'player2';
          b.bounceCountCurrentSide = 0;
          b.lastBounceSide = null;
          b.netTouched = false;
          this.p2Cooldown = PADDLE_CONTACT_COOLDOWN;
        }
      }
    }

    // 5. Out of bounds / Floor / Dead ball check
    if (b.pos.y < TABLE_HEIGHT - 0.28 || Math.abs(b.pos.z) > 3.0 || Math.abs(b.pos.x) > 2.4) {
      let winner: PlayerSide;
      let reason: string;

      if (!b.lastHitter) {
        winner = 'player2';
        reason = 'Ball Dead';
      } else {
        const hitter = b.lastHitter;
        const opponent: PlayerSide = hitter === 'player1' ? 'player2' : 'player1';

        if (b.lastBounceSide === opponent) {
          winner = hitter;
          reason = `${hitter === 'player1' ? 'Player 1' : 'Player 2'} Winner`;
        } else {
          winner = opponent;
          reason = `${hitter === 'player1' ? 'Player 1' : 'Player 2'} Out`;
        }
      }

      return {
        pointEnded: true,
        pointWinner: winner,
        pointReason: reason,
        soundEvents
      };
    }

    return {
      pointEnded: false,
      soundEvents
    };
  }

  /**
   * Calculates true 3D normal vector from paddle orientation Euler angles.
   */
  private getPaddleNormal(rot: Vector3D, isP1: boolean): Vector3D {
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
  }

  /**
   * Accurate 3D disk, swept anti-tunneling & relative velocity impulse collision with paddle.
   */
  private checkPaddleCollision(
    paddle: PaddleState,
    side: PlayerSide,
    prevPos?: Vector3D
  ): { collided: boolean; intensity: number } {
    const b = this.ball;
    const isP1 = side === 'player1';
    const dirZ = isP1 ? -1 : 1;

    const isServeToss = b.isServe && (b.serveState === 'tossed' || b.serveState === 'held');
    // Generous Hitbox for Player 1 (human player on 2D screen without VR depth perception):
    // Expanded collision radius (22cm) and depth thickness (38cm) guarantees that whenever you
    // visually line up the paddle with the ball on screen, contact connects cleanly and intuitively!
    const hitRadius = isP1 ? 0.22 : (isServeToss ? (SERVE_BALL_OFFSET_Y + 0.16) : PADDLE_HITBOX_RADIUS);
    const thickness = isP1 ? 0.38 : (isServeToss ? (SERVE_BALL_OFFSET_Z + 0.08) : 0.28);

    // Paddle disk center & offsets at current position
    let dx = b.pos.x - paddle.pos.x;
    let dy = b.pos.y - paddle.pos.y;
    let dz = b.pos.z - paddle.pos.z;

    // Height tolerance is relaxed (effectiveDy) so balls near the blade cleanly connect!
    const effectiveDy = dy * (isP1 ? 0.35 : 0.45);
    let radialDist = Math.hypot(dx, effectiveDy);
    let isHit = radialDist <= hitRadius && Math.abs(dz) <= thickness;

    // Swept segment check between previousBallPosition and currentBallPosition (Anti-Tunneling)
    if (!isHit && prevPos) {
      const segDz = b.pos.z - prevPos.z;
      if (Math.abs(segDz) > 1e-5) {
        const t = (paddle.pos.z - prevPos.z) / segDz;
        const tMin = isP1 ? -0.45 : -0.25;
        const tMax = isP1 ? 1.45 : 1.25;
        if (t >= tMin && t <= tMax) {
          const clampedT = Math.max(0, Math.min(1, t));
          const sweptX = prevPos.x + clampedT * (b.pos.x - prevPos.x);
          const sweptY = prevPos.y + clampedT * (b.pos.y - prevPos.y);
          const sweptRadial = Math.hypot(sweptX - paddle.pos.x, (sweptY - paddle.pos.y) * (isP1 ? 0.35 : 0.45));
          if (sweptRadial <= hitRadius) {
            isHit = true;
            b.pos.x = sweptX;
            b.pos.y = sweptY;
            b.pos.z = paddle.pos.z;
            dx = sweptX - paddle.pos.x;
            dy = sweptY - paddle.pos.y;
            dz = 0;
            radialDist = sweptRadial;
          }
        }
      }
    }

    if (isHit) {
      // 1. Handle Serve Strike
      if (b.isServe && b.lastHitter === side) {
        const forwardPaddleSpeed = Math.max(0, dirZ * paddle.vel.z);
        const totalPaddleSpeed = Math.hypot(paddle.vel.x, paddle.vel.y, paddle.vel.z);
        const isForwardStroke = paddle.isSwinging || forwardPaddleSpeed >= 0.08 || (totalPaddleSpeed >= 0.22 && forwardPaddleSpeed >= 0.03);

        if (!isForwardStroke) {
          return { collided: false, intensity: 0 };
        }

        // ITTF Law 2.6.5: Strike as ball is falling
        if (b.serveState === 'tossed' && b.vel.y > 0.15) {
          return { collided: false, intensity: 0 };
        }

        b.serveState = 'in_play';
        const forwardSpeed = Math.max(4.50, Math.min(5.10, 4.75 + forwardPaddleSpeed * 0.08));
        const sideBrush = paddle.vel.x;
        const sideSpin = dirZ === -1
          ? Math.max(-MAX_SPIN * 0.7, Math.min(MAX_SPIN * 0.7, (sideBrush * 24.0) + (dx / PADDLE_RADIUS) * 18.0))
          : Math.max(-MAX_SPIN * 0.7, Math.min(MAX_SPIN * 0.7, -(sideBrush * 24.0) - (dx / PADDLE_RADIUS) * 18.0));

        // Net clearance trajectory calculation:
        // Guarantees ball rebounds above net tape cleanly and lands safely in receiver court
        const targetZ1 = isP1 ? 0.95 : -0.95;
        const t1 = Math.max(0.08, Math.abs(b.pos.z - targetZ1) / forwardSpeed);
        const tBounceToNet = Math.abs(targetZ1) / forwardSpeed;
        const tableSurfaceY = TABLE_HEIGHT + BALL_RADIUS;
        const targetNetY = NET_Y_TOP + BALL_RADIUS + 0.048; // 4.8cm clearance above ball-net contact threshold
        const requiredReboundVy = (targetNetY - tableSurfaceY + 0.5 * (GRAVITY + 0.5) * tBounceToNet * tBounceToNet) / tBounceToNet;
        const requiredImpactVy = requiredReboundVy / TABLE_RESTITUTION;
        const vy = -(requiredImpactVy - GRAVITY * t1);

        // Aim serve dynamically across court (human aiming from blade/swipe; AI aiming across corners/angles/center)
        const receiverTargetZ = isP1 ? -0.85 : 0.85;
        let targetX: number;
        if (isP1) {
          targetX = (dx / PADDLE_RADIUS) * 0.45 + paddle.vel.x * 0.25;
        } else {
          // AI bot serve aiming: use selected serve target across court (left, right, center)
          if (this.serveTargetX !== null && this.serveTargetX !== undefined) {
            targetX = this.serveTargetX;
          } else {
            const targetSides = [-0.34, 0.34, -0.18, 0.18, 0.0];
            targetX = targetSides[Math.floor(Math.random() * targetSides.length)];
          }
        }
        targetX = Math.max(-0.54, Math.min(0.54, targetX));

        const tTotal = Math.abs((b.pos.z - receiverTargetZ) / forwardSpeed);
        const rawVx = (targetX - b.pos.x) / (tTotal || 0.44);
        const vx = Math.max(-0.45 * forwardSpeed, Math.min(0.45 * forwardSpeed, rawVx * 0.75 + paddle.vel.x * 0.15));

        b.vel.x = vx;
        b.vel.y = vy;
        b.vel.z = dirZ * forwardSpeed;
        b.spin = { x: 0, y: sideSpin, z: 0 };
        b.active = true;
        b.hasBouncedOnServerSide = false;
        b.hasBouncedOnReceiverSide = false;
        b.netTouched = false;

        return { collided: true, intensity: 0.85 };
      }

      // 2. Physical Relative Impulse for Rally Hits
      const normal = this.getPaddleNormal(paddle.rot, isP1);

      // Relative velocity: v_rel = v_ball - v_paddle
      const vRelX = b.vel.x - paddle.vel.x;
      const vRelY = b.vel.y - paddle.vel.y;
      const vRelZ = b.vel.z - paddle.vel.z;

      // Normal velocity component
      const vRelNormal = vRelX * normal.x + vRelY * normal.y + vRelZ * normal.z;

      // Tangential velocity component
      const vTangX = vRelX - vRelNormal * normal.x;
      const vTangY = vRelY - vRelNormal * normal.y;
      const vTangZ = vRelZ - vRelNormal * normal.z;

      // Rebound normal velocity with paddle elasticity (restitution e = 0.82)
      // Moving paddle provides forward surge
      const paddleNormalSpeed = paddle.vel.x * normal.x + paddle.vel.y * normal.y + paddle.vel.z * normal.z;
      const reboundNormalSpeed = Math.max(5.0, Math.min(10.5, Math.abs(vRelNormal) * PADDLE_RESTITUTION + Math.abs(paddleNormalSpeed) * 1.25));

      // Rebound tangential velocity with rubber friction grip
      const frictionGrip = 1.0 - PADDLE_FRICTION;
      const reboundTangX = vTangX * frictionGrip;
      const reboundTangY = vTangY * frictionGrip;
      const reboundTangZ = vTangZ * frictionGrip;

      // Simplified stroke calculation and calibrated return speed:
      // forwardStroke: deliberate forward push towards opponent
      // strokeIntensity: combined forward and lateral movement
      const forwardStroke = Math.max(0, dirZ * paddle.vel.z);
      const lateralStroke = Math.hypot(paddle.vel.x, paddle.vel.y);
      const strokeIntensity = forwardStroke + lateralStroke * 0.25;
      const isSmash = strokeIntensity >= 3.5 || paddle.isSwinging;

      let forwardSpeed: number;
      if (strokeIntensity < 0.35 && !paddle.isSwinging) {
        // Soft block / passive return: controlled, gentle pace
        forwardSpeed = 4.68;
      } else if (isSmash) {
        // Fast drive / smash: capped at 8.15 m/s
        forwardSpeed = Math.min(8.15, 5.50 + strokeIntensity * 0.40);
      } else {
        // Standard rally: relaxed, readable pace (~4.8 to 5.4 m/s)
        forwardSpeed = 4.80 + strokeIntensity * 0.28;
      }

      let newVz: number;
      if (isP1) {
        newVz = -forwardSpeed;
      } else {
        newVz = forwardSpeed;
      }

      // 1. Swipe Spin & Curving Shot physics (mimicking real-world table tennis):
      // Brushing laterally across the ball generates a clear, authentic curving arc (~12-16cm bend).
      // Brushing to the right curves to the right; brushing to the left curves to the left.
      const sideSpinDir = isP1 ? 1 : -1;
      const lateralBrush = paddle.vel.x;
      const offCenterBrush = (dx / PADDLE_RADIUS) * 12.0;
      const swipeSidespin = sideSpinDir * (lateralBrush * 18.0 + offCenterBrush);
      const spinY = Math.max(-110.0, Math.min(110.0, swipeSidespin));

      // Natural topspin dip keeps curving shots cleanly on the table
      const curveTopspin = Math.abs(spinY) * 0.28;
      const swipeTopspin = 24.0 + Math.max(-12.0, paddle.vel.y * 18.0) + curveTopspin;
      const spinX = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, swipeTopspin));

      b.spin = {
        x: spinX,
        y: spinY,
        z: 0
      };

      // 2. Dynamic Net Clearance & Landing Arc:
      const distToNet = Math.abs(b.pos.z);
      const avgForwardSpeed = forwardSpeed * 0.90; // account for aerodynamic drag deceleration
      const timeToNet = Math.max(0.10, Math.min(0.50, distToNet / (avgForwardSpeed || 1)));
      const effectiveG = GRAVITY + 2.0 + Math.max(0, spinX * MAGNUS_COEFFICIENT * forwardSpeed * 0.5);
      const targetNetHeight = NET_Y_TOP + 0.038; // 3.8cm clearance above net tape
      const minVyToClear = (targetNetHeight - b.pos.y + 0.5 * effectiveG * timeToNet * timeToNet) / timeToNet;

      // Opponent landing target Z
      const targetLandingZ = isP1 ? -0.88 : 0.88;
      const distToLanding = Math.abs(b.pos.z - targetLandingZ);
      const timeToLand = Math.max(0.25, Math.min(0.65, distToLanding / (avgForwardSpeed || 1)));
      const landingSurfaceY = TABLE_HEIGHT + BALL_RADIUS;
      const targetVyForLanding = (landingSurfaceY - b.pos.y + 0.5 * effectiveG * timeToLand * timeToLand) / timeToLand;

      // Launch vertical velocity combines landing arc with bat tilt and stroke:
      const tiltInfluence = normal.y * 3.2;
      const strokeInfluence = Math.max(-0.4, Math.min(1.2, paddle.vel.y * 0.30));
      let newVy = targetVyForLanding + tiltInfluence + strokeInfluence;

      if (isSmash || forwardSpeed >= 7.2) {
        newVy = Math.max(minVyToClear, Math.min(1.45, newVy));
      } else {
        const clampedMinVy = b.pos.y > (NET_Y_TOP + 0.12) ? Math.max(0.70, minVyToClear) : Math.max(1.60, minVyToClear);
        newVy = Math.max(clampedMinVy, Math.min(2.55, Math.max(clampedMinVy, newVy)));
      }

      // 3. Magnus Aerodynamic Lateral Curve Compensation:
      // F_magnusX = -MAGNUS_COEFFICIENT * (b.spin.y * b.vel.z)
      // For P1 (vel.z < 0): a_magnusX = MAGNUS_COEFFICIENT * spinY * forwardSpeed
      // For P2 (vel.z > 0): a_magnusX = -MAGNUS_COEFFICIENT * spinY * forwardSpeed
      const effectiveCurveAccel = -dirZ * MAGNUS_COEFFICIENT * spinY * forwardSpeed;
      const deltaXCurve = 0.5 * effectiveCurveAccel * (timeToLand * timeToLand);

      // 4. Opponent Court Landing Target (mimicking real-world table tennis curving shots):
      // Visible, natural curving arc that bends in flight and lands cleanly on table
      const curveSideBias = (isP1 ? 1 : -1) * Math.sign(spinY) * Math.min(0.24, Math.abs(spinY) * 0.0024);
      const strokeAim = (dx / PADDLE_RADIUS) * 0.12;
      const centering = b.pos.x * 0.25;
      let desiredLandingX = Math.max(-0.52, Math.min(0.52, centering + curveSideBias + strokeAim));

      if (!isP1) {
        // AI return realism: off-center contact when stretched creates authentic unforced errors
        const offCenterDist = Math.max(0, radialDist - 0.05);
        if (offCenterDist > 0.025) {
          const errorSign = (dx !== 0 ? Math.sign(dx) : (Math.random() > 0.5 ? 1 : -1));
          desiredLandingX += errorSign * offCenterDist * 2.2;
          // When severely stretched, occasional net clip or long ball
          if (offCenterDist > 0.055 && Math.random() < 0.28) {
            newVy += (Math.random() > 0.5 ? 0.30 : -0.42);
          }
        }
      }

      // Initial Vx: Compensates for aerodynamic curve displacement so the natural curve lands cleanly on the table!
      let newVx = (desiredLandingX - b.pos.x - deltaXCurve) / timeToLand;
      newVx = Math.max(-1.8, Math.min(1.8, newVx));
      newVx = Math.max(-1.45, Math.min(1.45, newVx));

      b.vel.x = Math.max(-2.2, Math.min(2.2, newVx));
      b.vel.y = newVy;
      b.vel.z = newVz;

      // Anti-tunneling displacement in front of blade
      b.pos.z = paddle.pos.z + normal.z * (BALL_RADIUS + 0.02);

      const intensity = Math.min(1.0, Math.hypot(b.vel.x, b.vel.y, b.vel.z) / 9.5);
      return { collided: true, intensity };
    }

    return { collided: false, intensity: 0 };
  }
}
