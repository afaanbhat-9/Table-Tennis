export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public isMuted: boolean = false;
  public volume: number = 0.85;

  constructor() {
    // Lazy initialize on first user gesture
    const unlockAudio = () => {
      this.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
  }

  private init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Subtle, soft, and gentle paddle ball impact sound ("very little and nice").
   * Quiet, satisfying, and pleasant wooden/rubber tap without harsh or loud boom.
   */
  public playPaddleHit(intensity: number = 0.8): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const clampedIntensity = Math.min(1.2, Math.max(0.4, intensity));

    // Soft warm organic tap (340 Hz down to 210 Hz in 28ms)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.028);

    // Keep volume gentle and subtle (~0.14)
    const softVolume = 0.14 * clampedIntensity;
    gain.gain.setValueAtTime(softVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);

    // Subtle micro-click transient
    this.playBandpassNoise(0.012, 0.06 * clampedIntensity, 1600, 3.0);
  }

  /**
   * Clean, pleasant countdown beep for 3, 2, 1 and serve/play start.
   */
  public playCountdown(count: number | string): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const isFinal = count === 0 || count === '0' || count === 'SERVE' || count === 'PLAY' || count === 'SERVE!' || count === 'PLAY!';
    const freq = isFinal ? 880 : 580; // High tone for start, medium tone for 3, 2, 1
    const duration = isFinal ? 0.09 : 0.06;
    const vol = isFinal ? 0.18 : 0.15;

    this.playTone(freq, now, duration, vol);
  }

  // --- Silenced Sounds (Removed per user request to keep only paddle hit and countdown) ---
  public playTableBounce(_intensity: number = 0.8): void {
    // Silenced per user request
  }

  public playNetHit(): void {
    // Silenced per user request
  }

  public playScore(): void {
    // Silenced per user request
  }

  public playGameOver(_isWinner: boolean): void {
    // Silenced per user request
  }

  public playButtonClick(): void {
    // Silenced per user request
  }

  private playTone(freq: number, startTime: number, duration: number, vol: number): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private playBandpassNoise(duration: number, volume: number, centerFreq: number, Q: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    if (bufferSize <= 0) return;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, now);
    filter.Q.setValueAtTime(Q, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }
}
