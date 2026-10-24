# Optional local MediaPipe assets

The game defaults to the official MediaPipe Tasks Vision WASM package and Face Landmarker model URLs configured in `.env.example`. For an offline college-fest setup, place a licensed `face_landmarker.task` file here and set:

```text
VITE_FACE_LANDMARKER_MODEL_URL=/models/face_landmarker.task
```

The WASM runtime may also be hosted locally and selected with `VITE_MEDIAPIPE_WASM_URL`. The application reports model-loading failures instead of claiming that webcam detection is available.
