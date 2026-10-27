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
    Task<IReadOnlyList<LeaderboardEntry>> GetLeaderboardAsync(bool daily, int limit, bool includeDemo, CancellationToken cancellationToken);
    Task<PlayerStatisticsResponse?> GetPlayerAsync(Guid id, CancellationToken cancellationToken);
    Task<PlayerStatisticsResponse?> GetPlayerByNicknameAsync(string nickname, CancellationToken cancellationToken);
    Task<IReadOnlyList<GameResultResponse>> GetRecentAsync(int limit, CancellationToken cancellationToken);
    Task<RegisterPlayerResponse> RegisterPlayerAsync(RegisterPlayerRequest request, CancellationToken cancellationToken);
    Task<VerifiedRankResponse?> GetVerifiedRankAsync(Guid resultId, CancellationToken cancellationToken);
    Task<PlayerStatisticsResponse?> UpdateProfilePictureAsync(Guid playerId, string? picture, CancellationToken cancellationToken);
    Task<int> ResetDemoDataAsync(CancellationToken cancellationToken);
}

public sealed class GameResultService(ChipBiteDbContext db) : IGameResultService
{
    private static readonly Regex NicknamePattern = new(@"^[\p{L}\p{N} _-]{1,18}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex EmailPattern = new(@"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex PicturePattern = new(@"^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static string? ValidateAndSanitizeProfilePicture(string? picture)
    {
        if (string.IsNullOrWhiteSpace(picture)) return null;
        var trimmed = picture.Trim();
        if (trimmed.Length > 280_000)
            throw new ArgumentException("Profile picture exceeds the maximum allowed size (approx 200KB).");
        if (!PicturePattern.IsMatch(trimmed))
            throw new ArgumentException("Invalid profile picture format. Only base64 JPEG, PNG, or WebP images are permitted.");
        return trimmed;
    }

    public async Task<RegisterPlayerResponse> RegisterPlayerAsync(RegisterPlayerRequest request, CancellationToken cancellationToken)
    {
        var nickname = request.Nickname?.Trim() ?? string.Empty;
        if (!NicknamePattern.IsMatch(nickname))
            throw new ArgumentException("Nickname must be 1–18 characters using letters, numbers, spaces, dashes, or underscores.");

        string? normalizedEmail = null;
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var trimmedEmail = request.Email.Trim();
            if (trimmedEmail.Length > 256) throw new ArgumentException("Email address must not exceed 256 characters.");
            if (!EmailPattern.IsMatch(trimmedEmail)) throw new ArgumentException("Please enter a valid email address.");
            normalizedEmail = trimmedEmail.ToLowerInvariant();
        }

        string? normalizedPhone = NormalizePhoneNumber(request.PhoneNumber);
        string? sanitizedPicture = ValidateAndSanitizeProfilePicture(request.ProfilePicture);
        bool isDemo = request.IsDemo || nickname.Equals("demo", StringComparison.OrdinalIgnoreCase);

        var now = DateTime.UtcNow;
        var profile = await db.PlayerProfiles.FirstOrDefaultAsync(item => item.Nickname == nickname, cancellationToken);
        if (profile is null)
        {
            profile = new PlayerProfile
            {
                Id = Guid.NewGuid(),
                Nickname = nickname,
                Email = normalizedEmail,
                PhoneNumber = normalizedPhone,
                ProfilePicture = sanitizedPicture,
                IsDemo = isDemo,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
            };
            db.PlayerProfiles.Add(profile);
        }
        else
        {
            if (normalizedEmail is not null) profile.Email = normalizedEmail;
            if (normalizedPhone is not null) profile.PhoneNumber = normalizedPhone;
            if (sanitizedPicture is not null) profile.ProfilePicture = sanitizedPicture;
            if (isDemo) profile.IsDemo = true;
            profile.UpdatedAtUtc = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return new RegisterPlayerResponse(
            profile.Id,
            profile.Nickname,
            !string.IsNullOrEmpty(profile.Email) || !string.IsNullOrEmpty(profile.PhoneNumber),
            profile.CreatedAtUtc,
            profile.ProfilePicture,
            profile.Email,
            profile.PhoneNumber
        );
    }

    private static string? NormalizePhoneNumber(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var trimmed = phone.Trim();
        if (trimmed.Length > 30) throw new ArgumentException("Phone number is too long (maximum 20 characters).");
        if (!Regex.IsMatch(trimmed, @"^[+\d\s().-]+$"))
            throw new ArgumentException("Phone number may only contain digits, spaces, hyphens, parentheses, and an optional leading '+'.");

        var hasPlus = trimmed.StartsWith('+');
        var digitsOnly = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digitsOnly.Length < 7) throw new ArgumentException("Phone number must contain at least 7 digits.");
        if (digitsOnly.Length > 15) throw new ArgumentException("Phone number must contain at most 15 digits.");

        return hasPlus ? $"+{digitsOnly}" : digitsOnly;
    }

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
        bool isDemo = request.IsDemo || nickname.Equals("demo", StringComparison.OrdinalIgnoreCase);

        var profile = await db.PlayerProfiles.FirstOrDefaultAsync(item => item.Nickname == nickname, cancellationToken);
        if (profile is null)
        {
            profile = new PlayerProfile { Id = Guid.NewGuid(), Nickname = nickname, IsDemo = isDemo, CreatedAtUtc = now, UpdatedAtUtc = now };
            db.PlayerProfiles.Add(profile);
        }
        else if (isDemo && !profile.IsDemo)
        {
            profile.IsDemo = true;
        }

        profile.TotalRounds += 1;
        profile.BestScore = Math.Max(profile.BestScore, score);
        profile.TotalXp += xp;
        profile.Level = Math.Max(1, profile.TotalXp / 250 + 1);
        profile.BestCombo = Math.Max(profile.BestCombo, combo);
        profile.UpdatedAtUtc = now;

        var createdAt = request.EffectiveCreatedAtUtc?.ToUniversalTime() ?? now;
        if (createdAt > now.AddMinutes(5) || createdAt < now.AddDays(-365)) createdAt = now;
        var mode = "webcam";
        var result = new GameResult
        {
            Id = id,
            Nickname = nickname,
            Score = score,
            CapturedChips = captured,
            GoldenChips = golden,
            BombPenalties = bombs,
            BestCombo = combo,
            EligibleOpportunities = eligible,
            Accuracy = accuracy,
            XpEarned = xp,
            Mode = mode,
            IsDemo = isDemo,
            CreatedAtUtc = createdAt,
            PlayerProfileId = profile.Id
        };
        db.GameResults.Add(result);

        var unlockedIds = new List<string> { "first-bite" };
        if (golden >= 5) unlockedIds.Add("golden-hunter");
        if (combo >= 10) unlockedIds.Add("combo-master");
        if (bombs == 0) unlockedIds.Add("bomb-dodger");
        if (score >= 200) unlockedIds.Add("high-scorer");
        if (bombs == 0) unlockedIds.Add("perfect-run");

        var knownAchievements = await db.Achievements.Where(item => unlockedIds.Contains(item.Id)).Select(item => item.Id).ToListAsync(cancellationToken);
        var alreadyUnlocked = await db.PlayerAchievements.Where(item => item.PlayerProfileId == profile.Id && knownAchievements.Contains(item.AchievementId)).Select(item => item.AchievementId).ToListAsync(cancellationToken);
        foreach (var achievementId in knownAchievements.Except(alreadyUnlocked))
        {
            db.PlayerAchievements.Add(new PlayerAchievement { PlayerProfileId = profile.Id, AchievementId = achievementId, UnlockedAtUtc = now });
        }

        await db.SaveChangesAsync(cancellationToken);
        return ToResponse(result);
    }

    public Task<IReadOnlyList<LeaderboardEntry>> GetLeaderboardAsync(bool daily, int limit, CancellationToken cancellationToken) =>
        GetLeaderboardAsync(daily, limit, false, cancellationToken);

    public async Task<IReadOnlyList<LeaderboardEntry>> GetLeaderboardAsync(bool daily, int limit, bool includeDemo, CancellationToken cancellationToken)
    {
        var query = db.GameResults.AsNoTracking().Include(item => item.PlayerProfile).AsQueryable();

        // Segregate demo records from the live leaderboard unless explicitly requested
        if (!includeDemo)
        {
            query = query.Where(item => !item.IsDemo && !item.Nickname.ToLower().Equals("demo"));
        }

        if (daily)
        {
            var start = DateTime.UtcNow.Date;
            query = query.Where(item => item.CreatedAtUtc >= start);
        }

        var results = await query
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.CreatedAtUtc)
            .ThenByDescending(item => item.BestCombo)
            .ThenByDescending(item => item.CapturedChips)
            .ThenBy(item => item.Id)
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync(cancellationToken);

        return results.Select((item, index) => new LeaderboardEntry(
            index + 1,
            item.Id,
            item.Nickname,
            item.Score,
            item.BestCombo,
            item.CapturedChips,
            "webcam",
            item.CreatedAtUtc,
            item.PlayerProfile?.ProfilePicture,
            item.IsDemo
        )).ToList();
    }

    public async Task<VerifiedRankResponse?> GetVerifiedRankAsync(Guid resultId, CancellationToken cancellationToken)
    {
        var result = await db.GameResults.AsNoTracking().FirstOrDefaultAsync(item => item.Id == resultId, cancellationToken);
        if (result is null) return null;

        var now = DateTime.UtcNow;
        var startOfToday = now.Date;

        int? dailyRank = null;
        if (result.CreatedAtUtc >= startOfToday)
        {
            var higherDaily = await db.GameResults.AsNoTracking()
                .Where(item => item.CreatedAtUtc >= startOfToday && !item.IsDemo)
                .CountAsync(item =>
                    item.Score > result.Score ||
                    (item.Score == result.Score && item.CreatedAtUtc < result.CreatedAtUtc) ||
                    (item.Score == result.Score && item.CreatedAtUtc == result.CreatedAtUtc && item.BestCombo > result.BestCombo) ||
                    (item.Score == result.Score && item.CreatedAtUtc == result.CreatedAtUtc && item.BestCombo == result.BestCombo && item.CapturedChips > result.CapturedChips) ||
                    (item.Score == result.Score && item.CreatedAtUtc == result.CreatedAtUtc && item.BestCombo == result.BestCombo && item.CapturedChips == result.CapturedChips && item.Id.CompareTo(result.Id) < 0),
                    cancellationToken);
            dailyRank = higherDaily + 1;
        }

        var higherAllTime = await db.GameResults.AsNoTracking()
            .Where(item => !item.IsDemo)
            .CountAsync(item =>
                item.Score > result.Score ||
                (item.Score == result.Score && item.CreatedAtUtc < result.CreatedAtUtc) ||
                (item.Score == result.Score && item.CreatedAtUtc == result.CreatedAtUtc && item.BestCombo > result.BestCombo) ||
                (item.Score == result.Score && item.CreatedAtUtc == result.CreatedAtUtc && item.BestCombo == result.BestCombo && item.CapturedChips > result.CapturedChips) ||
                (item.Score == result.Score && item.CreatedAtUtc == result.CreatedAtUtc && item.BestCombo == result.BestCombo && item.CapturedChips == result.CapturedChips && item.Id.CompareTo(result.Id) < 0),
                cancellationToken);
        var allTimeRank = higherAllTime + 1;

        var isTopThreeDaily = dailyRank.HasValue && dailyRank.Value <= 3;
        var isTopThreeAllTime = allTimeRank <= 3;
        var bestRank = Math.Min(dailyRank ?? int.MaxValue, allTimeRank);

        return new VerifiedRankResponse(result.Id, result.Score, dailyRank, allTimeRank, isTopThreeDaily, isTopThreeAllTime, bestRank);
    }

    public async Task<PlayerStatisticsResponse?> GetPlayerAsync(Guid id, CancellationToken cancellationToken)
    {
        var player = await db.PlayerProfiles
            .Include(item => item.Results)
            .Include(item => item.Achievements)
            .ThenInclude(item => item.Achievement)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (player is null) return null;
        var achievements = await db.Achievements.AsNoTracking().ToListAsync(cancellationToken);
        var unlocked = player.Achievements.ToDictionary(item => item.AchievementId, item => item.UnlockedAtUtc);

        return new PlayerStatisticsResponse(
            player.Id,
            player.Nickname,
            player.TotalRounds,
            player.BestScore,
            player.TotalXp,
            player.Level,
            player.BestCombo,
            player.Results.OrderByDescending(item => item.CreatedAtUtc).Take(12).Select(ToResponse).ToList(),
            achievements.Select(item => new AchievementResponse(item.Id, item.Title, item.Description, item.Icon, unlocked.ContainsKey(item.Id), unlocked.GetValueOrDefault(item.Id))).ToList(),
            player.ProfilePicture,
            player.CreatedAtUtc,
            player.Email,
            player.PhoneNumber
        );
    }

    public async Task<PlayerStatisticsResponse?> GetPlayerByNicknameAsync(string nickname, CancellationToken cancellationToken)
    {
        var player = await db.PlayerProfiles
            .Include(item => item.Results)
            .Include(item => item.Achievements)
            .ThenInclude(item => item.Achievement)
            .FirstOrDefaultAsync(item => item.Nickname == nickname, cancellationToken);

        if (player is null) return null;
        return await GetPlayerAsync(player.Id, cancellationToken);
    }

    public async Task<PlayerStatisticsResponse?> UpdateProfilePictureAsync(Guid playerId, string? picture, CancellationToken cancellationToken)
    {
        var player = await db.PlayerProfiles.FirstOrDefaultAsync(item => item.Id == playerId, cancellationToken);
        if (player is null) return null;

        player.ProfilePicture = ValidateAndSanitizeProfilePicture(picture);
        player.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return await GetPlayerAsync(player.Id, cancellationToken);
    }

    public async Task<int> ResetDemoDataAsync(CancellationToken cancellationToken)
    {
        var demoResults = await db.GameResults
            .Where(item => item.IsDemo || item.Nickname.ToLower().Equals("demo"))
            .ToListAsync(cancellationToken);

        var count = demoResults.Count;
        if (count > 0)
        {
            db.GameResults.RemoveRange(demoResults);
            await db.SaveChangesAsync(cancellationToken);
        }

        return count;
    }

    public async Task<IReadOnlyList<GameResultResponse>> GetRecentAsync(int limit, CancellationToken cancellationToken) =>
        (await db.GameResults.AsNoTracking().OrderByDescending(item => item.CreatedAtUtc).Take(Math.Clamp(limit, 1, 200)).ToListAsync(cancellationToken)).Select(ToResponse).ToList();

    private static GameResultResponse ToResponse(GameResult item) =>
        new(item.Id, item.Nickname, item.Score, item.CapturedChips, item.GoldenChips, item.BombPenalties, item.BestCombo, item.EligibleOpportunities, item.Accuracy, item.XpEarned, "webcam", item.CreatedAtUtc, item.IsDemo);
}
