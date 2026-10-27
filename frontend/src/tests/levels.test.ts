import { describe, expect, it } from 'vitest';
import { getLevelForScore, getLevelThreshold, LEVEL_THRESHOLDS } from '../game/levelConfig';

describe('Level Thresholds and Progression', () => {
  it('correctly maps all configured score tiers', () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(5);
    expect(LEVEL_THRESHOLDS[0]).toMatchObject({ level: 1, minScore: 0, maxScore: 99 });
    expect(LEVEL_THRESHOLDS[1]).toMatchObject({ level: 2, minScore: 100, maxScore: 249 });
    expect(LEVEL_THRESHOLDS[2]).toMatchObject({ level: 3, minScore: 250, maxScore: 449 });
    expect(LEVEL_THRESHOLDS[3]).toMatchObject({ level: 4, minScore: 450, maxScore: 699 });
    expect(LEVEL_THRESHOLDS[4]).toMatchObject({ level: 5, minScore: 700, maxScore: null });
  });

  it('evaluates exact boundary values for each level transition', () => {
    // Negative or zero
    expect(getLevelForScore(-10)).toBe(1);
    expect(getLevelForScore(0)).toBe(1);

    // Level 1 boundary: 0 to 99
    expect(getLevelForScore(50)).toBe(1);
    expect(getLevelForScore(99)).toBe(1);

    // Level 2 boundary: 100 to 249
    expect(getLevelForScore(100)).toBe(2);
    expect(getLevelForScore(180)).toBe(2);
    expect(getLevelForScore(249)).toBe(2);

    // Level 3 boundary: 250 to 449
    expect(getLevelForScore(250)).toBe(3);
    expect(getLevelForScore(350)).toBe(3);
    expect(getLevelForScore(449)).toBe(3);

    // Level 4 boundary: 450 to 699
    expect(getLevelForScore(450)).toBe(4);
    expect(getLevelForScore(580)).toBe(4);
    expect(getLevelForScore(699)).toBe(4);

    // Level 5 boundary: 700+
    expect(getLevelForScore(700)).toBe(5);
    expect(getLevelForScore(701)).toBe(5);
    expect(getLevelForScore(1500)).toBe(5);
  });

  it('computes correct start thresholds from getLevelThreshold', () => {
    expect(getLevelThreshold(1)).toBe(0);
    expect(getLevelThreshold(2)).toBe(100);
    expect(getLevelThreshold(3)).toBe(250);
    expect(getLevelThreshold(4)).toBe(450);
    expect(getLevelThreshold(5)).toBe(700);
  });

  it('prevents duplicate level-up events when scores fluctuate or jump rapidly', () => {
    class LevelTracker {
      highestLevelReached = 1;
      currentLevel = 1;
      levelUpEvents: number[] = [];

      updateScore(score: number) {
        const calculated = getLevelForScore(score);
        if (calculated > this.highestLevelReached) {
          this.highestLevelReached = calculated;
          this.currentLevel = calculated;
          this.levelUpEvents.push(calculated);
        }
      }

      reset() {
        this.highestLevelReached = 1;
        this.currentLevel = 1;
        this.levelUpEvents = [];
      }
    }

    const tracker = new LevelTracker();

    // Start at score 50 (Level 1)
    tracker.updateScore(50);
    expect(tracker.currentLevel).toBe(1);
    expect(tracker.levelUpEvents).toEqual([]);

    // Crosses threshold into Level 2 (120 points)
    tracker.updateScore(120);
    expect(tracker.currentLevel).toBe(2);
    expect(tracker.levelUpEvents).toEqual([2]);

    // Bomb penalty drops score down to 80 (below Level 2 threshold)
    tracker.updateScore(80);
    // Level tracking should not regress or re-announce
    expect(tracker.highestLevelReached).toBe(2);
    expect(tracker.levelUpEvents).toEqual([2]);

    // Recovers score to 110 (still in Level 2)
    tracker.updateScore(110);
    // Must NOT fire level-up event again for Level 2!
    expect(tracker.levelUpEvents).toEqual([2]);

    // Jumps to 260 (Level 3)
    tracker.updateScore(260);
    expect(tracker.currentLevel).toBe(3);
    expect(tracker.levelUpEvents).toEqual([2, 3]);

    // Jumps straight to 720 (skipping level 4 directly into Level 5)
    tracker.updateScore(720);
    expect(tracker.currentLevel).toBe(5);
    expect(tracker.levelUpEvents).toEqual([2, 3, 5]);

    // Starting a new round resets tracking cleanly
    tracker.reset();
    expect(tracker.highestLevelReached).toBe(1);
    expect(tracker.currentLevel).toBe(1);
    expect(tracker.levelUpEvents).toEqual([]);

    // Now Level 2 can trigger afresh for the new round
    tracker.updateScore(105);
    expect(tracker.levelUpEvents).toEqual([2]);
  });
});
