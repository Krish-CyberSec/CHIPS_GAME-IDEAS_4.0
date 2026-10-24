let audioContext: AudioContext | null = null;

const tone = (frequency: number, duration = 0.08, type: OscillatorType = 'sine') => {
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration + 0.02);
  } catch {
    // Browsers can block Web Audio until a gesture; gameplay remains silent.
  }
};

export const gameAudio = {
  countdown: () => tone(440, 0.09),
  capture: () => tone(660, 0.08),
  golden: () => { tone(880, 0.1); setTimeout(() => tone(1100, 0.1), 55); },
  combo: () => { tone(520, 0.08); setTimeout(() => tone(780, 0.12), 70); },
  penalty: () => tone(150, 0.18, 'sawtooth'),
  powerup: () => { tone(520, 0.08); setTimeout(() => tone(1040, 0.16), 80); },
  complete: () => { tone(440, 0.1); setTimeout(() => tone(660, 0.1), 100); setTimeout(() => tone(880, 0.16), 200); },
};
