import { AIDifficulty, MatchScore, PlayerProfile, PlayerSide, RoomState } from '../../../shared/types.js';

export interface UIEventHandlers {
  onStartVsCPU: (difficulty: AIDifficulty) => void;
  onCreateParty: (playerName: string) => void;
  onJoinParty: (code: string, playerName: string) => void;
  onReadyToggle: (isReady: boolean) => void;
  onStartPartyMatch: () => void;
  onLeaveParty: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onToggleSound: () => void;
  onRematch: () => void;
  onReturnToMenu: () => void;
}

export class UIManager {
  private handlers: UIEventHandlers;

  // DOM Elements
  private hudOverlay = document.getElementById('hud-overlay')!;
  private hudScoreP1 = document.getElementById('hud-score-p1')!;
  private hudScoreP2 = document.getElementById('hud-score-p2')!;
  private hudNameP1 = document.getElementById('hud-name-p1')!;
  private hudNameP2 = document.getElementById('hud-name-p2')!;
  private hudFlagP1 = document.getElementById('hud-flag-p1')!;
  private hudFlagP2 = document.getElementById('hud-flag-p2')!;
  private hudServeP1 = document.getElementById('hud-serve-p1')!;
  private hudServeP2 = document.getElementById('hud-serve-p2')!;
  private hudModeLabel = document.getElementById('hud-mode-label')!;
  private hudPingLabel = document.getElementById('hud-ping-label')!;

  private banner = document.getElementById('announcement-banner')!;
  private bannerText = document.getElementById('announcement-text')!;
  private bannerSub = document.getElementById('announcement-sub')!;

  private btnPause = document.getElementById('btn-pause')!;
  private btnMute = document.getElementById('btn-mute')!;
  private muteIcon = document.getElementById('mute-icon')!;

  private hudControlTip = document.getElementById('hud-control-tip');
  private hudSwingBadge = document.getElementById('hud-swing-badge');
  private swingBadgeTimer: any = null;
  private controlTipTimer: any = null;

  // Modals
  private modalMainMenu = document.getElementById('modal-main-menu')!;
  private modalCpuDifficulty = document.getElementById('modal-cpu-difficulty')!;
  private modalParty = document.getElementById('modal-party')!;
  private modalHowToPlay = document.getElementById('modal-how-to-play')!;
  private modalPause = document.getElementById('modal-pause')!;
  private modalGameOver = document.getElementById('modal-game-over')!;

  // Party views
  private tabCreate = document.querySelector('[data-tab="create"]')!;
  private tabJoin = document.querySelector('[data-tab="join"]')!;
  private viewPartyCreate = document.getElementById('view-party-create')!;
  private viewPartyJoin = document.getElementById('view-party-join')!;
  private viewPartyLobby = document.getElementById('view-party-lobby')!;
  private inputPlayerName = document.getElementById('input-player-name') as HTMLInputElement;
  private inputPartyCode = document.getElementById('input-party-code') as HTMLInputElement;
  private displayPartyCode = document.getElementById('display-party-code')!;

  private lobbySlot1Name = document.getElementById('lobby-slot1-name')!;
  private lobbySlot1Status = document.getElementById('lobby-slot1-status')!;
  private lobbySlot2Name = document.getElementById('lobby-slot2-name')!;
  private lobbySlot2Status = document.getElementById('lobby-slot2-status')!;
  private btnLobbyReady = document.getElementById('btn-lobby-ready') as HTMLButtonElement;
  private btnLobbyStart = document.getElementById('btn-lobby-start') as HTMLButtonElement;

  private toastMsg = document.getElementById('toast-msg')!;

  // State
  private selectedDifficulty: AIDifficulty = 'medium';
  private isPlayerReady: boolean = false;
  private currentRoomCode: string = '';

  constructor(handlers: UIEventHandlers) {
    this.handlers = handlers;
    this.bindEvents();
  }

  private bindEvents(): void {
    // Main Menu Buttons
    document.getElementById('btn-menu-vs-cpu')!.addEventListener('click', () => {
      this.modalMainMenu.style.display = 'none';
      this.modalCpuDifficulty.style.display = 'flex';
    });

    document.getElementById('btn-menu-party')!.addEventListener('click', () => {
      this.modalMainMenu.style.display = 'none';
      this.modalParty.style.display = 'flex';
      this.setPartyTab('create');
    });

    document.getElementById('btn-menu-how-to-play')!.addEventListener('click', () => {
      this.modalHowToPlay.style.display = 'flex';
    });

    document.getElementById('btn-close-how-to-play')!.addEventListener('click', () => {
      this.modalHowToPlay.style.display = 'none';
    });

    // Difficulty selection
    const diffCards = document.querySelectorAll('.diff-card');
    diffCards.forEach((card) => {
      card.addEventListener('click', () => {
        diffCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedDifficulty = (card.getAttribute('data-diff') as AIDifficulty) || 'medium';
      });
    });

    document.getElementById('btn-start-cpu-game')!.addEventListener('click', () => {
      this.modalCpuDifficulty.style.display = 'none';
      this.handlers.onStartVsCPU(this.selectedDifficulty);
    });

    document.getElementById('btn-back-to-main-from-diff')!.addEventListener('click', () => {
      this.modalCpuDifficulty.style.display = 'none';
      this.modalMainMenu.style.display = 'flex';
    });

    // Party Tabs
    this.tabCreate.addEventListener('click', () => this.setPartyTab('create'));
    this.tabJoin.addEventListener('click', () => this.setPartyTab('join'));

    document.getElementById('btn-create-party-action')!.addEventListener('click', () => {
      const name = this.inputPlayerName.value.trim() || 'Player 1';
      this.handlers.onCreateParty(name);
    });

    document.getElementById('btn-join-party-action')!.addEventListener('click', () => {
      const name = this.inputPlayerName.value.trim() || 'Player 2';
      const code = this.inputPartyCode.value.trim().toUpperCase();
      if (!code) {
        this.showToast('Please enter a party code');
        return;
      }
      this.handlers.onJoinParty(code, name);
    });

    // Copy party code
    this.displayPartyCode.addEventListener('click', () => {
      if (!this.currentRoomCode) return;
      navigator.clipboard.writeText(this.currentRoomCode);
      this.showToast(`Party code ${this.currentRoomCode} copied!`);
    });

    // Ready button
    this.btnLobbyReady.addEventListener('click', () => {
      this.isPlayerReady = !this.isPlayerReady;
      this.btnLobbyReady.innerText = this.isPlayerReady ? 'Cancel Ready' : 'Ready Up';
      this.handlers.onReadyToggle(this.isPlayerReady);
    });

    // Start Party Match (Host only)
    this.btnLobbyStart.addEventListener('click', () => {
      this.handlers.onStartPartyMatch();
    });

    // Leave Party
    document.getElementById('btn-leave-party')!.addEventListener('click', () => {
      this.handlers.onLeaveParty();
      this.resetPartyModal();
    });

    document.getElementById('btn-back-to-main-from-party')!.addEventListener('click', () => {
      this.handlers.onLeaveParty();
      this.modalParty.style.display = 'none';
      this.modalMainMenu.style.display = 'flex';
      this.resetPartyModal();
    });

    // Top-right buttons
    this.btnPause.addEventListener('click', () => {
      this.handlers.onPauseGame();
    });

    this.btnMute.addEventListener('click', () => {
      this.handlers.onToggleSound();
    });

    // Pause Modal Buttons
    document.getElementById('btn-resume-game')!.addEventListener('click', () => {
      this.modalPause.style.display = 'none';
      this.handlers.onResumeGame();
    });

    document.getElementById('btn-pause-mute')!.addEventListener('click', () => {
      this.handlers.onToggleSound();
    });

    document.getElementById('btn-quit-to-menu')!.addEventListener('click', () => {
      this.modalPause.style.display = 'none';
      this.handlers.onReturnToMenu();
    });

    // Game Over Buttons
    document.getElementById('btn-rematch')!.addEventListener('click', () => {
      this.modalGameOver.style.display = 'none';
      this.handlers.onRematch();
    });

    document.getElementById('btn-game-over-main-menu')!.addEventListener('click', () => {
      this.modalGameOver.style.display = 'none';
      this.handlers.onReturnToMenu();
    });
  }

  public setPartyTab(tab: 'create' | 'join'): void {
    if (tab === 'create') {
      this.tabCreate.classList.add('active');
      this.tabJoin.classList.remove('active');
      this.viewPartyCreate.style.display = 'flex';
      this.viewPartyJoin.style.display = 'none';
      this.viewPartyLobby.style.display = 'none';
    } else {
      this.tabJoin.classList.add('active');
      this.tabCreate.classList.remove('active');
      this.viewPartyJoin.style.display = 'flex';
      this.viewPartyCreate.style.display = 'none';
      this.viewPartyLobby.style.display = 'none';
    }
  }

  public showPartyLobby(room: RoomState, isHost: boolean): void {
    this.currentRoomCode = room.code;
    this.displayPartyCode.innerText = room.code;

    this.viewPartyCreate.style.display = 'none';
    this.viewPartyJoin.style.display = 'none';
    this.viewPartyLobby.style.display = 'flex';

    this.updateLobbySlots(room, isHost);
  }

  public updateLobbySlots(room: RoomState, isHost: boolean): void {
    const p1 = room.players.player1;
    const p2 = room.players.player2;

    if (p1) {
      this.lobbySlot1Name.innerText = p1.name + (isHost ? ' (You)' : '');
      this.lobbySlot1Status.innerText = p1.isReady ? 'Ready' : 'Not Ready';
      this.lobbySlot1Status.className = `slot-status-pill ${p1.isReady ? 'status-ready' : 'status-waiting'}`;
    }

    if (p2) {
      this.lobbySlot2Name.innerText = p2.name + (!isHost ? ' (You)' : '');
      this.lobbySlot2Status.innerText = p2.isReady ? 'Ready' : 'Not Ready';
      this.lobbySlot2Status.className = `slot-status-pill ${p2.isReady ? 'status-ready' : 'status-waiting'}`;
    } else {
      this.lobbySlot2Name.innerText = 'Waiting for friend to join...';
      this.lobbySlot2Status.innerText = 'Waiting';
      this.lobbySlot2Status.className = 'slot-status-pill status-waiting';
    }

    if (isHost) {
      this.btnLobbyStart.style.display = 'flex';
      const canStart = p1?.isReady && p2?.isReady;
      this.btnLobbyStart.disabled = !canStart;
      this.btnLobbyStart.innerText = canStart ? 'Start Match!' : 'Waiting for both players to be ready';
    } else {
      this.btnLobbyStart.style.display = 'none';
    }
  }

  public resetPartyModal(): void {
    this.isPlayerReady = false;
    this.btnLobbyReady.innerText = 'Ready Up';
    this.currentRoomCode = '';
    this.setPartyTab('create');
  }

  public showHUD(mode: 'singleplayer' | 'multiplayer', p1Name: string = 'YOU', p2Name: string = 'CPU'): void {
    this.hideAllModals();
    this.hudOverlay.style.display = 'block';
    this.hudNameP1.innerText = p1Name;
    this.hudNameP2.innerText = p2Name;
    this.hudModeLabel.innerText = mode === 'singleplayer' ? `Singleplayer (${this.selectedDifficulty})` : 'Online Party Match';
    this.hudPingLabel.style.display = mode === 'multiplayer' ? 'inline' : 'none';
  }

  public hideHUD(): void {
    this.hudOverlay.style.display = 'none';
  }

  public updateScoreboard(score: MatchScore, server: PlayerSide): void {
    this.hudScoreP1.innerText = score.player1.toString();
    this.hudScoreP2.innerText = score.player2.toString();

    if (server === 'player1') {
      this.hudServeP1.classList.add('active');
      this.hudServeP2.classList.remove('active');
    } else {
      this.hudServeP2.classList.add('active');
      this.hudServeP1.classList.remove('active');
    }
  }

  public updatePing(pingMs: number): void {
    this.hudPingLabel.innerText = `Ping: ${pingMs}ms`;
  }

  public showAnnouncement(text: string, subText: string = '', durationMs: number = 1500): void {
    this.bannerText.innerText = text;
    this.bannerSub.innerText = subText;
    this.banner.classList.add('visible');

    if (durationMs > 0) {
      setTimeout(() => {
        this.banner.classList.remove('visible');
      }, durationMs);
    }
  }

  public hideAnnouncement(): void {
    this.banner.classList.remove('visible');
  }

  public showPauseModal(): void {
    this.modalPause.style.display = 'flex';
  }

  public hidePauseModal(): void {
    this.modalPause.style.display = 'none';
  }

  public showGameOverModal(winner: PlayerSide, score: MatchScore, isPlayer1Winner: boolean): void {
    const headline = document.getElementById('winner-headline')!;
    const subtitle = document.getElementById('winner-subtitle')!;
    const fScoreP1 = document.getElementById('final-score-p1')!;
    const fScoreP2 = document.getElementById('final-score-p2')!;

    fScoreP1.innerText = score.player1.toString();
    fScoreP2.innerText = score.player2.toString();

    if (isPlayer1Winner) {
      headline.innerText = 'VICTORY!';
      headline.style.color = '#ffdf4a';
      subtitle.innerText = 'You won the match!';
    } else {
      headline.innerText = 'MATCH FINISHED';
      headline.style.color = '#e2e8f0';
      subtitle.innerText = `${winner === 'player1' ? 'Player 1' : 'Player 2'} won the match.`;
    }

    this.modalGameOver.style.display = 'flex';
  }

  public showMainMenu(): void {
    this.hideAllModals();
    this.hideHUD();
    this.modalMainMenu.style.display = 'flex';
  }

  public hideAllModals(): void {
    this.modalMainMenu.style.display = 'none';
    this.modalCpuDifficulty.style.display = 'none';
    this.modalParty.style.display = 'none';
    this.modalHowToPlay.style.display = 'none';
    this.modalPause.style.display = 'none';
    this.modalGameOver.style.display = 'none';
  }

  public updateMuteState(isMuted: boolean): void {
    this.muteIcon.innerText = isMuted ? '🔇' : '🔊';
    const pauseMute = document.getElementById('pause-mute-text');
    if (pauseMute) {
      pauseMute.innerText = isMuted ? '🔇 Sound: MUTED' : '🔊 Sound: ON';
    }
  }

  public showControlHint(durationMs: number = 4000): void {
    if (!this.hudControlTip) return;
    this.hudControlTip.style.opacity = '1';
    if (this.controlTipTimer) clearTimeout(this.controlTipTimer);
    this.controlTipTimer = setTimeout(() => {
      if (this.hudControlTip) this.hudControlTip.style.opacity = '0';
    }, durationMs);
  }

  public showSwingIndicator(strength: number): void {
    if (!this.hudSwingBadge) return;
    const powerText = strength > 0.8 ? 'SMASH DRIVE!' : (strength > 0.6 ? 'STRONG SWING!' : 'SWING STRIKE!');
    this.hudSwingBadge.innerText = powerText;
    this.hudSwingBadge.classList.add('active');

    if (this.swingBadgeTimer) clearTimeout(this.swingBadgeTimer);
    this.swingBadgeTimer = setTimeout(() => {
      if (this.hudSwingBadge) this.hudSwingBadge.classList.remove('active');
    }, 450);
  }

  public showToast(msg: string): void {
    this.toastMsg.innerText = msg;
    this.toastMsg.classList.add('show');
    setTimeout(() => {
      this.toastMsg.classList.remove('show');
    }, 2500);
  }
}
