import { Server } from 'socket.io';
import {
  PHYSICS_DT,
  SUB_STEPS,
  MAX_PADDLE_SPEED,
  PADDLE_MIN_X,
  PADDLE_MAX_X,
  PADDLE_MIN_Y,
  PADDLE_MAX_Y,
  PLAYER_PADDLE_Z,
  OPPONENT_PADDLE_Z
} from '../../shared/constants.js';
import { PhysicsSimulation } from '../../shared/physics.js';
import { RuleEngine } from '../../shared/rules.js';
import {
  ClientToServerEvents,
  GameSnapshot,
  MatchPhase,
  MatchScore,
  PlayerInput,
  PlayerProfile,
  PlayerSide,
  ServerToClientEvents,
  SoundEvent
} from '../../shared/types.js';

export class GameRoom {
  public code: string;
  public player1: PlayerProfile;
  public player2?: PlayerProfile;
  public phase: MatchPhase = 'idle';

  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private physics: PhysicsSimulation;
  private rules: RuleEngine;

  private tickNumber: number = 0;
  private loopInterval: NodeJS.Timeout | null = null;
  private snapshotInterval: NodeJS.Timeout | null = null;

  private p1InputQueue: PlayerInput[] = [];
  private p2InputQueue: PlayerInput[] = [];

  private countdownTimer: number = 0;
  private phaseTimer: number = 0;
  private pointWinnerBanner: { winner: PlayerSide; reason: string } | null = null;
  private recentSoundEvents: SoundEvent[] = [];

  constructor(
    code: string,
    hostPlayer: PlayerProfile,
    io: Server<ClientToServerEvents, ServerToClientEvents>
  ) {
    this.code = code;
    this.player1 = hostPlayer;
    this.io = io;
    this.physics = new PhysicsSimulation();
    this.rules = new RuleEngine();
  }

  public setGuest(guest: PlayerProfile): void {
    this.player2 = guest;
  }

  public getScore(): MatchScore {
    return this.rules.score;
  }

  public startMatch(): void {
    this.rules.reset();
    this.physics = new PhysicsSimulation();
    this.startCountdown();
  }

  private startCountdown(): void {
    this.phase = 'countdown';
    this.countdownTimer = 3;
    this.physics.prepareServe(this.rules.serve.server);

    const countdownInterval = setInterval(() => {
      this.io.to(this.code).emit('game:countdown', this.countdownTimer);
      this.countdownTimer--;

      if (this.countdownTimer < 0) {
        clearInterval(countdownInterval);
        this.beginServe();
        this.startGameLoops();
      }
    }, 1000);
  }

  private beginServe(): void {
    this.phase = 'serving';
    this.phaseTimer = 0.8; // Brief 0.8s pause before serve is struck
    this.pointWinnerBanner = null;
    this.physics.prepareServe(this.rules.serve.server);
  }

  private startGameLoops(): void {
    if (this.loopInterval) clearInterval(this.loopInterval);
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);

    // 60Hz Authoritative Physics Loop
    this.loopInterval = setInterval(() => {
      this.updatePhysics();
    }, 1000 / 60);

    // 30Hz Network Snapshot Broadcast
    this.snapshotInterval = setInterval(() => {
      this.broadcastSnapshot();
    }, 1000 / 30);
  }

  public handleInput(side: PlayerSide, input: PlayerInput): void {
    if (side === 'player1') {
      this.p1InputQueue.push(input);
    } else {
      this.p2InputQueue.push(input);
    }
  }

  private processPlayerInputs(dt: number): void {
    // Process latest input for Player 1
    if (this.p1InputQueue.length > 0) {
      const input = this.p1InputQueue[this.p1InputQueue.length - 1];
      this.p1InputQueue = [];
      this.applyPaddleInput(this.physics.paddle1, input, 'player1', dt);
    }

    // Process latest input for Player 2
    if (this.p2InputQueue.length > 0) {
      const input = this.p2InputQueue[this.p2InputQueue.length - 1];
      this.p2InputQueue = [];
      this.applyPaddleInput(this.physics.paddle2, input, 'player2', dt);
    }
  }

  private applyPaddleInput(
    paddle: any,
    input: PlayerInput,
    side: PlayerSide,
    dt: number
  ): void {
    const isP1 = side === 'player1';
    // Validate target position boundaries
    const targetX = Math.max(PADDLE_MIN_X, Math.min(PADDLE_MAX_X, input.targetPos.x));
    const targetY = Math.max(PADDLE_MIN_Y, Math.min(PADDLE_MAX_Y, input.targetPos.y));
    const baselineZ = isP1 ? PLAYER_PADDLE_Z : OPPONENT_PADDLE_Z;
    // Allow small Z swing variance (+/- 0.25m)
    const targetZ = isP1
      ? Math.max(baselineZ - 0.25, Math.min(baselineZ + 0.25, input.targetPos.z))
      : Math.max(baselineZ - 0.25, Math.min(baselineZ + 0.25, input.targetPos.z));

    const dx = targetX - paddle.pos.x;
    const dy = targetY - paddle.pos.y;
    const dz = targetZ - paddle.pos.z;
    const dist = Math.hypot(dx, dy, dz);

    const maxDist = MAX_PADDLE_SPEED * dt;
    if (dist > 0.0001) {
      const actualMove = Math.min(dist, maxDist);
      const ratio = actualMove / dist;
      paddle.vel = {
        x: (dx * ratio) / dt,
        y: (dy * ratio) / dt,
        z: (dz * ratio) / dt
      };
      paddle.pos.x += dx * ratio;
      paddle.pos.y += dy * ratio;
      paddle.pos.z += dz * ratio;
    } else {
      paddle.vel = { x: 0, y: 0, z: 0 };
    }

    // Natural paddle orientation
    paddle.rot = {
      x: isP1 ? -0.1 : 0.1,
      y: (paddle.pos.x / 1.0) * (isP1 ? 0.3 : -0.3),
      z: -(paddle.pos.x / 1.0) * 0.2
    };
  }

  private updatePhysics(): void {
    this.tickNumber++;

    if (this.phase === 'serving') {
      this.processPlayerInputs(PHYSICS_DT);
      this.phaseTimer -= PHYSICS_DT;
      if (this.phaseTimer <= 0) {
        // Automatically launch serve from the current server's paddle position
        const server = this.rules.serve.server;
        const targetX = (Math.random() - 0.5) * 0.6;
        this.physics.launchServe(server, targetX);
        this.phase = 'in_play';
        this.recentSoundEvents.push({ type: 'paddle_hit', intensity: 0.8 });
      }
      return;
    }

    if (this.phase === 'point_scored') {
      this.phaseTimer -= PHYSICS_DT;
      if (this.phaseTimer <= 0) {
        this.beginServe();
      }
      return;
    }

    if (this.phase === 'in_play') {
      this.processPlayerInputs(PHYSICS_DT);

      const result = this.physics.step(PHYSICS_DT, SUB_STEPS);

      for (const snd of result.soundEvents) {
        this.recentSoundEvents.push(snd);
      }

      if (result.pointEnded && result.pointWinner) {
        this.handlePointEnded(result.pointWinner, result.pointReason || 'Point');
      }
    }
  }

  private handlePointEnded(winner: PlayerSide, reason: string): void {
    const outcome = this.rules.awardPoint(winner);

    this.pointWinnerBanner = { winner, reason };
    this.recentSoundEvents.push({ type: 'score', intensity: 1.0 });

    this.io.to(this.code).emit('game:point_scored', {
      score: outcome.score,
      winner,
      reason
    });

    if (outcome.gameOver) {
      this.phase = 'game_over';
      this.recentSoundEvents.push({ type: 'applause', intensity: 1.0 });
      this.io.to(this.code).emit('game:over', {
        score: outcome.score,
        winner
      });
      this.stopGameLoops();
    } else {
      this.phase = 'point_scored';
      this.phaseTimer = 1.8; // 1.8s banner display before next point
    }
  }

  private broadcastSnapshot(): void {
    const snapshot: GameSnapshot = {
      timestamp: Date.now(),
      tick: this.tickNumber,
      phase: this.phase,
      ball: this.physics.ball,
      paddle1: this.physics.paddle1,
      paddle2: this.physics.paddle2,
      score: this.rules.score,
      serve: this.rules.serve,
      pointWinnerBanner: this.pointWinnerBanner,
      soundEvents: [...this.recentSoundEvents]
    };

    this.recentSoundEvents = [];
    this.io.to(this.code).emit('game:snapshot', snapshot);
  }

  public stopGameLoops(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }

  public destroy(): void {
    this.stopGameLoops();
  }
}
