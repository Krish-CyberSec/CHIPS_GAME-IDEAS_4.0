using System.Text.Json.Serialization;

namespace ChipBiteChallenge.API.DTOs;

public sealed record SubmitGameResultRequest(
    Guid Id,
    string Nickname,
    int Score,
    int CapturedChips,
    int GoldenChips,
    int BombPenalties,
    int BestCombo,
    int EligibleOpportunities,
    double? Accuracy,
    int XpEarned,
    string Mode,
    [property: JsonPropertyName("createdAtUtc")] DateTime? CreatedAtUtc,
    [property: JsonPropertyName("createdAt")] DateTime? CreatedAt = null,
    bool IsDemo = false
)
{
    [JsonIgnore]
    public DateTime? EffectiveCreatedAtUtc => CreatedAtUtc ?? CreatedAt;
}

public sealed record GameResultResponse(
    Guid Id,
    string Nickname,
    int Score,
    int CapturedChips,
    int GoldenChips,
    int BombPenalties,
    int BestCombo,
    int EligibleOpportunities,
    double? Accuracy,
    int XpEarned,
    string Mode,
    DateTime CreatedAtUtc,
    bool IsDemo = false
);

public sealed record LeaderboardEntry(
    int Rank,
    Guid Id,
    string Nickname,
    int Score,
    int BestCombo,
    int CapturedChips,
    string Mode,
    DateTime CreatedAtUtc,
    string? ProfilePicture = null,
    bool IsDemo = false
);

public sealed record PlayerStatisticsResponse(
    Guid Id,
    string Nickname,
    int TotalRounds,
    int BestScore,
    int TotalXp,
    int Level,
    int BestCombo,
    IReadOnlyList<GameResultResponse> RecentResults,
    IReadOnlyList<AchievementResponse> Achievements,
    string? ProfilePicture = null,
    DateTime? CreatedAtUtc = null,
    string? Email = null,
    string? PhoneNumber = null
);

public sealed record AchievementResponse(string Id, string Title, string Description, string Icon, bool Unlocked, DateTime? UnlockedAtUtc);
public sealed record LoginRequest(string Username, string Password);
public sealed record TokenResponse(string Token, DateTime ExpiresAtUtc);
public sealed record GameConfigurationResponse(int RoundDurationSeconds, int SpawnRateMs, int MinFallSpeed, int MaxFallSpeed, int ExtraTimeCapSeconds);
public sealed record UpdateGameConfigurationRequest(int RoundDurationSeconds, int SpawnRateMs, int MinFallSpeed, int MaxFallSpeed, int ExtraTimeCapSeconds);

public sealed record RegisterPlayerRequest(
    string Nickname,
    string? Email,
    string? PhoneNumber,
    string? ProfilePicture = null,
    bool IsDemo = false
);

public sealed record RegisterPlayerResponse(
    Guid Id,
    string Nickname,
    bool RegisteredWithContactInfo,
    DateTime CreatedAtUtc,
    string? ProfilePicture = null,
    string? Email = null,
    string? PhoneNumber = null
);

public sealed record UpdateProfilePictureRequest(string? ProfilePicture);

public sealed record VerifiedRankResponse(Guid ResultId, int Score, int? DailyRank, int? AllTimeRank, bool IsTopThreeDaily, bool IsTopThreeAllTime, int BestRank);
