namespace ChipBiteChallenge.API.Entities;

public sealed class GameResult
{
    public Guid Id { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public int Score { get; set; }
    public int CapturedChips { get; set; }
    public int GoldenChips { get; set; }
    public int BombPenalties { get; set; }
    public int BestCombo { get; set; }
    public int EligibleOpportunities { get; set; }
    public double? Accuracy { get; set; }
    public int XpEarned { get; set; }
    public string Mode { get; set; } = "webcam";
    public bool IsDemo { get; set; } = false;
    public DateTime CreatedAtUtc { get; set; }
    public Guid PlayerProfileId { get; set; }
    public PlayerProfile PlayerProfile { get; set; } = null!;
}

public sealed class PlayerProfile
{
    public Guid Id { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? ProfilePicture { get; set; }
    public bool IsDemo { get; set; } = false;
    public int TotalRounds { get; set; }
    public int BestScore { get; set; }
    public int TotalXp { get; set; }
    public int Level { get; set; } = 1;
    public int BestCombo { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public ICollection<GameResult> Results { get; set; } = new List<GameResult>();
    public ICollection<PlayerAchievement> Achievements { get; set; } = new List<PlayerAchievement>();
}

public sealed class Achievement
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = "🏆";
    public ICollection<PlayerAchievement> Players { get; set; } = new List<PlayerAchievement>();
}

public sealed class PlayerAchievement
{
    public Guid PlayerProfileId { get; set; }
    public PlayerProfile PlayerProfile { get; set; } = null!;
    public string AchievementId { get; set; } = string.Empty;
    public Achievement Achievement { get; set; } = null!;
    public DateTime UnlockedAtUtc { get; set; }
}

public sealed class GameConfiguration
{
    public int Id { get; set; }
    public int RoundDurationSeconds { get; set; } = 45;
    public int SpawnRateMs { get; set; } = 680;
    public int MinFallSpeed { get; set; } = 190;
    public int MaxFallSpeed { get; set; } = 350;
    public int ExtraTimeCapSeconds { get; set; } = 10;
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class AdminUser
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
