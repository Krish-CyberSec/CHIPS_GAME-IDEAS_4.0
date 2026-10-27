import { describe, expect, it } from 'vitest';
import { MouthDetectionService } from '../vision/MouthDetectionService';
import { CalibrationService } from '../vision/CalibrationService';

const makeLandmarks = (opening: number, center = .5) => {
  const landmarks = Array.from({ length: 300 }, () => ({ x: center, y: .5, z: 0 }));
  landmarks[10] = { x: center, y: .1, z: 0 }; landmarks[152] = { x: center, y: .9, z: 0 };
  landmarks[61] = { x: center - .08, y: .55, z: 0 }; landmarks[291] = { x: center + .08, y: .55, z: 0 };
  landmarks[13] = { x: center, y: .55 - opening / 2, z: 0 }; landmarks[14] = { x: center, y: .55 + opening / 2, z: 0 };
  return { faceLandmarks: [landmarks] } as never;
};

const makeMultiFaceLandmarks = (primaryOpening: number, secondaryOpening: number) => {
  // Primary face (centered, larger)
  const primary = Array.from({ length: 300 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  primary[10] = { x: 0.5, y: 0.1, z: 0 }; primary[152] = { x: 0.5, y: 0.9, z: 0 };
  primary[61] = { x: 0.42, y: 0.55, z: 0 }; primary[291] = { x: 0.58, y: 0.55, z: 0 };
  primary[13] = { x: 0.5, y: 0.55 - primaryOpening / 2, z: 0 }; primary[14] = { x: 0.5, y: 0.55 + primaryOpening / 2, z: 0 };

  // Secondary face (off-center, smaller)
  const secondary = Array.from({ length: 300 }, () => ({ x: 0.85, y: 0.35, z: 0 }));
  secondary[10] = { x: 0.85, y: 0.25, z: 0 }; secondary[152] = { x: 0.85, y: 0.45, z: 0 };
  secondary[61] = { x: 0.81, y: 0.38, z: 0 }; secondary[291] = { x: 0.89, y: 0.38, z: 0 };
  secondary[13] = { x: 0.85, y: 0.38 - secondaryOpening / 2, z: 0 }; secondary[14] = { x: 0.85, y: 0.38 + secondaryOpening / 2, z: 0 };

  return { faceLandmarks: [primary, secondary] } as never;
};

describe('mouth detection', () => {
  it('uses hysteresis so a slightly smaller opening does not immediately close', () => {
    const service = new MouthDetectionService();
    service.setThreshold(.45, .32);
    expect(service.estimate(makeLandmarks(.08)).isOpen).toBe(true);
    expect(service.estimate(makeLandmarks(.06)).isOpen).toBe(true);
    for (let index = 0; index < 15; index += 1) service.estimate(makeLandmarks(.02));
    expect(service.estimate(makeLandmarks(.02)).isOpen).toBe(false);
  });

  it('normalizes openness against mouth width', () => {
    const service = new MouthDetectionService();
    const closed = service.estimate(makeLandmarks(.02));
    const open = service.estimate(makeLandmarks(.15));
    expect(open.openness).toBeGreaterThan(closed.openness);
    expect(open.x).toBeGreaterThanOrEqual(0);
    expect(open.x).toBeLessThanOrEqual(1);
  });

  it('does not impose a small center-circle boundary on a visible face', () => {
    const service = new MouthDetectionService();
    const state = service.estimate(makeLandmarks(.12, .12));
    expect(state.reliable).toBe(true);
    expect(state.x).toBeGreaterThan(.8); // mirrored left-edge camera position
  });

  it('performs target input validation when multiple users are on screen and locks on primary target', () => {
    const service = new MouthDetectionService();
    const state = service.estimate(makeMultiFaceLandmarks(.06, .02));
    expect(state.reliable).toBe(true);
    expect(state.faceCount).toBe(2);
    expect(state.hasMultipleFaces).toBe(true);
    expect(state.targetValidated).toBe(true);
    // Verified tracking stays centered on primary face
    expect(state.x).toBeCloseTo(0.5, 1);
  });

  it('adjusts bite detection sensitivity dynamically', () => {
    const service = new MouthDetectionService();
    service.setThreshold(0.35, 0.25);

    // Medium opening that is normally below 0.35 threshold
    // opening 0.04 / 0.16 = 0.25 openness
    service.setSensitivity(1.0);
    expect(service.estimate(makeLandmarks(0.04)).isOpen).toBe(false);

    // With higher sensitivity (1.5x), lower threshold is needed so it triggers open!
    service.reset();
    service.setThreshold(0.35, 0.25);
    service.setSensitivity(1.6);
    expect(service.estimate(makeLandmarks(0.04)).isOpen).toBe(true);
  });
});

describe('calibration', () => {
  it('creates separate open and close thresholds only with useful separation', () => {
    const service = new CalibrationService();
    for (let index = 0; index < 10; index += 1) { service.addClosedSample(.12); service.addOpenSample(.45); }
    const result = service.result();
    expect(result).not.toBeNull();
    expect(result!.closeThreshold).toBeLessThan(result!.threshold);
    expect(result!.threshold).toBeLessThan(result!.openAverage);
  });

  it('rejects a calibration with no meaningful mouth separation', () => {
    const service = new CalibrationService();
    for (let index = 0; index < 10; index += 1) { service.addClosedSample(.15); service.addOpenSample(.155); }
    expect(service.result()).toBeNull();
  });
});
