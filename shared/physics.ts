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
      pos: { x: 0, y: TABLE_HEIGHT + 0.15, z: PLAYER_PADDLE_Z },
      vel: { x: 0, y: 0, z: 0 },
      rot: { x: 0, y: 0, z: 0 }
    };
    this.paddle2 = {
      pos: { x: 0, y: TABLE_HEIGHT + 0.15, z: OPPONENT_PADDLE_Z },
      vel: { x: 0, y: 0, z: 0 },
      rot: { x: 0, y: 0, z: 0 }
    };
  }

  public createDefaultBall(): BallState {
    return {
      pos: { x: 0, y: TABLE_HEIGHT + 0.35, z: PLAYER_PADDLE_Z - 0.2 },
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
   * Spawns a serve for either player1 or player2 with legal trajectory towards the other side.
   */
  public prepareServe(server: PlayerSide): void {
    const isP1 = server === 'player1';
    const startZ = isP1 ? PLAYER_PADDLE_Z - 0.25 : OPPONENT_PADDLE_Z + 0.25;
    const startY = TABLE_HEIGHT + 0.25;

    this.ball = {
      pos: { x: 0.15 * (Math.random() - 0.5), y: startY, z: startZ },
      vel: { x: 0, y: 0, z: 0 },
      lastHitter: server,
      bounceCountCurrentSide: 0,
      lastBounceSide: null,
      hasBouncedOnServerSide: false,
      hasBouncedOnReceiverSide: false,
      isServe: true,
      active: false
    };

    // Position paddle behind the ball
    if (isP1) {
      this.paddle1.pos = { x: this.ball.pos.x, y: startY, z: PLAYER_PADDLE_Z };
    } else {
      this.paddle2.pos = { x: this.ball.pos.x, y: startY, z: OPPONENT_PADDLE_Z };
    }
  }

  /**
   * Hits the serve into play
   */
  public launchServe(server: PlayerSide, targetX: number = 0, speedMultiplier: number = 1.0): void {
    const isP1 = server === 'player1';
    const dirZ = isP1 ? -1 : 1;
    // Ball needs to bounce on server's side first (~0.4m in front of server), then clear net and bounce on receiver side.
    const forwardSpeed = (5.5 + Math.random() * 1.0) * speedMultiplier;
    const upwardSpeed = 1.8 + Math.random() * 0.4;
    const sideSpeed = (targetX - this.ball.pos.x) * 1.8;

    this.ball.vel = {
      x: sideSpeed,
      y: upwardSpeed,
      z: dirZ * forwardSpeed
    };
    this.ball.lastHitter = server;
    this.ball.isServe = true;
    this.ball.hasBouncedOnServerSide = false;
    this.ball.hasBouncedOnReceiverSide = false;
    this.ball.active = true;
  }

  /**
   * Main step function. Uses substepping for robust swept collision detection.
   */
  public step(dt: number, subSteps: number = 4): PhysicsStepResult {
    const soundEvents: SoundEvent[] = [];
    if (!this.ball.active) {
      return { ball: this.ball, pointEnded: false, soundEvents };
    }

    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      const stepResult = this.subStep(subDt);

      // Collect sound events
      for (const snd of stepResult.soundEvents) {
        soundEvents.push(snd);
      }

      // If point ended in this substep, return immediately
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
        // Table surface slight friction
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
          // Serving rules: must bounce on server side first, then receiver side
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
              // Double bounce! Point goes to the opponent of bounceSide
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
    // Net is at z = 0, x from -NET_WIDTH/2 to NET_WIDTH/2, y from TABLE_HEIGHT to NET_Y_TOP
    const crossedNetPlane = (prevPos.z <= 0 && b.pos.z >= 0) || (prevPos.z >= 0 && b.pos.z <= 0);
    if (crossedNetPlane) {
      if (
        Math.abs(b.pos.x) <= NET_WIDTH / 2 &&
        b.pos.y >= TABLE_HEIGHT &&
        b.pos.y <= NET_Y_TOP + BALL_RADIUS
      ) {
        // Did it hit the very top tape (graze over)?
        if (b.pos.y >= NET_Y_TOP - 0.02) {
          // Graze net tape: slight slowdown, deflection
          b.vel.z *= 0.65;
          b.vel.y = Math.max(0.4, b.vel.y * 0.7);
          soundEvents.push({ type: 'net_hit', intensity: 0.5, pos: { ...b.pos } });
        } else {
          // Solid net hit: bounce back / fall down
          b.pos.z = prevPos.z;
          b.vel.z = -b.vel.z * NET_RESTITUTION;
          b.vel.x *= 0.5;
          soundEvents.push({ type: 'net_hit', intensity: 0.8, pos: { ...b.pos } });
        }
      }
    }

    // 4. Collision with Paddles
    // Player 1 Paddle (Z > 0, hits towards negative Z)
    if (b.vel.z > 0 && b.pos.z >= this.paddle1.pos.z - PADDLE_RADIUS - BALL_RADIUS) {
      const hit = this.checkPaddleCollision(this.paddle1, 'player1');
      if (hit.collided) {
        soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...b.pos } });

        // Volley check: If ball hasn't bounced on player 1's side first (and it wasn't player 1 serving), it's an illegal volley!
        if (!b.isServe && b.lastHitter === 'player2' && b.lastBounceSide !== 'player1') {
          return {
            pointEnded: true,
            pointWinner: 'player2',
            pointReason: 'Illegal Volley (Hit before bounce)',
            soundEvents
          };
        }

        b.lastHitter = 'player1';
        b.bounceCountCurrentSide = 0;
        b.lastBounceSide = null;
      }
    }

    // Player 2 Paddle (Z < 0, hits towards positive Z)
    if (b.vel.z < 0 && b.pos.z <= this.paddle2.pos.z + PADDLE_RADIUS + BALL_RADIUS) {
      const hit = this.checkPaddleCollision(this.paddle2, 'player2');
      if (hit.collided) {
        soundEvents.push({ type: 'paddle_hit', intensity: hit.intensity, pos: { ...b.pos } });

        // Volley check
        if (!b.isServe && b.lastHitter === 'player1' && b.lastBounceSide !== 'player2') {
          return {
            pointEnded: true,
            pointWinner: 'player1',
            pointReason: 'Illegal Volley (Hit before bounce)',
            soundEvents
          };
        }

        b.lastHitter = 'player2';
        b.bounceCountCurrentSide = 0;
        b.lastBounceSide = null;
      }
    }

    // 5. Out of bounds / Floor collision / Miss check
    // If ball drops below table height or travels far beyond baselines
    if (b.pos.y < TABLE_HEIGHT - 0.25 || Math.abs(b.pos.z) > 2.8 || Math.abs(b.pos.x) > 2.2) {
      // Determine point winner:
      // If player A hit it, and it bounced on player B's side, and player B failed to return it before it dropped: Player A wins!
      // If player A hit it, and it never bounced on player B's side (went out or net): Player B wins!
      let winner: PlayerSide;
      let reason: string;

      if (!b.lastHitter) {
        winner = 'player2';
        reason = 'Ball Dead';
      } else {
        const hitter = b.lastHitter;
        const opponent: PlayerSide = hitter === 'player1' ? 'player2' : 'player1';

        if (b.lastBounceSide === opponent) {
          // Ball hit opponent table, opponent missed return
          winner = hitter;
          reason = `${hitter === 'player1' ? 'Player 1' : 'Player 2'} Winner`;
        } else {
          // Ball went out without hitting opponent side
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
   * Collision check between ball and paddle disk.
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

    // Radial distance on paddle face
    const radialDist = Math.hypot(dx, dy);

    // Thickness tolerance
    const thickness = PADDLE_THICKNESS + BALL_RADIUS + 0.05;

    // Check if within paddle disk
    if (radialDist <= PADDLE_RADIUS * 1.25 && Math.abs(dz) <= thickness) {
      // Valid hit!
      const dirZ = isP1 ? -1 : 1;

      // Impart paddle velocity
      const paddleSpeed = Math.hypot(paddle.vel.x, paddle.vel.y, paddle.vel.z);
      const forwardBaseSpeed = 6.2 + Math.min(paddleSpeed * 0.9, 6.0);

      // Deflection based on contact offset on paddle face (aim control)
      const aimX = (dx / PADDLE_RADIUS) * 2.8 + paddle.vel.x * 0.4;
      const aimY = 1.6 + Math.max(-0.5, (dy / PADDLE_RADIUS) * 1.2) + Math.max(0, paddle.vel.y * 0.5);

      b.vel.x = aimX;
      b.vel.y = aimY;
      b.vel.z = dirZ * forwardBaseSpeed;

      // Displace ball slightly away from paddle to prevent re-collision
      b.pos.z = paddle.pos.z + dirZ * (PADDLE_THICKNESS / 2 + BALL_RADIUS + 0.02);

      const intensity = Math.min(1.0, (forwardBaseSpeed + paddleSpeed) / 10.0);
      return { collided: true, intensity };
    }

    return { collided: false, intensity: 0 };
  }
}
