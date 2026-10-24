import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';

const DEFAULT_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const DEFAULT_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export class FaceLandmarkerService {
  private detector: FaceLandmarker | null = null;
  private initializing: Promise<void> | null = null;
  private lastTimestamp = -1;
  private generation = 0;

  async initialize() {
    if (this.detector) return;
    if (this.initializing) return this.initializing;
    const request = ++this.generation;
    const initialization = (async () => {
      const wasmUrl = import.meta.env.VITE_MEDIAPIPE_WASM_URL || DEFAULT_WASM_URL;
      const modelUrl = import.meta.env.VITE_FACE_LANDMARKER_MODEL_URL || DEFAULT_MODEL_URL;
      const vision = await FilesetResolver.forVisionTasks(wasmUrl);
      const createDetector = (delegate: 'GPU' | 'CPU') => FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelUrl, delegate },
        runningMode: 'VIDEO',
        numFaces: 2,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
        outputFaceBlendshapes: false,
      });
      let detector: FaceLandmarker;
      try {
        detector = await createDetector('GPU');
      } catch {
        detector = await createDetector('CPU');
      }
      if (request !== this.generation) {
        detector.close();
        return;
      }
      this.detector = detector;
    })();
    this.initializing = initialization;
    try {
      await initialization;
    } finally {
      if (this.initializing === initialization) this.initializing = null;
    }
  }

  detect(video: HTMLVideoElement): FaceLandmarkerResult | null {
    if (!this.detector || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return null;
    const timestamp = performance.now();
    if (timestamp <= this.lastTimestamp) return null;
    this.lastTimestamp = timestamp;
    return this.detector.detectForVideo(video, timestamp);
  }

  close() {
    this.generation += 1;
    this.detector?.close();
    this.detector = null;
    this.initializing = null;
    this.lastTimestamp = -1;
  }
}
