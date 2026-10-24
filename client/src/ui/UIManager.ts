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

  // DOM Elements - HUD
  private hudOverlay = document.getElementById('hud-overlay')!;
  private hudScoreP1 = document.getElementById('hud-score-p1')!;
  private hudScoreP2 = document.getElementById('hud-score-p2')!;
  private hudNameP1 = document.getElementById('hud-name-p1')!;
  private hudNameP2 = document.getElementById('hud-name-p2')!;
  private hudServeP1 = document.getElementById('hud-serve-p1')!;
  private hudServeP2 = document.getElementById('hud-serve-p2')!;
  private hudModeLabel = document.getElementById('hud-mode-label')!;
  private hudPingLabel = document.getElementById('hud-ping-label')!;

  private banner = document.getElementById('announcement-banner')!;
  private bannerText = document.getElementById('announcement-text')!;
  private bannerSub = document.getElementById('announcement-sub')!;

  private countdownOverlay = document.getElementById('countdown-overlay')!;
  private countdownDigit = document.getElementById('countdown-digit')!;
  private countdownSub = document.getElementById('countdown-sub')!;
  private countdownTimer: any = null;

  private prevScoreP1: number = 0;
  private prevScoreP2: number = 0;

  private btnPause = document.getElementById('btn-pause')!;
  private btnMute = document.getElementById('btn-mute')!;
  private muteIcon = document.getElementById('mute-icon')!;
  private headerMuteIcon = document.getElementById('header-mute-icon');

  private hudControlTip = document.getElementById('hud-control-tip');
  private hudSwingBadge = document.getElementById('hud-swing-badge');
  private swingBadgeTimer: any = null;
  private controlTipTimer: any = null;

  // Modals & Containers
  private modalMainMenu = document.getElementById('modal-main-menu')!;
  private modalCpuDifficulty = document.getElementById('modal-cpu-difficulty')!;
  private modalParty = document.getElementById('modal-party')!;
  private modalHowToPlay = document.getElementById('modal-how-to-play')!;
  private modalPause = document.getElementById('modal-pause')!;
  private modalGameOver = document.getElementById('modal-game-over')!;

  // Party views & controls
  private tabCreate = document.querySelector('[data-tab="create"]')!;
  private tabJoin = document.querySelector('[data-tab="join"]')!;
  private viewPartyCreate = document.getElementById('view-party-create')!;
  private viewPartyJoin = document.getElementById('view-party-join')!;
  private viewPartyLobby = document.getElementById('view-party-lobby')!;
  private inputPlayerName = document.getElementById('input-player-name') as HTMLInputElement;
  private inputPartyCode = document.getElementById('input-party-code') as HTMLInputElement;
  private displayPartyCode = document.getElementById('display-party-code')!;
  private btnCopyPartyCode = document.getElementById('btn-copy-party-code');

  private partyLoadingContainer = document.getElementById('party-loading-container');
  private partyLoadingText = document.getElementById('party-loading-text');
  private partyErrorContainer = document.getElementById('party-error-container');
  private partyErrorText = document.getElementById('party-error-text');
  private btnPartyRetry = document.getElementById('btn-party-retry');
  private btnCreatePartyAction = document.getElementById('btn-create-party-action') as HTMLButtonElement;
  private btnJoinPartyAction = document.getElementById('btn-join-party-action') as HTMLButtonElement;

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
  private currentPartyTab: 'create' | 'join' = 'create';

  constructor(handlers: UIEventHandlers) {
    this.handlers = handlers;
    this.bindEvents();
  }

  private bindEvents(): void {
    // --- Full-page Menu Direct Actions ---
    const btnStartCpuInstant = document.getElementById('btn-start-vs-cpu-instant');
    if (btnStartCpuInstant) {
      btnStartCpuInstant.addEventListener('click', () => {
        this.handlers.onStartVsCPU(this.selectedDifficulty);
      });
    }

    const btnOpenCreate = document.getElementById('btn-open-create-party');
    if (btnOpenCreate) {
      btnOpenCreate.addEventListener('click', () => {
        this.resetPartyModal();
        this.setPartyTab('create');
        this.modalParty.style.display = 'flex';
      });
    }

    const btnOpenJoin = document.getElementById('btn-open-join-party');
    if (btnOpenJoin) {
      btnOpenJoin.addEventListener('click', () => {
        this.resetPartyModal();
        this.setPartyTab('join');
        this.modalParty.style.display = 'flex';
      });
    }

    // Home Difficulty Pills
    const homeDiffPills = document.querySelectorAll('#home-diff-pills .diff-pill');
    homeDiffPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        homeDiffPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedDifficulty = (pill.getAttribute('data-diff') as AIDifficulty) || 'medium';
      });
    });

    // Header actions
    const btnBrandHome = document.getElementById('btn-brand-home');
    if (btnBrandHome) {
      btnBrandHome.addEventListener('click', () => {
        this.hideAllModals();
        this.showMainMenu();
      });
    }

    const btnHeaderRules = document.getElementById('btn-header-rules');
    if (btnHeaderRules) {
      btnHeaderRules.addEventListener('click', () => {
        this.modalHowToPlay.style.display = 'flex';
      });
    }

    const btnHeaderSound = document.getElementById('btn-header-sound');
    if (btnHeaderSound) {
      btnHeaderSound.addEventListener('click', () => {
        this.handlers.onToggleSound();
      });
    }

    // Main Menu Buttons (Legacy / Secondary Support)
    const btnMenuCpu = document.getElementById('btn-menu-vs-cpu');
    if (btnMenuCpu) {
      btnMenuCpu.addEventListener('click', () => {
        this.modalMainMenu.style.display = 'none';
        this.modalCpuDifficulty.style.display = 'flex';
      });
    }

    const btnMenuParty = document.getElementById('btn-menu-party');
    if (btnMenuParty) {
      btnMenuParty.addEventListener('click', () => {
        this.resetPartyModal();
        this.setPartyTab('create');
        this.modalParty.style.display = 'flex';
      });
    }

    const btnMenuHowTo = document.getElementById('btn-menu-how-to-play');
    if (btnMenuHowTo) {
      btnMenuHowTo.addEventListener('click', () => {
        this.modalHowToPlay.style.display = 'flex';
      });
    }

    const btnCloseHowTo = document.getElementById('btn-close-how-to-play');
    if (btnCloseHowTo) {
      btnCloseHowTo.addEventListener('click', () => {
        this.modalHowToPlay.style.display = 'none';
      });
    }

    // Difficulty Modal selection
    const diffCards = document.querySelectorAll('.diff-card');
    diffCards.forEach((card) => {
      card.addEventListener('click', () => {
        diffCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedDifficulty = (card.getAttribute('data-diff') as AIDifficulty) || 'medium';
      });
    });

    const btnStartCpuGame = document.getElementById('btn-start-cpu-game');
    if (btnStartCpuGame) {
      btnStartCpuGame.addEventListener('click', () => {
        this.modalCpuDifficulty.style.display = 'none';
        this.handlers.onStartVsCPU(this.selectedDifficulty);
      });
    }

    const btnBackToMainFromDiff = document.getElementById('btn-back-to-main-from-diff');
    if (btnBackToMainFromDiff) {
      btnBackToMainFromDiff.addEventListener('click', () => {
        this.modalCpuDifficulty.style.display = 'none';
        this.modalMainMenu.style.display = 'flex';
      });
    }

    // Party Tabs
    this.tabCreate.addEventListener('click', () => this.setPartyTab('create'));
    this.tabJoin.addEventListener('click', () => this.setPartyTab('join'));

    // Party Create Action
    if (this.btnCreatePartyAction) {
      this.btnCreatePartyAction.addEventListener('click', () => {
        const name = this.inputPlayerName.value.trim() || 'Player 1';
        this.handlers.onCreateParty(name);
      });
    }

    // Party Join Action
    if (this.btnJoinPartyAction) {
      this.btnJoinPartyAction.addEventListener('click', () => {
        const name = this.inputPlayerName.value.trim() || 'Player 2';
        const code = this.inputPartyCode.value.trim().toUpperCase();
        if (!code) {
          this.showToast('Please enter a 6-character party code');
          return;
        }
        this.handlers.onJoinParty(code, name);
      });
    }

    // Party Retry Action
    if (this.btnPartyRetry) {
      this.btnPartyRetry.addEventListener('click', () => {
        if (this.currentPartyTab === 'create') {
          const name = this.inputPlayerName.value.trim() || 'Player 1';
          this.handlers.onCreateParty(name);
        } else {
          const name = this.inputPlayerName.value.trim() || 'Player 2';
          const code = this.inputPartyCode.value.trim().toUpperCase();
          if (!code) {
            this.showToast('Please enter a 6-character party code');
            return;
          }
          this.handlers.onJoinParty(code, name);
        }
      });
    }

    // Copy party code
    this.displayPartyCode.addEventListener('click', () => {
      this.copyPartyCode();
    });

    if (this.btnCopyPartyCode) {
      this.btnCopyPartyCode.addEventListener('click', () => {
        this.copyPartyCode();
      });
    }

    // Ready button
    this.btnLobbyReady.addEventListener('click', () => {
      this.isPlayerReady = !this.isPlayerReady;
      this.btnLobbyReady.innerText = this.isPlayerReady ? 'Cancel Ready' : 'Ready Up';
      this.handlers.onReadyToggle(this.isPlayerReady);
    });

    // Start Party Match (Host only)
    this.btnLobbyStart.addEventListener('click', () => {
      this.btnLobbyStart.innerText = 'Starting Match...';
      this.btnLobbyStart.disabled = true;
      this.handlers.onStartPartyMatch();
    });

    // Leave Party
    const btnLeaveParty = document.getElementById('btn-leave-party');
    if (btnLeaveParty) {
      btnLeaveParty.addEventListener('click', () => {
        this.handlers.onLeaveParty();
        this.resetPartyModal();
      });
    }

    const btnBackToMainFromParty = document.getElementById('btn-back-to-main-from-party');
    if (btnBackToMainFromParty) {
      btnBackToMainFromParty.addEventListener('click', () => {
        this.handlers.onLeaveParty();
        this.modalParty.style.display = 'none';
        this.modalMainMenu.style.display = 'flex';
        this.resetPartyModal();
      });
    }

    // Top-right match buttons
    this.btnPause.addEventListener('click', () => {
      this.handlers.onPauseGame();
    });

    this.btnMute.addEventListener('click', () => {
      this.handlers.onToggleSound();
    });

    // Pause Modal Buttons
    const btnResume = document.getElementById('btn-resume-game');
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        this.modalPause.style.display = 'none';
        this.handlers.onResumeGame();
      });
    }

    const btnPauseMute = document.getElementById('btn-pause-mute');
    if (btnPauseMute) {
      btnPauseMute.addEventListener('click', () => {
        this.handlers.onToggleSound();
      });
    }

    const btnQuit = document.getElementById('btn-quit-to-menu');
    if (btnQuit) {
      btnQuit.addEventListener('click', () => {
        this.modalPause.style.display = 'none';
        this.handlers.onReturnToMenu();
      });
    }

    // Game Over Buttons
    const btnRematch = document.getElementById('btn-rematch');
    if (btnRematch) {
      btnRematch.addEventListener('click', () => {
        this.modalGameOver.style.display = 'none';
        this.handlers.onRematch();
      });
    }

    const btnGameOverMain = document.getElementById('btn-game-over-main-menu');
    if (btnGameOverMain) {
      btnGameOverMain.addEventListener('click', () => {
        this.modalGameOver.style.display = 'none';
        this.handlers.onReturnToMenu();
      });
    }
  }

  public copyPartyCode(): void {
    if (!this.currentRoomCode) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.currentRoomCode).then(() => {
        this.showToast(`Party code ${this.currentRoomCode} copied!`);
      }).catch(() => {
        this.showToast(`Code: ${this.currentRoomCode}`);
      });
    } else {
      this.showToast(`Party code: ${this.currentRoomCode}`);
    }
  }

  public setPartyTab(tab: 'create' | 'join'): void {
    this.currentPartyTab = tab;
    this.resetPartyLoading();

    const tabs = document.getElementById('party-tabs');
    if (tabs) tabs.style.display = 'flex';
    const nicknameGroup = document.getElementById('party-nickname-group');
    if (nicknameGroup) nicknameGroup.style.display = 'flex';
    const btnBack = document.getElementById('btn-back-to-main-from-party');
    if (btnBack) btnBack.style.display = 'flex';

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

  public showPartyLoading(message: string): void {
    if (this.partyLoadingContainer) {
      this.partyLoadingContainer.style.display = 'flex';
    }
    if (this.partyLoadingText) {
      this.partyLoadingText.innerText = message;
    }
    if (this.partyErrorContainer) {
      this.partyErrorContainer.style.display = 'none';
    }
    if (this.btnCreatePartyAction) this.btnCreatePartyAction.disabled = true;
    if (this.btnJoinPartyAction) this.btnJoinPartyAction.disabled = true;
  }

  public showPartyError(errorMessage: string): void {
    if (this.partyLoadingContainer) {
      this.partyLoadingContainer.style.display = 'none';
    }
    if (this.btnCreatePartyAction) this.btnCreatePartyAction.disabled = false;
    if (this.btnJoinPartyAction) this.btnJoinPartyAction.disabled = false;

    if (this.partyErrorContainer) {
      this.partyErrorContainer.style.display = 'flex';
    }
    if (this.partyErrorText) {
      this.partyErrorText.innerText = errorMessage;
    }
  }

  public resetPartyLoading(): void {
    if (this.partyLoadingContainer) {
      this.partyLoadingContainer.style.display = 'none';
    }
    if (this.partyErrorContainer) {
      this.partyErrorContainer.style.display = 'none';
    }
    if (this.btnCreatePartyAction) this.btnCreatePartyAction.disabled = false;
    if (this.btnJoinPartyAction) this.btnJoinPartyAction.disabled = false;
  }

  public showPartyLobby(room: RoomState, isHost: boolean): void {
    this.currentRoomCode = room.code;
    this.displayPartyCode.innerText = room.code;
    this.resetPartyLoading();

    const tabs = document.getElementById('party-tabs');
    if (tabs) tabs.style.display = 'none';
    const nicknameGroup = document.getElementById('party-nickname-group');
    if (nicknameGroup) nicknameGroup.style.display = 'none';
    const btnBack = document.getElementById('btn-back-to-main-from-party');
    if (btnBack) btnBack.style.display = 'none';

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
      const hasGuest = Boolean(p2);
      const canStart = hasGuest && (p1?.isReady ?? true) && (p2?.isReady ?? true);
      this.btnLobbyStart.disabled = !canStart;
      if (!hasGuest) {
        this.btnLobbyStart.innerText = 'Waiting for friend to join...';
      } else if (!canStart) {
        this.btnLobbyStart.innerText = 'Waiting for both players to be ready';
      } else {
        this.btnLobbyStart.innerText = 'Start Match!';
      }
    } else {
      this.btnLobbyStart.style.display = 'none';
    }
  }

  public resetPartyModal(): void {
    this.isPlayerReady = false;
    this.btnLobbyReady.innerText = 'Ready Up';
    this.currentRoomCode = '';
    this.resetPartyLoading();
    this.setPartyTab('create');
  }

  public showHUD(mode: 'singleplayer' | 'multiplayer', p1Name: string = 'YOU', p2Name: string = 'CPU'): void {
    this.hideAllModals();
    document.body.classList.add('in-game');
    this.hudOverlay.style.display = 'block';
    this.hudNameP1.innerText = p1Name;
    this.hudNameP2.innerText = p2Name;

    // Reset scores cleanly
    this.prevScoreP1 = 0;
    this.prevScoreP2 = 0;
    this.hudScoreP1.innerText = '0';
    this.hudScoreP2.innerText = '0';
    this.hudScoreP1.classList.remove('score-pop');
    this.hudScoreP2.classList.remove('score-pop');

    this.hudModeLabel.innerText = mode === 'singleplayer' ? `Singleplayer (${this.selectedDifficulty})` : 'Online Party Match';
    this.hudPingLabel.style.display = mode === 'multiplayer' ? 'inline' : 'none';
  }

  public hideHUD(): void {
    document.body.classList.remove('in-game');
    this.hudOverlay.style.display = 'none';
    this.hideCountdown();
  }

  public updateScoreboard(score: MatchScore, server: PlayerSide): void {
    if (score.player1 !== this.prevScoreP1) {
      this.hudScoreP1.innerText = score.player1.toString();
      if (score.player1 > this.prevScoreP1) {
        this.triggerScoreCardAnimation(this.hudScoreP1);
      }
      this.prevScoreP1 = score.player1;
    }

    if (score.player2 !== this.prevScoreP2) {
      this.hudScoreP2.innerText = score.player2.toString();
      if (score.player2 > this.prevScoreP2) {
        this.triggerScoreCardAnimation(this.hudScoreP2);
      }
      this.prevScoreP2 = score.player2;
    }

    if (server === 'player1') {
      this.hudServeP1.classList.add('active');
      this.hudServeP2.classList.remove('active');
    } else {
      this.hudServeP2.classList.add('active');
      this.hudServeP1.classList.remove('active');
    }
  }

  private triggerScoreCardAnimation(el: HTMLElement): void {
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  }

  public showCountdown(count: number | string, subText?: string): void {
    if (!this.countdownOverlay || !this.countdownDigit) return;

    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    const str = count.toString().toUpperCase();
    this.countdownDigit.innerText = str;

    if (typeof count === 'number') {
      this.countdownDigit.style.fontSize = '';
      this.countdownSub.innerText = subText || (count === 3 ? 'READY...' : count === 1 ? 'GET SET!' : 'FOCUS!');
    } else {
      this.countdownDigit.style.fontSize = 'clamp(44px, 9vw, 80px)';
      this.countdownSub.innerText = subText || 'RALLY START!';
    }

    this.countdownOverlay.classList.add('active');
    this.countdownDigit.classList.remove('burst');
    void this.countdownDigit.offsetWidth;
    this.countdownDigit.classList.add('burst');

    const duration = typeof count === 'number' ? 880 : 1050;
    this.countdownTimer = setTimeout(() => {
      this.countdownOverlay.classList.remove('active');
      this.countdownDigit.classList.remove('burst');
    }, duration);
  }

  public hideCountdown(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.remove('active');
      if (this.countdownDigit) {
        this.countdownDigit.classList.remove('burst');
      }
    }
  }

  public updatePing(pingMs: number): void {
    this.hudPingLabel.innerText = `Ping: ${pingMs}ms`;
  }

  public showAnnouncement(_text: string, _subText: string = '', _durationMs: number = 1500): void {
    // In-game announcements suppressed per user request for clean, uncluttered gameplay
  }

  public hideAnnouncement(): void {
    if (this.banner) {
      this.banner.classList.remove('visible');
    }
  }

  public showPauseModal(): void {
    document.body.classList.remove('in-game');
    this.modalPause.style.display = 'flex';
  }

  public hidePauseModal(): void {
    document.body.classList.add('in-game');
    this.modalPause.style.display = 'none';
  }

  public showGameOverModal(winner: PlayerSide, score: MatchScore, isPlayer1Winner: boolean): void {
    document.body.classList.remove('in-game');
    const headline = document.getElementById('winner-headline')!;
    const subtitle = document.getElementById('winner-subtitle')!;
    const fScoreP1 = document.getElementById('final-score-p1')!;
    const fScoreP2 = document.getElementById('final-score-p2')!;

    fScoreP1.innerText = score.player1.toString();
    fScoreP2.innerText = score.player2.toString();

    if (isPlayer1Winner) {
      headline.innerText = 'VICTORY!';
      headline.style.color = '#34332F';
      subtitle.innerText = 'You won the match!';
    } else {
      headline.innerText = 'MATCH FINISHED';
      headline.style.color = '#77736C';
      subtitle.innerText = `${winner === 'player1' ? 'Player 1' : 'Player 2'} won the match.`;
    }

    this.modalGameOver.style.display = 'flex';
  }

  public showMainMenu(): void {
    document.body.classList.remove('in-game');
    this.hideAllModals();
    this.hideHUD();
    this.modalMainMenu.style.display = 'flex';

    // Re-trigger card entrance animations smoothly
    const cards = this.modalMainMenu.querySelectorAll('.menu-card');
    cards.forEach((card) => {
      const el = card as HTMLElement;
      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = '';
    });
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
    if (this.headerMuteIcon) {
      this.headerMuteIcon.innerText = isMuted ? '🔇 Sound: MUTED' : '🔊 Sound: ON';
    }
    const pauseMute = document.getElementById('pause-mute-text');
    if (pauseMute) {
      pauseMute.innerText = isMuted ? '🔇 Sound: MUTED' : '🔊 Sound: ON';
    }
  }

  public showControlHint(_durationMs: number = 4000): void {
    // In-game control hints suppressed per user request
  }

  public showSwingIndicator(_strength: number): void {
    // In-game swing text indicators suppressed per user request
  }

  public showToast(msg: string): void {
    this.toastMsg.innerText = msg;
    this.toastMsg.classList.add('show');
    setTimeout(() => {
      this.toastMsg.classList.remove('show');
    }, 2500);
  }
}
