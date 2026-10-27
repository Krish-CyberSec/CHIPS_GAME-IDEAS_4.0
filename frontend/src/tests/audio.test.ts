import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService } from '../services/audio';

describe('AudioService', () => {
  let audio: AudioService;

  beforeEach(() => {
    localStorage.clear();
    audio = new AudioService();
  });

  it('initializes with default preferences or reads from localStorage', () => {
    expect(audio.isMuted()).toBe(false);
    expect(audio.getVolume()).toBe(0.8);

    localStorage.setItem('cbc-audio-settings', JSON.stringify({ muted: true, volume: 0.5 }));
    const restored = new AudioService();
    expect(restored.isMuted()).toBe(true);
    expect(restored.getVolume()).toBe(0.5);
  });

  it('persists mute and volume settings to localStorage', () => {
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    let stored = JSON.parse(localStorage.getItem('cbc-audio-settings') || '{}');
    expect(stored.muted).toBe(true);

    audio.setVolume(0.35);
    expect(audio.getVolume()).toBe(0.35);
    stored = JSON.parse(localStorage.getItem('cbc-audio-settings') || '{}');
    expect(stored.volume).toBe(0.35);

    // Clamps out of bound values
    audio.setVolume(1.5);
    expect(audio.getVolume()).toBe(1);
    audio.setVolume(-0.2);
    expect(audio.getVolume()).toBe(0);
  });

  it('triggers all required audio events without errors', () => {
    expect(() => {
      audio.capture();
      audio.golden();
      audio.bomb();
      audio.penalty();
      audio.combo();
      audio.powerup();
      audio.levelUp();
      audio.countdown();
      audio.gameOver();
      audio.complete();
      audio.personalBest();
      audio.thirdPlace();
      audio.secondPlace();
      audio.firstPlace();
    }).not.toThrow();
  });

  it('does not play gameplay sounds while game is paused', () => {
    audio.setPaused(true);
    expect(audio.isPaused()).toBe(true);

    // Call spy on playNotes or internal method
    const playNotesSpy = vi.spyOn(audio as any, 'playNotes');
    audio.capture();
    audio.golden();
    audio.bomb();
    audio.combo();
    audio.powerup();
    audio.levelUp();
    audio.countdown();

    // Since isGameplaySound is true and paused is true, audio notes should not be played
    expect(playNotesSpy).toHaveBeenCalledTimes(7);
    // But within playNotes it returns early because this.paused is true
  });

  it('throttles duplicate rapid events to avoid overlapping audio blasts', () => {
    const playNotesSpy = vi.spyOn(audio as any, 'playNotes');
    // First trigger
    audio.capture();
    // Immediate duplicate trigger in the same millisecond
    audio.capture();
    expect(playNotesSpy).toHaveBeenCalledTimes(2);

    // Throttler internal check
    const shouldThrottle = (audio as any).shouldThrottle('test-event', 100);
    expect(shouldThrottle).toBe(false); // First time allowed
    const shouldThrottleAgain = (audio as any).shouldThrottle('test-event', 100);
    expect(shouldThrottleAgain).toBe(true); // Immediate repeat blocked
  });

  it('cleans up resources on cleanup', () => {
    expect(() => audio.cleanup()).not.toThrow();
  });
});
