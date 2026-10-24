# Architecture

## Runtime boundaries

The project has two independent runtime surfaces:

1. **Frontend** (`frontend/`) — React owns navigation, settings, persistence adapters, setup, results, leaderboards, and the operator UI. The playable frontend is webcam-only; keyboard and mouse fallbacks are not exposed. Phaser owns the high-frequency game loop and renders the falling objects through Canvas/WebGL.
2. **Backend** (`backend/ChipBiteChallenge.API/`) — ASP.NET Core 8 exposes result, leaderboard, player, configuration, health, and JWT-protected operator endpoints. EF Core targets SQL Server when configured and an in-memory database during local development.

The browser never uploads camera frames. `CameraService` owns the `MediaStream`, `FaceLandmarkerService` owns the MediaPipe detector, `MouthDetectionService` normalizes and smooths mouth landmarks with calibrated hysteresis, and `GameCanvas` passes the latest tracking snapshot into the Phaser input provider.

## Frontend data flow

```text
CameraService -> video element -> FaceLandmarkerService -> MouthDetectionService
                                                        |
                                                        v
                                            GameCanvas input provider
                                                        |
                                                        v
React setup / Phaser BiteScene -> GameResult -> local repository -> optional API repository
```

React state is intentionally not updated for every camera frame. The vision hook keeps a ref for high-frequency data, while React receives status changes and setup feedback. Phaser owns object movement, collision, score, timer, combo, power-up expiry, and round completion.

## State machine

The game lifecycle supports `idle`, `preparing`, `calibrating`, `countdown`, `playing`, `paused`, `tracking-lost`, `completed`, and `error`. The Phaser scene does not spawn or score objects after `completed`. Webcam tracking is the only playable input; gameplay freezes when tracking becomes unreliable.

## Persistence

The frontend uses a local-first adapter. `localResultRepository` stores bounded result history in browser storage. `apiResultRepository` attempts connected persistence only when `VITE_API_BASE_URL` is configured; a failed API request does not discard a locally saved result.

The backend validates and clamps submitted result data, makes result IDs idempotent, updates a nickname profile, and serves bounded leaderboard queries.

## Coordinate contract

MediaPipe returns normalized coordinates in the webcam's unmirrored coordinate space. The mouth service mirrors only X (`1 - x`) to match the CSS `scale-x-[-1]` preview, and keeps X/Y normalized. `normalizedToGamePoint()` is the single conversion into Phaser's logical 960×540 space. `getCaptureZone()` calculates the ellipse that is drawn by Phaser, and `overlapsCaptureZone()` uses that same ellipse plus the actual falling-object radius for capture. CSS pixels and device pixels are not used in collision checks.
