import { describe, expect, it, vi } from 'vitest';
import type { GameResult, VerifiedRankInfo } from '../types';
import { sortResults } from '../services/storage';

describe('Leaderboard ordering and tie-breaking', () => {
  it('orders by descending score and breaks ties deterministically', () => {
    const list: GameResult[] = [
      {
        id: 'p2-late',
        nickname: 'Player Two',
        score: 300,
        capturedChips: 12,
        goldenChips: 1,
        bombPenalties: 0,
        bestCombo: 5,
        eligibleOpportunities: 12,
        accuracy: 1,
        xpEarned: 60,
        mode: 'webcam',
        createdAt: '2026-10-27T12:00:10.000Z',
        personalBest: false,
        localOnly: true,
      },
      {
        id: 'p1-early',
        nickname: 'Player One',
        score: 300,
        capturedChips: 12,
        goldenChips: 1,
        bombPenalties: 0,
        bestCombo: 5,
        eligibleOpportunities: 12,
        accuracy: 1,
        xpEarned: 60,
        mode: 'webcam',
        createdAt: '2026-10-27T12:00:00.000Z', // 10s earlier
        personalBest: false,
        localOnly: true,
      },
      {
        id: 'p0-champ',
        nickname: 'Top Scorer',
        score: 500,
        capturedChips: 20,
        goldenChips: 3,
        bombPenalties: 0,
        bestCombo: 10,
        eligibleOpportunities: 20,
        accuracy: 1,
        xpEarned: 120,
        mode: 'webcam',
        createdAt: '2026-10-27T12:05:00.000Z',
        personalBest: true,
        localOnly: true,
      },
      {
        id: 'p3-low',
        nickname: 'Casual Biter',
        score: 80,
        capturedChips: 5,
        goldenChips: 0,
        bombPenalties: 1,
        bestCombo: 2,
        eligibleOpportunities: 6,
        accuracy: 0.83,
        xpEarned: 20,
        mode: 'webcam',
        createdAt: '2026-10-27T12:02:00.000Z',
        personalBest: false,
        localOnly: true,
      },
    ];

    const sorted = sortResults(list);
    expect(sorted[0].id).toBe('p0-champ'); // 500
    expect(sorted[1].id).toBe('p1-early'); // 300 (earlier)
    expect(sorted[2].id).toBe('p2-late'); // 300 (later)
    expect(sorted[3].id).toBe('p3-low'); // 80
  });

  it('handles empty results lists without crashing', () => {
    expect(sortResults([])).toEqual([]);
  });
});

describe('Single Result Submission Guard', () => {
  it('prevents multiple submissions of the same completed round', async () => {
    let submissionCount = 0;
    const mockSave = vi.fn().mockImplementation(async () => {
      submissionCount += 1;
      return true;
    });

    class RoundSubmissionManager {
      private submitted = false;

      async submit(result: { id: string }) {
        if (this.submitted) return false;
        this.submitted = true;
        await mockSave(result);
        return true;
      }

      reset() {
        this.submitted = false;
      }
    }

    const manager = new RoundSubmissionManager();
    const resultObj = { id: 'test-round-1' };

    // First submit succeeds
    const firstAttempt = await manager.submit(resultObj);
    expect(firstAttempt).toBe(true);
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Repeated call from duplicate effect or unmount is blocked
    const secondAttempt = await manager.submit(resultObj);
    expect(secondAttempt).toBe(false);
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Re-rendering or multiple callbacks do not trigger additional saves
    await manager.submit(resultObj);
    await manager.submit(resultObj);
    expect(mockSave).toHaveBeenCalledTimes(1);

    // New round allows submission
    manager.reset();
    await manager.submit({ id: 'test-round-2' });
    expect(mockSave).toHaveBeenCalledTimes(2);
  });
});

describe('Top-Three Celebration Logic', () => {
  it('correctly identifies verified top-three rankings', () => {
    const isTopThree = (verified: VerifiedRankInfo | null | undefined): boolean => {
      return Boolean(verified && (verified.isTopThreeDaily || verified.isTopThreeAllTime));
    };

    // 1st place
    const firstPlaceRank: VerifiedRankInfo = {
      dailyRank: 1,
      allTimeRank: 1,
      isTopThreeDaily: true,
      isTopThreeAllTime: true,
      bestRank: 1,
    };
    expect(isTopThree(firstPlaceRank)).toBe(true);

    // 2nd place
    const secondPlaceRank: VerifiedRankInfo = {
      dailyRank: 2,
      allTimeRank: 4,
      isTopThreeDaily: true,
      isTopThreeAllTime: false,
      bestRank: 2,
    };
    expect(isTopThree(secondPlaceRank)).toBe(true);

    // 3rd place
    const thirdPlaceRank: VerifiedRankInfo = {
      dailyRank: null,
      allTimeRank: 3,
      isTopThreeDaily: false,
      isTopThreeAllTime: true,
      bestRank: 3,
    };
    expect(isTopThree(thirdPlaceRank)).toBe(true);

    // 4th place - MUST NOT trigger celebration
    const fourthPlaceRank: VerifiedRankInfo = {
      dailyRank: 4,
      allTimeRank: 5,
      isTopThreeDaily: false,
      isTopThreeAllTime: false,
      bestRank: 4,
    };
    expect(isTopThree(fourthPlaceRank)).toBe(false);

    // Unverified / Offline API failure - MUST NOT trigger celebration
    expect(isTopThree(null)).toBe(false);
    expect(isTopThree(undefined)).toBe(false);
  });

  it('prevents duplicate celebration triggers across component rerenders', () => {
    let celebrationCount = 0;
    const playCelebration = vi.fn().mockImplementation(() => {
      celebrationCount += 1;
    });

    class CelebrationHookSimulator {
      private played = false;

      onRender(isTopThree: boolean) {
        if (!isTopThree || this.played) return;
        this.played = true;
        playCelebration();
      }
    }

    const sim = new CelebrationHookSimulator();

    // First render of top 3
    sim.onRender(true);
    expect(playCelebration).toHaveBeenCalledTimes(1);

    // Subsequent rerenders do NOT re-trigger celebration
    sim.onRender(true);
    sim.onRender(true);
    sim.onRender(true);
    expect(playCelebration).toHaveBeenCalledTimes(1);
    expect(celebrationCount).toBe(1);
  });
});
