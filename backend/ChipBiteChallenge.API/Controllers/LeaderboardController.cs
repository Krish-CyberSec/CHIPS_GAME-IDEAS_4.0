using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChipBiteChallenge.API.Controllers;

[ApiController]
[Route("api/leaderboard")]
public sealed class LeaderboardController(IGameResultService service) : ControllerBase
{
    [HttpGet("daily")]
    public async Task<ActionResult<IReadOnlyList<LeaderboardEntry>>> Daily([FromQuery] int limit = 50, CancellationToken cancellationToken = default) => Ok(await service.GetLeaderboardAsync(true, limit, cancellationToken));

    [HttpGet("all-time")]
    public async Task<ActionResult<IReadOnlyList<LeaderboardEntry>>> AllTime([FromQuery] int limit = 50, CancellationToken cancellationToken = default) => Ok(await service.GetLeaderboardAsync(false, limit, cancellationToken));
}
