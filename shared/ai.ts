import {
  BALL_RADIUS,
  TABLE_HEIGHT,
  OPPONENT_PADDLE_Z,
  GRAVITY,
  TABLE_RESTITUTION,
  PADDLE_MIN_X,
  PADDLE_MAX_X,
  PADDLE_MIN_Y,
  PADDLE_MAX_Y
} from './constants.js';
import { AIDifficulty, BallState, PaddleState, Vector3D } from './types.js';

interface AIDifficultyConfig {
  reactionDelayMs: number;
  predictionError: number;
  maxSpeed: number;
  reachLimitX: number;
  swingAggression: number;
  returnPlacementBias: number; // 0 = center, 1 = deep corners
}

const DIFFICULTY_CONFIGS: Record<AIDifficulty, AIDifficultyConfig> = {
  easy: {
    reactionDelayMs: 250,
    predictionError: 0.14,
    maxSpeed: 2.8,
    reachLimitX: 0.65,
    swingAggression: 0.3,
    returnPlacementBias: 0.2
  },
  medium: {
    reactionDelayMs: 130,
    predictionError: 0.05,
    maxSpeed: 4.8,
    reachLimitX: 0.85,
    swingAggression: 0.6,
    returnPlacementBias: 0.6
  },
  hard: {
    reactionDelayMs: 50,
    predictionError: 0.015,
    maxSpeed: 7.2,
    reachLimitX: 0.95,
    swingAggression: 0.9,
    returnPlacementBias: 0.85
  }
};

export class TableTennisAI {
  public difficulty: AIDifficulty;
  private config: AIDifficultyConfig;

  private currentTarget: Vector3D = {
    x: 0,
    y: TABLE_HEIGHT + 0.18,
    z: OPPONENT_PADDLE_Z
  };
  private targetOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastBallVelZ: number = 0;
  private timeSinceBallTurned: number = 0;
  private reactionTimer: number = 0;
  private isReacting: boolean = false;

  constructor(difficulty: AIDifficulty = 'medium') {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIGS[difficulty];
  }

  public setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIGS[difficulty];
  }

  public reset(): void {
    this.currentTarget = {
      x: 0,
      y: TABLE_HEIGHT + 0.18,
      z: OPPONENT_PADDLE_Z
    };
    this.targetOffset = { x: 0, y: 0 };
    this.lastBallVelZ = 0;
    this.timeSinceBallTurned = 0;
    this.reactionTimer = 0;
    this.isReacting = false;
  }

  /**
   * Updates AI paddle position and velocity for the current frame.
   */
  public update(dt: number, ball: BallState, paddle: PaddleState): void {
    // Check if ball just changed direction towards AI side
    const ballComingTowardsAI = ball.vel.z < -0.5 && ball.active;

    if (ballComingTowardsAI && this.lastBallVelZ >= -0.5) {
      // New incoming shot! Generate human-like reaction delay & perception error
      this.reactionTimer = this.config.reactionDelayMs / 1000;
      this.isReacting = false;
      const err = this.config.predictionError;
      this.targetOffset = {
        x: (Math.random() - 0.5) * 2 * err,
        y: (Math.random() - 0.5) * 2 * err
      };
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
      // Predict trajectory at paddle plane
      const predicted = this.predictBallAtPlane(ball, OPPONENT_PADDLE_Z);
      this.currentTarget = {
        x: predicted.x + this.targetOffset.x,
        y: predicted.y + this.targetOffset.y,
        z: OPPONENT_PADDLE_Z
      };

      // Swing forward when ball is very close
      if (ball.pos.z < OPPONENT_PADDLE_Z + 0.4 && ball.pos.z > OPPONENT_PADDLE_Z) {
        this.currentTarget.z = OPPONENT_PADDLE_Z + 0.12 * this.config.swingAggression;
      }
    } else {
      // Reset back to ready stance near center of table
      this.currentTarget = {
        x: 0,
        y: TABLE_HEIGHT + 0.18,
        z: OPPONENT_PADDLE_Z
      };
    }

    // Apply reach constraint (cannot reach beyond legal anatomical limit)
    this.currentTarget.x = Math.max(
      -this.config.reachLimitX,
      Math.min(this.config.reachLimitX, this.currentTarget.x)
    );
    this.currentTarget.y = Math.max(
      PADDLE_MIN_Y,
      Math.min(PADDLE_MAX_Y, this.currentTarget.y)
    );

    // Smooth movement towards target clamped by maxSpeed
    const dx = this.currentTarget.x - paddle.pos.x;
    const dy = this.currentTarget.y - paddle.pos.y;
    const dz = this.currentTarget.z - paddle.pos.z;

    const dist = Math.hypot(dx, dy, dz);
    const maxMove = this.config.maxSpeed * dt;

    if (dist > 0.001) {
      const step = Math.min(dist, maxMove);
      const vx = (dx / dist) * (step / dt);
      const vy = (dy / dist) * (step / dt);
      const vz = (dz / dist) * (step / dt);

      paddle.vel = { x: vx, y: vy, z: vz };
      paddle.pos.x += vx * dt;
      paddle.pos.y += vy * dt;
      paddle.pos.z += vz * dt;
    } else {
      paddle.vel = { x: 0, y: 0, z: 0 };
    }

    // Natural paddle tilt (facing forward and slight angle based on X offset)
    paddle.rot = {
      x: 0.1, // slight forward lean
      y: (paddle.pos.x / 1.0) * -0.3,
      z: -(paddle.pos.x / 1.0) * 0.2
    };
  }

  /**
   * Predicts where the ball will arrive when its Z reaches targetZ.
   */
  private predictBallAtPlane(ball: BallState, targetZ: number): Vector3D {
    if (Math.abs(ball.vel.z) < 0.1) {
      return { x: ball.pos.x, y: ball.pos.y, z: targetZ };
    }

    const t = (targetZ - ball.pos.z) / ball.vel.z;
    if (t <= 0 || t > 2.0) {
      return { x: ball.pos.x, y: ball.pos.y, z: targetZ };
    }

    // Simple forward projection
    let predX = ball.pos.x + ball.vel.x * t;

    // Vertical trajectory taking into account gravity and bounce if it hits table
    let currentY = ball.pos.y;
    let currentVy = ball.vel.y;
    let remainingT = t;
    const simDt = 0.02;

    while (remainingT > 0) {
      const step = Math.min(remainingT, simDt);
      currentVy -= GRAVITY * step;
      currentY += currentVy * step;

      if (currentY <= TABLE_HEIGHT + BALL_RADIUS) {
        currentY = TABLE_HEIGHT + BALL_RADIUS;
        currentVy = -currentVy * TABLE_RESTITUTION;
      }
      remainingT -= step;
    }

    return {
      x: predX,
      y: Math.max(TABLE_HEIGHT + 0.05, currentY),
      z: targetZ
    };
  }
}
