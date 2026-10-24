# Security and privacy

## Camera privacy

Camera access is requested only after the player activates the camera check. The browser video stream is kept in memory. The frontend sends only the completed score summary to the optional API. The detector is disposed and camera tracks are stopped when setup/game screens unmount.

## Input and API security

- Nicknames are restricted to 18 Unicode letters/numbers plus spaces, dashes, and underscores.
- React text rendering is used instead of injecting nickname HTML.
- The API validates and clamps result values and caps leaderboard limits.
- Repeated result IDs are idempotent to reduce duplicate submissions.
- Admin routes require a JWT with the `Operator` role.
- CORS is restricted to `Frontend:Origin` instead of allowing every origin.
- Error handling uses the ASP.NET exception handler and does not intentionally return stack traces.
- Result submissions are capped at 16 KiB, server-derived accuracy/XP replace client values, and future or stale timestamps are normalized before persistence.

## Secrets

The development password/key values are placeholders. Replace them using user-secrets, environment variables, or a deployment secret store. Do not commit production credentials, SQL connection strings, or JWT keys.

## Deployment checklist

1. Use HTTPS for the frontend and API.
2. Host MediaPipe WASM/model assets locally if the event network is unreliable.
3. Supply operator credentials and the JWT signing key through user-secrets or environment variables; the checked-in Development settings are empty by design.
4. Restrict CORS to the actual frontend origin.
5. Use a least-privilege SQL login.
6. Monitor result-submission rate and database health.
