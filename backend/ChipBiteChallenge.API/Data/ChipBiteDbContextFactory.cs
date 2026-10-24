using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ChipBiteChallenge.API.Data;

public sealed class ChipBiteDbContextFactory : IDesignTimeDbContextFactory<ChipBiteDbContext>
{
    public ChipBiteDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("CBC_SQL_CONNECTION")
            ?? "Server=(localdb)\\mssqllocaldb;Database=ChipBiteChallenge;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";
        var options = new DbContextOptionsBuilder<ChipBiteDbContext>().UseSqlServer(connection).Options;
        return new ChipBiteDbContext(options);
    }
}
