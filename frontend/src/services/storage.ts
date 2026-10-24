import { DEFAULT_GAME_CONFIGURATION, type GameConfiguration, type GameResult, type PlayerProfile } from '../types';

const RESULTS_KEY = 'cbc-results';
const CONFIGURATION_KEY = 'cbc-game-configuration';


const readConfiguration = (): GameConfiguration => {
  try {
    const stored = JSON.parse(localStorage.getItem(CONFIGURATION_KEY) ?? '{}') as Partial<GameConfiguration>;
    const minFallSpeed = Number.isFinite(stored.minFallSpeed) ? Math.max(80, Math.min(600, stored.minFallSpeed!)) : DEFAULT_GAME_CONFIGURATION.minFallSpeed;
    const maxFallSpeed = Number.isFinite(stored.maxFallSpeed) ? Math.max(minFallSpeed, Math.min(900, stored.maxFallSpeed!)) : Math.max(minFallSpeed, DEFAULT_GAME_CONFIGURATION.maxFallSpeed);
    return {
      ...DEFAULT_GAME_CONFIGURATION,
      roundDurationSeconds: Number.isFinite(stored.roundDurationSeconds) ? Math.max(20, Math.min(120, stored.roundDurationSeconds!)) : DEFAULT_GAME_CONFIGURATION.roundDurationSeconds,
      spawnRateMs: Number.isFinite(stored.spawnRateMs) ? Math.max(300, Math.min(2000, stored.spawnRateMs!)) : DEFAULT_GAME_CONFIGURATION.spawnRateMs,
      minFallSpeed,
      maxFallSpeed,
      comboThresholds: DEFAULT_GAME_CONFIGURATION.comboThresholds,
      comboMultipliers: DEFAULT_GAME_CONFIGURATION.comboMultipliers,
      extraTimeCapSeconds: Number.isFinite(stored.extraTimeCapSeconds) ? Math.max(0, Math.min(30, stored.extraTimeCapSeconds!)) : DEFAULT_GAME_CONFIGURATION.extraTimeCapSeconds,
    };
  } catch {
    return DEFAULT_GAME_CONFIGURATION;
  }
};

export const localGameConfiguration = {
  read: readConfiguration,
  save: (configuration: GameConfiguration) => {
    try { localStorage.setItem(CONFIGURATION_KEY, JSON.stringify(configuration)); } catch { /* local configuration is best effort */ }
  },
};

const readResults = (): GameResult[] => {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '[]') as GameResult[];
  } catch {
    return [];
  }
};

export const localResultRepository = {
  save: (result: GameResult) => {
    const results = readResults();
    const next = [result, ...results.filter((item) => item.id !== result.id)].slice(0, 500);
    try { localStorage.setItem(RESULTS_KEY, JSON.stringify(next)); } catch { /* local persistence is best effort */ }
  },
  all: () => readResults(),
  daily: () => {
    const day = new Date().toISOString().slice(0, 10);
    return readResults().filter((result) => result.createdAt.slice(0, 10) === day).sort((a, b) => b.score - a.score);
  },
  clear: () => localStorage.removeItem(RESULTS_KEY),
};

export const apiResultRepository = {
  save: async (result: GameResult) => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return false;
    const response = await fetch(`${base}/api/games/results`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) });
    return response.ok;
  },
};

export const apiLeaderboardRepository = {
  list: async (daily: boolean) => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return null;
    const response = await fetch(`${base}/api/leaderboard/${daily ? 'daily' : 'all-time'}?limit=50`);
    if (!response.ok) throw new Error('Connected leaderboard is unavailable.');
    return await response.json() as Array<{ rank: number; id: string; nickname: string; score: number; bestCombo: number; capturedChips: number; mode: string; createdAtUtc: string }>;
  },
};

export const getProfile = (): PlayerProfile | null => {
  try { return JSON.parse(localStorage.getItem('cbc-profile') ?? 'null') as PlayerProfile | null; } catch { return null; }
};
