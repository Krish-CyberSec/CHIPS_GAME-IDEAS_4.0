# Chip Bite Challenge

Chip Bite Challenge is a webcam-controlled browser arcade game for Class 11–12 students and college-fest visitors. Players see a mirrored camera preview, move their head toward falling virtual chips, and open their mouth to capture them. Camera frames stay in the browser; the backend receives completed score data only when connected mode is configured.

## Implemented features

- React + TypeScript + Vite frontend with Tailwind CSS and Phaser 3 game rendering.
- Home, How to Play, Player Setup, Gameplay, Results, Leaderboard, Profile, and Operator screens.
- Webcam permission flow, camera preview, MediaPipe Tasks Vision face-landmarker service, mouth-openness calibration, smoothing, tracking-loss pause, and cleanup.
- Webcam-only face tracking with mouth calibration and local processing.
- Normal, golden, speed, frozen, combo, bomb, mystery, and power-up objects.
- Combo multipliers, score protection, slow motion, magnet, double score, and extra-time effects.
- Local-first result, profile, achievement, and leaderboard persistence.
- ASP.NET Core 8 Web API with EF Core SQL Server support, in-memory development fallback, JWT-protected operator endpoints, Swagger, and an initial migration.
- Vitest frontend tests and xUnit backend service tests.

## Prerequisites

- Node.js 24.14.0 and npm 11.9.0 (or a compatible modern Node release).
- .NET SDK 8.0.425 or compatible .NET 8 SDK.
- A modern browser for webcam mode. Camera access requires `localhost` or HTTPS.
- SQL Server is optional for connected mode; local browser gameplay and the API's in-memory development mode do not require it.

## Run the frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

The frontend defaults to official MediaPipe WASM/model URLs. For offline or controlled deployment, download the Face Landmarker model and WASM assets into a local public path, then set `VITE_MEDIAPIPE_WASM_URL` and `VITE_FACE_LANDMARKER_MODEL_URL` in `.env`. The model is loaded only after the player activates the camera check.

## Run the backend

```powershell
dotnet run --project backend/ChipBiteChallenge.API --urls http://localhost:5080
```

The API health check is available at `http://localhost:5080/api/health`; Swagger is available in Development at `http://localhost:5080/swagger`.

For connected frontend persistence, set `VITE_API_BASE_URL=http://localhost:5080` in `frontend/.env`.

## SQL Server configuration and migration

The API uses an in-memory database when `ConnectionStrings:SqlServer` is absent. For SQL Server, configure the connection string without committing credentials:

```powershell
dotnet user-secrets --project backend/ChipBiteChallenge.API init
dotnet user-secrets --project backend/ChipBiteChallenge.API set "ConnectionStrings:SqlServer" "Server=localhost;Database=ChipBiteChallenge;Trusted_Connection=True;TrustServerCertificate=True"
dotnet user-secrets --project backend/ChipBiteChallenge.API set "Jwt:Key" "replace-with-a-random-secret-at-least-32-characters"
dotnet user-secrets --project backend/ChipBiteChallenge.API set "Admin:Password" "replace-locally"
dotnet ef database update --project backend/ChipBiteChallenge.API --startup-project backend/ChipBiteChallenge.API
```

The initial migration is `InitialCreate` under `backend/ChipBiteChallenge.API/Data/Migrations`.

## Test and build commands

```powershell
cd frontend
npm run build
npm test
npm run lint

cd ..
dotnet build backend/ChipBiteChallenge.sln
dotnet test backend/ChipBiteChallenge.sln --no-restore
```

## Webcam setup

1. Open the site on `localhost` or HTTPS.
2. Select **Play now** and enter a nickname.
3. Allow camera permission only when prompted.
4. The full camera frame is valid; the dashed guide is only a comfort reference.
5. Calibrate with a relaxed closed mouth followed by a comfortable open mouth.
6. Start the round. Captures are valid only when a reliable face track, an open mouth, and chip overlap are all present.

If camera or model loading fails, the game stops safely and explains the camera issue. The game never fabricates face detection success.

## College-fest runbook

1. Use a laptop connected to a large display and speakers.
2. Put the webcam at face height and mark the player position on the floor.
3. Start the frontend and API, then open the frontend in a full-screen browser tab.
4. Use the Operator screen to review local results and export CSV after the event.
5. Keep the webcam at face height and ensure the full face is visible for lighting and tracking stability.
6. Reset the local leaderboard before a new session only after confirming the operator dialog.

## Privacy and known limitations

- Camera frames and facial landmarks are processed in the browser and are not uploaded by the frontend.
- Completed result summaries can be submitted to the API; use local-only mode when the backend is not trusted or available.
- The default MediaPipe model/WASM configuration uses official remote assets. Offline deployments must host the assets locally.
- Actual webcam verification requires a camera, browser permission, lighting, and the model assets; automated tests use deterministic mocked landmarks.
- The frontend production bundle currently contains Phaser and is large; code splitting is a future optimization.

See `docs/` for architecture, requirements, API, database, security, testing, and development details.
