# API

Base URL in local development: `http://localhost:5080`.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | None | Service health check |
| POST | `/api/games/results` | None | Validate and persist a completed result |
| GET | `/api/games/configuration` | None | Read the current game configuration |
| GET | `/api/leaderboard/daily?limit=50` | None | Daily ordered leaderboard |
| GET | `/api/leaderboard/all-time?limit=50` | None | All-time ordered leaderboard |
| GET | `/api/players/{id}/statistics` | None | Player totals and recent results |
| GET | `/api/players/{id}/achievements` | None | Player achievement state |
| POST | `/api/admin/auth/login` | None | Issue an operator JWT |
| GET | `/api/admin/statistics` | Operator JWT | Operator statistics |
| GET | `/api/admin/results?limit=200` | Operator JWT | Recent results |
| POST | `/api/admin/configuration` | Operator JWT | Validate and update configuration |
| POST | `/api/admin/leaderboard/reset` | Operator JWT | Delete stored results |

## Result submission

`POST /api/games/results` accepts a JSON result summary. The server validates nickname syntax, clamps score and count ranges, calculates server-side XP, normalizes the mode, and treats a repeated result ID as an idempotent replay. The endpoint does not accept camera frames or landmarks.

## Authentication

`POST /api/admin/auth/login` uses `Admin:Username` and `Admin:Password` configuration values and signs an eight-hour JWT with `Jwt:Key`. Use user-secrets or environment variables in real deployments.
