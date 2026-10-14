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
  PADDLE_THICKNESS,
  PLAYER_PADDLE_Z,
  OPPONENT_PADDLE_Z
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
  soundEvents: SoundEvent[];
}

export class PhysicsSimulation {
  public ball: BallState;
  public paddle1: PaddleState;
  public paddle2: PaddleState;

  constructor() {
    this.ball = this.createDefaultBall();
    this.paddle1 = {
      pos: { x: 0, y: TABLE_HEIGHT + 0.16, z: PLAYER_PADDLE_Z },
      vel: { x: 0, y: 0, z: 0 },
      rot: { x: 0, y: 0, z: 0 }
    };
    this.paddle2 = {
      pos: { x: 0, y: TABLE_HEIGHT + 0.16, z: OPPONENT_PADDLE_Z },
      vel: { x: 0, y: 0, z: 0 },
      rot: { x: 0, y: 0, z: 0 }
    };
  }

  public createDefaultBall(): BallState {
    return {
      pos: { x: 0, y: TABLE_HEIGHT + 0.22, z: 1.20 },
      vel: { x: 0, y: 0, z: 0 },
      lastHitter: null,
      bounceCountCurrentSide: 0,
      lastBounceSide: null,
      hasBouncedOnServerSide: false,
      hasBouncedOnReceiverSide: false,
      isServe: true,
      active: false
    };
  }

  /**
   * Prepares a legal serve position above the server's table half.
   */
  public prepareServe(server: PlayerSide): void {
    const isP1 = server === 'player1';
    const startZ = isP1 ? 1.20 : -1.20;
    const startY = TABLE_HEIGHT + 0.22;
    const startX = 0.12 * (Math.random() - 0.5);

    this.ball = {
      pos: { x: startX, y: startY, z: startZ },
      vel: { x: 0, y: 0, z: 0 },
      lastHitter: server,
      bounceCountCurrentSide: 0,
      lastBounceSide: null,
      hasBouncedOnServerSide: false,
      hasBouncedOnReceiverSide: false,
      isServe: true,
      active: false
    };

    // Position server's paddle behind the ball
    if (isP1) {
      this.paddle1.pos = { x: startX, y: startY, z: PLAYER_PADDLE_Z };
    } else {
      this.paddle2.pos = { x: startX, y: startY, z: OPPONENT_PADDLE_Z };
    }
  }

  /**
   * Hits the serve legally: strikes downwards onto server's own table half first.
   */
  public launchServe(server: PlayerSide, targetX: number = 0, speedMultiplier: number = 1.0): void {
    const isP1 = server === 'player1';
    const dirZ = isP1 ? -1 : 1;

    // Real table tennis serve: strikes downwards onto server's side first (~0.4m in front)
    // Rebounds over the net and onto receiver's table half
    const forwardSpeed = (4.4 + Math.random() * 0.6) * speedMultiplier;
    const downwardSpeed = -1.8 - Math.random() * 0.3;
    const sideSpeed = (targetX - this.ball.pos.x) * 1.3;

    this.ball.vel = {
      x: sideSpeed,
      y: downwardSpeed,
      z: dirZ * forwardSpeed
    };
    this.ball.lastHitter = server;
    this.ball.isServe = true;
    this.ball.hasBouncedOnServerSide = false;
    this.ball.hasBouncedOnReceiverSide = false;
    this.ball.active = true;
  }

  /**
   * Substepped numerical integration and collision detection.
   */
  public step(dt: number, subSteps: number = 4): PhysicsStepResult {
    const soundEvents: SoundEvent[] = [];
    if (!this.ball.active) {
      // During active serve stance, check if the server swung their paddle into the ball
      if (this.ball.isServe && this.ball.lastHitter) {
        const server = this.ball.lastHitter;
        const paddle = server === 'player1' ? this.paddle1 : this.paddle2;
        const hit = this.checkPaddleCollision(paddle, server);
        if (hit.collided) {
          soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...this.ball.pos } });
          return { ball: this.ball, pointEnded: false, soundEvents };
        }
      }
      return { ball: this.ball, pointEnded: false, soundEvents };
    }

    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      const stepResult = this.subStep(subDt);

      for (const snd of stepResult.soundEvents) {
        soundEvents.push(snd);
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
    soundEvents: SoundEvent[];
  } {
    const soundEvents: SoundEvent[] = [];
    const b = this.ball;

    // 1. Gravity and drag integration
    const speed = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
    const drag = AIR_DRAG * speed;
    b.vel.x -= b.vel.x * drag * dt;
    b.vel.y -= (GRAVITY + b.vel.y * drag) * dt;
    b.vel.z -= b.vel.z * drag * dt;

    const prevPos: Vector3D = { ...b.pos };
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    b.pos.z += b.vel.z * dt;

    // 2. Collision with Table Surface
    const ballBottom = b.pos.y - BALL_RADIUS;
    const prevBallBottom = prevPos.y - BALL_RADIUS;

    if (
      (prevBallBottom >= TABLE_HEIGHT && ballBottom <= TABLE_HEIGHT) ||
      (ballBottom <= TABLE_HEIGHT && b.pos.y >= TABLE_HEIGHT - 0.05 && b.vel.y < 0)
    ) {
      // Check if within table boundaries
      if (
        b.pos.x >= TABLE_MIN_X - BALL_RADIUS &&
        b.pos.x <= TABLE_MAX_X + BALL_RADIUS &&
        b.pos.z >= TABLE_MIN_Z - BALL_RADIUS &&
        b.pos.z <= TABLE_MAX_Z + BALL_RADIUS
      ) {
        // Table bounce!
        b.pos.y = TABLE_HEIGHT + BALL_RADIUS;
        b.vel.y = -b.vel.y * TABLE_RESTITUTION;
        b.vel.x *= 0.96;
        b.vel.z *= 0.97;

        soundEvents.push({
          type: 'table_hit',
          intensity: Math.min(1.0, Math.abs(b.vel.y) / 4.0),
          pos: { ...b.pos }
        });

        // Determine which side of table it bounced on
        const bounceSide: PlayerSide = b.pos.z > 0 ? 'player1' : 'player2';

        if (b.isServe) {
          const server = b.lastHitter;
          if (!b.hasBouncedOnServerSide) {
            if (bounceSide === server) {
              b.hasBouncedOnServerSide = true;
            } else {
              // Direct bounce on wrong side during serve -> Fault!
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
              b.hasBouncedOnReceiverSide = true;
              b.isServe = false; // Serve is legally completed!
              b.bounceCountCurrentSide = 1;
              b.lastBounceSide = receiver;
            } else {
              // Double bounced on server side during serve
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
          // Rally rules
          if (b.lastBounceSide === bounceSide) {
            b.bounceCountCurrentSide++;
            if (b.bounceCountCurrentSide >= 2) {
              const winner: PlayerSide = bounceSide === 'player1' ? 'player2' : 'player1';
              return {
                pointEnded: true,
                pointWinner: winner,
                pointReason: 'Double Bounce',
                soundEvents
              };
            }
          } else {
            // Crossed to other side and bounced
            b.lastBounceSide = bounceSide;
            b.bounceCountCurrentSide = 1;
          }
        }
      }
    }

    // 3. Collision with Net
    const crossedNetPlane = (prevPos.z <= 0 && b.pos.z >= 0) || (prevPos.z >= 0 && b.pos.z <= 0);
    if (crossedNetPlane) {
      if (
        Math.abs(b.pos.x) <= NET_WIDTH / 2 &&
        b.pos.y >= TABLE_HEIGHT &&
        b.pos.y <= NET_Y_TOP + BALL_RADIUS
      ) {
        if (b.pos.y >= NET_Y_TOP - 0.02) {
          // Graze net tape: slight slowdown, deflection
          b.vel.z *= 0.65;
          b.vel.y = Math.max(0.4, b.vel.y * 0.7);
          soundEvents.push({ type: 'net_hit', intensity: 0.5, pos: { ...b.pos } });
        } else {
          // Solid net hit: bounce back
          b.pos.z = prevPos.z;
          b.vel.z = -b.vel.z * NET_RESTITUTION;
          b.vel.x *= 0.5;
          soundEvents.push({ type: 'net_hit', intensity: 0.8, pos: { ...b.pos } });
        }
      }
    }

    // 4. Collision with Paddles
    // Player 1 Paddle (Z > 0)
    // Check if relative motion closes the distance towards paddle
    const relSpeedP1 = b.vel.z - this.paddle1.vel.z;
    if (
      (relSpeedP1 > -0.5 || b.isServe) &&
      b.pos.z >= this.paddle1.pos.z - PADDLE_RADIUS - BALL_RADIUS - 0.08
    ) {
      const hit = this.checkPaddleCollision(this.paddle1, 'player1');
      if (hit.collided) {
        soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...b.pos } });

        // Volley check: If ball hasn't bounced on player 1's side first
        const isBallAlreadyOut = Math.abs(b.pos.x) > TABLE_MAX_X || b.pos.z > TABLE_MAX_Z + 0.15;
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
      }
    }

    // Player 2 Paddle (Z < 0)
    const relSpeedP2 = b.vel.z - this.paddle2.vel.z;
    if (
      (relSpeedP2 < 0.5 || b.isServe) &&
      b.pos.z <= this.paddle2.pos.z + PADDLE_RADIUS + BALL_RADIUS + 0.08
    ) {
      const hit = this.checkPaddleCollision(this.paddle2, 'player2');
      if (hit.collided) {
        soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...b.pos } });

        // Volley check
        const isBallAlreadyOut = Math.abs(b.pos.x) > TABLE_MAX_X || b.pos.z < TABLE_MIN_Z - 0.15;
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
      }
    }

    // 5. Out of bounds / Floor collision / Miss check
    if (b.pos.y < TABLE_HEIGHT - 0.25 || Math.abs(b.pos.z) > 2.8 || Math.abs(b.pos.x) > 2.2) {
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
   * Collision check between ball and paddle disk with dynamic swing impulse transfer.
   */
  private checkPaddleCollision(
    paddle: PaddleState,
    side: PlayerSide
  ): { collided: boolean; intensity: number } {
    const b = this.ball;
    const isP1 = side === 'player1';

    // Paddle disk center & dimensions
    const dx = b.pos.x - paddle.pos.x;
    const dy = b.pos.y - paddle.pos.y;
    const dz = b.pos.z - paddle.pos.z;

    const radialDist = Math.hypot(dx, dy);
    // Swept thickness window
    const thickness = PADDLE_THICKNESS + BALL_RADIUS + 0.08;

    if (radialDist <= PADDLE_RADIUS * 1.35 && Math.abs(dz) <= thickness) {
      const dirZ = isP1 ? -1 : 1;

      // Handle serve strike
      if (b.isServe && b.lastHitter === side) {
        b.vel.x = (dx / PADDLE_RADIUS) * 0.7 + paddle.vel.x * 0.25;
        b.vel.y = -1.8 + Math.max(-0.5, paddle.vel.y * 0.2);
        b.vel.z = dirZ * (4.5 + Math.abs(paddle.vel.z) * 0.2);
        b.active = true;
        b.hasBouncedOnServerSide = false;
        b.hasBouncedOnReceiverSide = false;
        return { collided: true, intensity: 0.85 };
      }

      // Rally strike: dynamic return speed based on paddle stroke & swing
      const forwardPaddleSpeed = Math.max(0, -dirZ * paddle.vel.z);
      const totalPaddleSpeed = Math.hypot(paddle.vel.x, paddle.vel.y, paddle.vel.z);

      // Fast swing produces faster return, gentle positioning produces gentle return
      const incomingSpeed = Math.abs(b.vel.z);
      const forwardBaseSpeed = 5.2 + forwardPaddleSpeed * 0.65 + incomingSpeed * 0.18;
      const clampedForwardSpeed = Math.min(11.2, Math.max(4.6, forwardBaseSpeed));

      // Controlled directional aim based on paddle contact offset and lateral swing
      const aimX = (dx / PADDLE_RADIUS) * 0.95 + paddle.vel.x * 0.35;
      const clampedAimX = Math.max(-2.2, Math.min(2.2, aimX));

      // Topspin arc / lift
      const aimY = 1.45 + (dy / PADDLE_RADIUS) * 0.5 + Math.max(0, paddle.vel.y * 0.35);
      const clampedAimY = Math.max(0.6, Math.min(3.2, aimY));

      b.vel.x = clampedAimX;
      b.vel.y = clampedAimY;
      b.vel.z = dirZ * clampedForwardSpeed;

      // Anti-tunneling displacement in front of paddle
      b.pos.z = paddle.pos.z + dirZ * (PADDLE_THICKNESS / 2 + BALL_RADIUS + 0.02);

      const intensity = Math.min(1.0, (clampedForwardSpeed + totalPaddleSpeed) / 10.0);
      return { collided: true, intensity };
    }

    return { collided: false, intensity: 0 };
  }
}
