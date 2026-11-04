using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using server.DTO;
using server.RemoteModels;
using server.Services;

namespace server.Controllers;

// Member portal. Every action calls the remote API (through AlpacaService), checks the result
// and answers with { success, message, ...data }.
// The member's JWT token is kept in the session, the browser never sees it.
[ApiController]
[Route("api/[controller]")]
public class MemberController : ControllerBase
{
    private const int MaxPointsPerClaim = 100000;

    private static readonly string[] DateRanges = ["All", "Today", "ThisWeek", "ThisMonth", "ThisYear"];
    private static readonly string[] HistoryTypes = ["Voucher", "Reward", "Point"];

    private readonly AlpacaService _alpaca;
    private readonly IWebHostEnvironment _env;

    public MemberController(AlpacaService alpaca, IWebHostEnvironment env)
    {
        _alpaca = alpaca;
        _env = env;
    }

    // ======================================================================
    // Helpers
    // ======================================================================

    private string? MemberToken => HttpContext.Session.GetString(SessionKeys.MemberToken);

    private static IActionResult Bad(string message, int status = 400)
    {
        return new ObjectResult(new { success = false, message }) { StatusCode = status };
    }

    // the browser has no session (or it timed out): the frontend sends the member back to the login page
    private static IActionResult NotLoggedIn()
    {
        return new ObjectResult(new { success = false, message = "Please log in to continue.", sessionExpired = true })
        {
            StatusCode = 401,
        };
    }

    // a failed call that was made with the member token
    private IActionResult AuthFail<T>(ServiceResult<T> result)
    {
        if (result.StatusCode == 401) HttpContext.Session.Remove(SessionKeys.MemberToken);

        return result.ToError(sessionExpired: true);
    }

    private Task<ServiceResult<RemoteMember>> FetchMember(string token)
    {
        return _alpaca.PostAsync<RemoteMember>("api/Member/FindMemberDetails", null, token);
    }

    // for pages that also work without logging in: gives the member, or null for a guest
    private async Task<RemoteMember?> TryGetMember()
    {
        var token = MemberToken;
        if (token == null) return null;

        var result = await FetchMember(token);
        if (result.Success) return result.Data;

        if (result.StatusCode == 401) HttpContext.Session.Remove(SessionKeys.MemberToken);

        return null;
    }

    private PendingOtp? GetPendingOtp()
    {
        var json = HttpContext.Session.GetString(SessionKeys.PendingOtp);

        return json == null ? null : JsonSerializer.Deserialize<PendingOtp>(json);
    }

    private void SavePendingOtp(PendingOtp pending)
    {
        HttpContext.Session.SetString(SessionKeys.PendingOtp, JsonSerializer.Serialize(pending));
    }

    private void ClearPending()
    {
        HttpContext.Session.Remove(SessionKeys.PendingOtp);
        HttpContext.Session.Remove(SessionKeys.PendingToken);
    }

    // Asks the remote API to email a new OTP to the member.
    // The remote API also returns the code in its response, we keep it on the server to check it ourselves.
    private async Task<ServiceResult<RemoteOtpResult>> RequestOtp(string phone)
    {
        var result = await _alpaca.PostAsync<RemoteOtpResult>("api/Member/GenerateOTP", new { phoneNumber = phone });
        if (!result.Success) return result;

        if (string.IsNullOrEmpty(result.Data?.Otp))
        {
            return ServiceResult<RemoteOtpResult>.Fail("We could not create a verification code. Please try again.", 502);
        }

        // while developing, the code is shown on screen so we can test without a mailbox
        if (!result.Data!.EmailSent && !_env.IsDevelopment())
        {
            return ServiceResult<RemoteOtpResult>.Fail("We could not send the verification email. Please try again later.", 502);
        }

        return result;
    }

    private IActionResult OtpSent(RemoteOtpResult otp, string message)
    {
        return Ok(new
        {
            success = true,
            message,
            email = Validation.MaskEmail(otp.Email),
            debugOtp = _env.IsDevelopment() ? otp.Otp : null,
        });
    }

    private string RemoteSegment(string value) => Uri.EscapeDataString(value);

    // ======================================================================
    // Register, login and OTP
    // ======================================================================

    // POST: /api/Member/Register
    // Creates the account on the remote API, then emails an OTP. The member is signed in after VerifyOtp.
    [HttpPost("[action]")]
    public async Task<IActionResult> Register([FromForm] RegisterForm form)
    {
        var name = form.Name?.Trim();
        var email = form.Email?.Trim();
        var phone = Validation.CleanPhone(form.PhoneNumber);

        if (string.IsNullOrWhiteSpace(name)) return Bad("Please enter your name.");
        if (!Validation.IsPhone(phone)) return Bad("Phone number must start with 0 and have 10 or 11 digits, e.g. 0123456789.");
        if (!Validation.IsEmail(email)) return Bad("Please enter a valid email address.");

        var passwordError = Validation.PasswordError(form.Password);
        if (passwordError != null) return Bad(passwordError);
        if (form.Password != form.ConfirmPassword) return Bad("Passwords do not match.");

        string? birthday = null;
        if (!string.IsNullOrWhiteSpace(form.Birthday))
        {
            if (!AlpacaService.TryParseDate(form.Birthday, out var day) || day > DateTime.Today)
            {
                return Bad("Please enter a valid birthday.");
            }

            birthday = day.ToString("yyyy-MM-dd");
        }

        var imageError = Validation.ImageError(form.Image);
        if (imageError != null) return Bad(imageError);

        var fields = new Dictionary<string, string?>
        {
            ["Name"] = name,
            ["Email"] = email,
            ["PhoneNumber"] = phone,
            ["Birthday"] = birthday,
            ["ReferralBy"] = string.IsNullOrWhiteSpace(form.ReferralBy) ? null : form.ReferralBy.Trim(),
            ["Password"] = form.Password,
        };

        var registered = await _alpaca.PostFormAsync<RemoteMember>("api/Member/RegisterMember", fields, form.Image, "Image");
        if (!registered.Success) return registered.ToError();

        var token = registered.Data?.SuccessToken;
        if (string.IsNullOrEmpty(token))
        {
            return Bad("Your account was created, but we could not sign you in. Please log in.", 502);
        }

        var otp = await RequestOtp(phone);
        if (!otp.Success)
        {
            return Bad("Your account was created, but we could not send the verification code. Please log in instead.", otp.StatusCode);
        }

        // the member stays signed out until the OTP is correct
        HttpContext.Session.Remove(SessionKeys.MemberToken);
        HttpContext.Session.SetString(SessionKeys.PendingToken, token);
        SavePendingOtp(new PendingOtp(PendingOtp.Register, phone, otp.Data!.Otp!, DateTime.UtcNow, 0, false));

        return OtpSent(otp.Data, "Account created. We sent a verification code to your email.");
    }

    // POST: /api/Member/VerifyOtp
    // Used after registering (signs the member in) and after "forgot password" (unlocks the reset form).
    [HttpPost("[action]")]
    public async Task<IActionResult> VerifyOtp([FromBody] OtpRequest request)
    {
        var pending = GetPendingOtp();
        if (pending == null) return Bad("Please request a verification code first.");

        if (pending.IsExpired) return Bad("This code has expired. Please request a new one.");
        if (pending.Attempts >= PendingOtp.MaxAttempts) return Bad("Too many wrong attempts. Please request a new code.");

        if (request.Code?.Trim() != pending.Code)
        {
            SavePendingOtp(pending with { Attempts = pending.Attempts + 1 });

            return Bad("The verification code is incorrect.");
        }

        if (pending.Purpose == PendingOtp.Reset)
        {
            SavePendingOtp(pending with { Verified = true });

            return Ok(new { success = true, message = "Code verified. Please choose a new password." });
        }

        // registration: the email is confirmed, so the member can be signed in now
        var token = HttpContext.Session.GetString(SessionKeys.PendingToken);
        if (token == null) return Bad("Your sign up session has expired. Please log in.");

        var member = await FetchMember(token);
        if (!member.Success) return member.ToError();

        HttpContext.Session.SetString(SessionKeys.MemberToken, token);
        ClearPending();

        return Ok(new { success = true, message = "Your account is verified. Welcome!", member = MemberDTO.From(member.Data!, _alpaca) });
    }

    // POST: /api/Member/ResendOtp
    [HttpPost("[action]")]
    public async Task<IActionResult> ResendOtp()
    {
        var pending = GetPendingOtp();
        if (pending == null) return Bad("Please start again.");

        var otp = await RequestOtp(pending.Phone);
        if (!otp.Success) return otp.ToError();

        SavePendingOtp(pending with { Code = otp.Data!.Otp!, CreatedUtc = DateTime.UtcNow, Attempts = 0, Verified = false });

        return OtpSent(otp.Data, "We sent you a new verification code.");
    }

    // POST: /api/Member/Login
    [HttpPost("[action]")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var phone = Validation.CleanPhone(request.PhoneNumber);

        if (!Validation.IsPhone(phone)) return Bad("Phone number must start with 0 and have 10 or 11 digits, e.g. 0123456789.");
        if (string.IsNullOrEmpty(request.Password)) return Bad("Please enter your password.");

        var login = await _alpaca.PostAsync<RemoteLoginResult>("api/Member/MemberLogin", new { phoneNumber = phone, password = request.Password });
        if (!login.Success)
            // the remote API returns "Invalid username" despite the input being a phne number and not username for some reason, so I am hard coding this to change it to "phone number"
            return login.ToError(overrideMessage: currentMessage => 
            currentMessage.Trim() == "Invalid username or password." ? "Invalid phone number or password." : null);

        var token = login.Data?.SuccessToken;
        if (string.IsNullOrEmpty(token)) return Bad("Login failed. Please try again.", 502);

        var member = await FetchMember(token);
        if (!member.Success) return member.ToError();

        ClearPending();
        HttpContext.Session.SetString(SessionKeys.MemberToken, token);

        return Ok(new { success = true, message = "Welcome back!", member = MemberDTO.From(member.Data!, _alpaca) });
    }

    // POST: /api/Member/Logout
    [HttpPost("[action]")]
    public IActionResult Logout()
    {
        HttpContext.Session.Remove(SessionKeys.MemberToken);
        ClearPending();

        return Ok(new { success = true, message = "You have been logged out." });
    }

    // ======================================================================
    // Forgot password
    // ======================================================================

    // POST: /api/Member/ForgotPassword
    [HttpPost("[action]")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var phone = Validation.CleanPhone(request.PhoneNumber);
        if (!Validation.IsPhone(phone)) return Bad("Phone number must start with 0 and have 10 or 11 digits, e.g. 0123456789.");

        var otp = await RequestOtp(phone);
        if (!otp.Success) return otp.ToError();

        ClearPending();
        SavePendingOtp(new PendingOtp(PendingOtp.Reset, phone, otp.Data!.Otp!, DateTime.UtcNow, 0, false));

        return OtpSent(otp.Data, "We sent a verification code to your email.");
    }

    // POST: /api/Member/ResetPassword (only works after VerifyOtp)
    [HttpPost("[action]")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var pending = GetPendingOtp();

        if (pending == null || pending.Purpose != PendingOtp.Reset || !pending.Verified)
        {
            return Bad("Please verify your code first.");
        }

        if (pending.IsExpired) return Bad("Your code has expired. Please request a new one.");

        var passwordError = Validation.PasswordError(request.NewPassword);
        if (passwordError != null) return Bad(passwordError);
        if (request.NewPassword != request.ConfirmPassword) return Bad("Passwords do not match.");

        var reset = await _alpaca.PostAsync<RemoteMessage>(
            "api/Member/MemberResetPassword",
            new { phoneNumber = pending.Phone, otp = pending.Code, newPassword = request.NewPassword }
        );
        if (!reset.Success) return reset.ToError();

        ClearPending();

        return Ok(new { success = true, message = "Your password has been reset. You can log in now." });
    }

    // ======================================================================
    // Profile
    // ======================================================================

    // GET: /api/Member/Profile
    [HttpGet("[action]")]
    public async Task<IActionResult> Profile()
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        var member = await FetchMember(token);
        if (!member.Success) return AuthFail(member);

        return Ok(new { success = true, message = "", member = MemberDTO.From(member.Data!, _alpaca) });
    }

    // POST: /api/Member/UpdateProfile
    [HttpPost("[action]")]
    public async Task<IActionResult> UpdateProfile([FromForm] ProfileForm form)
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        var name = form.Name?.Trim();
        var email = form.Email?.Trim();

        if (string.IsNullOrWhiteSpace(name)) return Bad("Please enter your name.");
        if (!Validation.IsEmail(email)) return Bad("Please enter a valid email address.");

        var imageError = Validation.ImageError(form.Image);
        if (imageError != null) return Bad(imageError);

        var fields = new Dictionary<string, string?> { ["Name"] = name, ["Email"] = email };

        var updated = await _alpaca.PostFormAsync<RemoteMember>("api/Member/MemberUpdateProfile", fields, form.Image, "Image", token);
        if (!updated.Success) return AuthFail(updated);

        return Ok(new { success = true, message = "Profile updated.", member = MemberDTO.From(updated.Data!, _alpaca) });
    }

    // POST: /api/Member/ChangePassword
    [HttpPost("[action]")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        if (string.IsNullOrEmpty(request.OldPassword)) return Bad("Please enter your current password.");

        var passwordError = Validation.PasswordError(request.NewPassword);
        if (passwordError != null) return Bad(passwordError);
        if (request.NewPassword != request.ConfirmPassword) return Bad("Passwords do not match.");
        if (request.NewPassword == request.OldPassword) return Bad("Your new password must be different from the current one.");

        // check the current password here first (Scrypt), so we can give a clear message
        var member = await FetchMember(token);
        if (!member.Success) return AuthFail(member);

        if (!_alpaca.VerifyPassword(request.OldPassword, member.Data!.Password))
        {
            return Bad("Your current password is incorrect.");
        }

        var changed = await _alpaca.PostAsync<RemoteMessage>(
            "api/Member/ChangePassword",
            new { oldPassword = request.OldPassword, newPassword = request.NewPassword },
            token
        );
        if (!changed.Success) return AuthFail(changed);

        return Ok(new { success = true, message = "Password updated." });
    }

    // ======================================================================
    // Home and highlights (also work for guests)
    // ======================================================================

    // GET: /api/Member/Home
    [HttpGet("[action]")]
    public async Task<IActionResult> Home()
    {
        var highlightsTask = _alpaca.GetAsync<List<RemoteHighlight>>("api/MemberHightlight/GetAllHighlights");
        var rewardsTask = _alpaca.GetAsync<List<RemoteReward>>("api/MemberReward/GetAllRewards");
        var memberTask = TryGetMember();

        await Task.WhenAll(highlightsTask, rewardsTask, memberTask);

        var highlights = await highlightsTask;
        if (!highlights.Success) return highlights.ToError();

        var rewards = await rewardsTask;
        if (!rewards.Success) return rewards.ToError();

        var member = await memberTask;

        return Ok(new
        {
            success = true,
            message = "",
            member = member == null ? null : MemberDTO.From(member, _alpaca),
            highlights = (highlights.Data ?? [])
                .Select(h => HighlightDTO.From(h, _alpaca))
                .Where(h => h.Status == "Active")
                .ToList(),
            rewards = (rewards.Data ?? [])
                .Select(r => RewardDTO.From(r, _alpaca))
                .Where(r => r.Status == "Active")
                .OrderBy(r => r.Point)
                .Take(6)
                .ToList(),
        });
    }

    // GET: /api/Member/Highlight/{guid}
    [HttpGet("[action]/{guid}")]
    public async Task<IActionResult> Highlight([FromRoute] string guid)
    {
        var highlight = await _alpaca.GetAsync<RemoteHighlight>($"api/MemberHightlight/GetHighlight/{RemoteSegment(guid)}");
        if (!highlight.Success || highlight.Data == null) return Bad("This promotion could not be found.", 404);

        return Ok(new { success = true, message = "", highlight = HighlightDTO.From(highlight.Data, _alpaca) });
    }

    // ======================================================================
    // Rewards
    // ======================================================================

    // GET: /api/Member/Rewards
    [HttpGet("[action]")]
    public async Task<IActionResult> Rewards()
    {
        var rewardsTask = _alpaca.GetAsync<List<RemoteReward>>("api/MemberReward/GetAllRewards");
        var memberTask = TryGetMember();

        await Task.WhenAll(rewardsTask, memberTask);

        var rewards = await rewardsTask;
        if (!rewards.Success) return rewards.ToError();

        var member = await memberTask;

        return Ok(new
        {
            success = true,
            message = "",
            points = member?.Point,
            rewards = (rewards.Data ?? [])
                .Select(r => RewardDTO.From(r, _alpaca))
                .Where(r => r.Status == "Active")
                .OrderBy(r => r.Point)
                .ToList(),
        });
    }

    // GET: /api/Member/Reward/{guid}
    [HttpGet("[action]/{guid}")]
    public async Task<IActionResult> Reward([FromRoute] string guid)
    {
        var token = MemberToken;

        var reward = await _alpaca.GetAsync<RemoteReward>($"api/MemberReward/GetReward/{RemoteSegment(guid)}");
        if (!reward.Success || reward.Data == null) return Bad("This reward could not be found.", 404);

        var member = await TryGetMember();

        // the remote API lets a member redeem each reward only once
        bool? alreadyRedeemed = null;
        if (member != null)
        {
            var record = await _alpaca.GetAsync<string>($"api/MemberReward/GetAllRewardRecord/{RemoteSegment(guid)}", token);
            alreadyRedeemed = !record.Success && record.StatusCode == 400;
        }

        return Ok(new
        {
            success = true,
            message = "",
            reward = RewardDTO.From(reward.Data, _alpaca),
            loggedIn = member != null,
            points = member?.Point,
            alreadyRedeemed,
        });
    }

    // POST: /api/Member/RedeemReward
    [HttpPost("[action]")]
    public async Task<IActionResult> RedeemReward([FromBody] RedeemRequest request)
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        if (string.IsNullOrWhiteSpace(request.ItemGuid)) return Bad("Please choose a reward.");
        if (string.IsNullOrEmpty(request.MemberPassword)) return Bad("Please enter your password.");
        if (!Validation.IsPin(request.OutletStaffPin)) return Bad("Please enter the 6-digit staff PIN.");

        var member = await FetchMember(token);
        if (!member.Success) return AuthFail(member);

        // check the password here first (Scrypt)
        if (!_alpaca.VerifyPassword(request.MemberPassword, member.Data!.Password))
        {
            return Bad("Your password is incorrect.");
        }

        var reward = await _alpaca.GetAsync<RemoteReward>($"api/MemberReward/GetReward/{RemoteSegment(request.ItemGuid)}");
        if (!reward.Success || reward.Data == null) return Bad("This reward could not be found.", 404);

        var item = RewardDTO.From(reward.Data, _alpaca);
        if (item.Status != "Active") return Bad("This reward is not available any more.");

        var points = member.Data.Point ?? 0;
        if (points < item.Point)
        {
            return Bad($"Not enough points. You have {points} points but this reward needs {item.Point}.");
        }

        // the remote API lets a member redeem each reward only once
        var record = await _alpaca.GetAsync<string>($"api/MemberReward/GetAllRewardRecord/{RemoteSegment(request.ItemGuid)}", token);
        if (!record.Success && record.StatusCode == 400) return Bad("You have already redeemed this reward.");

        var redeemed = await _alpaca.PostAsync<string>(
            "api/MemberReward/RedeemReward",
            new { rewardGUID = request.ItemGuid, memberPassword = request.MemberPassword, outletStaffPin = request.OutletStaffPin },
            token
        );
        if (!redeemed.Success) return AuthFail(redeemed);

        return Ok(new
        {
            success = true,
            message = $"{item.Title ?? item.Name} redeemed successfully!",
            points = points - item.Point,
        });
    }

    // ======================================================================
    // Vouchers
    // ======================================================================

    // GET: /api/Member/Vouchers
    // Logged in members get three lists (available, used, expired), guests can only browse.
    [HttpGet("[action]")]
    public async Task<IActionResult> Vouchers()
    {
        var token = MemberToken;

        if (token == null)
        {
            var all = await _alpaca.GetAsync<List<RemoteVoucher>>("api/MemberVoucher/GetAllVouchers");
            if (!all.Success) return all.ToError();

            var vouchers = (all.Data ?? []).Select(v => VoucherDTO.From(v, _alpaca)).ToList();

            return Ok(new
            {
                success = true,
                message = "",
                loggedIn = false,
                active = vouchers.Where(v => v.Status == "Active").ToList(),
                used = new List<VoucherDTO>(),
                expired = vouchers.Where(v => v.Status == "Expired").ToList(),
            });
        }

        var filter = await _alpaca.GetAsync<RemoteFilterVouchers>("api/MemberVoucher/GetFilterVouchers", token);
        if (!filter.Success) return AuthFail(filter);

        return Ok(new
        {
            success = true,
            message = "",
            loggedIn = true,
            active = (filter.Data?.ActiveVouchers ?? []).Select(v => VoucherDTO.From(v, _alpaca)).ToList(),
            used = (filter.Data?.ClaimedVouchers ?? []).Select(v => VoucherDTO.From(v, _alpaca)).ToList(),
            expired = (filter.Data?.ExpiredVouchers ?? []).Select(v => VoucherDTO.From(v, _alpaca)).ToList(),
        });
    }

    // GET: /api/Member/MyVouchers (vouchers the member has not used yet)
    [HttpGet("[action]")]
    public async Task<IActionResult> MyVouchers()
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        var vouchers = await _alpaca.GetAsync<List<RemoteVoucher>>("api/MemberVoucher/GetMemberUnclaimedVouchers", token);
        if (!vouchers.Success) return AuthFail(vouchers);

        return Ok(new
        {
            success = true,
            message = "",
            vouchers = (vouchers.Data ?? []).Select(v => VoucherDTO.From(v, _alpaca)).ToList(),
        });
    }

    // GET: /api/Member/Voucher/{guid}
    // state tells the frontend what the member can do: guest, active, used, expired or unavailable (not valid right now)
    [HttpGet("[action]/{guid}")]
    public async Task<IActionResult> Voucher([FromRoute] string guid)
    {
        var token = MemberToken;

        var voucher = await _alpaca.GetAsync<RemoteVoucher>($"api/MemberVoucher/GetVoucher/{RemoteSegment(guid)}");
        if (!voucher.Success || voucher.Data == null) return Bad("This voucher could not be found.", 404);

        var item = VoucherDTO.From(voucher.Data, _alpaca);
        var state = "guest";

        if (token != null)
        {
            state = item.Status == "Expired" ? "expired" : "unavailable";

            var filter = await _alpaca.GetAsync<RemoteFilterVouchers>("api/MemberVoucher/GetFilterVouchers", token);
            if (!filter.Success) return AuthFail(filter);

            // the lists also carry the day/time rules, which the single voucher call does not
            var active = filter.Data?.ActiveVouchers?.FirstOrDefault(v => v.VoucherGUID == guid);
            var used = filter.Data?.ClaimedVouchers?.FirstOrDefault(v => v.VoucherGUID == guid);
            var expired = filter.Data?.ExpiredVouchers?.FirstOrDefault(v => v.VoucherGUID == guid);

            if (active != null)
            {
                state = "active";
                item = VoucherDTO.From(active, _alpaca);
            }
            else if (used != null)
            {
                state = "used";
                item = VoucherDTO.From(used, _alpaca);
            }
            else if (expired != null)
            {
                state = "expired";
                item = VoucherDTO.From(expired, _alpaca);
            }
        }

        return Ok(new { success = true, message = "", voucher = item, state });
    }

    // POST: /api/Member/RedeemVoucher
    [HttpPost("[action]")]
    public async Task<IActionResult> RedeemVoucher([FromBody] RedeemRequest request)
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        if (string.IsNullOrWhiteSpace(request.ItemGuid)) return Bad("Please choose a voucher.");
        if (string.IsNullOrEmpty(request.MemberPassword)) return Bad("Please enter your password.");
        if (!Validation.IsPin(request.OutletStaffPin)) return Bad("Please enter the 6-digit staff PIN.");

        var member = await FetchMember(token);
        if (!member.Success) return AuthFail(member);

        // check the password here first (Scrypt)
        if (!_alpaca.VerifyPassword(request.MemberPassword, member.Data!.Password))
        {
            return Bad("Your password is incorrect.");
        }

        // the voucher has to be in the member's "available" list (not used, not expired, valid on this day and time)
        var filter = await _alpaca.GetAsync<RemoteFilterVouchers>("api/MemberVoucher/GetFilterVouchers", token);
        if (!filter.Success) return AuthFail(filter);

        var active = filter.Data?.ActiveVouchers?.FirstOrDefault(v => v.VoucherGUID == request.ItemGuid);
        if (active == null)
        {
            if (filter.Data?.ClaimedVouchers?.Any(v => v.VoucherGUID == request.ItemGuid) == true)
            {
                return Bad("You have already used this voucher.");
            }

            if (filter.Data?.ExpiredVouchers?.Any(v => v.VoucherGUID == request.ItemGuid) == true)
            {
                return Bad("This voucher has expired.");
            }

            return Bad("This voucher cannot be used right now.");
        }

        var redeemed = await _alpaca.PostAsync<string>(
            "api/MemberVoucher/RedeemVoucher",
            new { voucherGUID = request.ItemGuid, memberPassword = request.MemberPassword, outletStaffPin = request.OutletStaffPin },
            token
        );
        if (!redeemed.Success) return AuthFail(redeemed);

        return Ok(new { success = true, message = $"{active.VoucherName ?? active.Title} redeemed successfully!" });
    }

    // ======================================================================
    // Collect points
    // ======================================================================

    // POST: /api/Member/CollectPoints
    // The member says how many points they earned at an outlet and the staff confirms it with their PIN.
    // On the remote API this is two calls: AssignPoint (creates a pending code) and ApprovePoint (staff PIN).
    [HttpPost("[action]")]
    public async Task<IActionResult> CollectPoints([FromBody] CollectPointsRequest request)
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        if (request.Point < 1 || request.Point > MaxPointsPerClaim) return Bad($"Points must be between 1 and {MaxPointsPerClaim}.");
        if (string.IsNullOrWhiteSpace(request.OutletGuid)) return Bad("Please choose an outlet.");
        if (!Validation.IsPin(request.Pin)) return Bad("Please enter the 6-digit staff PIN.");

        var outlet = await _alpaca.GetAsync<RemoteOutlet>($"api/MemberOutlet/GetOutlet/{RemoteSegment(request.OutletGuid)}");
        if (!outlet.Success || outlet.Data == null) return Bad("This outlet could not be found.", 404);

        if (outlet.Data.OutletStatus != RemoteOutletStatus.Active)
        {
            return Bad("This outlet is not collecting points right now.");
        }

        // check the PIN before creating anything, so a wrong PIN does not leave a pending record behind
        var staff = await _alpaca.GetAsync<List<RemoteOutletStaff>>($"api/MemberOutletStaff/GetAllOutletStaff/{RemoteSegment(request.OutletGuid)}", token);
        if (!staff.Success) return AuthFail(staff);

        var approver = staff.Data?.FirstOrDefault(s => s.Pin == request.Pin);
        if (approver == null) return Bad("The staff PIN is incorrect for this outlet.");

        var assigned = await _alpaca.PostAsync<RemoteAssignPoint>("api/MemberPoint/AssignPoint", new { point = request.Point }, token);
        if (!assigned.Success) return AuthFail(assigned);

        var fields = new Dictionary<string, string?>
        {
            ["Point"] = request.Point.ToString(),
            ["OutletGUID"] = request.OutletGuid,
            ["Pin"] = request.Pin,
            ["PointRecordStatus"] = "Approve",
            ["Code"] = assigned.Data?.Code,
            ["Remark"] = "Collected at outlet",
        };

        var approved = await _alpaca.PostFormAsync<string>("api/MemberPoint/ApprovePoint", fields, null, "Image", token);
        if (!approved.Success) return AuthFail(approved);

        var member = await FetchMember(token);

        return Ok(new
        {
            success = true,
            message = $"{request.Point} points added at {outlet.Data.OutletName}. Approved by {approver.OutletStaffName}.",
            points = member.Success ? member.Data?.Point : null,
        });
    }

    // ======================================================================
    // History
    // ======================================================================

    // GET: /api/Member/History?range=ThisMonth&types=Voucher,Reward
    [HttpGet("[action]")]
    public async Task<IActionResult> History([FromQuery] string? range, [FromQuery] string? types)
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        var query = new List<string>();

        var dateRange = DateRanges.FirstOrDefault(r => r.Equals(range, StringComparison.OrdinalIgnoreCase));
        if (dateRange != null) query.Add($"dateRange={dateRange}");

        var chosenTypes = (types ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(t => HistoryTypes.FirstOrDefault(h => h.Equals(t, StringComparison.OrdinalIgnoreCase)))
            .Where(t => t != null)
            .ToList();
        if (chosenTypes.Count > 0) query.Add($"types={string.Join(",", chosenTypes)}");

        var url = "api/MemberHistory/GetHistoryRecord" + (query.Count > 0 ? "?" + string.Join("&", query) : "");

        var history = await _alpaca.GetAsync<List<RemoteHistoryRecord>>(url, token);
        if (!history.Success) return AuthFail(history);

        return Ok(new
        {
            success = true,
            message = "",
            history = (history.Data ?? [])
                .Select(HistoryDTO.From)
                .OrderByDescending(h => h.Date)
                .ToList(),
        });
    }

    // ======================================================================
    // Outlets
    // ======================================================================

    // GET: /api/Member/Outlets
    [HttpGet("[action]")]
    public async Task<IActionResult> Outlets()
    {
        var outlets = await _alpaca.GetAsync<List<RemoteOutlet>>("api/MemberOutlet/GetAllOutlets");
        if (!outlets.Success) return outlets.ToError();

        return Ok(new
        {
            success = true,
            message = "",
            outlets = (outlets.Data ?? [])
                .Select(OutletDTO.From)
                .Where(o => o.Status == "Active")
                .OrderBy(o => o.Name)
                .ToList(),
        });
    }

    // GET: /api/Member/Outlet/{guid}
    // The staff list (names only, never the PINs) needs a logged in member.
    [HttpGet("[action]/{guid}")]
    public async Task<IActionResult> Outlet([FromRoute] string guid)
    {
        var token = MemberToken;

        var outlet = await _alpaca.GetAsync<RemoteOutlet>($"api/MemberOutlet/GetOutlet/{RemoteSegment(guid)}");
        if (!outlet.Success || outlet.Data == null) return Bad("This outlet could not be found.", 404);

        var staff = new List<OutletStaffDTO>();

        if (token != null)
        {
            var staffResult = await _alpaca.GetAsync<List<RemoteOutletStaff>>($"api/MemberOutletStaff/GetAllOutletStaff/{RemoteSegment(guid)}", token);
            if (!staffResult.Success) return AuthFail(staffResult);

            staff = (staffResult.Data ?? []).Select(s => OutletStaffDTO.From(s, includePin: false)).ToList();
        }

        return Ok(new
        {
            success = true,
            message = "",
            outlet = OutletDTO.From(outlet.Data),
            staff,
            loggedIn = token != null,
        });
    }

    // ======================================================================
    // Feedback
    // ======================================================================

    // POST: /api/Member/Feedback
    [HttpPost("Feedback")]
    public async Task<IActionResult> SubmitFeedback([FromBody] FeedbackRequest request)
    {
        var token = MemberToken;
        if (token == null) return NotLoggedIn();

        if (string.IsNullOrWhiteSpace(request.OutletGuid)) return Bad("Please choose an outlet.");
        if (string.IsNullOrWhiteSpace(request.Category)) return Bad("Please choose a category.");
        if (request.Rating < 1 || request.Rating > 5) return Bad("Please give a rating from 1 to 5.");
        if (string.IsNullOrWhiteSpace(request.Title)) return Bad("Please enter a title.");
        if (string.IsNullOrWhiteSpace(request.Description)) return Bad("Please tell us more in the description.");

        var member = await FetchMember(token);
        if (!member.Success) return AuthFail(member);

        var outlet = await _alpaca.GetAsync<RemoteOutlet>($"api/MemberOutlet/GetOutlet/{RemoteSegment(request.OutletGuid)}");
        if (!outlet.Success || outlet.Data == null) return Bad("This outlet could not be found.", 404);

        var created = await _alpaca.PostAsync<string>(
            "api/MemberFeedback/CreateFeedback",
            new
            {
                title = request.Title.Trim(),
                description = request.Description.Trim(),
                rating = request.Rating.ToString(),
                category = request.Category.Trim(),
                location = outlet.Data.OutletName,
                memberGUID = member.Data!.MemberGUID,
            },
            token
        );
        if (!created.Success) return AuthFail(created);

        return Ok(new { success = true, message = "Thank you! Your feedback has been sent." });
    }
}
