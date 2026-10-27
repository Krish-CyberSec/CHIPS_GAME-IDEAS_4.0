import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIGURATION, type GameResult } from '../types';
import { localGameConfiguration, localResultRepository, sortResults } from '../services/storage';

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

describe('result sorting and tie breaking', () => {
  it('consistently breaks ties by earlier time, combo, chips, and id', () => {
    const r1: GameResult = {
      id: 'b',
      nickname: 'Player 1',
      score: 200,
      capturedChips: 10,
      goldenChips: 1,
      bombPenalties: 0,
      bestCombo: 5,
      eligibleOpportunities: 10,
      accuracy: 1,
      xpEarned: 50,
      mode: 'webcam',
      createdAt: '2026-10-27T10:00:00.000Z',
      personalBest: false,
      localOnly: true,
    };

    const r2: GameResult = {
      ...r1,
      id: 'a',
      nickname: 'Player 2 (Later time)',
      createdAt: '2026-10-27T10:05:00.000Z',
    };

    const r3: GameResult = {
      ...r1,
      id: 'c',
      nickname: 'Player 3 (Higher score)',
      score: 300,
    };

    const sorted = sortResults([r2, r1, r3]);
    expect(sorted[0].id).toBe('c'); // highest score
    expect(sorted[1].id).toBe('b'); // tied score 200, earlier timestamp wins
    expect(sorted[2].id).toBe('a'); // tied score 200, later timestamp
  });

  it('preserves score 496 and isolates demo score 9 in localResultRepository', () => {
    localStorage.removeItem('cbc-results');

    // Simulate demo score 9 in storage
    localResultRepository.save({
      id: 'demo-1',
      nickname: 'demo',
      score: 9,
      capturedChips: 1,
      goldenChips: 0,
      bombPenalties: 0,
      bestCombo: 1,
      eligibleOpportunities: 1,
      accuracy: 1,
      xpEarned: 10,
      mode: 'webcam',
      createdAt: new Date().toISOString(),
      personalBest: false,
      localOnly: true,
      isDemo: true,
    });

    // Player achieves 496
    localResultRepository.save({
      id: 'real-1',
      nickname: 'Champion',
      score: 496,
      capturedChips: 35,
      goldenChips: 4,
      bombPenalties: 0,
      bestCombo: 12,
      eligibleOpportunities: 38,
      accuracy: 0.92,
      xpEarned: 210,
      mode: 'webcam',
      createdAt: new Date().toISOString(),
      personalBest: true,
      localOnly: true,
      isDemo: false,
    });

    // Default all() and daily() isolate demo
    const allResults = localResultRepository.all();
    expect(allResults.length).toBe(1);
    expect(allResults[0].score).toBe(496);
    expect(allResults[0].nickname).toBe('Champion');

    const dailyResults = localResultRepository.daily();
    expect(dailyResults.length).toBe(1);
    expect(dailyResults[0].score).toBe(496);

    // With includeDemo = true, demo 9 appears after 496
    const withDemo = localResultRepository.all(true);
    expect(withDemo.length).toBe(2);
    expect(withDemo[0].score).toBe(496);
    expect(withDemo[1].score).toBe(9);

    localStorage.removeItem('cbc-results');
  });
});
