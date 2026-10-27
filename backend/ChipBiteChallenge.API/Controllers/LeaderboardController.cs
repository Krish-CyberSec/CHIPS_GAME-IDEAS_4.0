using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChipBiteChallenge.API.Controllers;

[ApiController]
[Route("api/leaderboard")]
public sealed class LeaderboardController(IGameResultService service) : ControllerBase
{
    [HttpGet("daily")]
    public async Task<ActionResult<IReadOnlyList<LeaderboardEntry>>> Daily([FromQuery] int limit = 50, [FromQuery] bool includeDemo = false, CancellationToken cancellationToken = default) =>
        Ok(await service.GetLeaderboardAsync(true, limit, includeDemo, cancellationToken));

    [HttpGet("all-time")]
    public async Task<ActionResult<IReadOnlyList<LeaderboardEntry>>> AllTime([FromQuery] int limit = 50, [FromQuery] bool includeDemo = false, CancellationToken cancellationToken = default) =>
        Ok(await service.GetLeaderboardAsync(false, limit, includeDemo, cancellationToken));

    [HttpGet("verify/{resultId:guid}")]
    public async Task<ActionResult<VerifiedRankResponse>> VerifyRank(Guid resultId, CancellationToken cancellationToken)
    {
        var rank = await service.GetVerifiedRankAsync(resultId, cancellationToken);
        return rank is null ? NotFound(new { error = "Game result not found." }) : Ok(rank);
    }
}
