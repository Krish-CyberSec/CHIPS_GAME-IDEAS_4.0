import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { MouthTrackingState } from '../types';

const LANDMARKS = { upperLip: 13, lowerLip: 14, leftCorner: 61, rightCorner: 291, forehead: 10, chin: 152 };
export const MOUTH_DETECTION_CONFIG = {
  smoothingAlpha: 0.35,
  openThreshold: 0.28,
  closeThresholdRatio: 0.78,
  minimumCalibrationSeparation: 0.05,
} as const;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const emptyState = (previous: MouthTrackingState | null, detected = false, faceCount = 0): MouthTrackingState => ({
  detected,
  reliable: false,
  x: previous?.x ?? 0.5,
  y: previous?.y ?? 0.55,
  width: previous?.width ?? 0.16,
  height: previous?.height ?? 0.05,
  openness: 0,
  isOpen: false,
  confidence: 0,
  mirrored: true,
  timestamp: performance.now(),
  faceCount,
  hasMultipleFaces: faceCount > 1,
  targetValidated: false,
});

export class MouthDetectionService {
  private previous: MouthTrackingState | null = null;
  private openThreshold: number = MOUTH_DETECTION_CONFIG.openThreshold;
  private closeThreshold: number = this.openThreshold * MOUTH_DETECTION_CONFIG.closeThresholdRatio;
  private sensitivity: number = 1.0;

  setThreshold(value: number, closeThreshold = value * MOUTH_DETECTION_CONFIG.closeThresholdRatio) {
    if (!Number.isFinite(value) || value <= 0) return;
    this.openThreshold = value;
    this.closeThreshold = Math.min(value, Math.max(0.01, closeThreshold));
  }

  setSensitivity(value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    this.sensitivity = Math.max(0.4, Math.min(2.5, value));
  }

  estimate(result: FaceLandmarkerResult | null): MouthTrackingState {
    const faces = result?.faceLandmarks ?? [];
    const faceCount = faces.length;
    if (faceCount === 0) return emptyState(this.previous, false, 0);

    // Target input validation: when multiple users are in frame, validate and select the primary user
    let targetLandmarks = faces[0];
    let targetValidated = false;

    if (faceCount === 1) {
      targetLandmarks = faces[0];
      targetValidated = true;
    } else {
      let bestScore = -Infinity;
      for (let i = 0; i < faces.length; i++) {
        const landmarks = faces[i];
        const top = landmarks[LANDMARKS.forehead];
        const bottom = landmarks[LANDMARKS.chin];
        const left = landmarks[LANDMARKS.leftCorner];
        const right = landmarks[LANDMARKS.rightCorner];
        if (!top || !bottom || !left || !right) continue;

        const faceHeight = distance(top, bottom);
        const faceCenterX = (left.x + right.x) / 2;
        const faceCenterY = (top.y + bottom.y) / 2;
        const distFromCenter = Math.hypot(faceCenterX - 0.5, faceCenterY - 0.5);

        // Score based on size (closer person is larger) and central alignment
        let score = faceHeight * 2.2 - distFromCenter * 0.9;

        // Continuity / target stickiness: favor the face already being tracked
        if (this.previous && this.previous.reliable) {
          const mirroredPrevX = 1 - this.previous.x;
          const distFromPrev = Math.hypot(faceCenterX - mirroredPrevX, faceCenterY - this.previous.y);
          if (distFromPrev < 0.3) {
            score += 1.8 * (1 - distFromPrev / 0.3);
          }
        }

        if (score > bestScore) {
          bestScore = score;
          targetLandmarks = landmarks;
        }
      }
      targetValidated = true;
    }

    const upper = targetLandmarks[LANDMARKS.upperLip];
    const lower = targetLandmarks[LANDMARKS.lowerLip];
    const left = targetLandmarks[LANDMARKS.leftCorner];
    const right = targetLandmarks[LANDMARKS.rightCorner];
    const faceTop = targetLandmarks[LANDMARKS.forehead];
    const faceBottom = targetLandmarks[LANDMARKS.chin];
    if (!upper || !lower || !left || !right || !faceTop || !faceBottom) {
      return emptyState(this.previous, true, faceCount);
    }

    const mouthWidth = Math.max(distance(left, right), 0.001);
    const openness = distance(upper, lower) / mouthWidth;
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
      faceCount,
      hasMultipleFaces: faceCount > 1,
      targetValidated,
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

    // Sensitivity scales effective thresholds (higher sensitivity = easier to bite)
    const effectiveOpenThreshold = this.openThreshold / this.sensitivity;
    const effectiveCloseThreshold = this.closeThreshold / this.sensitivity;

    smoothed.isOpen = this.previous?.isOpen
      ? smoothed.openness >= effectiveCloseThreshold
      : smoothed.openness >= effectiveOpenThreshold;

    this.previous = smoothed;
    return smoothed;
  }

  reset() {
    this.previous = null;
    this.openThreshold = MOUTH_DETECTION_CONFIG.openThreshold;
    this.closeThreshold = this.openThreshold * MOUTH_DETECTION_CONFIG.closeThresholdRatio;
    this.sensitivity = 1.0;
  }
}
