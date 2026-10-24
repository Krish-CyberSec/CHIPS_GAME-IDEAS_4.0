using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChipBiteChallenge.API.DTOs;
using Microsoft.IdentityModel.Tokens;

namespace ChipBiteChallenge.API.Services;

public sealed class JwtTokenService(IConfiguration configuration)
{
    public TokenResponse Create(string username)
    {
        var expires = DateTime.UtcNow.AddHours(8);
        var key = configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        if (key.Length < 32) throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(claims: [new Claim(ClaimTypes.Name, username), new Claim(ClaimTypes.Role, "Operator")], expires: expires, signingCredentials: credentials);
        return new TokenResponse(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
