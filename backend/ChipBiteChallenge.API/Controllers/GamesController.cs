using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChipBiteChallenge.API.Controllers;

[ApiController]
[Route("api/games")]
public sealed class GamesController(IGameResultService service) : ControllerBase
{
    [HttpPost("results")]
    [RequestSizeLimit(16_384)]
    public async Task<ActionResult<GameResultResponse>> Submit([FromBody] SubmitGameResultRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await service.SaveAsync(request, cancellationToken)); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("configuration")]
    public async Task<ActionResult<GameConfigurationResponse>> Configuration([FromServices] IGameConfigurationService configuration, CancellationToken cancellationToken) => Ok(await configuration.GetAsync(cancellationToken));
}
