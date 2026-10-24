import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CalibrationResult, MouthTrackingState } from '../types';
import { CameraService } from './CameraService';
import { CalibrationService } from './CalibrationService';
import { FaceLandmarkerService } from './FaceLandmarkerService';
import { MouthDetectionService } from './MouthDetectionService';

export type VisionMessage = 'idle' | 'loading-camera' | 'loading-model' | 'ready' | 'no-face' | 'multiple-faces' | 'tracking-lost' | 'permission-denied' | 'camera-error' | 'model-error';

const INITIAL_STATE: MouthTrackingState = { detected: false, reliable: false, x: .5, y: .55, width: .16, height: .05, openness: 0, isOpen: false, confidence: 0, mirrored: true, timestamp: 0 };
const PUBLISH_INTERVAL_MS = 32;
const TRACKING_GRACE_MS = 650;

export function useWebcamVision(videoRef: RefObject<HTMLVideoElement | null>) {
  const camera = useRef(new CameraService());
  const landmarker = useRef(new FaceLandmarkerService());
  const mouth = useRef(new MouthDetectionService());
  const calibration = useRef(new CalibrationService());
  const frame = useRef<number | null>(null);
  const [state, setState] = useState<MouthTrackingState>(INITIAL_STATE);
  const [message, setMessage] = useState<VisionMessage>('idle');
  const [modelReady, setModelReady] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const latestState = useRef(INITIAL_STATE);
  const lastPublishedAt = useRef(0);
  const publishedState = useRef(INITIAL_STATE);
  const lastReliableState = useRef<MouthTrackingState | null>(null);
  const lastReliableAt = useRef(0);
  const messageRef = useRef<VisionMessage>('idle');
  const tickRef = useRef<() => void>(() => undefined);
  const generation = useRef(0);
  const startPromise = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const modelReadyRef = useRef(false);

  const setVisionMessage = useCallback((next: VisionMessage) => {
    messageRef.current = next;
    if (mounted.current) setMessage(next);
  }, []);

  const scheduleNextFrame = useCallback(() => {
    if (frame.current === null && camera.current.active) frame.current = requestAnimationFrame(() => { frame.current = null; tickRef.current(); });
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    if (!video || !camera.current.active) {
      setVisionMessage('idle');
      return;
    }
    const result = mouth.current.estimate(landmarker.current.detect(video));
    const now = performance.now();
    let effectiveState = result;
    if (result.reliable) {
      lastReliableState.current = result;
      lastReliableAt.current = now;
    } else if (lastReliableState.current && now - lastReliableAt.current < TRACKING_GRACE_MS) {
      // Keep the last mouth position for a short camera/model hiccup. The mouth
      // is explicitly closed during grace so a stale frame cannot bite a chip.
      effectiveState = { ...lastReliableState.current, detected: false, reliable: true, isOpen: false, openness: 0, confidence: Math.min(lastReliableState.current.confidence, .45), timestamp: now };
    }
    latestState.current = effectiveState;
    if (effectiveState.reliable !== publishedState.current.reliable || effectiveState.detected !== publishedState.current.detected || now - lastPublishedAt.current >= PUBLISH_INTERVAL_MS) {
      lastPublishedAt.current = now;
      publishedState.current = effectiveState;
      if (mounted.current) setState(effectiveState);
    }
    const nextMessage: VisionMessage = result.reliable ? 'ready' : result.detected ? 'multiple-faces' : lastReliableState.current ? 'tracking-lost' : 'no-face';
    if (messageRef.current !== nextMessage) setVisionMessage(nextMessage);
    scheduleNextFrame();
  }, [scheduleNextFrame, setVisionMessage, videoRef]);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  const stop = useCallback(() => {
    generation.current += 1;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    startPromise.current = null;
    camera.current.stop(videoRef.current ?? undefined);
    landmarker.current.close();
    mouth.current.reset();
    lastReliableState.current = null;
    lastReliableAt.current = 0;
    modelReadyRef.current = false;
    if (mounted.current) {
      setModelReady(false);
      setCalibrationResult(null);
      publishedState.current = INITIAL_STATE;
      setState(INITIAL_STATE);
      setVisionMessage('idle');
    }
  }, [setVisionMessage, videoRef]);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video) throw new Error('Camera preview is not ready.');
    if (startPromise.current) return startPromise.current;
    if (camera.current.active && modelReadyRef.current) {
      scheduleNextFrame();
      return;
    }
    const run = ++generation.current;
    const pending = (async () => {
      setVisionMessage('loading-camera');
      try {
        const stream = await camera.current.start(video);
        if (run !== generation.current || videoRef.current !== video) { camera.current.stopStream(stream, video); return; }
      } catch (error) {
        if (run !== generation.current) return;
        setVisionMessage(error instanceof DOMException && error.name === 'NotAllowedError' ? 'permission-denied' : 'camera-error');
        throw error;
      }
      if (run !== generation.current) return;
      setVisionMessage('loading-model');
      try {
        await landmarker.current.initialize();
      } catch (error) {
        setVisionMessage('model-error');
        camera.current.stop(video);
        throw error;
      }
      if (run !== generation.current) {
        camera.current.stop(video);
        landmarker.current.close();
        return;
      }
      modelReadyRef.current = true;
      if (mounted.current) setModelReady(true);
      scheduleNextFrame();
    })();
    startPromise.current = pending;
    pending.then(() => { if (startPromise.current === pending) startPromise.current = null; }, () => { if (startPromise.current === pending) startPromise.current = null; });
    return pending;
  }, [scheduleNextFrame, setVisionMessage, videoRef]);

  const applyCalibration = useCallback((result: CalibrationResult) => {
    if (!Number.isFinite(result.threshold) || !Number.isFinite(result.closeThreshold) || result.threshold <= 0) return false;
    mouth.current.setThreshold(result.threshold, result.closeThreshold);
    if (mounted.current) setCalibrationResult(result);
    return true;
  }, []);

  const startCalibration = useCallback(async (onPhase?: (phase: 'closed' | 'open') => void, durationMs = 2600) => {
    if (!modelReadyRef.current || !camera.current.active) throw new Error('The camera and model must be ready before calibration.');
    calibration.current.reset();
    if (mounted.current) setCalibrationResult(null);
    onPhase?.('closed');
    const collect = async (add: (value: number) => void, phaseStart: number) => {
      while (performance.now() - phaseStart < durationMs) {
        const sample = latestState.current;
        if (sample.reliable) add(sample.openness);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    };
    await collect((value) => calibration.current.addClosedSample(value), performance.now());
    onPhase?.('open');
    await collect((value) => calibration.current.addOpenSample(value), performance.now());
    const result = calibration.current.result();
    if (!result) throw new Error('Calibration needs a stable face and a clearly wider, comfortable open-mouth sample.');
    mouth.current.setThreshold(result.threshold, result.closeThreshold);
    if (mounted.current) setCalibrationResult(result);
    return result;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, [stop]);

  return { state, message, modelReady, calibrationResult, start, stop, startCalibration, applyCalibration };
}
