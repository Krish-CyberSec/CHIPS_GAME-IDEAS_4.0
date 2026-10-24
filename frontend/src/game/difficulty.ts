import type { GameConfiguration } from '../types';

export interface DifficultyProfile {
  level: number;
  levelStartScore: number;
  nextLevelScore: number;
  spawnRateMs: number;
  minFallSpeed: number;
  maxFallSpeed: number;
  bombChance: number;
  lateralDrift: number;
  wobbleAmplitude: number;
  precisionPressure: number;
}

const LEVEL_SCORE_THRESHOLDS = [0, 120, 300, 550, 900, 1350];
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export const getLevelThreshold = (level: number) => {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= LEVEL_SCORE_THRESHOLDS.length) return LEVEL_SCORE_THRESHOLDS[safeLevel - 1];
  return LEVEL_SCORE_THRESHOLDS[LEVEL_SCORE_THRESHOLDS.length - 1] + (safeLevel - LEVEL_SCORE_THRESHOLDS.length) * 450;
};

export const getLevelForScore = (score: number) => {
  const safeScore = Math.max(0, score);
  let level = 1;
  while (safeScore >= getLevelThreshold(level + 1)) level += 1;
  return level;
};

/** Difficulty changes only when the player earns enough points to reach a new level. */
export const getDifficultyProfile = (level: number, config: GameConfiguration): DifficultyProfile => {
  const safeLevel = Math.max(1, Math.floor(level));
  const intensity = Math.min(1, (safeLevel - 1) / 6);
  return {
    level: safeLevel,
    levelStartScore: getLevelThreshold(safeLevel),
    nextLevelScore: getLevelThreshold(safeLevel + 1),
    spawnRateMs: Math.max(270, Math.round(config.spawnRateMs - (safeLevel - 1) * 58)),
    minFallSpeed: Math.round(config.minFallSpeed + (safeLevel - 1) * 24),
    maxFallSpeed: Math.round(config.maxFallSpeed + (safeLevel - 1) * 42),
    bombChance: .05 + intensity * .085,
    lateralDrift: 12 + (safeLevel - 1) * 4,
    wobbleAmplitude: 8 + (safeLevel - 1) * 4,
    precisionPressure: clamp((safeLevel - 1) * 4, 0, 24),
  };
};
