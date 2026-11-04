using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using server.DTO;
using server.RemoteModels;
using server.Services;

namespace server.Controllers;

// Admin portal. The remote API wants an admin JWT on every admin call, so the admin logs in here
// and the token is kept in the session (the browser never sees it).
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private const int MaxPointsPerAssign = 100000;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly string[] Days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    private readonly AlpacaService _alpaca;
    private readonly ILogger<AdminController> _logger;

    public AdminController(AlpacaService alpaca, ILogger<AdminController> logger)
    {
        _alpaca = alpaca;
        _logger = logger;
    }

    // ======================================================================
    // Helpers
    // ======================================================================

    // null when nobody is logged in. The live remote API does not give a token at admin login
    // (and does not ask for one), so a logged in admin without a token gets "", which is never sent.
    private string? AdminToken =>
        HttpContext.Session.GetString(SessionKeys.AdminName) == null
            ? null
            : HttpContext.Session.GetString(SessionKeys.AdminToken) ?? "";

    private static IActionResult Bad(string message, int status = 400)
    {
        return new ObjectResult(new { success = false, message }) { StatusCode = status };
    }

    private static IActionResult Done(string message)
    {
        return new OkObjectResult(new { success = true, message });
    }

    private static IActionResult NotLoggedIn()
    {
        return new ObjectResult(new { success = false, message = "Please log in to continue.", sessionExpired = true })
        {
            StatusCode = 401,
        };
    }

    // a failed call that was made with the admin token
    private IActionResult AuthFail<T>(ServiceResult<T> result)
    {
        if (result.StatusCode == 401)
        {
            HttpContext.Session.Remove(SessionKeys.AdminToken);
            HttpContext.Session.Remove(SessionKeys.AdminName);
        }

        return result.ToError(sessionExpired: true);
    }

    // deleting something that is still used by other records fails on the remote database
    private IActionResult DeleteFail<T>(ServiceResult<T> result)
    {
        var message = result.Message;

        if (message.Contains("entity changes", StringComparison.OrdinalIgnoreCase)
            || message.Contains("REFERENCE constraint", StringComparison.OrdinalIgnoreCase))
        {
            return Bad("This item is linked to other records (for example redemptions), so it cannot be deleted.");
        }

        return AuthFail(result);
    }

    // checks the start and end date of a reward, voucher or highlight
    private static string? CheckDates(string? start, string? end, out string? startValue, out string? endValue)
    {
        startValue = AlpacaService.StartOfDay(start);
        endValue = AlpacaService.EndOfDay(end);

        if (startValue == null) return "Please choose a start date.";
        if (endValue == null) return "Please choose an end date.";

        AlpacaService.TryParseDate(start, out var from);
        AlpacaService.TryParseDate(end, out var to);

        return to < from ? "The end date cannot be earlier than the start date." : null;
    }

    // ======================================================================
    // Login
    // ======================================================================

    // POST: /api/Admin/Login
    [HttpPost("[action]")]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
    {
        var username = request.Username?.Trim();

        if (string.IsNullOrWhiteSpace(username)) return Bad("Please enter your username.");
        if (string.IsNullOrEmpty(request.Password)) return Bad("Please enter your password.");

        var login = await _alpaca.LoginAdmin(username, request.Password);
        if (!login.Success) return login.ToError();

        // a successful answer is the login. If the remote API also sends a token we keep it for the next calls.
        HttpContext.Session.Remove(SessionKeys.AdminToken);

        if (!string.IsNullOrEmpty(login.Data?.SuccessToken))
        {
            HttpContext.Session.SetString(SessionKeys.AdminToken, login.Data.SuccessToken);
        }

        HttpContext.Session.SetString(SessionKeys.AdminName, username);

        return Ok(new { success = true, message = "Welcome back!", username });
    }

    // POST: /api/Admin/Logout
    [HttpPost("[action]")]
    public IActionResult Logout()
    {
        HttpContext.Session.Remove(SessionKeys.AdminToken);
        HttpContext.Session.Remove(SessionKeys.AdminName);

        return Done("You have been logged out.");
    }

    // GET: /api/Admin/Session (lets the frontend ask "am I still logged in?")
    [HttpGet("[action]")]
    public IActionResult Session()
    {
        if (AdminToken == null) return NotLoggedIn();

        return Ok(new { success = true, message = "", username = HttpContext.Session.GetString(SessionKeys.AdminName) });
    }

    // ======================================================================
    // Dashboard
    // ======================================================================

    // GET: /api/Admin/Dashboard
    [HttpGet("[action]")]
    public async Task<IActionResult> Dashboard()
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var membersTask = _alpaca.GetAsync<List<RemoteMember>>("api/ManageMember/GetAllMember", token);
        var rewardsTask = _alpaca.GetAsync<List<RemoteReward>>("api/ManageRewards/GetAllRewards", token);
        var vouchersTask = _alpaca.GetAsync<List<RemoteVoucher>>("api/ManageRewards/GetAllVouchers", token);
        var pointsTask = _alpaca.GetAsync<List<RemotePointRecord>>("api/ManagePoint/GetAllPoint", token);
        var rewardRecordsTask = _alpaca.GetAsync<List<RemoteRewardRecord>>("api/ManageRecords/GetAllRewardAssignRecord", token);
        var voucherRecordsTask = _alpaca.GetAsync<List<RemoteVoucherRecord>>("api/ManageRecords/GetAllVoucherAssignRecord", token);

        await Task.WhenAll(membersTask, rewardsTask, vouchersTask, pointsTask, rewardRecordsTask, voucherRecordsTask);

        var members = await membersTask;
        if (!members.Success) return AuthFail(members);

        var rewards = await rewardsTask;
        if (!rewards.Success) return AuthFail(rewards);

        var vouchers = await vouchersTask;
        if (!vouchers.Success) return AuthFail(vouchers);

        var points = await pointsTask;
        if (!points.Success) return AuthFail(points);

        var rewardRecords = await rewardRecordsTask;
        if (!rewardRecords.Success) return AuthFail(rewardRecords);

        var voucherRecords = await voucherRecordsTask;
        if (!voucherRecords.Success) return AuthFail(voucherRecords);

        var pointList = points.Data ?? [];

        return Ok(new
        {
            success = true,
            message = "",
            totalMembers = members.Data?.Count ?? 0,
            activeMembers = members.Data?.Count(m => m.AccountStatus == RemoteAccountStatus.Active) ?? 0,
            activeRewards = rewards.Data?.Count(r => DateStatus.For(r.CreateDate, r.ExpireDate) == "Active") ?? 0,
            activeVouchers = vouchers.Data?.Count(v => DateStatus.For(v.CreatedDate, v.ExpiredDate) == "Active") ?? 0,
            pointRecords = pointList.Count,
            pointsByStatus = new[]
            {
                new { label = "Pending", value = pointList.Count(p => p.PointRecordStatus == RemotePointStatus.Pending) },
                new { label = "Approved", value = pointList.Count(p => p.PointRecordStatus == RemotePointStatus.Approve) },
                new { label = "Rejected", value = pointList.Count(p => p.PointRecordStatus == RemotePointStatus.Rejected) },
            },
            redemptions = new[]
            {
                new { label = "Rewards", value = rewardRecords.Data?.Count ?? 0 },
                new { label = "Vouchers", value = voucherRecords.Data?.Count ?? 0 },
            },
        });
    }

    // ======================================================================
    // Members
    // ======================================================================

    // GET: /api/Admin/Members?search=alex
    // search matches name, email, phone number or member id
    [HttpGet("[action]")]
    public async Task<IActionResult> Members([FromQuery] string? search)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var members = await _alpaca.GetAsync<List<RemoteMember>>("api/ManageMember/GetAllMember", token);
        if (!members.Success) return AuthFail(members);

        var list = (members.Data ?? []).Select(m => MemberDTO.From(m, _alpaca));

        var text = search?.Trim();
        if (!string.IsNullOrEmpty(text))
        {
            list = list.Where(m =>
                m.Id.ToString() == text
                || (m.Name ?? "").Contains(text, StringComparison.OrdinalIgnoreCase)
                || (m.Email ?? "").Contains(text, StringComparison.OrdinalIgnoreCase)
                || (m.PhoneNumber ?? "").Contains(text.Replace(" ", "").Replace("-", ""), StringComparison.OrdinalIgnoreCase));
        }

        return Ok(new { success = true, message = "", members = list.OrderByDescending(m => m.Id).ToList() });
    }

    // GET: /api/Admin/Member/5
    [HttpGet("[action]/{id:int}")]
    public async Task<IActionResult> Member([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var member = await _alpaca.GetAsync<RemoteMember>($"api/ManageMember/FindMemberById?id={id}", token);
        if (!member.Success) return AuthFail(member);

        return Ok(new { success = true, message = "", member = MemberDTO.From(member.Data!, _alpaca) });
    }

    // POST: /api/Admin/CreateMember
    [HttpPost("[action]")]
    public async Task<IActionResult> CreateMember([FromBody] AdminMemberRequest request)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var error = CheckMember(request, needBirthday: true, out var phone, out var birthday);
        if (error != null) return Bad(error);

        var passwordError = Validation.PasswordError(request.Password);
        if (passwordError != null) return Bad(passwordError);

        var created = await _alpaca.PostAsync<string>(
            "api/ManageMember/CreateMember",
            new
            {
                name = request.Name!.Trim(),
                email = request.Email!.Trim(),
                phoneNumber = phone,
                birthDate = birthday,
                password = request.Password,
                tier = string.IsNullOrWhiteSpace(request.Tier) ? null : request.Tier.Trim(),
            },
            token
        );
        if (!created.Success) return AuthFail(created);

        return Done("Member created.");
    }

    // POST: /api/Admin/EditMember (the password is not changed here)
    [HttpPost("[action]")]
    public async Task<IActionResult> EditMember([FromBody] AdminMemberRequest request)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        if (request.MemberID <= 0) return Bad("Member not found.", 404);

        var error = CheckMember(request, needBirthday: false, out var phone, out var birthday);
        if (error != null) return Bad(error);

        var edited = await _alpaca.PostAsync<string>(
            "api/ManageMember/EditMember",
            new
            {
                memberID = request.MemberID,
                name = request.Name!.Trim(),
                email = request.Email!.Trim(),
                phoneNumber = phone,
                birthDate = birthday,
                tier = string.IsNullOrWhiteSpace(request.Tier) ? null : request.Tier.Trim(),
            },
            token
        );
        if (!edited.Success) return AuthFail(edited);

        return Done("Member updated.");
    }

    // The birthday is needed to create a member. When editing, an empty birthday keeps the old one
    // (some older members were saved without a birthday).
    private static string? CheckMember(AdminMemberRequest request, bool needBirthday, out string phone, out string? birthday)
    {
        phone = Validation.CleanPhone(request.PhoneNumber);
        birthday = null;

        if (string.IsNullOrWhiteSpace(request.Name)) return "Please enter the member's name.";
        if (!Validation.IsEmail(request.Email)) return "Please enter a valid email address.";
        if (!Validation.IsPhone(phone)) return "Phone number must start with 0 and have 10 or 11 digits, e.g. 0123456789.";

        if (string.IsNullOrWhiteSpace(request.BirthDate) && !needBirthday) return null;

        if (!AlpacaService.TryParseDate(request.BirthDate, out var day) || day > DateTime.Today)
        {
            return "Please enter a valid birth date.";
        }

        birthday = day.ToString("yyyy-MM-dd");

        return null;
    }

    // POST: /api/Admin/ToggleMember/5 (active <-> inactive)
    [HttpPost("[action]/{id:int}")]
    public async Task<IActionResult> ToggleMember([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var toggled = await _alpaca.PostAsync<string>("api/ManageMember/ActiveOrDeactiveMember", new { memberID = id }, token);
        if (!toggled.Success) return AuthFail(toggled);

        return Done("Member status updated.");
    }

    // ======================================================================
    // Rewards
    // ======================================================================

    // GET: /api/Admin/Rewards
    [HttpGet("[action]")]
    public async Task<IActionResult> Rewards()
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var rewards = await _alpaca.GetAsync<List<RemoteReward>>("api/ManageRewards/GetAllRewards", token);
        if (!rewards.Success) return AuthFail(rewards);

        return Ok(new
        {
            success = true,
            message = "",
            rewards = (rewards.Data ?? []).Select(r => RewardDTO.From(r, _alpaca)).OrderByDescending(r => r.Id).ToList(),
        });
    }

    // GET: /api/Admin/Reward/5
    [HttpGet("[action]/{id:int}")]
    public async Task<IActionResult> Reward([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var reward = await _alpaca.GetAsync<RemoteReward>($"api/ManageRewards/GetReward/{id}", token);
        if (!reward.Success) return AuthFail(reward);

        return Ok(new { success = true, message = "", reward = RewardDTO.From(reward.Data!, _alpaca) });
    }

    // POST: /api/Admin/CreateReward (multipart form, the image is optional)
    [HttpPost("[action]")]
    public async Task<IActionResult> CreateReward([FromForm] RewardForm form)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var error = CheckReward(form, out var start, out var end);
        if (error != null) return Bad(error);

        var name = form.Name!.Trim();

        var fields = new Dictionary<string, string?>
        {
            ["FullName"] = name,
            ["Title"] = string.IsNullOrWhiteSpace(form.Title) ? name : form.Title.Trim(),
            ["SubTitle"] = form.SubTitle?.Trim(),
            ["ShortTitle"] = form.ShortTitle?.Trim(),
            ["Point"] = form.Point.ToString(),
            ["Description"] = form.Description?.Trim(),
            ["TnC"] = form.TnC?.Trim(),
            ["Status"] = "Active",
            ["CreateDate"] = start,
            ["ExpireDate"] = end,
        };

        var created = await _alpaca.PostFormAsync<string>("api/ManageRewards/CreateReward", fields, form.File, "file", token);
        if (!created.Success) return AuthFail(created);

        return Done("Reward created.");
    }

    // POST: /api/Admin/EditReward
    [HttpPost("[action]")]
    public async Task<IActionResult> EditReward([FromForm] RewardForm form)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        if (form.Id <= 0) return Bad("Reward not found.", 404);

        var error = CheckReward(form, out var start, out var end);
        if (error != null) return Bad(error);

        var name = form.Name!.Trim();

        var fields = new Dictionary<string, string?>
        {
            ["Id"] = form.Id.ToString(),
            ["Name"] = name,
            ["Title"] = string.IsNullOrWhiteSpace(form.Title) ? name : form.Title.Trim(),
            ["SubTitle"] = form.SubTitle?.Trim(),
            ["ShortTitle"] = form.ShortTitle?.Trim(),
            ["Point"] = form.Point.ToString(),
            ["Description"] = form.Description?.Trim(),
            ["TnC"] = form.TnC?.Trim(),
            ["Status"] = "Active",
            ["CreateDate"] = start,
            ["ExpireDate"] = end,
        };

        var edited = await _alpaca.PostFormAsync<string>("api/ManageRewards/EditReward", fields, form.File, "file", token);
        if (!edited.Success) return AuthFail(edited);

        return Done("Reward updated.");
    }

    private static string? CheckReward(RewardForm form, out string? start, out string? end)
    {
        start = null;
        end = null;

        if (string.IsNullOrWhiteSpace(form.Name)) return "Please enter the reward name.";
        if (form.Point == null || form.Point < 0) return "Please enter the points needed (0 or more).";

        var imageError = Validation.ImageError(form.File);
        if (imageError != null) return imageError;

        return CheckDates(form.CreateDate, form.ExpireDate, out start, out end);
    }

    // DELETE: /api/Admin/Reward/5
    [HttpDelete("Reward/{id:int}")]
    public async Task<IActionResult> DeleteReward([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var deleted = await _alpaca.GetAsync<string>($"api/ManageRewards/DeleteReward/{id}", token);
        if (!deleted.Success) return DeleteFail(deleted);

        return Done("Reward deleted.");
    }

    // ======================================================================
    // Vouchers
    // ======================================================================

    // GET: /api/Admin/Vouchers
    [HttpGet("[action]")]
    public async Task<IActionResult> Vouchers()
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var vouchers = await _alpaca.GetAsync<List<RemoteVoucher>>("api/ManageRewards/GetAllVouchers", token);
        if (!vouchers.Success) return AuthFail(vouchers);

        return Ok(new
        {
            success = true,
            message = "",
            vouchers = (vouchers.Data ?? []).Select(v => VoucherDTO.From(v, _alpaca)).OrderByDescending(v => v.Id).ToList(),
        });
    }

    // GET: /api/Admin/Voucher/5 (this one also has the day/time rules)
    [HttpGet("[action]/{id:int}")]
    public async Task<IActionResult> Voucher([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var voucher = await _alpaca.GetAsync<RemoteVoucher>($"api/ManageRewards/GetVoucher/{id}", token);
        if (!voucher.Success) return AuthFail(voucher);

        return Ok(new { success = true, message = "", voucher = VoucherDTO.From(voucher.Data!, _alpaca) });
    }

    // POST: /api/Admin/CreateVoucher
    [HttpPost("[action]")]
    public async Task<IActionResult> CreateVoucher([FromForm] VoucherForm form)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var error = CheckVoucher(form, out var start, out var end, out var rules);
        if (error != null) return Bad(error);

        var name = form.Name!.Trim();

        var fields = new Dictionary<string, string?>
        {
            ["VoucherName"] = name,
            ["Title"] = string.IsNullOrWhiteSpace(form.Title) ? name : form.Title.Trim(),
            ["Subtitle"] = form.Subtitle?.Trim(),
            ["ShortTitle"] = form.ShortTitle?.Trim(),
            ["Description"] = form.Description?.Trim(),
            ["TNC"] = form.TnC?.Trim(),
            ["CreatedDate"] = start,
            ["ExpiredDate"] = end,
            ["VoucherRules"] = BuildRules(rules, 0),
        };

        var created = await _alpaca.PostFormAsync<string>("api/ManageRewards/CreateVoucher", fields, form.File, "file", token);
        if (!created.Success) return AuthFail(created);

        return Done("Voucher created.");
    }

    // POST: /api/Admin/EditVoucher
    [HttpPost("[action]")]
    public async Task<IActionResult> EditVoucher([FromForm] VoucherForm form)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        if (form.Id <= 0) return Bad("Voucher not found.", 404);

        var error = CheckVoucher(form, out var start, out var end, out var rules);
        if (error != null) return Bad(error);

        var name = form.Name!.Trim();

        var fields = new Dictionary<string, string?>
        {
            ["VoucherID"] = form.Id.ToString(),
            ["VoucherName"] = name,
            ["Title"] = string.IsNullOrWhiteSpace(form.Title) ? name : form.Title.Trim(),
            ["Subtitle"] = form.Subtitle?.Trim(),
            ["ShortTitle"] = form.ShortTitle?.Trim(),
            ["Description"] = form.Description?.Trim(),
            ["TNC"] = form.TnC?.Trim(),
            ["CreatedDate"] = start,
            ["ExpiredDate"] = end,
            ["VoucherStatus"] = "Active",
            ["VoucherRules"] = BuildRules(rules, form.Id),
        };

        var edited = await _alpaca.PostFormAsync<string>("api/ManageRewards/EditVoucher", fields, form.File, "file", token);
        if (!edited.Success) return AuthFail(edited);

        return Done("Voucher updated.");
    }

    private static string? CheckVoucher(VoucherForm form, out string? start, out string? end, out List<VoucherRuleDTO> rules)
    {
        start = null;
        end = null;
        rules = [];

        if (string.IsNullOrWhiteSpace(form.Name)) return "Please enter the voucher name.";

        var imageError = Validation.ImageError(form.File);
        if (imageError != null) return imageError;

        // the rules arrive as JSON text, e.g. [{"dayOfWeek":"Monday","startTime":"09:00","endTime":"17:00"}]
        if (!string.IsNullOrWhiteSpace(form.Rules))
        {
            try
            {
                rules = JsonSerializer.Deserialize<List<VoucherRuleDTO>>(form.Rules, JsonOptions) ?? [];
            }
            catch (JsonException)
            {
                return "The voucher rules are not valid.";
            }
        }

        foreach (var rule in rules)
        {
            if (!Days.Contains(rule.DayOfWeek)) return "Every rule needs a day of the week.";

            if (!TimeSpan.TryParse(rule.StartTime, out var from) || !TimeSpan.TryParse(rule.EndTime, out var to))
            {
                return "Every rule needs a start time and an end time.";
            }

            if (to <= from) return $"On {rule.DayOfWeek}, the end time must be later than the start time.";
        }

        return CheckDates(form.CreatedDate, form.ExpiredDate, out start, out end);
    }

    // The remote API wants the rules as JSON text. We always send them without ids:
    // the remote API then removes the old rules and adds these ones, which also lets the day be changed.
    private static string BuildRules(List<VoucherRuleDTO> rules, int voucherId)
    {
        var list = rules.Select(r => new
        {
            VoucherID = voucherId,
            DayOfWeek = r.DayOfWeek,
            StartTime = TimeSpan.Parse(r.StartTime),
            EndTime = TimeSpan.Parse(r.EndTime),
        });

        return JsonSerializer.Serialize(list);
    }

    // DELETE: /api/Admin/Voucher/5
    [HttpDelete("Voucher/{id:int}")]
    public async Task<IActionResult> DeleteVoucher([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var deleted = await _alpaca.GetAsync<string>($"api/ManageRewards/DeleteVoucher/{id}", token);
        if (!deleted.Success) return DeleteFail(deleted);

        return Done("Voucher deleted.");
    }

    // ======================================================================
    // Highlights (the promotions shown on the member home page)
    // ======================================================================

    // GET: /api/Admin/Highlights
    [HttpGet("[action]")]
    public async Task<IActionResult> Highlights()
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var highlights = await _alpaca.GetAsync<List<RemoteHighlight>>("api/ManageHighlight/GetAllHighlight", token);
        if (!highlights.Success) return AuthFail(highlights);

        return Ok(new
        {
            success = true,
            message = "",
            highlights = (highlights.Data ?? []).Select(h => HighlightDTO.From(h, _alpaca)).OrderByDescending(h => h.Id).ToList(),
        });
    }

    // GET: /api/Admin/Highlight/5
    [HttpGet("[action]/{id:int}")]
    public async Task<IActionResult> Highlight([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var highlight = await _alpaca.GetAsync<RemoteHighlight>($"api/ManageHighlight/GetHighlight/{id}", token);
        if (!highlight.Success) return AuthFail(highlight);

        return Ok(new { success = true, message = "", highlight = HighlightDTO.From(highlight.Data!, _alpaca) });
    }

    // POST: /api/Admin/CreateHighlight (the remote API needs an image for a new highlight)
    [HttpPost("[action]")]
    public async Task<IActionResult> CreateHighlight([FromForm] HighlightForm form)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        if (form.File == null || form.File.Length == 0) return Bad("Please choose an image.");

        var error = CheckHighlight(form, out var start, out var end);
        if (error != null) return Bad(error);

        var created = await _alpaca.PostFormAsync<string>("api/ManageHighlight/CreateHighlight", HighlightFields(form, start, end), form.File, "file", token);
        if (!created.Success) return AuthFail(created);

        return Done("Highlight created.");
    }

    // POST: /api/Admin/EditHighlight
    [HttpPost("[action]")]
    public async Task<IActionResult> EditHighlight([FromForm] HighlightForm form)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        if (form.Id <= 0) return Bad("Highlight not found.", 404);

        var error = CheckHighlight(form, out var start, out var end);
        if (error != null) return Bad(error);

        var edited = await _alpaca.PostFormAsync<string>("api/ManageHighlight/EditHighlight", HighlightFields(form, start, end), form.File, "file", token);
        if (!edited.Success) return AuthFail(edited);

        return Done("Highlight updated.");
    }

    private static string? CheckHighlight(HighlightForm form, out string? start, out string? end)
    {
        start = null;
        end = null;

        if (string.IsNullOrWhiteSpace(form.Title)) return "Please enter a title.";

        var imageError = Validation.ImageError(form.File);
        if (imageError != null) return imageError;

        return CheckDates(form.CreateDate, form.ExpireDate, out start, out end);
    }

    private static Dictionary<string, string?> HighlightFields(HighlightForm form, string? start, string? end)
    {
        return new Dictionary<string, string?>
        {
            ["HighlightID"] = form.Id.ToString(),
            ["Title"] = form.Title?.Trim(),
            ["SubTitle"] = form.SubTitle?.Trim(),
            ["Description"] = form.Description?.Trim(),
            ["TnC"] = form.TnC?.Trim(),
            ["CreateDate"] = start,
            ["ExpireDate"] = end,
        };
    }

    // DELETE: /api/Admin/Highlight/5
    [HttpDelete("Highlight/{id:int}")]
    public async Task<IActionResult> DeleteHighlight([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var deleted = await _alpaca.GetAsync<string>($"api/ManageHighlight/DeleteHighlight/{id}", token);
        if (!deleted.Success) return DeleteFail(deleted);

        return Done("Highlight deleted.");
    }

    // ======================================================================
    // Outlets and outlet staff
    // ======================================================================

    // GET: /api/Admin/Outlets
    [HttpGet("[action]")]
    public async Task<IActionResult> Outlets()
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var outlets = await _alpaca.GetAsync<List<RemoteOutlet>>("api/Outlet/GetAllOutlets", token);
        if (!outlets.Success) return AuthFail(outlets);

        return Ok(new
        {
            success = true,
            message = "",
            outlets = (outlets.Data ?? []).Select(OutletDTO.From).OrderBy(o => o.Name).ToList(),
        });
    }

    // POST: /api/Admin/CreateOutlet
    [HttpPost("[action]")]
    public async Task<IActionResult> CreateOutlet([FromBody] OutletRequest request)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var name = request.OutletName?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return Bad("Please enter the outlet name.");

        var created = await _alpaca.PostAsync<string>("api/Outlet/PostOutlet", new { outletName = name }, token);
        if (!created.Success) return AuthFail(created);

        return Done("Outlet created.");
    }

    // POST: /api/Admin/ToggleOutlet/5 (active <-> deactive)
    [HttpPost("[action]/{id:int}")]
    public async Task<IActionResult> ToggleOutlet([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var toggled = await _alpaca.GetAsync<string>($"api/Outlet/ActiveOrDeactiveOutlet/{id}", token);
        if (!toggled.Success) return AuthFail(toggled);

        return Done("Outlet status updated.");
    }

    // GET: /api/Admin/Staff?outletId=1 (the admin can see the PINs, they manage them)
    [HttpGet("[action]")]
    public async Task<IActionResult> Staff([FromQuery] int outletId)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var staff = await _alpaca.PostAsync<List<RemoteOutletStaff>>("api/OutletStaff/GetAllOutletStaff", new { outletID = outletId }, token);
        if (!staff.Success) return AuthFail(staff);

        return Ok(new
        {
            success = true,
            message = "",
            staff = (staff.Data ?? []).Select(s => OutletStaffDTO.From(s, includePin: true)).OrderBy(s => s.Name).ToList(),
        });
    }

    // POST: /api/Admin/CreateStaff
    [HttpPost("[action]")]
    public async Task<IActionResult> CreateStaff([FromBody] StaffRequest request)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var error = CheckStaff(request);
        if (error != null) return Bad(error);

        var created = await _alpaca.PostAsync<string>(
            "api/OutletStaff/CreateOutletStaff",
            new { outletStaffName = request.OutletStaffName!.Trim(), pin = request.Pin, outletID = request.OutletID, role = request.Role },
            token
        );
        if (!created.Success) return AuthFail(created);

        return Done("Staff member added.");
    }

    // POST: /api/Admin/UpdateStaff
    [HttpPost("[action]")]
    public async Task<IActionResult> UpdateStaff([FromBody] StaffRequest request)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        if (request.OutletStaffID <= 0) return Bad("Staff member not found.", 404);

        var error = CheckStaff(request);
        if (error != null) return Bad(error);

        var updated = await _alpaca.PostAsync<string>(
            "api/OutletStaff/UpdateOutletStaff",
            new
            {
                outletStaffID = request.OutletStaffID,
                outletStaffName = request.OutletStaffName!.Trim(),
                pin = request.Pin,
                outletID = request.OutletID,
                role = request.Role,
            },
            token
        );
        if (!updated.Success) return AuthFail(updated);

        return Done("Staff member updated.");
    }

    private static string? CheckStaff(StaffRequest request)
    {
        if (request.OutletID <= 0) return "Please choose an outlet.";
        if (string.IsNullOrWhiteSpace(request.OutletStaffName)) return "Please enter the staff name.";
        if (!Validation.IsPin(request.Pin)) return "The PIN must be exactly 6 digits.";

        return null;
    }

    // DELETE: /api/Admin/Staff/5
    [HttpDelete("Staff/{id:int}")]
    public async Task<IActionResult> DeleteStaff([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var deleted = await _alpaca.DeleteAsync<string>($"api/OutletStaff/DeleteOutletStaff/{id}", token);
        if (!deleted.Success) return DeleteFail(deleted);

        return Done("Staff member deleted.");
    }

    // ======================================================================
    // Point records
    // ======================================================================

    // GET: /api/Admin/Points?outletId=1
    [HttpGet("[action]")]
    public async Task<IActionResult> Points([FromQuery] int? outletId)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var points = await _alpaca.GetAsync<List<RemotePointRecord>>("api/ManagePoint/GetAllPointAssignRecord", token);
        if (!points.Success) return AuthFail(points);

        var list = (points.Data ?? []).Select(PointRecordDTO.From);

        // records that were not approved by any staff yet have no outlet, so they are hidden by the outlet filter
        if (outletId.HasValue) list = list.Where(p => p.OutletId == outletId);

        return Ok(new { success = true, message = "", points = list.OrderByDescending(p => p.Date).ToList() });
    }

    // GET: /api/Admin/Point/5
    [HttpGet("[action]/{id:int}")]
    public async Task<IActionResult> Point([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var point = await _alpaca.GetAsync<RemotePointRecord>($"api/ManagePoint/GetAllPointAssignRecordByPointId/{id}", token);
        if (!point.Success) return AuthFail(point);
        if (point.Data == null) return Bad("Point record not found.", 404);

        return Ok(new { success = true, message = "", point = PointRecordDTO.From(point.Data) });
    }

    // POST: /api/Admin/AssignPoints (the admin adds points to a member directly, confirmed with the staff PIN)
    [HttpPost("[action]")]
    public async Task<IActionResult> AssignPoints([FromBody] AssignPointsRequest request)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var phone = Validation.CleanPhone(request.PhoneNumber);

        if (!Validation.IsPhone(phone)) return Bad("Phone number must start with 0 and have 10 or 11 digits, e.g. 0123456789.");
        if (request.Point < 1 || request.Point > MaxPointsPerAssign) return Bad($"Points must be between 1 and {MaxPointsPerAssign}.");
        if (request.OutletID <= 0) return Bad("Please choose an outlet.");
        if (!Validation.IsPin(request.Pin)) return Bad("Please enter the 6-digit staff PIN.");

        var assigned = await _alpaca.PostAsync<string>(
            "api/ManagePoint/OutletAssignPoint",
            new { point = request.Point, phoneNumber = phone, pin = request.Pin, outletID = request.OutletID },
            token
        );
        if (!assigned.Success) return AuthFail(assigned);

        return Done($"{request.Point} points added to {phone}.");
    }

    // POST: /api/Admin/RejectPoint
    // The remote API needs a staff PIN of the outlet for this, so we look one up for the admin.
    // It has nowhere to store the reason, so the reason is only written to the server log.
    [HttpPost("[action]")]
    public async Task<IActionResult> RejectPoint([FromBody] RejectPointRequest request)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        if (string.IsNullOrWhiteSpace(request.Reason)) return Bad("Please enter a reason for rejecting this record.");

        var point = await _alpaca.GetAsync<RemotePointRecord>($"api/ManagePoint/GetAllPointAssignRecordByPointId/{request.PointRecordID}", token);
        if (!point.Success) return AuthFail(point);
        if (point.Data == null) return Bad("Point record not found.", 404);

        var record = point.Data;

        if (record.PointRecordStatus == RemotePointStatus.Rejected) return Bad("This record has already been rejected.");
        if (string.IsNullOrEmpty(record.Member?.PhoneNumber)) return Bad("The member of this record could not be found.");

        var outletId = request.OutletID > 0 ? request.OutletID : record.OutletStaff?.OutletID ?? 0;
        if (outletId <= 0) return Bad("Please choose an outlet.");

        var staff = await _alpaca.PostAsync<List<RemoteOutletStaff>>("api/OutletStaff/GetAllOutletStaff", new { outletID = outletId }, token);
        if (!staff.Success) return AuthFail(staff);

        var pin = staff.Data?.FirstOrDefault(s => !string.IsNullOrEmpty(s.Pin))?.Pin;
        if (pin == null) return Bad("This outlet has no staff member yet. Please add one first.");

        var rejected = await _alpaca.PostAsync<string>(
            "api/ManagePoint/RejectPoint",
            new
            {
                id = record.PointRecordGUID,
                assignPoint = new { point = 0, phoneNumber = record.Member.PhoneNumber, pin, outletID = outletId },
            },
            token
        );
        if (!rejected.Success) return AuthFail(rejected);

        _logger.LogInformation("Point record {Guid} was rejected by the admin. Reason: {Reason}", record.PointRecordGUID, request.Reason.Trim());

        return Done("Point record rejected.");
    }

    // ======================================================================
    // Redemption records
    // ======================================================================

    // GET: /api/Admin/Redemptions
    [HttpGet("[action]")]
    public async Task<IActionResult> Redemptions()
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var rewardsTask = _alpaca.GetAsync<List<RemoteRewardRecord>>("api/ManageRecords/GetAllRewardAssignRecord", token);
        var vouchersTask = _alpaca.GetAsync<List<RemoteVoucherRecord>>("api/ManageRecords/GetAllVoucherAssignRecord", token);

        await Task.WhenAll(rewardsTask, vouchersTask);

        var rewards = await rewardsTask;
        if (!rewards.Success) return AuthFail(rewards);

        var vouchers = await vouchersTask;
        if (!vouchers.Success) return AuthFail(vouchers);

        return Ok(new
        {
            success = true,
            message = "",
            rewards = (rewards.Data ?? []).Select(RedemptionDTO.From).OrderByDescending(r => r.Date).ToList(),
            vouchers = (vouchers.Data ?? []).Select(RedemptionDTO.From).OrderByDescending(v => v.Date).ToList(),
        });
    }

    // GET: /api/Admin/Redemption/reward/5 (or /voucher/5)
    [HttpGet("[action]/{type}/{id:int}")]
    public async Task<IActionResult> Redemption([FromRoute] string type, [FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        if (type.Equals("reward", StringComparison.OrdinalIgnoreCase))
        {
            var reward = await _alpaca.GetAsync<RemoteRewardRecord>($"api/ManageRecords/GetRewardAssignRecordById/{id}", token);
            if (!reward.Success) return AuthFail(reward);

            return Ok(new { success = true, message = "", redemption = RedemptionDTO.From(reward.Data!) });
        }

        if (type.Equals("voucher", StringComparison.OrdinalIgnoreCase))
        {
            var voucher = await _alpaca.GetAsync<RemoteVoucherRecord>($"api/ManageRecords/GetVoucherAssignRecordById/{id}", token);
            if (!voucher.Success) return AuthFail(voucher);

            return Ok(new { success = true, message = "", redemption = RedemptionDTO.From(voucher.Data!) });
        }

        return Bad("Unknown redemption type.", 404);
    }

    // ======================================================================
    // Feedback
    // ======================================================================

    // GET: /api/Admin/Feedbacks?memberId=3
    [HttpGet("[action]")]
    public async Task<IActionResult> Feedbacks([FromQuery] int? memberId)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var membersTask = _alpaca.GetAsync<List<RemoteMember>>("api/ManageMember/GetAllMember", token);

        var feedbackTask = memberId.HasValue
            ? _alpaca.PostAsync<List<RemoteFeedback>>("api/Feedback/GetFeedbackListFilterUser", new { memberID = memberId }, token)
            : _alpaca.GetAsync<List<RemoteFeedback>>("api/Feedback/GetAllFeedbackList", token);

        await Task.WhenAll(membersTask, feedbackTask);

        var members = await membersTask;
        if (!members.Success) return AuthFail(members);

        var feedback = await feedbackTask;

        // the remote API answers "No Records Found" with an error when a member has no feedback
        if (!feedback.Success && !(memberId.HasValue && feedback.StatusCode == 400)) return AuthFail(feedback);

        var names = (members.Data ?? []).ToDictionary(m => m.MemberID, m => m.Name);

        return Ok(new
        {
            success = true,
            message = "",
            feedbacks = (feedback.Data ?? [])
                .Select(f => FeedbackDTO.From(f, f.MemberID.HasValue ? names.GetValueOrDefault(f.MemberID.Value) : null))
                .OrderByDescending(f => f.Id)
                .ToList(),
            members = (members.Data ?? []).Select(m => new { id = m.MemberID, name = m.Name }).OrderBy(m => m.name).ToList(),
        });
    }

    // GET: /api/Admin/Feedback/5
    [HttpGet("[action]/{id:int}")]
    public async Task<IActionResult> Feedback([FromRoute] int id)
    {
        var token = AdminToken;
        if (token == null) return NotLoggedIn();

        var feedback = await _alpaca.GetAsync<RemoteFeedback>($"api/Feedback/GetFeedback/{id}", token);
        if (!feedback.Success) return AuthFail(feedback);
        if (feedback.Data == null) return Bad("Feedback not found.", 404);

        string? memberName = null;
        if (feedback.Data.MemberID.HasValue)
        {
            var member = await _alpaca.GetAsync<RemoteMember>($"api/ManageMember/FindMemberById?id={feedback.Data.MemberID}", token);
            memberName = member.Data?.Name;
        }

        return Ok(new { success = true, message = "", feedback = FeedbackDTO.From(feedback.Data, memberName) });
    }
}
