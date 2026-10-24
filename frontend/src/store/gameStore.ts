import { useSyncExternalStore } from 'react';
import type { GameResult, GameSettings, PlayerProfile } from '../types';

interface StoreState {
  settings: GameSettings;
  profile: PlayerProfile;
  currentResult: GameResult | null;
}

const defaultAchievements = () => [
  { id: 'first-bite', title: 'First Bite', description: 'Complete one round.', unlocked: false, icon: '🍿' },
  { id: 'golden-hunter', title: 'Golden Hunter', description: 'Capture five golden chips in one round.', unlocked: false, icon: '🌟' },
  { id: 'combo-master', title: 'Combo Master', description: 'Reach a combo of ten.', unlocked: false, icon: '🔥' },
  { id: 'bomb-dodger', title: 'Bomb Dodger', description: 'Finish without a bomb penalty.', unlocked: false, icon: '🛡️' },
  { id: 'speed-demon', title: 'Speed Demon', description: 'Capture ten chips while a speed bonus is active.', unlocked: false, icon: '⚡' },
  { id: 'high-scorer', title: 'High Scorer', description: 'Reach 200 points.', unlocked: false, icon: '🏆' },
  { id: 'perfect-run', title: 'Perfect Run', description: 'Finish without a penalty.', unlocked: false, icon: '💎' },
];

const fallbackProfile: PlayerProfile = {
  nickname: 'Guest Biter',
  totalRounds: 0,
  bestScore: 0,
  totalXp: 0,
  level: 1,
  bestCombo: 0,
  achievements: defaultAchievements(),
  recentResults: [],
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const storedSettings = read<Partial<GameSettings>>('cbc-settings', {});
let state: StoreState = {
  settings: { mode: 'webcam', soundEnabled: storedSettings.soundEnabled ?? true, musicEnabled: storedSettings.musicEnabled ?? false, reducedMotion: storedSettings.reducedMotion ?? false, calibrationResult: storedSettings.calibrationResult ?? null },
  profile: read<PlayerProfile>('cbc-profile', fallbackProfile),
  currentResult: null,
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const persist = () => {
  try {
    localStorage.setItem('cbc-settings', JSON.stringify(state.settings));
    localStorage.setItem('cbc-profile', JSON.stringify(state.profile));
  } catch {
    // Local-first storage is best effort; gameplay must continue if storage is blocked.
  }
};

export const gameStore = {
  getSnapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  updateSettings: (settings: Partial<GameSettings>) => {
    state = { ...state, settings: { ...state.settings, ...settings } };
    persist();
    notify();
  },
  setProfileNickname: (nickname: string) => {
    state = { ...state, profile: { ...state.profile, nickname } };
    persist();
    notify();
  },
  setCurrentResult: (currentResult: GameResult | null) => {
    state = { ...state, currentResult };
    notify();
  },
  saveResult: (result: GameResult) => {
    const profile = state.profile;
    const achievements = profile.achievements.map((achievement) => {
      const unlocked = achievement.unlocked || (
        (achievement.id === 'first-bite' && profile.totalRounds + 1 >= 1) ||
        (achievement.id === 'golden-hunter' && result.goldenChips >= 5) ||
        (achievement.id === 'combo-master' && result.bestCombo >= 10) ||
        (achievement.id === 'bomb-dodger' && result.bombPenalties === 0) ||
        (achievement.id === 'speed-demon' && (result.speedCaptures ?? 0) >= 10) ||
        (achievement.id === 'high-scorer' && result.score >= 200) ||
        (achievement.id === 'perfect-run' && result.bombPenalties === 0)
      );
      return unlocked && !achievement.unlocked ? { ...achievement, unlocked, unlockedAt: result.createdAt } : { ...achievement, unlocked };
    });
    const bestScore = Math.max(profile.bestScore, result.score);
    const nextProfile: PlayerProfile = {
      ...profile,
      nickname: result.nickname,
      totalRounds: profile.totalRounds + 1,
      bestScore,
      totalXp: profile.totalXp + result.xpEarned,
      level: Math.max(1, Math.floor((profile.totalXp + result.xpEarned) / 250) + 1),
      bestCombo: Math.max(profile.bestCombo, result.bestCombo),
      achievements,
      recentResults: [result, ...profile.recentResults].slice(0, 12),
    };
    const finalResult = { ...result, personalBest: result.score >= profile.bestScore };
    state = { ...state, profile: nextProfile, currentResult: finalResult };
    persist();
    notify();
    return finalResult;
  },
  resetProfile: () => {
    state = { ...state, profile: fallbackProfile, currentResult: null };
    persist();
    notify();
  },
};

export const useGameStore = () => useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot, gameStore.getSnapshot);
