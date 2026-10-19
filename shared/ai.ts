import {
  BALL_RADIUS,
  TABLE_HEIGHT,
  OPPONENT_PADDLE_Z,
  GRAVITY,
  AIR_DRAG,
  TABLE_RESTITUTION,
  PADDLE_MIN_X,
  PADDLE_MAX_X,
  PADDLE_MIN_Y,
  PADDLE_MAX_Y,
  getMinPaddleY,
  MAGNUS_COEFFICIENT
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
    reactionDelayMs: 280,       // Generous human-like reaction delay for Casual (relaxing pace)
    predictionError: 0.12,      // Natural inaccuracies, can miss wide or fast angled shots
    maxSpeed: 2.2,              // Relaxed movement speed (won't sprint to impossible corners)
    lerpRate: 7.0,              // Smooth, gentle movement interpolation
    reachLimitX: 0.60,          // Cannot reach extreme table edge shots
    swingAggression: 0.15,      // Gentle returns, won't smash aggressively
    returnPlacementBias: 0.10   // Hits returns safely near center line, easy to rally
  },
  medium: {
    reactionDelayMs: 150,
    predictionError: 0.03,
    maxSpeed: 4.8,
    lerpRate: 13.0,
    reachLimitX: 0.85,
    swingAggression: 0.65,
    returnPlacementBias: 0.55
  },
  hard: {
    reactionDelayMs: 120,
    predictionError: 0.005,
    maxSpeed: 7.2,
    lerpRate: 18.0,
    reachLimitX: 0.98,
    swingAggression: 0.95,
    returnPlacementBias: 0.88
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
      // Casual bot: serves from comfortable near-center positions with gentle, centered targets
      const stances = [-0.15, 0.15, 0.0];
      this.chosenServeX = stances[this.serveCount % stances.length];
      this.serveCount++;
      const targets = [-0.08, 0.08, 0.0];
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
      this.reactionTimer -= dt;
      if (this.reactionTimer <= 0) {
        this.isReacting = true;
      }
    } else {
      this.isReacting = false;
    }

    if (this.isReacting && ballComingTowardsAI) {
      // Predict arrival at AI paddle baseline with aerodynamics and table bounce
      const predicted = this.predictBallAtPlane(ball, OPPONENT_PADDLE_Z);
      this.currentTarget = {
        x: predicted.x + this.targetOffset.x,
        y: predicted.y + this.targetOffset.y,
        z: OPPONENT_PADDLE_Z
      };

      // Forward swing surge when ball is in striking window
      if (ball.pos.z < OPPONENT_PADDLE_Z + 0.38 && ball.pos.z > OPPONENT_PADDLE_Z - 0.05) {
        this.currentTarget.z = OPPONENT_PADDLE_Z + 0.14 * this.config.swingAggression;
        // Lateral brush towards strategic aim target kept controlled
        this.currentTarget.x += (this.strategicAimX - this.currentTarget.x) * 0.08;
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
   * Fast forward trajectory simulation accounting for gravity, drag, and table bounce.
   */
  private predictBallAtPlane(ball: BallState, targetZ: number): Vector3D {
    if (Math.abs(ball.vel.z) < 0.1) {
      return { x: ball.pos.x, y: ball.pos.y, z: targetZ };
    }

    // Time estimate to reach target plane
    const tEstimate = (targetZ - ball.pos.z) / ball.vel.z;
    if (tEstimate <= 0 || tEstimate > 2.5) {
      return { x: ball.pos.x, y: ball.pos.y, z: targetZ };
    }

    let simX = ball.pos.x;
    let simY = ball.pos.y;
    let simZ = ball.pos.z;
    let simVx = ball.vel.x;
    let simVy = ball.vel.y;
    let simVz = ball.vel.z;

    const simDt = 0.015;
    const maxSteps = Math.min(160, Math.ceil(tEstimate / simDt) + 10);

    for (let step = 0; step < maxSteps; step++) {
      if (simZ <= targetZ) {
        break;
      }

      // Physics integration step
      const spd = Math.hypot(simVx, simVy, simVz);
      const drag = AIR_DRAG * spd;

      simVx -= simVx * drag * simDt;
      simVy += (-GRAVITY - simVy * drag) * simDt;
      simVz -= simVz * drag * simDt;

      simX += simVx * simDt;
      simY += simVy * simDt;
      simZ += simVz * simDt;

      // Table bounce simulation
      if (simY <= TABLE_HEIGHT + BALL_RADIUS) {
        simY = TABLE_HEIGHT + BALL_RADIUS;
        simVy = Math.abs(simVy) * TABLE_RESTITUTION;
      }
    }

    return {
      x: Math.max(PADDLE_MIN_X, Math.min(PADDLE_MAX_X, simX)),
      y: Math.max(TABLE_HEIGHT + 0.08, Math.min(PADDLE_MAX_Y, simY)),
      z: targetZ
    };
  }
}
