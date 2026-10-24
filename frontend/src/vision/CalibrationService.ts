import type { CalibrationResult } from '../types';
import { MOUTH_DETECTION_CONFIG } from './MouthDetectionService';

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

export class CalibrationService {
  private closed: number[] = [];
  private open: number[] = [];

  addClosedSample(value: number) { if (Number.isFinite(value)) this.closed.push(value); }
  addOpenSample(value: number) { if (Number.isFinite(value)) this.open.push(value); }
  get closedCount() { return this.closed.length; }
  get openCount() { return this.open.length; }
  get ready() { return this.closed.length >= 10 && this.open.length >= 10; }

  result(): CalibrationResult | null {
    if (!this.ready) return null;
    const closedAverage = average(this.closed);
    const openAverage = average(this.open);
    const separation = openAverage - closedAverage;
    if (separation < MOUTH_DETECTION_CONFIG.minimumCalibrationSeparation) return null;
    const margin = Math.max(0.008, separation * 0.08);
    const closeThreshold = closedAverage + separation * 0.42;
    const threshold = Math.min(openAverage - margin, closedAverage + separation * 0.58);
    return { closedAverage, openAverage, threshold, closeThreshold, margin, sampleCount: this.closed.length + this.open.length };
  }

  reset() { this.closed = []; this.open = []; }
}
