import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIGURATION } from '../types';
import { localGameConfiguration } from '../services/storage';

describe('local game configuration', () => {
  afterEach(() => localStorage.removeItem('cbc-game-configuration'));

  it('normalizes stored values and keeps fall speed ordering safe', () => {
    localStorage.setItem('cbc-game-configuration', JSON.stringify({ roundDurationSeconds: 999, minFallSpeed: 500, maxFallSpeed: 100, spawnRateMs: -1 }));
    const configuration = localGameConfiguration.read();
    expect(configuration.roundDurationSeconds).toBe(120);
    expect(configuration.spawnRateMs).toBe(300);
    expect(configuration.minFallSpeed).toBe(500);
    expect(configuration.maxFallSpeed).toBe(500);
  });

  it('falls back to the shipped configuration for malformed storage', () => {
    localStorage.setItem('cbc-game-configuration', '{not-json');
    expect(localGameConfiguration.read()).toEqual(DEFAULT_GAME_CONFIGURATION);
  });
});
