using ChipBiteChallenge.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChipBiteChallenge.API.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(ChipBiteDbContext db, CancellationToken cancellationToken = default)
    {
        if (!await db.Achievements.AnyAsync(cancellationToken))
        {
            db.Achievements.AddRange(
                new Achievement { Id = "first-bite", Title = "First Bite", Description = "Complete one round.", Icon = "🍿" },
                new Achievement { Id = "golden-hunter", Title = "Golden Hunter", Description = "Capture five golden chips in one round.", Icon = "🌟" },
                new Achievement { Id = "combo-master", Title = "Combo Master", Description = "Reach a combo of ten.", Icon = "🔥" },
                new Achievement { Id = "bomb-dodger", Title = "Bomb Dodger", Description = "Finish without a bomb penalty.", Icon = "🛡️" },
                new Achievement { Id = "speed-demon", Title = "Speed Demon", Description = "Capture ten chips while a speed bonus is active.", Icon = "⚡" },
                new Achievement { Id = "high-scorer", Title = "High Scorer", Description = "Reach 200 points.", Icon = "🏆" },
                new Achievement { Id = "perfect-run", Title = "Perfect Run", Description = "Finish without a penalty.", Icon = "💎" });
        }
        if (!await db.GameConfigurations.AnyAsync(cancellationToken)) db.GameConfigurations.Add(new GameConfiguration { Id = 1, SpawnRateMs = 680, MinFallSpeed = 190, MaxFallSpeed = 350, UpdatedAtUtc = DateTime.UtcNow });
        await db.SaveChangesAsync(cancellationToken);
    }
}
