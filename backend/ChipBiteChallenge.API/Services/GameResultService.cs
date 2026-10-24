using System.Text.RegularExpressions;
using ChipBiteChallenge.API.Data;
using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChipBiteChallenge.API.Services;

public interface IGameResultService
{
    Task<GameResultResponse> SaveAsync(SubmitGameResultRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<LeaderboardEntry>> GetLeaderboardAsync(bool daily, int limit, CancellationToken cancellationToken);
    Task<PlayerStatisticsResponse?> GetPlayerAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<GameResultResponse>> GetRecentAsync(int limit, CancellationToken cancellationToken);
}

public sealed class GameResultService(ChipBiteDbContext db) : IGameResultService
{
    private static readonly Regex NicknamePattern = new("^[\\p{L}\\p{N} _-]{1,18}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public async Task<GameResultResponse> SaveAsync(SubmitGameResultRequest request, CancellationToken cancellationToken)
    {
        var nickname = request.Nickname?.Trim() ?? string.Empty;
        if (!NicknamePattern.IsMatch(nickname)) throw new ArgumentException("Nickname must be 1–18 characters using letters, numbers, spaces, dashes, or underscores.");
        var id = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id;
        var existing = await db.GameResults.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (existing is not null) return ToResponse(existing);
        var now = DateTime.UtcNow;
        var score = Math.Clamp(request.Score, 0, 5000);
        var captured = Math.Clamp(request.CapturedChips, 0, 250);
        var golden = Math.Clamp(request.GoldenChips, 0, captured);
        var bombs = Math.Clamp(request.BombPenalties, 0, 100);
        var combo = Math.Clamp(request.BestCombo, 0, 100);
        var eligible = Math.Clamp(request.EligibleOpportunities, captured, 300);
        double? accuracy = eligible == 0 ? null : Math.Clamp((double)captured / eligible, 0, 1);
        var xp = Math.Clamp(Math.Max(10, score / 4 + combo * 3 + captured * 2), 0, 5000);
        var profile = await db.PlayerProfiles.FirstOrDefaultAsync(item => item.Nickname == nickname, cancellationToken);
        if (profile is null) { profile = new PlayerProfile { Id = Guid.NewGuid(), Nickname = nickname, CreatedAtUtc = now }; db.PlayerProfiles.Add(profile); }
        profile.TotalRounds += 1; profile.BestScore = Math.Max(profile.BestScore, score); profile.TotalXp += xp; profile.Level = Math.Max(1, profile.TotalXp / 250 + 1); profile.BestCombo = Math.Max(profile.BestCombo, combo); profile.UpdatedAtUtc = now;
        var createdAt = request.CreatedAtUtc?.ToUniversalTime() ?? now;
        if (createdAt > now.AddMinutes(5) || createdAt < now.AddDays(-365)) createdAt = now;
        var mode = "webcam";
        var result = new GameResult { Id = id, Nickname = nickname, Score = score, CapturedChips = captured, GoldenChips = golden, BombPenalties = bombs, BestCombo = combo, EligibleOpportunities = eligible, Accuracy = accuracy, XpEarned = xp, Mode = mode, CreatedAtUtc = createdAt, PlayerProfileId = profile.Id };
        db.GameResults.Add(result);
        var unlockedIds = new List<string> { "first-bite" };
        if (golden >= 5) unlockedIds.Add("golden-hunter");
        if (combo >= 10) unlockedIds.Add("combo-master");
        if (bombs == 0) unlockedIds.Add("bomb-dodger");
        if (score >= 200) unlockedIds.Add("high-scorer");
        if (bombs == 0) unlockedIds.Add("perfect-run");
        var knownAchievements = await db.Achievements.Where(item => unlockedIds.Contains(item.Id)).Select(item => item.Id).ToListAsync(cancellationToken);
        var alreadyUnlocked = await db.PlayerAchievements.Where(item => item.PlayerProfileId == profile.Id && knownAchievements.Contains(item.AchievementId)).Select(item => item.AchievementId).ToListAsync(cancellationToken);
        foreach (var achievementId in knownAchievements.Except(alreadyUnlocked)) db.PlayerAchievements.Add(new PlayerAchievement { PlayerProfileId = profile.Id, AchievementId = achievementId, UnlockedAtUtc = now });
        await db.SaveChangesAsync(cancellationToken);
        return ToResponse(result);
    }

    public async Task<IReadOnlyList<LeaderboardEntry>> GetLeaderboardAsync(bool daily, int limit, CancellationToken cancellationToken)
    {
        var query = db.GameResults.AsNoTracking();
        if (daily) { var start = DateTime.UtcNow.Date; query = query.Where(item => item.CreatedAtUtc >= start); }
        var results = await query.OrderByDescending(item => item.Score).ThenBy(item => item.CreatedAtUtc).Take(Math.Clamp(limit, 1, 100)).ToListAsync(cancellationToken);
        return results.Select((item, index) => new LeaderboardEntry(index + 1, item.Id, item.Nickname, item.Score, item.BestCombo, item.CapturedChips, "webcam", item.CreatedAtUtc)).ToList();
    }

    public async Task<PlayerStatisticsResponse?> GetPlayerAsync(Guid id, CancellationToken cancellationToken)
    {
        var player = await db.PlayerProfiles.Include(item => item.Results).Include(item => item.Achievements).ThenInclude(item => item.Achievement).FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (player is null) return null;
        var achievements = await db.Achievements.AsNoTracking().ToListAsync(cancellationToken);
        var unlocked = player.Achievements.ToDictionary(item => item.AchievementId, item => item.UnlockedAtUtc);
        return new PlayerStatisticsResponse(player.Id, player.Nickname, player.TotalRounds, player.BestScore, player.TotalXp, player.Level, player.BestCombo, player.Results.OrderByDescending(item => item.CreatedAtUtc).Take(12).Select(ToResponse).ToList(), achievements.Select(item => new AchievementResponse(item.Id, item.Title, item.Description, item.Icon, unlocked.ContainsKey(item.Id), unlocked.GetValueOrDefault(item.Id))).ToList());
    }

    public async Task<IReadOnlyList<GameResultResponse>> GetRecentAsync(int limit, CancellationToken cancellationToken) => (await db.GameResults.AsNoTracking().OrderByDescending(item => item.CreatedAtUtc).Take(Math.Clamp(limit, 1, 200)).ToListAsync(cancellationToken)).Select(ToResponse).ToList();
    private static GameResultResponse ToResponse(GameResult item) => new(item.Id, item.Nickname, item.Score, item.CapturedChips, item.GoldenChips, item.BombPenalties, item.BestCombo, item.EligibleOpportunities, item.Accuracy, item.XpEarned, "webcam", item.CreatedAtUtc);
}
