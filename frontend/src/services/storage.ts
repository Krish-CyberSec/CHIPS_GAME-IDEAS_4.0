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

/**
 * Deterministic tie-breaking for local results, mirroring the backend:
 * 1. Score descending
 * 2. CreatedAt ascending (earlier run wins)
 * 3. BestCombo descending
 * 4. CapturedChips descending
 * 5. Id alphabetical
 */
export const sortResults = (list: GameResult[]): GameResult[] => {
  return [...list].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) return timeA - timeB;
    if (b.bestCombo !== a.bestCombo) return b.bestCombo - a.bestCombo;
    if (b.capturedChips !== a.capturedChips) return b.capturedChips - a.capturedChips;
    return a.id.localeCompare(b.id);
  });
};

export const localResultRepository = {
  save: (result: GameResult) => {
    const results = readResults();
    const next = [result, ...results.filter((item) => item.id !== result.id)].slice(0, 500);
    try { localStorage.setItem(RESULTS_KEY, JSON.stringify(next)); } catch { /* local persistence is best effort */ }
  },
  all: (includeDemo = false) => {
    const results = readResults();
    const filtered = includeDemo
      ? results
      : results.filter((item) => !item.isDemo && item.nickname?.toLowerCase() !== 'demo');
    return sortResults(filtered);
  },
  daily: (includeDemo = false) => {
    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const results = readResults();
    const filtered = results.filter((result) => {
      if (!includeDemo && (result.isDemo || result.nickname?.toLowerCase() === 'demo')) {
        return false;
      }
      const d = new Date(result.createdAt);
      if (isNaN(d.getTime())) return false;
      const resUtc = d.toISOString().slice(0, 10);
      const resLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return resUtc === todayUtc || resLocal === todayLocal || result.createdAt.slice(0, 10) === todayUtc;
    });
    return sortResults(filtered);
  },
  clear: () => localStorage.removeItem(RESULTS_KEY),
};

export const apiPlayerRepository = {
  register: async (data: {
    nickname: string;
    email?: string;
    phoneNumber?: string;
    profilePicture?: string | null;
    isDemo?: boolean;
  }) => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return null;
    const response = await fetch(`${base}/api/players/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register player profile.');
    }
    return await response.json() as {
      id: string;
      nickname: string;
      registeredWithContactInfo: boolean;
      createdAtUtc: string;
      profilePicture?: string | null;
    };
  },
  getProfile: async (idOrNickname: string): Promise<PlayerProfile | null> => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return null;
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNickname);
    const url = isGuid
      ? `${base}/api/players/${idOrNickname}/profile`
      : `${base}/api/players/by-nickname/${encodeURIComponent(idOrNickname)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json() as PlayerProfile;
  },
  updatePicture: async (id: string, profilePicture: string | null): Promise<PlayerProfile | null> => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return null;
    const response = await fetch(`${base}/api/players/${id}/picture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profilePicture }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update profile picture.');
    }
    return await response.json() as PlayerProfile;
  },
};

export const apiResultRepository = {
  save: async (result: GameResult): Promise<boolean> => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return false;
    const payload = {
      id: result.id,
      nickname: result.nickname,
      score: result.score,
      capturedChips: result.capturedChips,
      goldenChips: result.goldenChips,
      bombPenalties: result.bombPenalties,
      bestCombo: result.bestCombo,
      eligibleOpportunities: result.eligibleOpportunities,
      accuracy: result.accuracy,
      xpEarned: result.xpEarned,
      mode: result.mode,
      createdAtUtc: result.createdAt,
      isDemo: result.isDemo ?? (result.nickname?.toLowerCase() === 'demo'),
    };
    const response = await fetch(`${base}/api/games/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  },
};

export interface VerifiedRankData {
  resultId: string;
  score: number;
  dailyRank: number | null;
  allTimeRank: number | null;
  isTopThreeDaily: boolean;
  isTopThreeAllTime: boolean;
  bestRank: number;
}

export const apiLeaderboardRepository = {
  list: async (daily: boolean, includeDemo = false) => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return null;
    const response = await fetch(
      `${base}/api/leaderboard/${daily ? 'daily' : 'all-time'}?limit=50&includeDemo=${includeDemo}`
    );
    if (!response.ok) throw new Error('Connected leaderboard is unavailable.');
    return await response.json() as Array<{
      rank: number;
      id: string;
      nickname: string;
      score: number;
      bestCombo: number;
      capturedChips: number;
      mode: string;
      createdAtUtc: string;
      profilePicture?: string | null;
      isDemo?: boolean;
    }>;
  },
  verifyRank: async (resultId: string): Promise<VerifiedRankData | null> => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return null;
    try {
      const response = await fetch(`${base}/api/leaderboard/verify/${resultId}`);
      if (!response.ok) return null;
      return await response.json() as VerifiedRankData;
    } catch {
      return null;
    }
  },
};

export const getProfile = (): PlayerProfile | null => {
  try { return JSON.parse(localStorage.getItem('cbc-profile') ?? 'null') as PlayerProfile | null; } catch { return null; }
};
