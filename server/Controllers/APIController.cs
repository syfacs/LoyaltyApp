using Microsoft.AspNetCore.Mvc;
using server.Services;
using server.ViewModels;

namespace server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class APIController(AlpacaService alpacaService) : ControllerBase
{
    [HttpPost("auth/login")]
    public Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken) =>
        Post("api/Member/MemberLogin", request, null, cancellationToken);

    [HttpPost("auth/register")]
    public async Task<IActionResult> Register([FromForm] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.PhoneNumber) ||
            string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(ApiResponse.Failure("Name, phone number, email, and password are required."));
        }

        var result = await alpacaService.PostFormAsync(
            "api/Member/RegisterMember", request.ToFields(), request.Image, null, cancellationToken);

        return Reply(result);
    }

    [HttpPost("auth/request-otp")]
    public Task<IActionResult> RequestOtp([FromBody] OtpRequest request, CancellationToken cancellationToken) =>
        Post("api/Member/GenerateOTP", request, null, cancellationToken);

    [HttpPost("auth/reset-password")]
    public Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken) =>
        Post("api/Member/MemberResetPassword", request, null, cancellationToken);

    [HttpPost("member/profile")]
    public Task<IActionResult> Profile(CancellationToken cancellationToken) =>
        Post("api/Member/FindMemberDetails", new { }, GetToken(), cancellationToken);

    [HttpPost("member/profile/update")]
    public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var result = await alpacaService.PostFormAsync(
            "api/Member/MemberUpdateProfile", request.ToFields(), request.Image, GetToken(), cancellationToken);

        return Reply(result);
    }

    [HttpPost("member/change-password")]
    public Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken) =>
        Post("api/Member/ChangePassword", request, GetToken(), cancellationToken);

    [HttpGet("highlights")]
    public Task<IActionResult> Highlights(CancellationToken cancellationToken) =>
        Get("api/MemberHightlight/GetAllHighlights", null, cancellationToken);

    [HttpGet("outlets")]
    public Task<IActionResult> Outlets(CancellationToken cancellationToken) =>
        Get("api/MemberOutlet/GetAllOutlets", null, cancellationToken);

    [HttpGet("outlets/{outletGuid}/staff")]
    public Task<IActionResult> OutletStaff(string outletGuid, CancellationToken cancellationToken) =>
        Get($"api/MemberOutletStaff/GetAllOutletStaff/{outletGuid}", null, cancellationToken);

    [HttpGet("rewards")]
    public Task<IActionResult> Rewards(CancellationToken cancellationToken) =>
        Get("api/MemberReward/GetAllRewards", null, cancellationToken);

    [HttpPost("rewards/redeem")]
    public Task<IActionResult> RedeemReward([FromBody] RedeemRewardRequest request, CancellationToken cancellationToken) =>
        Post("api/MemberReward/RedeemReward", request, GetToken(), cancellationToken);

    [HttpGet("vouchers")]
    public Task<IActionResult> Vouchers(CancellationToken cancellationToken) =>
        Get("api/MemberVoucher/GetFilterVouchers", GetToken(), cancellationToken);

    [HttpPost("vouchers/redeem")]
    public Task<IActionResult> RedeemVoucher([FromBody] RedeemVoucherRequest request, CancellationToken cancellationToken) =>
        Post("api/MemberVoucher/RedeemVoucher", request, GetToken(), cancellationToken);

    [HttpPost("points/request")]
    public Task<IActionResult> RequestPoints([FromBody] AssignPointRequest request, CancellationToken cancellationToken) =>
        Post("api/MemberPoint/AssignPoint", request, GetToken(), cancellationToken);

    [HttpPost("points/approve")]
    public Task<IActionResult> ApprovePoints([FromBody] ApprovePointRequest request, CancellationToken cancellationToken) =>
        Post("api/MemberPoint/ApprovePoint", request, GetToken(), cancellationToken);

    [HttpGet("history")]
    public Task<IActionResult> History(CancellationToken cancellationToken) =>
        Get("api/MemberHistory/GetHistoryRecord", GetToken(), cancellationToken);

    [HttpPost("feedback")]
    public Task<IActionResult> Feedback([FromBody] FeedbackRequest request, CancellationToken cancellationToken) =>
        Post("api/MemberFeedback/CreateFeedback", request, GetToken(), cancellationToken);

    private async Task<IActionResult> Get(string path, string? token, CancellationToken cancellationToken)
    {
        return Reply(await alpacaService.GetAsync(path, token, cancellationToken));
    }

    private async Task<IActionResult> Post(string path, object body, string? token, CancellationToken cancellationToken)
    {
        return Reply(await alpacaService.PostAsync(path, body, token, cancellationToken));
    }

    private IActionResult Reply(AlpacaResponse response)
    {
        return StatusCode(response.StatusCode, new ApiResponse(response.Success, response.Message, response.Data));
    }

    private string? GetToken()
    {
        var header = Request.Headers.Authorization.ToString();
        const string prefix = "Bearer ";

        return header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? header[prefix.Length..]
            : null;
    }
}
