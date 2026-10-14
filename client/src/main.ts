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
  OPPONENT_PADDLE_Z,
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

  private currentMode: GameMode = 'none';
  private isPaused: boolean = false;
  private lastTime: number = performance.now();
  private isHost: boolean = false;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.sceneManager = new SceneManager(this.container);
    this.soundManager = new SoundManager();
    this.inputController = new InputController(this.container, this.sceneManager.camera);
    this.netClient = new NetworkClient();

    this.spPhysics = new PhysicsSimulation();
    this.spRules = new RuleEngine();
    this.spAI = new TableTennisAI('medium');

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

    this.setupNetworkCallbacks();
    this.startAnimationLoop();
  }

  private setupNetworkCallbacks(): void {
    this.netClient.onPartyUpdated = (room: RoomState) => {
      this.uiManager.showPartyLobby(room, this.isHost);
      this.uiManager.updateLobbySlots(room, this.isHost);
    };

    this.netClient.onGameCountdown = (count: number) => {
      this.soundManager.playButtonClick();
      if (count > 0) {
        this.uiManager.showAnnouncement(count.toString(), '', 900);
      } else {
        this.uiManager.showAnnouncement('PLAY!', '', 800);
      }
    };

    this.netClient.onGameSnapshot = (snap: GameSnapshot) => {
      if (this.currentMode !== 'multiplayer') {
        this.currentMode = 'multiplayer';
        const p1Name = this.netClient.roomState?.players.player1?.name || 'Player 1';
        const p2Name = this.netClient.roomState?.players.player2?.name || 'Player 2';
        this.uiManager.showHUD('multiplayer', p1Name, p2Name);
      }

      this.uiManager.updateScoreboard(snap.score, snap.serve.server);
      this.uiManager.updatePing(this.netClient.pingMs);

      // Play sound events received from server
      if (snap.soundEvents) {
        for (const snd of snap.soundEvents) {
          if (snd.type === 'paddle_hit') this.soundManager.playPaddleHit(snd.intensity);
          else if (snd.type === 'table_hit') this.soundManager.playTableBounce(snd.intensity);
          else if (snd.type === 'net_hit') this.soundManager.playNetHit();
          else if (snd.type === 'score') this.soundManager.playScore();
          else if (snd.type === 'applause') this.soundManager.playGameOver(true);
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
      this.returnToMainMenu();
    };
  }

  // --- SINGLE PLAYER FLOW ---
  public startSinglePlayer(difficulty: AIDifficulty): void {
    this.currentMode = 'singleplayer';
    this.isPaused = false;
    this.spAI.setDifficulty(difficulty);
    this.spAI.reset();
    this.spRules.reset('player1');
    this.spPhysics = new PhysicsSimulation();

    this.uiManager.showHUD('singleplayer', 'YOU', `CPU (${difficulty.toUpperCase()})`);
    this.uiManager.updateScoreboard(this.spRules.score, 'player1');

    this.inputController.setPosition(0.3, TABLE_HEIGHT + 0.15, PLAYER_PADDLE_Z);
    this.startSinglePlayerCountdown();
  }

  private startSinglePlayerCountdown(): void {
    this.spPhase = 'countdown';
    this.spCountdown = 3;
    this.spPhysics.prepareServe(this.spRules.serve.server);
    this.uiManager.showAnnouncement('3', 'Ready...', 900);
    this.soundManager.playButtonClick();

    const interval = setInterval(() => {
      if (this.currentMode !== 'singleplayer') {
        clearInterval(interval);
        return;
      }
      this.spCountdown--;
      if (this.spCountdown > 0) {
        this.uiManager.showAnnouncement(this.spCountdown.toString(), '', 900);
        this.soundManager.playButtonClick();
      } else if (this.spCountdown === 0) {
        this.uiManager.showAnnouncement('SERVE!', '', 800);
        this.soundManager.playPaddleHit(0.8);
        clearInterval(interval);
        this.spBeginServe();
      }
    }, 1000);
  }

  private spBeginServe(): void {
    this.spPhase = 'serving';
    this.spPhaseTimer = 0.5;
    this.spPhysics.prepareServe(this.spRules.serve.server);
  }

  private updateSinglePlayer(dt: number): void {
    if (this.isPaused) return;

    // 1. Update player paddle from input
    const input = this.inputController.update(dt);
    this.spPhysics.paddle1.pos = { ...this.inputController.currentPaddle.pos };
    this.spPhysics.paddle1.vel = { ...this.inputController.currentPaddle.vel };
    this.spPhysics.paddle1.rot = { ...this.inputController.currentPaddle.rot };

    // 2. Update AI paddle
    this.spAI.update(dt, this.spPhysics.ball, this.spPhysics.paddle2);

    // 3. State handling
    if (this.spPhase === 'serving') {
      this.spPhaseTimer -= dt;
      if (this.spPhaseTimer <= 0) {
        const server = this.spRules.serve.server;
        const targetX = (Math.random() - 0.5) * 0.6;
        this.spPhysics.launchServe(server, targetX);
        this.spPhase = 'in_play';
        this.soundManager.playPaddleHit(0.85);
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

      // Play sound events
      for (const snd of result.soundEvents) {
        if (snd.type === 'paddle_hit') this.soundManager.playPaddleHit(snd.intensity);
        else if (snd.type === 'table_hit') this.soundManager.playTableBounce(snd.intensity);
        else if (snd.type === 'net_hit') this.soundManager.playNetHit();
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
      this.spPhaseTimer = 1.8;
    }
  }

  // --- MULTIPLAYER FLOW ---
  private async handleCreateParty(playerName: string): Promise<void> {
    this.isHost = true;
    const res = await this.netClient.createParty(playerName);
    if (!res.success) {
      this.uiManager.showToast(res.error || 'Failed to create party');
    }
  }

  private async handleJoinParty(code: string, playerName: string): Promise<void> {
    this.isHost = false;
    const res = await this.netClient.joinParty(code, playerName);
    if (!res.success) {
      this.uiManager.showToast(res.error || 'Failed to join party');
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
      this.sceneManager.updateGameState(snap.ball, snap.paddle1, snap.paddle2);
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
    this.currentMode = 'none';
    this.isPaused = false;
    this.spPhase = 'idle';
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

      const dt = Math.min((time - this.lastTime) / 1000, 0.05); // clamp max dt to 50ms
      this.lastTime = time;

      if (this.currentMode === 'singleplayer') {
        this.updateSinglePlayer(dt);
        this.sceneManager.updateGameState(
          this.spPhysics.ball,
          this.spPhysics.paddle1,
          this.spPhysics.paddle2
        );
      } else if (this.currentMode === 'multiplayer') {
        this.updateMultiplayer(dt);
      } else {
        // Idle menu scene: gentle floating camera or static view
        this.sceneManager.updateGameState(
          this.spPhysics.ball,
          this.spPhysics.paddle1,
          this.spPhysics.paddle2
        );
      }

      this.sceneManager.render();
    };

    requestAnimationFrame(loop);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
