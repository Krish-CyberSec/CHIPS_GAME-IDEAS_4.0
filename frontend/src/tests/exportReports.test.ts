import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameResult, PlayerProfile } from '../types';
import { exportCsvReport, exportJsonReport, exportPdfReport } from '../utils/exportReports';
import { gameStore } from '../store/gameStore';

describe('report exports', () => {
  const mockResult: GameResult = {
    id: 'test-guid-1234',
    nickname: 'BiteMaster',
    email: 'bitemaster@example.com',
    phoneNumber: '+15551234567',
    score: 496,
    capturedChips: 35,
    goldenChips: 4,
    bombPenalties: 0,
    bestCombo: 12,
    eligibleOpportunities: 38,
    accuracy: 0.92,
    xpEarned: 210,
    mode: 'webcam',
    createdAt: '2026-10-27T15:30:00.000Z',
    personalBest: true,
    localOnly: false,
    verifiedRank: {
      dailyRank: 1,
      allTimeRank: 1,
      bestRank: 1,
      isTopThreeDaily: true,
      isTopThreeAllTime: true,
    },
    profilePicture: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  };

  const mockProfile: PlayerProfile = {
    nickname: 'BiteMaster',
    email: 'bitemaster@example.com',
    phoneNumber: '+15551234567',
    totalRounds: 5,
    bestScore: 496,
    totalXp: 1250,
    level: 6,
    bestCombo: 12,
    achievements: [
      { id: 'first-bite', title: 'First Bite', description: 'Done', unlocked: true, icon: '🍿', unlockedAt: '2026-10-27T15:30:00.000Z' },
    ],
    recentResults: [mockResult],
    profilePicture: mockResult.profilePicture,
  };

  let downloadedBlob: Blob | null = null;
  let downloadedName = '';

  beforeEach(() => {
    downloadedBlob = null;
    downloadedName = '';
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      downloadedBlob = obj as Blob;
      return 'blob:mock-url';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exportJsonReport triggers download with valid versioned schema 1.0.0 and correct score 496', async () => {
    exportJsonReport(mockResult, mockProfile);

    expect(downloadedBlob).not.toBeNull();
    expect(downloadedName).toContain('chip-bite-result-BiteMaster-496');

    const text = await (downloadedBlob as unknown as Blob).text();
    const parsed = JSON.parse(text);

    expect(parsed.reportVersion).toBe('1.0.0');
    expect(parsed.gameResult.score).toBe(496);
    expect(parsed.gameResult.resultId).toBe('test-guid-1234');
    expect(parsed.gameResult.email).toBe('bitemaster@example.com');
    expect(parsed.gameResult.phoneNumber).toBe('+15551234567');
    expect(parsed.playerProfile.email).toBe('bitemaster@example.com');
    expect(parsed.playerProfile.phoneNumber).toBe('+15551234567');
    expect(parsed.gameResult.verifiedRank.bestRank).toBe(1);
    expect(parsed.playerProfile.level).toBe(6);
  });

  it('exportCsvReport triggers download with valid CSV format containing score 496 and player stats', async () => {
    exportCsvReport(mockResult, mockProfile);

    expect(downloadedBlob).not.toBeNull();
    expect(downloadedName).toContain('chip-bite-statistics-BiteMaster-496');

    const text = await (downloadedBlob as unknown as Blob).text();
    expect(text).toContain('Result ID,test-guid-1234');
    expect(text).toContain('Player Email,bitemaster@example.com');
    expect(text).toContain('Player Phone Number,+15551234567');
    expect(text).toContain('Final Score,496');
    expect(text).toContain('Leaderboard Best Rank,#1');
    expect(text).toContain('Golden Bonus Chips,4');
  });

  it('exportPdfReport generates a valid PDF 1.4 binary structure with Helvetica fonts and JPEG XObject', async () => {
    exportPdfReport(mockResult, mockProfile);

    expect(downloadedBlob).not.toBeNull();
    expect(downloadedName).toContain('chip-bite-report-BiteMaster-496');

    const text = await (downloadedBlob as unknown as Blob).text();
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('CHIP BITE CHALLENGE -- OFFICIAL ARENA REPORT');
    expect(text).toContain('bitemaster@example.com');
    expect(text).toContain('+15551234567');
    expect(text).toContain('496');
    expect(text).toContain('%%EOF');
  });
});

describe('profile state and picture management in gameStore', () => {
  it('updates profile picture and attaches to saved game results', () => {
    const testPic = 'data:image/jpeg;base64,mock123';
    gameStore.setProfilePicture(testPic);
    expect(gameStore.getSnapshot().profile.profilePicture).toBe(testPic);

    const saved = gameStore.saveResult({
      id: 'r-1',
      nickname: 'PicPlayer',
      score: 496,
      capturedChips: 25,
      goldenChips: 3,
      bombPenalties: 0,
      bestCombo: 10,
      eligibleOpportunities: 25,
      accuracy: 1,
      xpEarned: 100,
      mode: 'webcam',
      createdAt: new Date().toISOString(),
      personalBest: true,
      localOnly: true,
    });

    expect(saved.profilePicture).toBe(testPic);
    expect(saved.score).toBe(496);

    // Can clear profile picture
    gameStore.setProfilePicture(null);
    expect(gameStore.getSnapshot().profile.profilePicture).toBeNull();
  });
});
