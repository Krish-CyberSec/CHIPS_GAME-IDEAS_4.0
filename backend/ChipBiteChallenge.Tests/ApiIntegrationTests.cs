using System.Net;
using System.Net.Http.Json;
using ChipBiteChallenge.API.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ChipBiteChallenge.Tests;

public sealed class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient client;

    public ApiIntegrationTests(WebApplicationFactory<Program> factory) => client = factory.CreateClient();

    [Fact]
    public async Task HealthEndpoint_ReturnsOk()
    {
        var response = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ResultSubmission_IsVisibleOnLeaderboard()
    {
        var id = Guid.NewGuid();
        var response = await client.PostAsJsonAsync("/api/games/results", new SubmitGameResultRequest(id, "Integration Biter", 250, 12, 2, 0, 10, 15, .8, 100, "webcam", DateTime.UtcNow));
        response.EnsureSuccessStatusCode();
        var board = await client.GetFromJsonAsync<List<LeaderboardEntry>>("/api/leaderboard/all-time");
        Assert.Contains(board ?? [], item => item.Id == id && item.Score == 250);
    }

    [Fact]
    public async Task PlayerRegistration_ValidatesAndSaves()
    {
        var response = await client.PostAsJsonAsync("/api/players/register", new RegisterPlayerRequest("Tourney Biter", "tourney@example.com", "+1 (555) 345-6789"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var reg = await response.Content.ReadFromJsonAsync<RegisterPlayerResponse>();
        Assert.NotNull(reg);
        Assert.Equal("Tourney Biter", reg.Nickname);
        Assert.True(reg.RegisteredWithContactInfo);
    }

    [Fact]
    public async Task PlayerRegistration_InvalidEmail_ReturnsBadRequest()
    {
        var response = await client.PostAsJsonAsync("/api/players/register", new RegisterPlayerRequest("Bad Biter", "invalid-email-format", null));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task LeaderboardVerifyRank_ReturnsCorrectRank()
    {
        var id = Guid.NewGuid();
        var submitRes = await client.PostAsJsonAsync("/api/games/results", new SubmitGameResultRequest(id, "Top Ranker", 450, 20, 4, 0, 15, 20, 1.0, 180, "webcam", DateTime.UtcNow));
        submitRes.EnsureSuccessStatusCode();

        var verifyRes = await client.GetAsync($"/api/leaderboard/verify/{id}");
        Assert.Equal(HttpStatusCode.OK, verifyRes.StatusCode);
        var rankInfo = await verifyRes.Content.ReadFromJsonAsync<VerifiedRankResponse>();
        Assert.NotNull(rankInfo);
        Assert.Equal(id, rankInfo.ResultId);
        Assert.Equal(450, rankInfo.Score);
        Assert.True(rankInfo.BestRank >= 1);
    }
}
