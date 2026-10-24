# Database

## Entities

- `GameResults` — bounded score summaries with UTC timestamps and a player foreign key.
- `PlayerProfiles` — nickname-based guest profile totals.
- `Achievements` — seeded achievement definitions.
- `PlayerAchievements` — composite-key unlock records.
- `GameConfigurations` — one current operator-controlled game configuration.
- `AdminUsers` — reserved schema for future database-backed operator identity management; the current login uses configured credentials and JWT issuance.

## Providers

The API selects SQL Server when `ConnectionStrings:SqlServer` is configured. Without it, it uses `ChipBiteChallengeLocal` in-memory storage so local API smoke tests do not require a SQL Server instance.

## Migrations

The initial EF Core migration is `InitialCreate` in `ChipBiteChallenge.API/Data/Migrations`. Apply it with:

```powershell
dotnet ef database update --project backend/ChipBiteChallenge.API --startup-project backend/ChipBiteChallenge.API
```

The API runs migrations during startup only when a SQL Server connection is configured. Local in-memory mode uses `EnsureCreated`.

All persisted timestamps are UTC. Leaderboard daily filtering uses the UTC date boundary; local display converts through the browser.
