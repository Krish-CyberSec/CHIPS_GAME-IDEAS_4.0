using System.Text;
using ChipBiteChallenge.API.Data;
using ChipBiteChallenge.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var sqlConnection = builder.Configuration.GetConnectionString("SqlServer");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<ChipBiteDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(sqlConnection)) options.UseSqlServer(sqlConnection);
    else options.UseInMemoryDatabase("ChipBiteChallengeLocal");
});
builder.Services.AddScoped<IGameResultService, GameResultService>();
builder.Services.AddScoped<IGameConfigurationService, GameConfigurationService>();
builder.Services.AddSingleton<JwtTokenService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("CBC_JWT_KEY") ?? string.Empty;
if (jwtKey.Length < 32)
{
    if (!builder.Environment.IsDevelopment()) throw new InvalidOperationException("Jwt:Key or CBC_JWT_KEY must contain at least 32 characters outside Development.");
    jwtKey = "chip-bite-development-signing-key-change-me-32";
    builder.Configuration["Jwt:Key"] = jwtKey;
}
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters { ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)), ValidateIssuer = false, ValidateAudience = false, ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1) };
});
builder.Services.AddAuthorization();
var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? "http://localhost:5173";
builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy.WithOrigins(frontendOrigin).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment()) app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ChipBiteDbContext>();
    if (!string.IsNullOrWhiteSpace(sqlConnection)) await db.Database.MigrateAsync();
    else await db.Database.EnsureCreatedAsync();
    await DatabaseSeeder.SeedAsync(db);
}

app.Run();

public partial class Program { }
