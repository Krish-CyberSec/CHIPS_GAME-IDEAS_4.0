export type ControlMode = 'webcam';

export type ThemeMode = 'dark' | 'light';

export type GameStatus = 'idle' | 'preparing' | 'calibrating' | 'countdown' | 'playing' | 'paused' | 'tracking-lost' | 'completed' | 'error';

export type ChipKind = 'normal' | 'golden' | 'speed' | 'frozen' | 'combo' | 'bomb' | 'mystery';

export type PowerUpKind = 'magnet' | 'shield' | 'double-score' | 'slow-motion' | 'extra-time';

export interface MouthTrackingState {
  detected: boolean;
  reliable: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  openness: number;
  isOpen: boolean;
  confidence: number;
  mirrored: boolean;
  timestamp: number;
}

export interface CalibrationResult {
  closedAverage: number;
  openAverage: number;
  threshold: number;
  closeThreshold: number;
  margin: number;
  sampleCount: number;
}

export interface ActivePowerUp {
  kind: PowerUpKind;
  remainingMs: number;
  activatedAt: number;
}

export interface GameResult {
  id: string;
  nickname: string;
  score: number;
  capturedChips: number;
  goldenChips: number;
  bombPenalties: number;
  bestCombo: number;
  speedCaptures?: number;
  eligibleOpportunities: number;
  accuracy: number | null;
  xpEarned: number;
  mode: ControlMode;
  createdAt: string;
  personalBest: boolean;
  localOnly: boolean;
}

export interface PlayerProfile {
  nickname: string;
  totalRounds: number;
  bestScore: number;
  totalXp: number;
  level: number;
  bestCombo: number;
  achievements: Achievement[];
  recentResults: GameResult[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string;
}

export interface GameSettings {
  mode: ControlMode;
  theme: ThemeMode;
  soundEnabled: boolean;
  musicEnabled: boolean;
  reducedMotion: boolean;
  calibrationResult: CalibrationResult | null;
}

export interface GameConfiguration {
  roundDurationSeconds: number;
  spawnRateMs: number;
  minFallSpeed: number;
  maxFallSpeed: number;
  comboThresholds: number[];
  comboMultipliers: number[];
  extraTimeCapSeconds: number;
}

export const DEFAULT_GAME_CONFIGURATION: GameConfiguration = {
  roundDurationSeconds: 45,
  spawnRateMs: 680,
  minFallSpeed: 190,
  maxFallSpeed: 350,
  comboThresholds: [3, 5, 10],
  comboMultipliers: [1.25, 1.5, 2],
  extraTimeCapSeconds: 10,
};
