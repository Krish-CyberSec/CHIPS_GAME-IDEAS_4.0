using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChipBiteChallenge.API.Controllers;

[ApiController]
[Route("api/players")]
public sealed class PlayersController(IGameResultService service) : ControllerBase
{
    [HttpGet("{id:guid}/statistics")]
    public async Task<ActionResult<PlayerStatisticsResponse>> Statistics(Guid id, CancellationToken cancellationToken)
    {
        var result = await service.GetPlayerAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{id:guid}/achievements")]
    public async Task<ActionResult<IReadOnlyList<AchievementResponse>>> Achievements(Guid id, CancellationToken cancellationToken)
    {
        var result = await service.GetPlayerAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result.Achievements);
    }
}
