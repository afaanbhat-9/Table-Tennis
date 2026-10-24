import {
  BALL_RADIUS,
  TABLE_HEIGHT,
  TABLE_WIDTH,
  TABLE_LENGTH,
  OPPONENT_PADDLE_Z,
  GRAVITY,
  AIR_DRAG,
  TABLE_RESTITUTION,
  PADDLE_MIN_X,
  PADDLE_MAX_X,
  PADDLE_MIN_Y,
  PADDLE_MAX_Y,
  getMinPaddleY,
  MAGNUS_COEFFICIENT,
  SPIN_AIR_DECAY,
  SPIN_BOUNCE_DECAY,
  SPIN_BOUNCE_FRICTION
} from './constants.js';
import { AIDifficulty, BallState, PaddleState, Vector3D } from './types.js';

interface AIDifficultyConfig {
  reactionDelayMs: number;
  predictionError: number;
  maxSpeed: number;
  lerpRate: number;
  reachLimitX: number;
  swingAggression: number;
  returnPlacementBias: number; // 0 = center, 1 = deep corners
}

const DIFFICULTY_CONFIGS: Record<AIDifficulty, AIDifficultyConfig> = {
  easy: {
    reactionDelayMs: 320,       // Slow, forgiving beginner reaction delay
    predictionError: 0.14,      // Natural beginner variance; easily beaten by placement
    maxSpeed: 1.5,              // Relaxed movement pace; player smashes and corner drives score easily
    lerpRate: 5.0,              // Smooth, forgiving tracking
    reachLimitX: 0.42,          // Corners (> 0.44m) are clear winners for the player
    swingAggression: 0.0,       // Zero smashes; gentle, readable returns
    returnPlacementBias: 0.04   // Returns directly towards center court
  },
  medium: {
    reactionDelayMs: 250,       // Human intermediate reaction delay (player can outpace it!)
    predictionError: 0.075,     // Human variance; beaten by angled shots and smashes
    maxSpeed: 2.2,              // Balanced pace: cross-court drives cleanly beat the Pro bot!
    lerpRate: 7.2,              // Realistic tracking
    reachLimitX: 0.55,          // Corners (> 58cm) cleanly pass the Pro bot for earned points!
    swingAggression: 0.10,      // Friendly, enjoyable rally returns (no laser smashes)
    returnPlacementBias: 0.18   // Good variety without unfair extreme angles
  },
  hard: {
    reactionDelayMs: 215,       // Alert tournament player, but human and beatable
    predictionError: 0.05,      // Realistic variance; sharp drives can win points
    maxSpeed: 2.8,              // Athletic, but won't teleport across the table
    lerpRate: 9.5,              // Sharp tracking
    reachLimitX: 0.65,          // Strong coverage, but deep corner smashes score cleanly!
    swingAggression: 0.22,      // Controlled attacks rather than constant overwhelming bullets
    returnPlacementBias: 0.30   // Varied ITTF placement creating enjoyable, rewarding rallies
  }
};

export class TableTennisAI {
  public difficulty: AIDifficulty;
  private config: AIDifficultyConfig;

  private currentTarget: Vector3D = {
    x: 0,
    y: TABLE_HEIGHT + 0.14,
    z: OPPONENT_PADDLE_Z
  };
  private targetOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastBallVelZ: number = 0;
  private reactionTimer: number = 0;
  private isReacting: boolean = false;
  private strategicAimX: number = 0;
  private serveCount: number = 0;

  constructor(difficulty: AIDifficulty = 'medium') {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIGS[difficulty];
  }

  public setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIGS[difficulty];
  }

  public chosenServeX: number = 0;
  public chosenServeTargetX: number = 0;

  /**
   * Selects varied, authentic ITTF serving stances (wide forehand, wide backhand, mid, center)
   * and targets across the receiver's court (cross-court corners, sidelines, body serves).
   */
  public selectServePosition(): number {
    if (this.difficulty === 'easy') {
      // Casual bot: serves from comfortable stances across table with safe, central targets
      const stances = [-0.22, 0.22, -0.10, 0.10, 0.0];
      this.chosenServeX = stances[this.serveCount % stances.length];
      this.serveCount++;
      const targets = [-0.18, 0.18, -0.08, 0.08, 0.0];
      this.chosenServeTargetX = targets[Math.floor(Math.random() * targets.length)];
      return this.chosenServeX;
    }

    // Varied legal stances across table width (-0.76m to +0.76m) for Pro / Master:
    const stances = [-0.46, 0.46, -0.28, 0.28, 0.0];
    const base = stances[this.serveCount % stances.length];
    this.serveCount++;
    this.chosenServeX = base + (Math.random() - 0.5) * 0.04;

    // Strategically aim across the player's side of the table (never just down the middle):
    const targets = [
      -this.chosenServeX * 0.85, // Cross-court angle
      this.chosenServeX * 0.75,  // Down the line
      (Math.random() > 0.5 ? 0.38 : -0.38), // Wide corner
      (Math.random() > 0.5 ? 0.22 : -0.22)  // Mid-wing
    ];
    this.chosenServeTargetX = targets[Math.floor(Math.random() * targets.length)];
    return this.chosenServeX;
  }

  public reset(): void {
    this.currentTarget = {
      x: 0,
      y: TABLE_HEIGHT + 0.14,
      z: OPPONENT_PADDLE_Z
    };
    this.targetOffset = { x: 0, y: 0 };
    this.lastBallVelZ = 0;
    this.reactionTimer = 0;
    this.isReacting = false;
    this.strategicAimX = 0;
    this.chosenServeX = 0;
    this.chosenServeTargetX = 0;
  }

  /**
   * Updates AI paddle position and velocity for the current frame.
   */
  public update(dt: number, ball: BallState, paddle: PaddleState): void {
    // Check if ball is moving towards AI side
    const ballComingTowardsAI = ball.vel.z < -0.4 && ball.active;

    if (ballComingTowardsAI && this.lastBallVelZ >= -0.4) {
      // New incoming shot: apply human-like reaction delay and perception error
      this.reactionTimer = this.config.reactionDelayMs / 1000;
      this.isReacting = false;
      const err = this.config.predictionError;
      this.targetOffset = {
        x: (Math.random() - 0.5) * 2 * err,
        y: (Math.random() - 0.5) * 2 * err
      };

      // Select strategic return placement (centered cleanly within table boundaries)
      const targetSide = ball.pos.x > 0 ? -1 : 1; // cross-court bias
      this.strategicAimX = targetSide * (0.15 + Math.random() * 0.16) * this.config.returnPlacementBias;
    }
    this.lastBallVelZ = ball.vel.z;

    if (ballComingTowardsAI) {
      // Once the ball bounces on the AI court, visual & audio cues accelerate reading of short shots
      const bounceBoost = (ball.bounceCountCurrentSide >= 1 && ball.lastBounceSide === 'player2') ? 1.6 : 1.0;
      this.reactionTimer -= dt * bounceBoost;
      if (this.reactionTimer <= 0) {
        this.isReacting = true;
      }
    } else {
      this.isReacting = false;
    }

    if (this.isReacting && ballComingTowardsAI) {
      // 3D Interception with aerodynamic curve simulation and short-ball stepping
      const prediction = this.predictBallIntercept(ball);
      this.currentTarget = {
        x: prediction.pos.x + this.targetOffset.x,
        y: prediction.pos.y + this.targetOffset.y,
        z: prediction.pos.z
      };

      // Forward swing surge when ball enters striking zone
      const strikeWindowZ = this.currentTarget.z;
      if (ball.pos.z < strikeWindowZ + 0.38 && ball.pos.z > strikeWindowZ - 0.08) {
        const surge = 0.08 * (this.config.swingAggression > 0 ? this.config.swingAggression : 0.8);
        this.currentTarget.z += surge;
      }
    } else if (ball.isServe && ball.lastHitter === 'player2') {
      if (ball.serveState === 'tossed') {
        // Strike toss as it descends towards striking height
        const isDescending = ball.vel.y <= 0.20 && ball.pos.y <= TABLE_HEIGHT + 0.32;
        this.currentTarget = {
          x: ball.pos.x,
          y: Math.max(TABLE_HEIGHT + 0.16, ball.pos.y),
          z: isDescending ? (OPPONENT_PADDLE_Z + 0.24) : OPPONENT_PADDLE_Z
        };
      } else {
        // Held serve stance: keep stable at chosen serve position
        this.currentTarget = {
          x: this.chosenServeX !== 0 ? this.chosenServeX : ball.pos.x,
          y: TABLE_HEIGHT + 0.18,
          z: OPPONENT_PADDLE_Z
        };
      }
    } else {
      // Smooth return to neutral center ready position
      this.currentTarget = {
        x: 0,
        y: TABLE_HEIGHT + 0.18,
        z: OPPONENT_PADDLE_Z
      };
    }

    // Apply reach constraint
    this.currentTarget.x = Math.max(
      -this.config.reachLimitX,
      Math.min(this.config.reachLimitX, this.currentTarget.x)
    );

    const minY = getMinPaddleY(this.currentTarget.x, this.currentTarget.z);
    this.currentTarget.y = Math.max(
      minY,
      Math.min(PADDLE_MAX_Y, this.currentTarget.y)
    );

    // Smooth lerp interpolation towards target capped by maximum movement speed
    const lerpFactor = 1.0 - Math.exp(-this.config.lerpRate * dt);
    let targetDx = (this.currentTarget.x - paddle.pos.x) * lerpFactor;
    let targetDy = (this.currentTarget.y - paddle.pos.y) * lerpFactor;
    let targetDz = (this.currentTarget.z - paddle.pos.z) * lerpFactor;

    const moveDist = Math.hypot(targetDx, targetDy, targetDz);
    const maxMove = this.config.maxSpeed * dt;

    if (moveDist > maxMove) {
      const scale = maxMove / moveDist;
      targetDx *= scale;
      targetDy *= scale;
      targetDz *= scale;
    }

    if (moveDist > 0.0001 && dt > 0) {
      paddle.vel = {
        x: targetDx / dt,
        y: targetDy / dt,
        z: targetDz / dt
      };
      paddle.pos.x += targetDx;
      paddle.pos.y += targetDy;
      paddle.pos.z += targetDz;
    } else {
      paddle.vel = { x: 0, y: 0, z: 0 };
    }

    // Dynamic clearance clamp so blade never clips into table or frame
    const actualMinY = getMinPaddleY(paddle.pos.x, paddle.pos.z);
    if (paddle.pos.y < actualMinY) {
      paddle.pos.y = actualMinY;
    }

    // Natural paddle tilt (forward topspin tilt & slight yaw)
    const isServeStrike = ball.isServe && ball.lastHitter === 'player2' && ball.serveState === 'tossed' && ball.vel.y <= 0.20;
    const isSwinging = targetDz > 0.03 && (this.isReacting || isServeStrike);
    paddle.isSwinging = isSwinging;
    paddle.swingPhase = isSwinging ? 'forward' : 'idle';
    paddle.rot = {
      x: isSwinging ? 0.32 : 0.14, // forward topspin lean
      y: (paddle.pos.x / 1.0) * -0.28,
      z: -(paddle.pos.x / 1.0) * 0.18
    };
  }

  /**
   * Fast forward trajectory simulation accounting for gravity, drag, Magnus curve, and table bounce.
   * Accurately determines the optimal 3D strike location (x, y, z).
   * For deep shots, intercepts around OPPONENT_PADDLE_Z (-1.84m).
   * For short shots / drop shots that bounce shallow on the table and won't reach baseline before double-bouncing,
   * steps forward towards the table (up to z = -1.20m) with guaranteed table clearance so the bot returns short balls cleanly.
   */
  public predictBallIntercept(ball: BallState): { pos: Vector3D; isShort: boolean } {
    if (Math.abs(ball.vel.z) < 0.1) {
      return { pos: { x: ball.pos.x, y: ball.pos.y, z: OPPONENT_PADDLE_Z }, isShort: false };
    }

    let simX = ball.pos.x;
    let simY = ball.pos.y;
    let simZ = ball.pos.z;
    let simVx = ball.vel.x;
    let simVy = ball.vel.y;
    let simVz = ball.vel.z;
    let simSpinX = ball.spin ? ball.spin.x : 0;
    let simSpinY = ball.spin ? ball.spin.y : 0;

    const simDt = 0.012;
    const maxSteps = 160;

    let bouncesOnAI = 0;
    let apexAfterBounce: { x: number; y: number; z: number } | null = null;
    let prevSimVy = simVy;
    let reachedBaseline = false;
    let baselinePoint: { x: number; y: number; z: number } | null = null;

    for (let step = 0; step < maxSteps; step++) {
      // Physics integration step
      const spd = Math.hypot(simVx, simVy, simVz);
      const drag = AIR_DRAG * spd;

      let fMagnusX = 0;
      let fMagnusY = 0;
      if (simSpinY !== 0 || simSpinX !== 0) {
        fMagnusX = -MAGNUS_COEFFICIENT * (simSpinY * simVz);
        fMagnusY = -MAGNUS_COEFFICIENT * simSpinX * Math.abs(simVz);
        simSpinX *= Math.max(0, 1.0 - SPIN_AIR_DECAY * simDt);
        simSpinY *= Math.max(0, 1.0 - SPIN_AIR_DECAY * simDt);
      }

      simVx += (fMagnusX - simVx * drag) * simDt;
      simVy += (fMagnusY - GRAVITY - simVy * drag) * simDt;
      simVz -= simVz * drag * simDt;

      simX += simVx * simDt;
      simY += simVy * simDt;
      simZ += simVz * simDt;

      // Track post-bounce apex on AI side
      if (bouncesOnAI >= 1 && prevSimVy > 0 && simVy <= 0 && !apexAfterBounce) {
        apexAfterBounce = { x: simX, y: simY, z: simZ };
      }
      prevSimVy = simVy;

      // Table bounce simulation
      if (simY <= TABLE_HEIGHT + BALL_RADIUS) {
        if (simZ >= -TABLE_LENGTH / 2 && simZ <= 0 && Math.abs(simX) <= TABLE_WIDTH / 2) {
          bouncesOnAI++;
          simY = TABLE_HEIGHT + BALL_RADIUS;
          simVy = Math.abs(simVy) * TABLE_RESTITUTION;
          const flightDirZ = simVz > 0 ? 1 : -1;
          simVx = simVx * 0.95 - flightDirZ * simSpinY * SPIN_BOUNCE_FRICTION;
          simSpinX *= SPIN_BOUNCE_DECAY;
          simSpinY *= SPIN_BOUNCE_DECAY;

          if (bouncesOnAI >= 2) {
            // Ball would double bounce! Intercept must happen before this second bounce!
            break;
          }
        } else {
          // Off table or floor
          break;
        }
      }

      // Check if deep ball reached baseline area
      if (simZ <= OPPONENT_PADDLE_Z) {
        reachedBaseline = true;
        baselinePoint = { x: simX, y: simY, z: OPPONENT_PADDLE_Z };
        break;
      }
    }

    if (reachedBaseline && baselinePoint) {
      return {
        pos: {
          x: Math.max(PADDLE_MIN_X, Math.min(PADDLE_MAX_X, baselinePoint.x)),
          y: Math.max(TABLE_HEIGHT + 0.08, Math.min(PADDLE_MAX_Y, baselinePoint.y)),
          z: OPPONENT_PADDLE_Z
        },
        isShort: false
      };
    }

    // Ball will not reach OPPONENT_PADDLE_Z before double-bouncing (SHORT ball / drop shot):
    // Move forward towards the table to intercept the ball at its apex or comfortable striking height
    let strikeZ = OPPONENT_PADDLE_Z;
    let strikeX = simX;
    let strikeY = TABLE_HEIGHT + 0.16;

    if (apexAfterBounce) {
      strikeZ = Math.max(-1.48, Math.min(-1.18, apexAfterBounce.z));
      strikeX = apexAfterBounce.x;
      strikeY = Math.max(TABLE_HEIGHT + 0.12, Math.min(PADDLE_MAX_Y, apexAfterBounce.y));
    } else {
      strikeZ = Math.max(-1.50, Math.min(-1.22, simZ));
      strikeX = simX;
      strikeY = Math.max(TABLE_HEIGHT + 0.12, Math.min(PADDLE_MAX_Y, simY));
    }

    const safeMinY = getMinPaddleY(strikeX, strikeZ);
    return {
      pos: {
        x: Math.max(PADDLE_MIN_X, Math.min(PADDLE_MAX_X, strikeX)),
        y: Math.max(safeMinY, Math.min(PADDLE_MAX_Y, strikeY)),
        z: strikeZ
      },
      isShort: true
    };
  }

  /**
   * Fast forward trajectory simulation accounting for gravity, drag, and table bounce (legacy helper).
   */
  public predictBallAtPlane(ball: BallState, targetZ: number): Vector3D {
    const intercept = this.predictBallIntercept(ball);
    return intercept.pos;
  }
}
