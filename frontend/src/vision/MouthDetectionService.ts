import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { MouthTrackingState } from '../types';

const LANDMARKS = { upperLip: 13, lowerLip: 14, leftCorner: 61, rightCorner: 291, forehead: 10, chin: 152 };
export const MOUTH_DETECTION_CONFIG = { smoothingAlpha: 0.35, openThreshold: 0.09, closeThresholdRatio: 0.78, minimumCalibrationSeparation: 0.018 } as const;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const emptyState = (previous: MouthTrackingState | null, detected = false): MouthTrackingState => ({
  detected,
  reliable: false,
  x: previous?.x ?? .5,
  y: previous?.y ?? .55,
  width: previous?.width ?? .16,
  height: previous?.height ?? .05,
  openness: 0,
  isOpen: false,
  confidence: 0,
  mirrored: true,
  timestamp: performance.now(),
});

export class MouthDetectionService {
  private previous: MouthTrackingState | null = null;
  private openThreshold: number = MOUTH_DETECTION_CONFIG.openThreshold;
  private closeThreshold: number = this.openThreshold * MOUTH_DETECTION_CONFIG.closeThresholdRatio;

  setThreshold(value: number, closeThreshold = value * MOUTH_DETECTION_CONFIG.closeThresholdRatio) {
    if (!Number.isFinite(value) || value <= 0) return;
    this.openThreshold = value;
    this.closeThreshold = Math.min(value, Math.max(0.01, closeThreshold));
  }

  estimate(result: FaceLandmarkerResult | null): MouthTrackingState {
    const faces = result?.faceLandmarks ?? [];
    if (faces.length === 0) return emptyState(this.previous);
    if (faces.length !== 1) return emptyState(this.previous, true);
    const landmarks = faces[0];
    const upper = landmarks[LANDMARKS.upperLip];
    const lower = landmarks[LANDMARKS.lowerLip];
    const left = landmarks[LANDMARKS.leftCorner];
    const right = landmarks[LANDMARKS.rightCorner];
    const faceTop = landmarks[LANDMARKS.forehead];
    const faceBottom = landmarks[LANDMARKS.chin];
    if (!upper || !lower || !left || !right || !faceTop || !faceBottom) return emptyState(this.previous, true);
    const faceHeight = Math.max(distance(faceTop, faceBottom), 0.001);
    const openness = distance(upper, lower) / faceHeight;
    const raw: MouthTrackingState = {
      detected: true,
      reliable: true,
      x: 1 - ((left.x + right.x + upper.x + lower.x) / 4),
      y: (left.y + right.y + upper.y + lower.y) / 4,
      width: distance(left, right),
      height: Math.max(distance(upper, lower), 0.015),
      openness,
      isOpen: false,
      confidence: 0.9,
      mirrored: true,
      timestamp: performance.now(),
    };
    const alpha = MOUTH_DETECTION_CONFIG.smoothingAlpha;
    const smoothed = this.previous ? {
      ...raw,
      x: this.previous.x + (raw.x - this.previous.x) * alpha,
      y: this.previous.y + (raw.y - this.previous.y) * alpha,
      width: this.previous.width + (raw.width - this.previous.width) * alpha,
      height: this.previous.height + (raw.height - this.previous.height) * alpha,
      openness: this.previous.openness + (raw.openness - this.previous.openness) * alpha,
    } : raw;
    smoothed.isOpen = this.previous?.isOpen ? smoothed.openness >= this.closeThreshold : smoothed.openness >= this.openThreshold;
    this.previous = smoothed;
    return smoothed;
  }

  reset() {
    this.previous = null;
    this.openThreshold = MOUTH_DETECTION_CONFIG.openThreshold;
    this.closeThreshold = this.openThreshold * MOUTH_DETECTION_CONFIG.closeThresholdRatio;
  }
}
