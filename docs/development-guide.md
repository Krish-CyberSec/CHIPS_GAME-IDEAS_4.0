# Development guide

## Start work

Use two terminals:

```powershell
cd frontend
npm run dev
```

```powershell
dotnet run --project backend/ChipBiteChallenge.API --urls http://localhost:5080
```

## Conventions

- Keep React pages focused on user flow and pass high-frequency input through refs.
- Keep Phaser systems in `src/game` rather than putting the loop inside React components.
- Put camera ownership in `src/vision` and always stop tracks on cleanup.
- Keep score formulas in `src/game/scoring.ts` and cover changes with Vitest tests.
- Use DTOs in the API; do not return EF entities directly.
- Keep SQL credentials and JWT secrets outside source control.

## Adding a new chip

1. Add its type and default label/color.
2. Add its spawn probability and capture behavior in `GameEngine.ts`.
3. Keep positive scoring in `scoring.ts` and negative penalties separate.
4. Add a visual label that does not depend on color alone.
5. Add a deterministic unit test for the rule.
6. Update the README and requirements docs.

## Adding API behavior

1. Add a request/response DTO.
2. Validate and clamp input in the service layer.
3. Add or update EF entities/migration only when persistence changes.
4. Add xUnit coverage for valid, invalid, duplicate, and authorization paths.
5. Run the solution build and tests before reporting the change.
