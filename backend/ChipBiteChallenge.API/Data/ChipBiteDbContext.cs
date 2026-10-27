using ChipBiteChallenge.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChipBiteChallenge.API.Data;

public sealed class ChipBiteDbContext(DbContextOptions<ChipBiteDbContext> options) : DbContext(options)
{
    public DbSet<GameResult> GameResults => Set<GameResult>();
    public DbSet<PlayerProfile> PlayerProfiles => Set<PlayerProfile>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<PlayerAchievement> PlayerAchievements => Set<PlayerAchievement>();
    public DbSet<GameConfiguration> GameConfigurations => Set<GameConfiguration>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GameResult>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Nickname).HasMaxLength(18).IsRequired();
            entity.Property(item => item.Mode).HasMaxLength(20).IsRequired();
            entity.HasIndex(item => new { item.CreatedAtUtc, item.Score });
            entity.HasOne(item => item.PlayerProfile).WithMany(item => item.Results).HasForeignKey(item => item.PlayerProfileId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<PlayerProfile>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Nickname).HasMaxLength(18).IsRequired();
            entity.Property(item => item.Email).HasMaxLength(256);
            entity.Property(item => item.PhoneNumber).HasMaxLength(32);
            entity.Property(item => item.ProfilePicture).HasMaxLength(300_000);
            entity.HasIndex(item => item.Nickname).IsUnique();
        });
        modelBuilder.Entity<Achievement>(entity => { entity.HasKey(item => item.Id); entity.Property(item => item.Title).HasMaxLength(80).IsRequired(); });
        modelBuilder.Entity<PlayerAchievement>(entity =>
        {
            entity.HasKey(item => new { item.PlayerProfileId, item.AchievementId });
            entity.HasOne(item => item.PlayerProfile).WithMany(item => item.Achievements).HasForeignKey(item => item.PlayerProfileId);
            entity.HasOne(item => item.Achievement).WithMany(item => item.Players).HasForeignKey(item => item.AchievementId);
        });
        modelBuilder.Entity<GameConfiguration>(entity => entity.HasKey(item => item.Id));
        modelBuilder.Entity<AdminUser>(entity => { entity.HasKey(item => item.Id); entity.HasIndex(item => item.Username).IsUnique(); entity.Property(item => item.Username).HasMaxLength(80).IsRequired(); });
    }
}
