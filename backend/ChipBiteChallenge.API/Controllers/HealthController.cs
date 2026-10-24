using Microsoft.AspNetCore.Mvc;

namespace ChipBiteChallenge.API.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", service = "Chip Bite Challenge API", utc = DateTime.UtcNow });
}
