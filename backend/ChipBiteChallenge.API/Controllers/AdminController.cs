using ChipBiteChallenge.API.Data;
using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChipBiteChallenge.API.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class AdminController(IConfiguration configuration, JwtTokenService tokens, IGameResultService results, IGameConfigurationService gameConfiguration, ChipBiteDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("auth/login")]
    public ActionResult<TokenResponse> Login(LoginRequest request)
    {
        var expectedUser = configuration["Admin:Username"] ?? "operator";
        var expectedPassword = configuration["Admin:Password"];
        if (string.IsNullOrWhiteSpace(expectedPassword) || request.Username != expectedUser || request.Password != expectedPassword) return Unauthorized(new { error = "Invalid operator credentials." });
        return Ok(tokens.Create(request.Username));
    }

    [Authorize(Roles = "Operator")]
    [HttpGet("statistics")]
    public async Task<IActionResult> Statistics(CancellationToken cancellationToken)
    {
        var all = await results.GetRecentAsync(200, cancellationToken);
        return Ok(new { totalCompletedRounds = all.Count, highestScore = all.Count == 0 ? 0 : all.Max(item => item.Score), averageScore = all.Count == 0 ? 0 : Math.Round(all.Average(item => item.Score), 2), recentResults = all.Take(25) });
    }

    [Authorize(Roles = "Operator")]
    [HttpGet("results")]
    public async Task<ActionResult<IReadOnlyList<GameResultResponse>>> Results([FromQuery] int limit = 200, CancellationToken cancellationToken = default) => Ok(await results.GetRecentAsync(limit, cancellationToken));

    [Authorize(Roles = "Operator")]
    [HttpPost("configuration")]
    public async Task<ActionResult<GameConfigurationResponse>> Configuration(UpdateGameConfigurationRequest request, CancellationToken cancellationToken) => Ok(await gameConfiguration.UpdateAsync(request, cancellationToken));

    [Authorize(Roles = "Operator")]
    [HttpPost("leaderboard/reset")]
    public async Task<IActionResult> Reset(CancellationToken cancellationToken)
    {
        var results = await db.GameResults.ToListAsync(cancellationToken);
        db.GameResults.RemoveRange(results);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
