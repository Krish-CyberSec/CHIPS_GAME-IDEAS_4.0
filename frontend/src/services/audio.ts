// Reusable, arcade-style audio service using Web Audio API

interface AudioPreferences {
  muted: boolean;
  volume: number;
}

const STORAGE_KEY = 'cbc-audio-settings';

const readPreferences = (): AudioPreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { muted: false, volume: 0.8 };
    const parsed = JSON.parse(raw) as Partial<AudioPreferences>;
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.8,
    };
  } catch {
    return { muted: false, volume: 0.8 };
  }
};

const persistPreferences = (prefs: AudioPreferences) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Local storage is best-effort
  }
};

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 0.8;
  private paused = false;
  private lastPlayed = new Map<string, number>();
  private interactionListenerAttached = false;

  constructor() {
    const prefs = readPreferences();
    this.muted = prefs.muted;
    this.volume = prefs.volume;
    this.attachAutoplayResumer();
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.updateMasterGain();
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Will be resumed on user gesture
      });
    }
    return this.ctx;
  }

  private updateMasterGain() {
    if (!this.masterGain || !this.ctx) return;
    const effectiveGain = this.muted ? 0 : this.volume;
    try {
      this.masterGain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
    } catch {
      // AudioParam updates can fail if context is closed
    }
  }

  private attachAutoplayResumer() {
    if (typeof window === 'undefined') return;
    const resume = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => undefined);
      }
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      this.interactionListenerAttached = false;
    };
    if (!this.interactionListenerAttached) {
      this.interactionListenerAttached = true;
      window.addEventListener('pointerdown', resume, { once: true, passive: true });
      window.addEventListener('keydown', resume, { once: true, passive: true });
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.updateMasterGain();
    persistPreferences({ muted: this.muted, volume: this.volume });
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateMasterGain();
    persistPreferences({ muted: this.muted, volume: this.volume });
  }

  public getVolume(): number {
    return this.volume;
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  private shouldThrottle(event: string, intervalMs = 60): boolean {
    const now = performance.now();
    const last = this.lastPlayed.get(event) ?? -Infinity;
    if (now - last < intervalMs) {
      return true;
    }
    this.lastPlayed.set(event, now);
    return false;
  }

  /**
   * Synthesize a note sequence using oscillators with gain envelopes.
   */
  private playNotes(
    notes: Array<{ freq: number; duration: number; type?: OscillatorType; delay?: number; gain?: number }>,
    eventName: string,
    throttleMs = 60,
    isGameplaySound = true
  ) {
    if (this.muted || this.volume <= 0) return;
    if (isGameplaySound && this.paused) return;
    if (this.shouldThrottle(eventName, throttleMs)) return;

    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain || ctx.state === 'closed') return;

    const startTime = ctx.currentTime;

    for (const note of notes) {
      try {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = note.type ?? 'sine';
        osc.frequency.setValueAtTime(note.freq, startTime + (note.delay ?? 0));

        const noteStart = startTime + (note.delay ?? 0);
        const peakGain = (note.gain ?? 0.15) * 0.8;
        noteGain.gain.setValueAtTime(0.0001, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(peakGain, noteStart + 0.008);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + note.duration);

        osc.connect(noteGain);
        noteGain.connect(this.masterGain);

        osc.start(noteStart);
        osc.stop(noteStart + note.duration + 0.02);
      } catch {
        // Graceful fallback: audio fails safely without interrupting gameplay
      }
    }
  }

  // 1. Regular chip captured - snappy arcade pop
  public capture() {
    this.playNotes(
      [
        { freq: 560, duration: 0.06, type: 'triangle' },
        { freq: 780, duration: 0.05, type: 'sine', delay: 0.02 },
      ],
      'capture',
      70
    );
  }

  // 2. Golden bonus chip captured - bright sparkle chime
  public golden() {
    this.playNotes(
      [
        { freq: 880, duration: 0.07, type: 'triangle', gain: 0.18 },
        { freq: 1175, duration: 0.08, type: 'sine', delay: 0.04, gain: 0.2 },
        { freq: 1760, duration: 0.12, type: 'sine', delay: 0.08, gain: 0.22 },
      ],
      'golden',
      100
    );
  }

  // 3. Bomb penalty - low buzz/drop warning
  public bomb() {
    this.playNotes(
      [
        { freq: 220, duration: 0.14, type: 'sawtooth', gain: 0.15 },
        { freq: 110, duration: 0.18, type: 'sawtooth', delay: 0.05, gain: 0.16 },
      ],
      'bomb',
      120
    );
  }
  public penalty() {
    this.bomb();
  }

  // 4. Combo milestone - punchy ascending arpeggio
  public combo() {
    this.playNotes(
      [
        { freq: 523.25, duration: 0.07, type: 'sine', gain: 0.16 }, // C5
        { freq: 659.25, duration: 0.07, type: 'sine', delay: 0.05, gain: 0.18 }, // E5
        { freq: 783.99, duration: 0.12, type: 'sine', delay: 0.1, gain: 0.2 }, // G5
      ],
      'combo',
      150
    );
  }

  // 5. Power-up collected - energetic power chime
  public powerup() {
    this.playNotes(
      [
        { freq: 440, duration: 0.06, type: 'triangle', gain: 0.16 },
        { freq: 660, duration: 0.07, type: 'triangle', delay: 0.04, gain: 0.18 },
        { freq: 880, duration: 0.08, type: 'sine', delay: 0.08, gain: 0.2 },
        { freq: 1320, duration: 0.15, type: 'sine', delay: 0.12, gain: 0.22 },
      ],
      'powerup',
      150
    );
  }

  // 6. Level-up - triumphant fanfare transition
  public levelUp() {
    this.playNotes(
      [
        { freq: 523.25, duration: 0.09, type: 'sine', gain: 0.2 }, // C5
        { freq: 659.25, duration: 0.09, type: 'triangle', delay: 0.07, gain: 0.22 }, // E5
        { freq: 783.99, duration: 0.1, type: 'triangle', delay: 0.14, gain: 0.24 }, // G5
        { freq: 1046.5, duration: 0.22, type: 'sine', delay: 0.21, gain: 0.26 }, // C6
      ],
      'levelUp',
      300
    );
  }

  // 7. Countdown warning - crisp digital pulse
  public countdown() {
    this.playNotes(
      [{ freq: 440, duration: 0.08, type: 'square', gain: 0.12 }],
      'countdown',
      150
    );
  }

  // 8. Game over / round complete - melodic resolution
  public gameOver() {
    this.playNotes(
      [
        { freq: 440, duration: 0.12, type: 'triangle', gain: 0.18 },
        { freq: 554.37, duration: 0.12, type: 'triangle', delay: 0.09, gain: 0.18 },
        { freq: 659.25, duration: 0.14, type: 'sine', delay: 0.18, gain: 0.2 },
        { freq: 880, duration: 0.25, type: 'sine', delay: 0.27, gain: 0.22 },
      ],
      'gameOver',
      250,
      false
    );
  }
  public complete() {
    this.gameOver();
  }

  // 9. Personal best - bright celebratory flourish
  public personalBest() {
    this.playNotes(
      [
        { freq: 587.33, duration: 0.1, type: 'sine', gain: 0.18 }, // D5
        { freq: 739.99, duration: 0.1, type: 'sine', delay: 0.08, gain: 0.2 }, // F#5
        { freq: 880, duration: 0.12, type: 'triangle', delay: 0.16, gain: 0.22 }, // A5
        { freq: 1174.66, duration: 0.28, type: 'sine', delay: 0.24, gain: 0.25 }, // D6
      ],
      'personalBest',
      300,
      false
    );
  }

  // 10. Third-place achievement - bronze fanfare
  public thirdPlace() {
    this.playNotes(
      [
        { freq: 392.0, duration: 0.12, type: 'triangle', gain: 0.2 }, // G4
        { freq: 493.88, duration: 0.12, type: 'triangle', delay: 0.1, gain: 0.22 }, // B4
        { freq: 587.33, duration: 0.25, type: 'sine', delay: 0.2, gain: 0.25 }, // D5
      ],
      'thirdPlace',
      400,
      false
    );
  }

  // 11. Second-place achievement - silver fanfare
  public secondPlace() {
    this.playNotes(
      [
        { freq: 440.0, duration: 0.12, type: 'triangle', gain: 0.2 }, // A4
        { freq: 554.37, duration: 0.12, type: 'triangle', delay: 0.09, gain: 0.22 }, // C#5
        { freq: 659.25, duration: 0.12, type: 'sine', delay: 0.18, gain: 0.24 }, // E5
        { freq: 880.0, duration: 0.3, type: 'sine', delay: 0.27, gain: 0.26 }, // A5
      ],
      'secondPlace',
      400,
      false
    );
  }

  // 12. First-place victory - grand champion fanfare
  public firstPlace() {
    this.playNotes(
      [
        { freq: 523.25, duration: 0.1, type: 'triangle', gain: 0.22 }, // C5
        { freq: 659.25, duration: 0.1, type: 'triangle', delay: 0.08, gain: 0.24 }, // E5
        { freq: 783.99, duration: 0.1, type: 'sine', delay: 0.16, gain: 0.26 }, // G5
        { freq: 1046.5, duration: 0.14, type: 'sine', delay: 0.24, gain: 0.28 }, // C6
        { freq: 1318.51, duration: 0.35, type: 'sine', delay: 0.34, gain: 0.3 }, // E6
      ],
      'firstPlace',
      500,
      false
    );
  }

  public cleanup() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.masterGain = null;
    }
    this.lastPlayed.clear();
  }
}

export const gameAudio = new AudioService();
export { AudioService };
