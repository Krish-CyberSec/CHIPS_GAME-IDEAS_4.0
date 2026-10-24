using ChipBiteChallenge.API.Data;
using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Services;
using Microsoft.EntityFrameworkCore;

namespace ChipBiteChallenge.Tests;

public sealed class GameResultServiceTests
{
    private static ChipBiteDbContext CreateDb() => new(new DbContextOptionsBuilder<ChipBiteDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task SaveAsync_ClampsUntrustedValuesAndCreatesProfile()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        var result = await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "Test Biter", 9000, 400, 500, 120, 200, 1, null, 9999, "webcam", null), CancellationToken.None);
        Assert.Equal(5000, result.Score);
        Assert.Equal(250, result.CapturedChips);
        Assert.Equal(250, result.GoldenChips);
        Assert.Equal(100, result.BombPenalties);
        Assert.Equal(100, result.BestCombo);
        Assert.NotEqual(Guid.Empty, (await db.PlayerProfiles.SingleAsync()).Id);
    }

    [Fact]
    public async Task SaveAsync_IsIdempotentForDuplicateResultId()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        var id = Guid.NewGuid();
        var request = new SubmitGameResultRequest(id, "Repeat Biter", 100, 5, 1, 0, 3, 5, .5, 50, "webcam", null);
        await service.SaveAsync(request, CancellationToken.None);
        await service.SaveAsync(request, CancellationToken.None);
        Assert.Single(await db.GameResults.ToListAsync());
        Assert.Equal(1, (await db.PlayerProfiles.SingleAsync()).TotalRounds);
    }

    [Fact]
    public async Task Leaderboard_OrdersByScoreAndHonorsDailyFilter()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "Low", 10, 1, 0, 0, 1, 1, 1, 10, "webcam", DateTime.UtcNow), CancellationToken.None);
        await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "High", 200, 5, 1, 0, 5, 5, 1, 10, "webcam", DateTime.UtcNow), CancellationToken.None);
        var board = await service.GetLeaderboardAsync(true, 10, CancellationToken.None);
        Assert.Equal("High", board[0].Nickname);
        Assert.Equal(1, board[0].Rank);
    }

    [Fact]
    public async Task SaveAsync_RecomputesDerivedFieldsAndRejectsFutureTimestamps()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        var result = await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "Trusted Biter", 100, 5, 1, 0, 3, 10, 0, 9999, "webcam", DateTime.UtcNow.AddDays(2)), CancellationToken.None);
        Assert.Equal(.5, result.Accuracy);
        Assert.Equal(44, result.XpEarned);
        Assert.True(result.CreatedAtUtc <= DateTime.UtcNow.AddMinutes(5));
    }


    [Fact]
    public async Task SaveAsync_NormalizesEverySubmittedModeToWebcam()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        var result = await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "Camera Biter", 100, 5, 0, 0, 3, 5, null, 50, "legacy-mode", null), CancellationToken.None);
        Assert.Equal("webcam", result.Mode);
    }

    [Fact]
    public async Task SaveAsync_RejectsUnsafeNickname()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        await Assert.ThrowsAsync<ArgumentException>(() => service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "<script>", 10, 1, 0, 0, 1, 1, null, 10, "webcam", null), CancellationToken.None));
    }

}
