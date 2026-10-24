# Testing

## Executed automated checks

Frontend:

```powershell
cd frontend
npm run build
npm test
npm run lint
```

Backend:

```powershell
dotnet build backend/ChipBiteChallenge.sln
dotnet test backend/ChipBiteChallenge.sln --no-restore
```

Frontend unit tests cover combo thresholds, bomb scoring, accuracy bounds, nickname validation, and deterministic mouth landmark normalization. Backend xUnit tests cover clamping, idempotent duplicate result IDs, profile creation, and leaderboard ordering.

On October 24, 2026, the frontend run completed with 4 test files / 11 tests passing. The production build and lint completed successfully; Vite emitted a non-failing bundle-size warning because Phaser keeps the initial JavaScript bundle above 500 kB. Backend build/test execution was blocked in this container because the .NET SDK is not installed; the backend suite was not claimed as passing.

## Runtime checks

The frontend dev server was checked over HTTP on October 24, 2026 and served the document for `/`, `/how-to-play`, and `/setup`. A browser GUI session was unavailable in this environment, so interactive navigation, console inspection, camera permission, and real MediaPipe capture were not claimed as completed. The local API health/result smoke check remains dependent on the unavailable .NET SDK.

## Manual webcam checklist

1. Start the frontend on `localhost` or HTTPS.
2. Choose Webcam Mode and allow permission.
3. Confirm the mirrored preview and face guide.
4. Confirm the model loads and face status becomes ready.
5. Keep the mouth closed through the first calibration phase.
6. Open the mouth comfortably during the second phase.
7. Start a round and capture a normal and golden chip.
8. Confirm a bomb applies only one penalty.
9. Move out of frame and confirm the tracking-lost overlay pauses captures.
10. Return to frame and confirm play resumes.
11. Complete the round and verify the result persists locally.
12. Repeat the flow after a score threshold and confirm the next level increases pressure.

Automated tests now cover calibrated hysteresis, weak calibration rejection, normalized-to-Phaser coordinate conversion, and shared capture-zone overlap. Actual physical webcam testing remains environment-dependent and was not performed here.


## Webcam range and difficulty follow-up — October 24, 2026

- Confirm the setup preview labels the dashed frame as a comfort guide, not a hard detection boundary.
- Move the face toward each edge of the visible camera frame and confirm the UI stays in `Tracking ready` or briefly shows `Reacquiring face signal`, rather than treating the guide edge as an error.
- During a round, verify that a short tracking hiccup does not cause an accidental bite, that the round pauses after the grace period, and that returning to frame resumes play.
- Verify the arena expands on a large display/fullscreen, targets drift laterally at higher score levels, missed chips reset the combo, and the user must close and reopen the mouth for separate bites.


## Webcam-only score levels — October 24, 2026

- Frontend verification after the webcam-only and level-progression changes: `npm run lint` passed with 0 warnings/errors; `npm test` passed with 7 test files / 21 tests; `npm run build` passed with the existing non-failing Phaser bundle-size warning.
- HTTP smoke checks returned `200` for `/`, `/how-to-play`, `/setup`, `/game`, `/results`, `/leaderboard`, `/profile`, and `/admin`.
- Regression coverage now verifies camera-only setup, score thresholds, monotonic pressure increases, current-level progress values, and capture geometry.
- Backend build/test remains unavailable in this container because the .NET SDK is not installed.
