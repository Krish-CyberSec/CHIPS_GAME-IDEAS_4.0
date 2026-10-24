import { describe, expect, it } from 'vitest';
import { getCaptureZone, normalizedToGamePoint, overlapsCaptureZone } from '../game/geometry';

describe('game coordinate geometry', () => {
  it('converts normalized mirrored coordinates into Phaser logical units', () => {
    expect(normalizedToGamePoint({ x: .25, y: .5 }, 960, 540)).toEqual({ x: 240, y: 270 });
    expect(normalizedToGamePoint({ x: 2, y: -1 }, 960, 540)).toEqual({ x: 960, y: 0 });
  });

  it('uses the same ellipse geometry for visible target and capture overlap', () => {
    const zone = getCaptureZone({ width: .16 }, 960, 540, true);
    expect(overlapsCaptureZone({ x: 240, y: 270 }, 20, { x: 260, y: 270 }, zone)).toBe(true);
    expect(overlapsCaptureZone({ x: 240, y: 270 }, 20, { x: 900, y: 500 }, zone)).toBe(false);
  });

  it('tightens the visible capture ring as pressure rises without disappearing', () => {
    const opening = getCaptureZone({ width: .16 }, 960, 540, true, 0);
    const finale = getCaptureZone({ width: .16 }, 960, 540, true, 16);
    expect(finale.radiusX).toBeLessThan(opening.radiusX);
    expect(finale.radiusY).toBeLessThan(opening.radiusY);
    expect(finale.radiusX).toBeGreaterThanOrEqual(42);
  });
});
