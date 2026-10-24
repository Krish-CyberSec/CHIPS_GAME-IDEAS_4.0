# Chip Bite Challenge — Implementation Plan and Baseline

## Phase 1 audit (October 24, 2026)

### Existing architecture

- **Frontend:** React 19 + TypeScript + Vite + Tailwind 3 + React Router 7.
- **Game:** Phaser 3 owns the high-frequency loop in `frontend/src/game/GameEngine.ts`; `GameCanvas.tsx` owns the webcam-driven Phaser lifecycle.
- **Vision:** `CameraService` owns `MediaStream`, `FaceLandmarkerService` owns MediaPipe Tasks Vision, `MouthDetectionService` extracts and smooths normalized mouth landmarks, and `useWebcamVision` feeds the latest snapshot to setup/game.
- **Navigation:** `App.tsx` wraps routes in `Layout`; the home CTA currently routes to `/setup`, then `/game`.
- **Persistence:** local-first `localStorage` result/profile repositories with optional API submission and leaderboard reads.
- **Backend:** ASP.NET Core 8 + EF Core; SQL Server when configured, explicit in-memory development fallback otherwise. Result submission and leaderboard endpoints are public; operator endpoints use JWT role authorization.

### Existing user flow

1. `/` renders `HomePage`.
2. `Play now` links to `/setup`.
3. `/setup` collects nickname, camera permission, model loading, and calibration for the webcam-only game.
4. `/game` starts a Phaser scene and the required webcam vision loop.
5. Game completion saves locally, attempts `POST /api/games/results`, then navigates to `/results`.
6. `/leaderboard` reads connected data when configured and otherwise uses local results.

### MediaPipe-to-Phaser pipeline

`videoRef` → `CameraService.start()` → MediaPipe `FaceLandmarker.detectForVideo()` → `MouthDetectionService.estimate()` → `useWebcamVision.state` → `GamePage.trackingState` → `GameCanvas.inputRef` → `BiteScene.inputProvider.getState()` → Phaser logical coordinates (`x * scale.width`, `y * scale.height`). The preview is CSS-mirrored and the service mirrors normalized X once.

### Baseline checks

| Check | Command | Result |
|---|---|---|
| Frontend dependencies | `npm ci` | Passed; 198 packages installed. npm reported 4 audit findings (3 moderate, 1 high). |
| Frontend lint | `npm run lint` | Passed: 0 warnings, 0 errors. |
| Frontend tests | `npm test` | Passed: 3 files, 6 tests. |
| Frontend build | `npm run build` | Passed; Vite emitted a non-failing 1.69 MB minified bundle warning. |
| Backend build | `dotnet build backend/ChipBiteChallenge.sln` | Not run: .NET SDK is not installed in this environment (`dotnet: command not found`). |
| Backend tests | `dotnet test backend/ChipBiteChallenge.sln --no-restore` | Not run for the same environment limitation. |

### Baseline issue list

1. The landing page is functional but not cinematic: it uses the existing gradient/card layout, lacks the required full-screen video, Podium font, mobile overlay navigation, and requested hero copy/stats.
2. The global `Layout` header remains visible on the landing page, so the home page cannot achieve a true fullscreen composition without a route-aware presentation change.
3. `GameEngine` renders every falling object as a labeled circle; it needs reusable procedural chip textures and a distinct bomb visual.
4. `MouthDetectionService` has one open threshold and no hysteresis; calibration threshold calculation can exceed the open sample midpoint and does not guard against reversed/weak calibration separation.
5. Vision starts can race under React Strict Mode or repeated clicks; camera/model lifecycle needs an idempotent start/stop state machine and cancellation guards.
6. The hook schedules a frame even after a stopped/inactive stream unless the cleanup race is already settled; frame processing should explicitly check stream/video activity and avoid stale starts.
7. `GameEngine` returns early while tracking is unreliable, which freezes object movement/timer but also skips normal frame updates; state and recovery need explicit handling.
8. Capture uses a fixed radius and does not account for mouth target dimensions or a short open-edge cooldown; input snapshots can cause repeated capture attempts in the same open interval (the processed guard prevents duplicates per object, but not accidental neighboring captures).
9. Pause is controlled in React but Phaser pause state is toggled by effect transitions; restart currently reloads the whole browser instead of resetting one game instance.
10. The frontend sends all client result values to the API, while the backend clamps them but does not validate cross-field consistency (for example, bomb/capture relationships or submitted `Accuracy`/`XpEarned` values before replacing some fields).
11. Backend verification is blocked by the missing .NET SDK; real camera and MediaPipe tests remain manual and require browser permission plus network/local model assets.

## Implementation phases

1. Replace the home presentation with the cinematic landing page while preserving routes and the existing `/setup` handoff.
2. Add deterministic, reusable Phaser chip and bonus-chip textures with distinct bomb art.
3. Harden camera/model lifecycle, calibration, smoothing, hysteresis, tracking-loss recovery, and user-facing states.
4. Document and centralize coordinate conversion; make capture geometry and capture state deterministic.
5. Repair pause/restart/focus cleanup and preserve all scoring, power-up, leaderboard, and result behavior.
6. Tighten server-side result validation without changing API routes/contracts; add focused regression tests where the installed toolchains permit.
7. Run frontend checks, build, browser smoke checks, and report backend/manual-camera gaps honestly.

## Completed phase notes

### Phase 2 — landing page

- **Changed:** `frontend/index.html`, `frontend/tailwind.config.cjs`, `frontend/src/index.css`, `frontend/src/components/Layout.tsx`, `frontend/src/pages/HomePage.tsx`, `frontend/src/tests/setup.ts`, `frontend/src/tests/navigation.test.tsx`.
- **Result:** Fullscreen cinematic home composition with the requested video URL, font loading, responsive desktop/mobile navigation, accessible menu state, `/setup` CTA, real `/how-to-play` and `/leaderboard` links, `#about` section, stats row, reduced-motion handling, and dark fallback background.
- **Checks:** `npm run lint`, `npm test`, and `npm run build` passed after the phase.
- **Open manual check:** Browser GUI and video provider playback still need a real browser smoke test.

### Phase 3 — game visuals

- **Changed:** `frontend/src/game/GameEngine.ts`.
- **Result:** Reusable deterministic Phaser-generated chip, golden chip, and bomb textures; special chips reuse the chip silhouette with tint/labels; capture feedback uses lightweight tweened rings/text without per-frame texture creation.
- **Checks:** Frontend lint, 12-test Vitest suite, and production build passed.
- **Open manual check:** Confirm visual scale/contrast on the target event display in a real browser.

### Phases 4–5 — webcam, calibration, coordinates, and capture

- **Changed:** `frontend/src/vision/CameraService.ts`, `FaceLandmarkerService.ts`, `MouthDetectionService.ts`, `CalibrationService.ts`, `useWebcamVision.ts`, `errors.ts`, `frontend/src/game/geometry.ts`, `GameEngine.ts`, `GameCanvas.tsx`, `GamePage.tsx`, `SetupPage.tsx`, and related tests.
- **Result:** Idempotent/cancellable camera/model lifecycle, GPU-to-CPU model fallback, multiple-face rejection, tracking-loss recovery, reduced React frame publication, calibrated hysteresis, weak-calibration rejection, one documented normalized-to-Phaser conversion, shared visible/collision ellipse, capture cooldown, no duplicate per-object scoring, real capture feedback, pause-safe timer, visibility pause, and component-scoped restart.
- **Checks:** `npm run lint` passed; `npm test` passed with 5 files / 12 tests; `npm run build` passed with only the existing Phaser bundle-size warning.
- **Open manual checks:** Real permission flow, actual MediaPipe model load, calibration with a face, capture alignment, and console errors require a browser and camera.

### Phase 6–7 — gameplay and backend boundary

- **Changed:** `backend/ChipBiteChallenge.API/Controllers/GamesController.cs`, `Services/GameResultService.cs`, `appsettings.Development.json`, `backend/ChipBiteChallenge.Tests/GameResultServiceTests.cs`, plus docs.
- **Result:** Result POST is capped at 16 KiB; server continues to clamp untrusted values, recomputes accuracy/XP, normalizes modes and suspicious timestamps, keeps idempotency, and checked-in Development secrets are empty placeholders.
- **Checks:** Backend build/tests could not run because this container does not have the .NET SDK (`dotnet: command not found`). The new backend tests were written but not claimed as passing.
- **Open manual check:** Run `dotnet build backend/ChipBiteChallenge.sln` and `dotnet test backend/ChipBiteChallenge.sln --no-restore` on a .NET 8-capable machine, then exercise API health, submission, leaderboard, and operator auth.

## Final verification snapshot

- `npm run lint`: passed with 0 warnings and 0 errors.
- `npm test`: passed with 5 test files and 12 tests.
- `npm run build`: passed; Vite retained its non-failing Phaser bundle-size warning.
- HTTP smoke check: Vite returned 200 for `/`, `/how-to-play`, `/setup`, `/game`, `/results`, and `/leaderboard`. The requested CloudFront video responded to `HEAD` with `200 video/mp4` in this environment.
- `npm audit --omit=dev`: no production vulnerabilities reported. The full install audit still reports 4 development-tree findings (3 moderate, 1 high); no automatic major dependency upgrade was applied.
- `dotnet build backend/ChipBiteChallenge.sln`: blocked because `dotnet` is not installed.
- `dotnet test backend/ChipBiteChallenge.sln --no-restore`: blocked for the same reason.
- GUI browser/camera smoke test: not claimed; the computer-use browser session was unavailable in this Linux container, and no real camera was attached.

## Webcam interruption repair — October 24, 2026

- **Observed error:** `Webcam unavailable — The play() request was interrupted by a new load request.`
- **Cause:** A browser `HTMLVideoElement.play()` promise can reject with `AbortError` while `srcObject` is settling or while React/camera lifecycle cleanup replaces the stream. The previous implementation treated that transient rejection as a terminal camera failure.
- **Fix:** `CameraService` now sets `autoplay`, retries only this specific interruption when the same `MediaStream` is still attached, preserves cancellation checks, and never retries genuine permission failures.
- **Regression:** `frontend/src/tests/cameraService.test.ts` simulates the exact interrupted play promise and verifies the second attempt succeeds.
- **Verification:** Frontend lint passed, 6 test files / 13 tests passed, and the production build passed. Real camera hardware still needs a browser smoke test.

## Follow-up: stale Vite process — October 24, 2026

The active Vite process was serving an older transformed `CameraService.ts` without the race fix, even though the workspace file had been updated. The dev server was restarted and verified to serve the current source containing `startGeneration` and the interrupted-play retry. The camera preview no longer sets a competing `autoplay` request; pending video playback is paused before `srcObject` replacement.

## Cinematic multi-page theme pass — October 24, 2026

The shared internal experience now follows the landing-page direction: Podium headlines, Inter body copy, sharp borders, black/video atmosphere, high-contrast white typography, cyan/gold/coral accents, responsive site navigation, a mobile overlay menu, and content-rich page sections. Updated route surfaces include How to Play, Setup, Results, Leaderboard, Profile, Operator, and the gameplay shell. HTTP smoke checks returned `200` for all eight frontend routes.


## Webcam range and adaptive arena pass — October 24, 2026

- **Detection range:** The camera guide is now a full-frame comfort guide rather than a restrictive oval. The UI explicitly explains that tracking remains valid anywhere the face is visible in the camera frame. MediaPipe detection/presence/tracking thresholds were lowered from `0.55` to `0.45` to improve edge-of-frame resilience.
- **Recovery:** `useWebcamVision` now holds the last valid mouth position for up to `650ms` during a transient detection drop, forces the mouth closed during that grace window, and changes the message to a professional “reacquiring” state instead of immediately presenting an error.
- **Arena size:** The game surface now uses a larger `1840px` maximum layout, prioritizes the playfield until extra-large screens, and supports a viewport-aware minimum height plus fullscreen enter/exit controls.
- **Challenge:** A tested difficulty curve increases spawn pressure, falling speed, lateral drift, wobble, and bomb probability over three stages. Chips now move with controlled horizontal motion, missed non-hazard targets break combos, and each bite requires a close/open cycle rather than holding the mouth open to chain captures.
- **Checks:** Frontend lint passed, 6 Vitest files / 14 tests passed, and the production build passed with the existing non-failing Phaser bundle-size warning. Physical webcam testing still requires a real browser and camera.


## Connected landing and competitive arcade pass — October 24, 2026

- The landing page now uses the same `Logo`, navigation destinations, sound control, mobile menu vocabulary, privacy language, typography, borders, footer, and cinematic shell treatment as the internal routes. It remains an immersive hero page, but no longer feels like a separate microsite.
- The competitive game loop now has a clearer market-arcade pressure curve: three timed stages, faster spawn cadence, faster falling targets, controlled lateral drift, higher late-round bomb probability, a shrinking capture ring, combo breaks on missed safe targets, and a close/open bite rhythm.
- The field guide was updated so the documented rules match the runtime behavior and stage boundaries.
- Checks after this pass: frontend lint passed, 7 Vitest files / 21 tests passed, production build passed with the existing non-failing Phaser bundle-size warning, and all eight frontend routes returned HTTP 200.


## Webcam-only and score-level progression — October 24, 2026

- Removed keyboard and mouse from the playable frontend flow. `ControlMode` is now webcam-only, persisted settings are normalized to webcam, the setup page requires camera activation plus mouth calibration, and the Phaser input pipeline no longer installs keyboard or pointer controls.
- Replaced time-based stage changes with score-based level progression. Thresholds begin at 120, 300, 550, 900, and 1350 points; later levels continue with larger thresholds. Level advancement is monotonic during the active round, and each earned level increases spawn pressure, fall speed, drift, wobble, bomb probability, and capture precision pressure.
- The game HUD now displays the current level, score progress toward the next threshold, and a level-up announcement.
