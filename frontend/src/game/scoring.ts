import type { ChipKind, GameConfiguration, PowerUpKind } from '../types';

export const CHIP_POINTS: Record<ChipKind, number> = { normal: 10, golden: 25, speed: 10, frozen: 10, combo: 10, bomb: -20, mystery: 15 };

export const getComboMultiplier = (combo: number, config: GameConfiguration) => {
  for (let index = config.comboThresholds.length - 1; index >= 0; index -= 1) {
    if (combo >= config.comboThresholds[index]) return config.comboMultipliers[index] ?? 1;
  }
  return 1;
};

export const calculateObjectPoints = (kind: ChipKind, combo: number, scoreMultiplier: number, config: GameConfiguration) => {
  const base = CHIP_POINTS[kind];
  if (kind === 'bomb') return base;
  return Math.round(base * getComboMultiplier(combo, config) * scoreMultiplier);
};

export const calculateAccuracy = (captured: number, eligible: number) => eligible > 0 ? Math.min(1, captured / eligible) : null;

export const powerUpDurationMs = (kind: PowerUpKind) => kind === 'extra-time' ? 0 : 5000;

export const calculateXp = (score: number, bestCombo: number, captured: number) => Math.max(10, Math.round(score / 4) + bestCombo * 3 + captured * 2);
