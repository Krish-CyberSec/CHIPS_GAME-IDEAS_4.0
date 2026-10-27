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

    [Fact]
    public async Task RegisterPlayerAsync_ValidInput_RegistersSuccessfullyAndNormalizes()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        var response = await service.RegisterPlayerAsync(new RegisterPlayerRequest("Apex Biter", "User@Example.COM ", "+1 (555) 234-5678"), CancellationToken.None);

        Assert.Equal("Apex Biter", response.Nickname);
        Assert.True(response.RegisteredWithContactInfo);

        var profile = await db.PlayerProfiles.SingleAsync(p => p.Nickname == "Apex Biter");
        Assert.Equal("user@example.com", profile.Email);
        Assert.Equal("+15552345678", profile.PhoneNumber);
    }

    [Fact]
    public async Task RegisterPlayerAsync_OptionalContact_AllowsRegistrationWithoutEmailOrPhone()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        var response = await service.RegisterPlayerAsync(new RegisterPlayerRequest("Casual Biter", null, null), CancellationToken.None);

        Assert.Equal("Casual Biter", response.Nickname);
        Assert.False(response.RegisteredWithContactInfo);

        var profile = await db.PlayerProfiles.SingleAsync(p => p.Nickname == "Casual Biter");
        Assert.Null(profile.Email);
        Assert.Null(profile.PhoneNumber);
    }

    [Fact]
    public async Task RegisterPlayerAsync_RejectsInvalidEmailAndPhone()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPlayerAsync(new RegisterPlayerRequest("ValidName", "invalid-email", null), CancellationToken.None));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPlayerAsync(new RegisterPlayerRequest("ValidName", null, "not-a-number"), CancellationToken.None));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPlayerAsync(new RegisterPlayerRequest("ValidName", null, "123"), CancellationToken.None)); // < 7 digits
    }

    [Fact]
    public async Task RegisterPlayerAsync_ReusesExistingProfile_WithoutDuplication()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);

        var first = await service.RegisterPlayerAsync(new RegisterPlayerRequest("Returning", "first@test.com", "+15551112222"), CancellationToken.None);
        var second = await service.RegisterPlayerAsync(new RegisterPlayerRequest("Returning", "updated@test.com", "+15553334444"), CancellationToken.None);

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, await db.PlayerProfiles.CountAsync());

        var profile = await db.PlayerProfiles.SingleAsync();
        Assert.Equal("updated@test.com", profile.Email);
        Assert.Equal("+15553334444", profile.PhoneNumber);
    }

    [Fact]
    public async Task LeaderboardPrivacy_NeverExposesEmailOrPhone()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);

        await service.RegisterPlayerAsync(new RegisterPlayerRequest("Private Biter", "secret@corp.com", "+15559998888"), CancellationToken.None);
        var result = await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "Private Biter", 300, 15, 2, 0, 8, 15, 1.0, 100, "webcam", DateTime.UtcNow), CancellationToken.None);

        var entries = await service.GetLeaderboardAsync(false, 10, CancellationToken.None);
        var entry = Assert.Single(entries);

        Assert.Equal("Private Biter", entry.Nickname);
        Assert.Equal(300, entry.Score);
        // LeaderboardEntry type explicitly does NOT have Email or PhoneNumber properties
        var entryProperties = typeof(LeaderboardEntry).GetProperties().Select(p => p.Name);
        Assert.DoesNotContain("Email", entryProperties);
        Assert.DoesNotContain("PhoneNumber", entryProperties);
    }

    [Fact]
    public async Task VerifiedRank_ComputesAccurateRanksWithTieBreaking()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        var now = DateTime.UtcNow;

        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();

        // id1: 300 points, combo 10, captured 15
        await service.SaveAsync(new SubmitGameResultRequest(id1, "P1", 300, 15, 2, 0, 10, 15, 1.0, 100, "webcam", now.AddMinutes(-5)), CancellationToken.None);
        // id2: 300 points, combo 8 (tied score, lower combo or later timestamp)
        await service.SaveAsync(new SubmitGameResultRequest(id2, "P2", 300, 15, 2, 0, 8, 15, 1.0, 100, "webcam", now.AddMinutes(-4)), CancellationToken.None);
        // id3: 150 points
        await service.SaveAsync(new SubmitGameResultRequest(id3, "P3", 150, 10, 1, 0, 5, 10, 1.0, 50, "webcam", now.AddMinutes(-3)), CancellationToken.None);

        var rank1 = await service.GetVerifiedRankAsync(id1, CancellationToken.None);
        Assert.NotNull(rank1);
        Assert.Equal(1, rank1.AllTimeRank);
        Assert.True(rank1.IsTopThreeAllTime);

        var rank2 = await service.GetVerifiedRankAsync(id2, CancellationToken.None);
        Assert.NotNull(rank2);
        Assert.Equal(2, rank2.AllTimeRank);
        Assert.True(rank2.IsTopThreeAllTime);

        var rank3 = await service.GetVerifiedRankAsync(id3, CancellationToken.None);
        Assert.NotNull(rank3);
        Assert.Equal(3, rank3.AllTimeRank);
        Assert.True(rank3.IsTopThreeAllTime);
    }

    [Fact]
    public async Task Score496_IsRetainedAndRankedAccurately_NotOverwrittenByDemoScore9()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        var now = DateTime.UtcNow;

        // Simulate an old demo run with score 9
        var demoId = Guid.NewGuid();
        await service.SaveAsync(new SubmitGameResultRequest(
            demoId, "demo", 9, 1, 0, 0, 1, 1, 1.0, 10, "webcam", now.AddHours(-1), IsDemo: true
        ), CancellationToken.None);

        // Player plays real round and achieves score 496
        var realId = Guid.NewGuid();
        var saved = await service.SaveAsync(new SubmitGameResultRequest(
            realId, "TrueChampion", 496, 35, 4, 0, 12, 38, 0.92, 210, "webcam", now, IsDemo: false
        ), CancellationToken.None);

        Assert.Equal(496, saved.Score);

        // Authoritative live leaderboard (default excludes demo)
        var board = await service.GetLeaderboardAsync(false, 10, includeDemo: false, CancellationToken.None);
        Assert.Single(board);
        Assert.Equal(496, board[0].Score);
        Assert.Equal("TrueChampion", board[0].Nickname);
        Assert.Equal(1, board[0].Rank);
        Assert.False(board[0].IsDemo);

        // When demo is explicitly requested, demo appears below 496
        var boardWithDemo = await service.GetLeaderboardAsync(false, 10, includeDemo: true, CancellationToken.None);
        Assert.Equal(2, boardWithDemo.Count);
        Assert.Equal(496, boardWithDemo[0].Score);
        Assert.Equal(1, boardWithDemo[0].Rank);
        Assert.Equal(9, boardWithDemo[1].Score);
        Assert.Equal(2, boardWithDemo[1].Rank);
        Assert.True(boardWithDemo[1].IsDemo);

        // Verified rank of the 496 result is Rank 1
        var rankInfo = await service.GetVerifiedRankAsync(realId, CancellationToken.None);
        Assert.NotNull(rankInfo);
        Assert.Equal(496, rankInfo.Score);
        Assert.Equal(1, rankInfo.AllTimeRank);
        Assert.True(rankInfo.IsTopThreeAllTime);
    }

    [Fact]
    public async Task ProfilePicture_CanBeRegisteredSavedAndUpdated()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);
        const string mockJpegBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

        var reg = await service.RegisterPlayerAsync(new RegisterPlayerRequest(
            "Photogenic", "photo@test.com", "+15551234567", ProfilePicture: mockJpegBase64
        ), CancellationToken.None);

        Assert.Equal(mockJpegBase64, reg.ProfilePicture);

        // Submit game result
        var saved = await service.SaveAsync(new SubmitGameResultRequest(
            Guid.NewGuid(), "Photogenic", 450, 20, 2, 0, 8, 20, 1.0, 150, "webcam", DateTime.UtcNow
        ), CancellationToken.None);

        var board = await service.GetLeaderboardAsync(false, 10, CancellationToken.None);
        Assert.Equal(mockJpegBase64, board[0].ProfilePicture);

        // Update profile picture
        const string updatedPngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        var updatedProfile = await service.UpdateProfilePictureAsync(reg.Id, updatedPngBase64, CancellationToken.None);
        Assert.NotNull(updatedProfile);
        Assert.Equal(updatedPngBase64, updatedProfile.ProfilePicture);

        // Clear profile picture
        var clearedProfile = await service.UpdateProfilePictureAsync(reg.Id, null, CancellationToken.None);
        Assert.NotNull(clearedProfile);
        Assert.Null(clearedProfile.ProfilePicture);
    }

    [Fact]
    public async Task ProfilePicture_RejectsUnsafeOrOversizedPictures()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);

        // Reject script tags / HTML in picture field
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPlayerAsync(new RegisterPlayerRequest("Hacker", null, null, ProfilePicture: "<script>alert(1)</script>"), CancellationToken.None));

        // Reject non-image base64
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPlayerAsync(new RegisterPlayerRequest("Hacker", null, null, ProfilePicture: "data:application/pdf;base64,JVBERi0xLjQK..."), CancellationToken.None));

        // Reject oversized picture > 280,000 chars
        var hugePicture = "data:image/jpeg;base64," + new string('A', 300_000);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RegisterPlayerAsync(new RegisterPlayerRequest("HugePic", null, null, ProfilePicture: hugePicture), CancellationToken.None));
    }

    [Fact]
    public async Task ResetDemoDataAsync_RemovesOnlyDemoRecords()
    {
        await using var db = CreateDb();
        var service = new GameResultService(db);

        await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "demo", 9, 1, 0, 0, 1, 1, 1.0, 10, "webcam", DateTime.UtcNow, IsDemo: true), CancellationToken.None);
        await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "DemoBot", 15, 2, 0, 0, 2, 2, 1.0, 15, "webcam", DateTime.UtcNow, IsDemo: true), CancellationToken.None);
        await service.SaveAsync(new SubmitGameResultRequest(Guid.NewGuid(), "RealPlayer", 496, 35, 4, 0, 12, 38, 0.92, 210, "webcam", DateTime.UtcNow, IsDemo: false), CancellationToken.None);

        var removed = await service.ResetDemoDataAsync(CancellationToken.None);
        Assert.Equal(2, removed);

        var remaining = await db.GameResults.ToListAsync();
        Assert.Single(remaining);
        Assert.Equal("RealPlayer", remaining[0].Nickname);
        Assert.Equal(496, remaining[0].Score);
    }
}
