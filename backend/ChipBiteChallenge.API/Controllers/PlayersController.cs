using ChipBiteChallenge.API.DTOs;
using ChipBiteChallenge.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChipBiteChallenge.API.Controllers;

[ApiController]
[Route("api/players")]
public sealed class PlayersController(IGameResultService service) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<RegisterPlayerResponse>> Register([FromBody] RegisterPlayerRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.RegisterPlayerAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id:guid}/statistics")]
    public async Task<ActionResult<PlayerStatisticsResponse>> Statistics(Guid id, CancellationToken cancellationToken)
    {
        var result = await service.GetPlayerAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HttpGet("{id:guid}/profile")]
    public async Task<ActionResult<PlayerStatisticsResponse>> Profile(Guid id, CancellationToken cancellationToken)
    {
        var result = await service.GetPlayerAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("by-nickname/{nickname}")]
    public async Task<ActionResult<PlayerStatisticsResponse>> ByNickname(string nickname, CancellationToken cancellationToken)
    {
        var result = await service.GetPlayerByNicknameAsync(nickname, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/picture")]
    [RequestSizeLimit(524_288)]
    public async Task<ActionResult<PlayerStatisticsResponse>> UpdatePicture(Guid id, [FromBody] UpdateProfilePictureRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.UpdateProfilePictureAsync(id, request.ProfilePicture, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/picture")]
    public async Task<ActionResult<PlayerStatisticsResponse>> DeletePicture(Guid id, CancellationToken cancellationToken)
    {
        var result = await service.UpdateProfilePictureAsync(id, null, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{id:guid}/achievements")]
    public async Task<ActionResult<IReadOnlyList<AchievementResponse>>> Achievements(Guid id, CancellationToken cancellationToken)
    {
        var result = await service.GetPlayerAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result.Achievements);
    }
}
