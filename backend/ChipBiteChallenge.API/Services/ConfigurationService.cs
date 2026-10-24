using ChipBiteChallenge.API.Data;
using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChipBiteChallenge.API.Services;

public interface IGameConfigurationService
{
    Task<GameConfigurationResponse> GetAsync(CancellationToken cancellationToken);
    Task<GameConfigurationResponse> UpdateAsync(UpdateGameConfigurationRequest request, CancellationToken cancellationToken);
}

public sealed class GameConfigurationService(ChipBiteDbContext db) : IGameConfigurationService
{
    public async Task<GameConfigurationResponse> GetAsync(CancellationToken cancellationToken)
    {
        var config = await db.GameConfigurations.FirstOrDefaultAsync(cancellationToken);
        if (config is null) { config = new GameConfiguration { Id = 1, UpdatedAtUtc = DateTime.UtcNow }; db.GameConfigurations.Add(config); await db.SaveChangesAsync(cancellationToken); }
        return ToResponse(config);
    }

    public async Task<GameConfigurationResponse> UpdateAsync(UpdateGameConfigurationRequest request, CancellationToken cancellationToken)
    {
        var config = await db.GameConfigurations.FirstOrDefaultAsync(cancellationToken) ?? new GameConfiguration { Id = 1 };
        config.RoundDurationSeconds = Math.Clamp(request.RoundDurationSeconds, 20, 120); config.SpawnRateMs = Math.Clamp(request.SpawnRateMs, 300, 2000); config.MinFallSpeed = Math.Clamp(request.MinFallSpeed, 80, 600); config.MaxFallSpeed = Math.Clamp(request.MaxFallSpeed, config.MinFallSpeed, 900); config.ExtraTimeCapSeconds = Math.Clamp(request.ExtraTimeCapSeconds, 0, 30); config.UpdatedAtUtc = DateTime.UtcNow;
        if (db.Entry(config).State == EntityState.Detached) db.GameConfigurations.Add(config);
        await db.SaveChangesAsync(cancellationToken); return ToResponse(config);
    }
    private static GameConfigurationResponse ToResponse(GameConfiguration item) => new(item.RoundDurationSeconds, item.SpawnRateMs, item.MinFallSpeed, item.MaxFallSpeed, item.ExtraTimeCapSeconds);
}
