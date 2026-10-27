using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChipBiteChallenge.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProfilePictureAndDemoFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDemo",
                table: "PlayerProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ProfilePicture",
                table: "PlayerProfiles",
                type: "nvarchar(max)",
                maxLength: 300000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDemo",
                table: "GameResults",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDemo",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "ProfilePicture",
                table: "PlayerProfiles");

            migrationBuilder.DropColumn(
                name: "IsDemo",
                table: "GameResults");
        }
    }
}
