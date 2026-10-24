import { describe, expect, it } from 'vitest';
import { calculateAccuracy, calculateObjectPoints, getComboMultiplier } from '../game/scoring';
import { DEFAULT_GAME_CONFIGURATION } from '../types';
import { getDifficultyProfile, getLevelForScore, getLevelThreshold } from '../game/difficulty';

describe('scoring rules', () => {
  it('applies configured combo thresholds', () => {
    expect(getComboMultiplier(2, DEFAULT_GAME_CONFIGURATION)).toBe(1);
    expect(getComboMultiplier(3, DEFAULT_GAME_CONFIGURATION)).toBe(1.25);
    expect(getComboMultiplier(5, DEFAULT_GAME_CONFIGURATION)).toBe(1.5);
    expect(getComboMultiplier(10, DEFAULT_GAME_CONFIGURATION)).toBe(2);
  });

  it('keeps bomb penalties separate from positive multipliers', () => {
    expect(calculateObjectPoints('bomb', 10, 2, DEFAULT_GAME_CONFIGURATION)).toBe(-20);
    expect(calculateObjectPoints('golden', 10, 2, DEFAULT_GAME_CONFIGURATION)).toBe(100);
  });

  it('calculates bounded accuracy', () => {
    expect(calculateAccuracy(5, 10)).toBe(.5);
    expect(calculateAccuracy(12, 10)).toBe(1);
    expect(calculateAccuracy(0, 0)).toBeNull();
  });
});


describe('score-threshold level curve', () => {
  it('levels up only when the player reaches the next score threshold', () => {
    expect(getLevelForScore(0)).toBe(1);
    expect(getLevelForScore(getLevelThreshold(2) - 1)).toBe(1);
    expect(getLevelForScore(getLevelThreshold(2))).toBe(2);
    expect(getLevelForScore(getLevelThreshold(4))).toBe(4);
  });

  it('increases pressure by level without violating the spawn safety floor', () => {
    const opening = getDifficultyProfile(1, DEFAULT_GAME_CONFIGURATION);
    const finale = getDifficultyProfile(6, DEFAULT_GAME_CONFIGURATION);
    expect(finale.level).toBeGreaterThan(opening.level);
    expect(finale.levelStartScore).toBeGreaterThan(opening.levelStartScore);
    expect(finale.spawnRateMs).toBeLessThan(opening.spawnRateMs);
    expect(finale.maxFallSpeed).toBeGreaterThan(opening.maxFallSpeed);
    expect(finale.bombChance).toBeGreaterThan(opening.bombChance);
    expect(finale.precisionPressure).toBeGreaterThan(opening.precisionPressure);
    expect(finale.spawnRateMs).toBeGreaterThanOrEqual(270);
  });
});
