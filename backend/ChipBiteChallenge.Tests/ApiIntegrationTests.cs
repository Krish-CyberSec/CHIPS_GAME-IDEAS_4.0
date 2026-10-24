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
}
