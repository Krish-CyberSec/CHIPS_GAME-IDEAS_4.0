namespace ChipBiteChallenge.API.DTOs;

public sealed record SubmitGameResultRequest(Guid Id, string Nickname, int Score, int CapturedChips, int GoldenChips, int BombPenalties, int BestCombo, int EligibleOpportunities, double? Accuracy, int XpEarned, string Mode, DateTime? CreatedAtUtc);
public sealed record GameResultResponse(Guid Id, string Nickname, int Score, int CapturedChips, int GoldenChips, int BombPenalties, int BestCombo, int EligibleOpportunities, double? Accuracy, int XpEarned, string Mode, DateTime CreatedAtUtc);
public sealed record LeaderboardEntry(int Rank, Guid Id, string Nickname, int Score, int BestCombo, int CapturedChips, string Mode, DateTime CreatedAtUtc);
public sealed record PlayerStatisticsResponse(Guid Id, string Nickname, int TotalRounds, int BestScore, int TotalXp, int Level, int BestCombo, IReadOnlyList<GameResultResponse> RecentResults, IReadOnlyList<AchievementResponse> Achievements);
public sealed record AchievementResponse(string Id, string Title, string Description, string Icon, bool Unlocked, DateTime? UnlockedAtUtc);
public sealed record LoginRequest(string Username, string Password);
public sealed record TokenResponse(string Token, DateTime ExpiresAtUtc);
public sealed record GameConfigurationResponse(int RoundDurationSeconds, int SpawnRateMs, int MinFallSpeed, int MaxFallSpeed, int ExtraTimeCapSeconds);
public sealed record UpdateGameConfigurationRequest(int RoundDurationSeconds, int SpawnRateMs, int MinFallSpeed, int MaxFallSpeed, int ExtraTimeCapSeconds);
