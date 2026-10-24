import { SceneManager } from './renderer/SceneManager.js';
import { SoundManager } from './audio/SoundManager.js';
import { InputController } from './input/InputController.js';
import { UIManager } from './ui/UIManager.js';
import { NetworkClient } from './net/NetworkClient.js';
import { PhysicsSimulation } from '../../shared/physics.js';
import { RuleEngine } from '../../shared/rules.js';
import { TableTennisAI } from '../../shared/ai.js';
import {
  AIDifficulty,
  GameSnapshot,
  MatchPhase,
  PlayerSide,
  RoomState
} from '../../shared/types.js';
import {
  PHYSICS_DT,
  SUB_STEPS,
  PLAYER_PADDLE_Z,
  TABLE_HEIGHT
} from '../../shared/constants.js';

type GameMode = 'none' | 'singleplayer' | 'multiplayer';

class GameApp {
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private soundManager: SoundManager;
  private inputController: InputController;
  private uiManager: UIManager;
  private netClient: NetworkClient;

  // Single-player components
  private spPhysics: PhysicsSimulation;
  private spRules: RuleEngine;
  private spAI: TableTennisAI;
  private spPhase: MatchPhase = 'idle';
  private spPhaseTimer: number = 0;
  private spCountdown: number = 3;
  private countdownInterval: any = null;

  private currentMode: GameMode = 'none';
  private isPaused: boolean = false;
  private lastTime: number = performance.now();
  private physicsAccumulator: number = 0;
  private isHost: boolean = false;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.sceneManager = new SceneManager(this.container);
    this.soundManager = new SoundManager();
    this.inputController = new InputController(this.container, this.sceneManager.camera);
    this.netClient = new NetworkClient();

    this.spPhysics = new PhysicsSimulation();
    this.spPhysics.setAIDifficulty('medium');
    this.spRules = new RuleEngine();
    this.spAI = new TableTennisAI('medium');

    // Swing trigger feedback
    this.inputController.onSwingTriggered = (strength) => {
      this.uiManager.showSwingIndicator(strength);
      this.soundManager.playPaddleHit(0.35 * strength);
    };

    // Click or tap to serve immediately and reliably
    this.inputController.onPointerTap = () => {
      if (
        this.currentMode === 'singleplayer' &&
        this.spPhase === 'serving' &&
        this.spRules.serve.server === 'player1' &&
        this.spPhysics.ball.isServe &&
        (this.spPhysics.ball.serveState === 'held' || this.spPhysics.ball.serveState === 'tossed')
      ) {
        this.spPhysics.launchServe('player1', this.inputController.targetPos.x);
        this.spPhase = 'in_play';
        this.soundManager.playPaddleHit(0.85);
        this.sceneManager.triggerHitEffect(this.spPhysics.ball.pos);
      }
    };

    this.uiManager = new UIManager({
      onStartVsCPU: (diff) => this.startSinglePlayer(diff),
      onCreateParty: (name) => this.handleCreateParty(name),
      onJoinParty: (code, name) => this.handleJoinParty(code, name),
      onReadyToggle: (isReady) => this.netClient.setReady(isReady),
      onStartPartyMatch: () => this.netClient.startMatch(),
      onLeaveParty: () => this.handleLeaveParty(),
      onPauseGame: () => this.togglePause(),
      onResumeGame: () => this.resumeGame(),
      onToggleSound: () => this.toggleSound(),
      onRematch: () => this.handleRematch(),
      onReturnToMenu: () => this.returnToMainMenu()
    });

    (window as any).__gameApp = this;
    this.setupNetworkCallbacks();
    this.startAnimationLoop();

    // Check URL parameters for direct match start or deep linking
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'singleplayer') {
      const diff = (params.get('diff') as AIDifficulty) || 'medium';
      this.startSinglePlayer(diff);
    } else if (params.get('modal') === 'difficulty') {
      document.getElementById('modal-main-menu')!.style.display = 'none';
      document.getElementById('modal-cpu-difficulty')!.style.display = 'flex';
    } else if (params.get('modal') === 'party') {
      document.getElementById('modal-main-menu')!.style.display = 'none';
      document.getElementById('modal-party')!.style.display = 'flex';
      this.uiManager.setPartyTab('create');
    } else if (params.get('modal') === 'rules') {
      document.getElementById('modal-main-menu')!.style.display = 'none';
      document.getElementById('modal-how-to-play')!.style.display = 'flex';
    } else if (params.get('party')) {
      const code = params.get('party')!;
      document.getElementById('modal-main-menu')!.style.display = 'none';
      document.getElementById('modal-party')!.style.display = 'flex';
      this.uiManager.setPartyTab('join');
    } else if (params.get('autocreate') === '1') {
      document.getElementById('modal-main-menu')!.style.display = 'none';
      document.getElementById('modal-party')!.style.display = 'flex';
      this.handleCreateParty('Host Player');
    }
  }

  private setupNetworkCallbacks(): void {
    this.netClient.onPartyUpdated = (room: RoomState) => {
      this.uiManager.showPartyLobby(room, this.isHost);
      this.uiManager.updateLobbySlots(room, this.isHost);
    };

    this.netClient.onGameCountdown = (count: number) => {
      if (count > 0) {
        this.uiManager.showCountdown(count);
        this.soundManager.playCountdown(count);
      } else {
        this.uiManager.showCountdown('PLAY!', 'RALLY START!');
        this.soundManager.playCountdown('PLAY!');
      }
    };

    this.netClient.onGameSnapshot = (snap: GameSnapshot) => {
      if (this.currentMode !== 'multiplayer') {
        this.currentMode = 'multiplayer';
        const p1Name = this.netClient.roomState?.players.player1?.name || 'Player 1';
        const p2Name = this.netClient.roomState?.players.player2?.name || 'Player 2';
        this.uiManager.showHUD('multiplayer', p1Name, p2Name);
        this.uiManager.showControlHint(4500);
      }

      this.uiManager.updateScoreboard(snap.score, snap.serve.server);
      this.uiManager.updatePing(this.netClient.pingMs);

      // Play sound events received from server
      if (snap.soundEvents) {
        for (const snd of snap.soundEvents) {
          if (snd.type === 'paddle_hit') {
            this.soundManager.playPaddleHit(snd.intensity);
            this.sceneManager.triggerHitEffect(snd.pos);
          } else if (snd.type === 'table_hit') {
            this.soundManager.playTableBounce(snd.intensity);
            this.sceneManager.triggerHitEffect(snd.pos);
          } else if (snd.type === 'net_hit') {
            this.soundManager.playNetHit();
          } else if (snd.type === 'score') {
            this.soundManager.playScore();
          } else if (snd.type === 'applause') {
            this.soundManager.playGameOver(true);
          }
        }
      }

      if (snap.pointWinnerBanner) {
        this.uiManager.showAnnouncement(
          `${snap.pointWinnerBanner.winner === 'player1' ? 'Player 1' : 'Player 2'} Point!`,
          snap.pointWinnerBanner.reason,
          1500
        );
      }
    };

    this.netClient.onPointScored = (data) => {
      this.uiManager.updateScoreboard(data.score, data.winner);
      this.uiManager.showAnnouncement(
        `${data.winner === 'player1' ? 'Player 1' : 'Player 2'} Point!`,
        data.reason,
        1500
      );
    };

    this.netClient.onGameOver = (data) => {
      const isWinner = data.winner === this.netClient.mySide;
      this.soundManager.playGameOver(isWinner);
      this.uiManager.showGameOverModal(data.winner, data.score, isWinner);
    };

    this.netClient.onPlayerDisconnected = (data) => {
      this.uiManager.showToast(data.message);
      if (this.currentMode === 'multiplayer') {
        this.returnToMainMenu();
      }
    };

    this.netClient.onPartyLeft = () => {
      if (this.currentMode === 'multiplayer') {
        this.uiManager.showToast('Left the party room');
        this.returnToMainMenu();
      }
    };
  }

  // --- SINGLE PLAYER FLOW ---
  public startSinglePlayer(difficulty: AIDifficulty): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    this.currentMode = 'singleplayer';
    this.isPaused = false;
    this.spAI.setDifficulty(difficulty);
    this.spAI.reset();
    this.spRules.reset('player1');
    this.spPhysics = new PhysicsSimulation();
    this.spPhysics.setAIDifficulty(difficulty);

    this.uiManager.showHUD('singleplayer', 'YOU', 'CPU');
    this.uiManager.updateScoreboard(this.spRules.score, 'player1');
    this.uiManager.showControlHint(4500);

    const params = new URLSearchParams(window.location.search);
    const testBatY = params.get('test_bat_y') ? parseFloat(params.get('test_bat_y')!) : (TABLE_HEIGHT + 0.12);
    const testBatZ = params.get('test_bat_z') ? parseFloat(params.get('test_bat_z')!) : PLAYER_PADDLE_Z;
    this.inputController.setPosition(0.0, testBatY, testBatZ);
    this.startSinglePlayerCountdown();
  }

  private startSinglePlayerCountdown(): void {
    this.spPhase = 'countdown';
    this.spCountdown = 3;
    const isPlayerServer = this.spRules.serve.server === 'player1';
    const serveX = isPlayerServer ? 0.0 : this.spAI.selectServePosition();
    const serveTargetX = isPlayerServer ? undefined : this.spAI.chosenServeTargetX;
    this.spPhysics.prepareServe(this.spRules.serve.server, serveX, serveTargetX);
    this.uiManager.showCountdown(3, 'READY...');
    this.soundManager.playCountdown(3);

    this.countdownInterval = setInterval(() => {
      if (this.currentMode !== 'singleplayer') {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        return;
      }
      this.spCountdown--;
      if (this.spCountdown > 0) {
        this.uiManager.showCountdown(this.spCountdown);
        this.soundManager.playCountdown(this.spCountdown);
      } else if (this.spCountdown === 0) {
        this.uiManager.showCountdown('SERVE!', 'RALLY START!');
        this.soundManager.playCountdown('SERVE!');
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.spBeginServe();
      }
    }, 1000);
  }

  private spBeginServe(): void {
    this.spPhase = 'serving';
    const isPlayerServer = this.spRules.serve.server === 'player1';
    this.spPhaseTimer = isPlayerServer ? 4.0 : 2.5;
    const serveX = isPlayerServer ? this.inputController.targetPos.x : this.spAI.selectServePosition();
    const serveTargetX = isPlayerServer ? undefined : this.spAI.chosenServeTargetX;
    this.spPhysics.prepareServe(this.spRules.serve.server, serveX, serveTargetX);
  }

  private updateSinglePlayer(dt: number): void {
    if (this.isPaused) return;

    // 1. Update player paddle from input (synchronized with visible paddle)
    this.inputController.activeBall = this.spPhysics.ball;
    const input = this.inputController.update(dt);
    this.spPhysics.paddle1.pos = { ...this.inputController.currentPaddle.pos };
    this.spPhysics.paddle1.vel = { ...this.inputController.currentPaddle.vel };
    this.spPhysics.paddle1.rot = { ...this.inputController.currentPaddle.rot };
    this.spPhysics.paddle1.isSwinging = this.inputController.currentPaddle.isSwinging;
    this.spPhysics.paddle1.swingPhase = this.inputController.currentPaddle.swingPhase;

    // 2. Update AI paddle
    this.spAI.update(dt, this.spPhysics.ball, this.spPhysics.paddle2);

    // 3. State handling
    if (this.spPhase === 'countdown') {
      this.spPhysics.updateServeBall(this.spRules.serve.server);
      return;
    }

    if (this.spPhase === 'serving') {
      const isPlayerServer = this.spRules.serve.server === 'player1';

      // CPU serve toss assistance
      if (!isPlayerServer && this.spPhysics.ball.serveState === 'held' && this.spPhaseTimer <= 1.8) {
        const snd = this.spPhysics.tossServe('player2');
        if (snd) this.soundManager.playPaddleHit(0.4);
      }

      const stepRes = this.spPhysics.step(dt, SUB_STEPS);
      for (const snd of stepRes.soundEvents) {
        if (snd.type === 'paddle_hit') {
          this.soundManager.playPaddleHit(snd.intensity);
          this.sceneManager.triggerHitEffect(snd.pos);
          if (this.spRules.serve.server === 'player1') {
            this.inputController.triggerHitSwing();
          }
        } else if (snd.type === 'table_hit') {
          this.soundManager.playTableBounce(snd.intensity);
          this.sceneManager.triggerHitEffect(snd.pos);
        } else if (snd.type === 'net_hit') {
          this.soundManager.playNetHit();
        }
      }

      // ITTF Let service replay
      if (stepRes.isLet) {
        this.soundManager.playNetHit();
        this.uiManager.showAnnouncement('LET!', 'Ball clipped net — Re-serve', 1600);
        this.spBeginServe();
        return;
      }

      // Check if server struck the ball into play
      if (
        this.spPhysics.ball.active &&
        this.spPhysics.ball.serveState !== 'held' &&
        this.spPhysics.ball.serveState !== 'tossed'
      ) {
        this.spPhase = 'in_play';
      } else {
        // Serve timeout assistance: auto-launches cleanly so the ball NEVER gets stuck
        this.spPhaseTimer -= dt;
        if (this.spPhaseTimer <= 0) {
          const server = this.spRules.serve.server;
          const targetX = server === 'player1'
            ? this.inputController.targetPos.x
            : (this.spAI.chosenServeTargetX !== undefined ? this.spAI.chosenServeTargetX : (Math.random() - 0.5) * 0.4);
          this.spPhysics.launchServe(server, targetX);
          this.spPhase = 'in_play';
          this.soundManager.playPaddleHit(0.85);
          this.sceneManager.triggerHitEffect(this.spPhysics.ball.pos);
        }
      }
      return;
    }

    if (this.spPhase === 'point_scored') {
      this.spPhaseTimer -= dt;
      if (this.spPhaseTimer <= 0) {
        this.spBeginServe();
      }
      return;
    }

    if (this.spPhase === 'in_play') {
      const result = this.spPhysics.step(dt, SUB_STEPS);

      // Play sound events & hit ripples
      for (const snd of result.soundEvents) {
        if (snd.type === 'paddle_hit') {
          this.soundManager.playPaddleHit(snd.intensity);
          this.sceneManager.triggerHitEffect(snd.pos);
          if (this.spPhysics.ball.lastHitter === 'player1') {
            this.inputController.triggerHitSwing();
          }
        } else if (snd.type === 'table_hit') {
          this.soundManager.playTableBounce(snd.intensity);
          this.sceneManager.triggerHitEffect(snd.pos);
        } else if (snd.type === 'net_hit') {
          this.soundManager.playNetHit();
        }
      }

      // Check for mid-rally let or service let
      if (result.isLet) {
        this.soundManager.playNetHit();
        this.uiManager.showAnnouncement('LET!', 'Ball clipped net — Re-serve', 1600);
        this.spBeginServe();
        return;
      }

      if (result.pointEnded && result.pointWinner) {
        this.handleSinglePlayerPoint(result.pointWinner, result.pointReason || 'Point');
      }
    }
  }

  private handleSinglePlayerPoint(winner: PlayerSide, reason: string): void {
    const outcome = this.spRules.awardPoint(winner);
    this.soundManager.playScore();

    this.uiManager.updateScoreboard(outcome.score, this.spRules.serve.server);
    this.uiManager.showAnnouncement(
      `${winner === 'player1' ? 'YOU' : 'CPU'} POINT!`,
      reason,
      1600
    );

    if (outcome.gameOver) {
      this.spPhase = 'game_over';
      const isWinner = winner === 'player1';
      this.soundManager.playGameOver(isWinner);
      setTimeout(() => {
        this.uiManager.showGameOverModal(winner, outcome.score, isWinner);
      }, 1000);
    } else {
      this.spPhase = 'point_scored';
      this.spPhaseTimer = 2.0;
    }
  }

  // --- MULTIPLAYER FLOW ---
  private async handleCreateParty(playerName: string): Promise<void> {
    this.isHost = true;
    this.uiManager.showPartyLoading('Creating private room...');
    const res = await this.netClient.createParty(playerName);
    if (res.success && res.room) {
      this.currentMode = 'multiplayer';
      this.uiManager.showPartyLobby(res.room, true);
    } else {
      this.uiManager.showPartyError(res.error || 'Failed to create room. Please check server connection and retry.');
    }
  }

  private async handleJoinParty(code: string, playerName: string): Promise<void> {
    this.isHost = false;
    this.uiManager.showPartyLoading('Connecting to party room...');
    const res = await this.netClient.joinParty(code, playerName);
    if (res.success && res.room) {
      this.currentMode = 'multiplayer';
      this.uiManager.showPartyLobby(res.room, false);
    } else {
      this.uiManager.showPartyError(res.error || 'Party code not found, expired, or room is full.');
    }
  }

  private handleLeaveParty(): void {
    this.netClient.leaveParty();
    this.currentMode = 'none';
    this.uiManager.showMainMenu();
  }

  private updateMultiplayer(dt: number): void {
    // 1. Gather player input and send to server
    const input = this.inputController.update(dt);
    this.netClient.sendInput(input);

    // 2. Interpolate authoritative game snapshot
    const snap = this.netClient.getInterpolatedState(50);
    if (snap) {
      this.sceneManager.updateGameState(snap.ball, snap.paddle1, snap.paddle2, dt);
    }
  }

  // --- GENERAL CONTROLS ---
  private togglePause(): void {
    if (this.currentMode === 'none') return;
    this.isPaused = true;
    this.uiManager.showPauseModal();
  }

  private resumeGame(): void {
    this.isPaused = false;
    this.uiManager.hidePauseModal();
  }

  private toggleSound(): void {
    const isMuted = this.soundManager.toggleMute();
    this.uiManager.updateMuteState(isMuted);
    this.soundManager.playButtonClick();
  }

  private handleRematch(): void {
    if (this.currentMode === 'singleplayer') {
      this.startSinglePlayer(this.spAI.difficulty);
    } else if (this.currentMode === 'multiplayer') {
      this.netClient.rematch();
    }
  }

  private returnToMainMenu(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.currentMode = 'none';
    this.isPaused = false;
    this.spPhase = 'idle';
    this.inputController.resetSwing();
    if (this.netClient.roomState) {
      this.netClient.leaveParty();
    }
    this.uiManager.showMainMenu();
    this.sceneManager.resetCamera();
  }

  // --- MAIN ANIMATION LOOP ---
  private startAnimationLoop(): void {
    const loop = (time: number) => {
      requestAnimationFrame(loop);

      const rawDt = Math.min((time - this.lastTime) / 1000, 0.05); // clamp max dt to 50ms
      this.lastTime = time;

      if (this.currentMode === 'singleplayer') {
        this.physicsAccumulator += rawDt;
        // Clamp accumulator to avoid spiral of death on tab switch or pause
        if (this.physicsAccumulator > 0.1) this.physicsAccumulator = 0.1;

        // Fixed 60Hz physics integration loop
        while (this.physicsAccumulator >= PHYSICS_DT) {
          this.updateSinglePlayer(PHYSICS_DT);
          this.physicsAccumulator -= PHYSICS_DT;
        }

        // Render at native screen refresh rate (60Hz, 120Hz, 144Hz+) with zero stuttering or micro-freezes
        this.spPhysics.paddle1.pos.x = this.inputController.currentPaddle.pos.x;
        this.spPhysics.paddle1.pos.y = this.inputController.currentPaddle.pos.y;
        this.spPhysics.paddle1.pos.z = this.inputController.currentPaddle.pos.z;
        this.spPhysics.paddle1.rot.x = this.inputController.currentPaddle.rot.x;
        this.spPhysics.paddle1.rot.y = this.inputController.currentPaddle.rot.y;
        this.spPhysics.paddle1.rot.z = this.inputController.currentPaddle.rot.z;

        this.sceneManager.updateGameState(
          this.spPhysics.ball,
          this.spPhysics.paddle1,
          this.spPhysics.paddle2,
          rawDt
        );
      } else if (this.currentMode === 'multiplayer') {
        this.updateMultiplayer(rawDt);
      } else {
        // Idle menu scene
        this.sceneManager.updateGameState(
          this.spPhysics.ball,
          this.spPhysics.paddle1,
          this.spPhysics.paddle2,
          rawDt
        );
      }

      this.sceneManager.render();
    };

    requestAnimationFrame(loop);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  (window as any).gameApp = new GameApp();
});
