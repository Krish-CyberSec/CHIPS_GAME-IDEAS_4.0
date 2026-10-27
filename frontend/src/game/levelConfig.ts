export interface LevelTier {
  level: number;
  minScore: number;
  maxScore: number | null;
  name: string;
}

/**
 * Authoritative score thresholds for Chip Bite Challenge.
 * Level 1: 0–99 points
 * Level 2: 100–249 points
 * Level 3: 250–449 points
 * Level 4: 450–699 points
 * Level 5: 700+ points
 */
export const LEVEL_THRESHOLDS: readonly LevelTier[] = [
  { level: 1, minScore: 0, maxScore: 99, name: 'Level 1' },
  { level: 2, minScore: 100, maxScore: 249, name: 'Level 2' },
  { level: 3, minScore: 250, maxScore: 449, name: 'Level 3' },
  { level: 4, minScore: 450, maxScore: 699, name: 'Level 4' },
  { level: 5, minScore: 700, maxScore: null, name: 'Level 5' },
] as const;

export const LEVEL_START_SCORES = [0, 100, 250, 450, 700] as const;

/**
 * Returns the minimum score required to enter the given level.
 */
export const getLevelThreshold = (level: number): number => {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= LEVEL_START_SCORES.length) {
    return LEVEL_START_SCORES[safeLevel - 1];
  }
  // For levels beyond 5, space thresholds every 300 points
  return LEVEL_START_SCORES[LEVEL_START_SCORES.length - 1] + (safeLevel - LEVEL_START_SCORES.length) * 300;
};

/**
 * Authoritative function to calculate level from current score.
 */
export const getLevelForScore = (score: number): number => {
  const safeScore = Math.max(0, Math.floor(score));
  if (safeScore < 100) return 1;
  if (safeScore < 250) return 2;
  if (safeScore < 450) return 3;
  if (safeScore < 700) return 4;
  return 5;
};
