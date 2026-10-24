# Requirements and implemented acceptance

## User flow

- A visitor can open the home page without creating an account.
- A visitor can choose a temporary nickname and enter the Webcam-only game mode.
- The camera requests permission only after the visitor presses Enable camera.
- Webcam Mode loads MediaPipe Face Landmarker, shows a mirrored preview, detects a face, and calibrates mouth openness.
- The player can complete a timed round, see a result summary, replay, and inspect local leaderboard/profile data.
- Camera permission and mouth calibration are required before a round can start.

## Game rules

- Default round length is 45 seconds.
- The game has score-earned levels, falling object speed changes, normal/golden/special/bomb objects, combo multipliers, and power-ups.
- A capture requires active gameplay, reliable webcam tracking, an open mouth, overlap, and a one-time processed-object guard.
- Positive points use the centralized combo and score multiplier rules. Bomb penalties are applied separately and the score is clamped at zero.
- Results include score, captured chips, golden chips, bomb penalties, best combo, accuracy, XP, mode, and local/connected state.

## Security and privacy

- No video or landmark payload is uploaded by the frontend.
- Nicknames are validated before display and API submission.
- Admin login returns a JWT; operator endpoints require the `Operator` role.
- SQL connection strings, JWT keys, and admin passwords are configuration values, not source-controlled production secrets.
