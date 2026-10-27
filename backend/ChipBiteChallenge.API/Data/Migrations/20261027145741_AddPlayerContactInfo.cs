using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChipBiteChallenge.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerContactInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "PlayerProfiles",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "PlayerProfiles",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "PlayerProfiles");
        }
    }
}
