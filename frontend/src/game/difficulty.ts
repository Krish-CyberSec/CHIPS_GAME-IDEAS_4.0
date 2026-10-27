import type { GameConfiguration } from '../types';
import { getLevelForScore, getLevelThreshold } from './levelConfig';

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

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export { getLevelForScore, getLevelThreshold };

/**
 * Difficulty increases progressively by level while remaining strictly bounded for fair gameplay.
 */
export const getDifficultyProfile = (level: number, config: GameConfiguration): DifficultyProfile => {
  const safeLevel = Math.max(1, Math.floor(level));
  const intensity = Math.min(1, (safeLevel - 1) / 4);
  return {
    level: safeLevel,
    levelStartScore: getLevelThreshold(safeLevel),
    nextLevelScore: getLevelThreshold(safeLevel + 1),
    spawnRateMs: Math.max(270, Math.round(config.spawnRateMs - (safeLevel - 1) * 55)),
    minFallSpeed: clamp(Math.round(config.minFallSpeed + (safeLevel - 1) * 25), config.minFallSpeed, 380),
    maxFallSpeed: clamp(Math.round(config.maxFallSpeed + (safeLevel - 1) * 40), config.maxFallSpeed, 550),
    bombChance: clamp(0.05 + intensity * 0.08, 0.05, 0.20),
    lateralDrift: 12 + (safeLevel - 1) * 4,
    wobbleAmplitude: 8 + (safeLevel - 1) * 4,
    precisionPressure: clamp((safeLevel - 1) * 4, 0, 24),
  };
};
