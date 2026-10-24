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

describe('mouth detection', () => {
  it('uses hysteresis so a slightly smaller opening does not immediately close', () => {
    const service = new MouthDetectionService();
    service.setThreshold(.1, .07);
    expect(service.estimate(makeLandmarks(.16)).isOpen).toBe(true);
    expect(service.estimate(makeLandmarks(.08)).isOpen).toBe(true);
    for (let index = 0; index < 8; index += 1) service.estimate(makeLandmarks(.03));
    expect(service.estimate(makeLandmarks(.03)).isOpen).toBe(false);
  });

  it('normalizes openness against face height', () => {
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
});

describe('calibration', () => {
  it('creates separate open and close thresholds only with useful separation', () => {
    const service = new CalibrationService();
    for (let index = 0; index < 10; index += 1) { service.addClosedSample(.04); service.addOpenSample(.16); }
    const result = service.result();
    expect(result).not.toBeNull();
    expect(result!.closeThreshold).toBeLessThan(result!.threshold);
    expect(result!.threshold).toBeLessThan(result!.openAverage);
  });

  it('rejects a calibration with no meaningful mouth separation', () => {
    const service = new CalibrationService();
    for (let index = 0; index < 10; index += 1) { service.addClosedSample(.08); service.addOpenSample(.081); }
    expect(service.result()).toBeNull();
  });
});
