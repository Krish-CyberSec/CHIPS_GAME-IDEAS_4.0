import type { MouthTrackingState } from '../types';

export interface GamePoint { x: number; y: number; }
export interface CaptureZone { radiusX: number; radiusY: number; }

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

/** Convert MediaPipe's normalized, mirrored coordinates into Phaser's logical game units. */
export const normalizedToGamePoint = (tracking: Pick<MouthTrackingState, 'x' | 'y'>, width: number, height: number): GamePoint => ({
  x: clamp(tracking.x, 0, 1) * width,
  y: clamp(tracking.y, 0, 1) * height,
});

/** The same ellipse is drawn around the mouth and used for collision checks. */
export const getCaptureZone = (tracking: Pick<MouthTrackingState, 'width'>, width: number, height: number, webcam: boolean, precisionPressure = 0): CaptureZone => {
  const pressure = clamp(precisionPressure, 0, 24);
  if (!webcam) return { radiusX: clamp(55 - pressure, 42, 55), radiusY: clamp(36 - pressure * .65, 28, 36) };
  const mouthWidth = clamp(tracking.width, 0.08, 0.34);
  return {
    radiusX: clamp(mouthWidth * width * 0.35 + 28 - pressure, 42, 86),
    radiusY: clamp(mouthWidth * height * 0.22 + 22 - pressure * .65, 30, 64),
  };
};

export const overlapsCaptureZone = (object: GamePoint, objectRadius: number, mouth: GamePoint, zone: CaptureZone) => {
  const horizontal = Math.max(1, zone.radiusX + objectRadius);
  const vertical = Math.max(1, zone.radiusY + objectRadius);
  const dx = (object.x - mouth.x) / horizontal;
  const dy = (object.y - mouth.y) / vertical;
  return dx * dx + dy * dy <= 1;
};
