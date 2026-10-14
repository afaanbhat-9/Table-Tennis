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
   * Authentic dual-stage table tennis paddle impact sound.
   * Combines wooden blade low-end punch with rubber friction pop.
   */
  public playPaddleHit(intensity: number = 0.8): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const clampedIntensity = Math.min(1.4, Math.max(0.4, intensity));

    // 1. Blade body punch: 210 Hz down to 90 Hz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210 * (0.9 + clampedIntensity * 0.2), now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.045);

    gain.gain.setValueAtTime(0.65 * clampedIntensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);

    // 2. Rubber tackiness & pop: bandpassed noise centered at ~1050 Hz
    this.playBandpassNoise(0.03, 0.45 * clampedIntensity, 1050, 2.5);
  }

  /**
   * Authentic table bounce "TOK / PING" sound.
   * Combines sharp celluloid/ABS impact transient with hollow wooden board resonance.
   */
  public playTableBounce(intensity: number = 0.8): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const clampedIntensity = Math.min(1.3, Math.max(0.35, intensity));

    // 1. Sharp initial impact transient (1350 Hz down to 800 Hz in 18ms)
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(1350, now);
    snapOsc.frequency.exponentialRampToValueAtTime(820, now + 0.02);

    snapGain.gain.setValueAtTime(0.55 * clampedIntensity, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    snapOsc.connect(snapGain);
    snapGain.connect(this.masterGain);
    snapOsc.start(now);
    snapOsc.stop(now + 0.03);

    // 2. Wooden table body resonance: 510 Hz with fast exponential ringdown
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(510, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(460, now + 0.045);

    bodyGain.gain.setValueAtTime(0.48 * clampedIntensity, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.masterGain);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.05);

    // 3. Wood click micro-transient
    this.playBandpassNoise(0.015, 0.28 * clampedIntensity, 2400, 3.0);
  }

  /**
   * Soft net tape brush / mesh flutter sound.
   */
  public playNetHit(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.playBandpassNoise(0.07, 0.4, 1850, 2.0);
  }

  /**
   * Pleasant broadcast chime when a point is scored.
   */
  public playScore(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Harmonic arpeggio: C5 -> G5
    this.playTone(523.25, now, 0.12, 0.22);
    this.playTone(783.99, now + 0.08, 0.25, 0.28);
  }

  /**
   * Victory fanfare on game over.
   */
  public playGameOver(isWinner: boolean): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (isWinner) {
      // Ascending triumphant major fanfare
      this.playTone(523.25, now, 0.14, 0.28); // C5
      this.playTone(659.25, now + 0.12, 0.14, 0.28); // E5
      this.playTone(783.99, now + 0.24, 0.14, 0.32); // G5
      this.playTone(1046.50, now + 0.38, 0.45, 0.36); // C6
    } else {
      // Soft descending cadence
      this.playTone(493.88, now, 0.18, 0.25); // B4
      this.playTone(440.00, now + 0.16, 0.18, 0.25); // A4
      this.playTone(392.00, now + 0.32, 0.35, 0.25); // G4
    }
  }

  /**
   * Clean tactile UI button click.
   */
  public playButtonClick(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.022);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
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
