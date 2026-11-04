using System;
using server.RemoteModels;
using server.Services;

namespace server.DTO;

// ======================================================================
// Requests: what the React frontend sends to this server
// (every field can be null so the controllers can reply with a friendly message instead of a raw 400)
// ======================================================================

public record LoginRequest(string? PhoneNumber, string? Password);

public record OtpRequest(string? Code);

public record ForgotPasswordRequest(string? PhoneNumber);

public record ResetPasswordRequest(string? NewPassword, string? ConfirmPassword);

public record ChangePasswordRequest(string? OldPassword, string? NewPassword, string? ConfirmPassword);

// used to redeem both rewards and vouchers
public record RedeemRequest(string? ItemGuid, string? MemberPassword, string? OutletStaffPin);

public record CollectPointsRequest(int Point, string? OutletGuid, string? Pin);

public record FeedbackRequest(string? OutletGuid, string? Category, int Rating, string? Title, string? Description);

// forms with an image are sent as multipart/form-data, so these are classes
public class RegisterForm
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Birthday { get; set; }
    public string? ReferralBy { get; set; }
    public string? Password { get; set; }
    public string? ConfirmPassword { get; set; }
    public IFormFile? Image { get; set; }
}

public class ProfileForm
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public IFormFile? Image { get; set; }
}

// ---------- admin requests ----------

public record AdminLoginRequest(string? Username, string? Password);

public record AdminMemberRequest(
    int MemberID,
    string? Name,
    string? Email,
    string? PhoneNumber,
    string? BirthDate,
    string? Password,
    string? Tier
);

public record OutletRequest(string? OutletName);

public record StaffRequest(int OutletStaffID, string? OutletStaffName, string? Pin, int OutletID, string? Role);

public record AssignPointsRequest(string? PhoneNumber, int Point, int OutletID, string? Pin);

public record RejectPointRequest(int PointRecordID, string? Reason, int OutletID);

public class RewardForm
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Title { get; set; }
    public string? SubTitle { get; set; }
    public string? ShortTitle { get; set; }
    public int? Point { get; set; }
    public string? Description { get; set; }
    public string? TnC { get; set; }
    public string? CreateDate { get; set; }
    public string? ExpireDate { get; set; }
    public IFormFile? File { get; set; }
}

public class VoucherForm
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Title { get; set; }
    public string? Subtitle { get; set; }
    public string? ShortTitle { get; set; }
    public string? Description { get; set; }
    public string? TnC { get; set; }
    public string? CreatedDate { get; set; }
    public string? ExpiredDate { get; set; }

    // the rules as a JSON text, e.g. [{"dayOfWeek":"Monday","startTime":"09:00","endTime":"17:00"}]
    public string? Rules { get; set; }
    public IFormFile? File { get; set; }
}

public class HighlightForm
{
    public int Id { get; set; }
    public string? Title { get; set; }
    public string? SubTitle { get; set; }
    public string? Description { get; set; }
    public string? TnC { get; set; }
    public string? CreateDate { get; set; }
    public string? ExpireDate { get; set; }
    public IFormFile? File { get; set; }
}

// ======================================================================
// Session state kept on the server
// ======================================================================

// an OTP that was sent and is waiting to be checked (the code itself never goes to the browser)
public record PendingOtp(string Purpose, string Phone, string Code, DateTime CreatedUtc, int Attempts, bool Verified)
{
    public const string Register = "register";
    public const string Reset = "reset";
    public const int ValidMinutes = 10;
    public const int MaxAttempts = 5;

    public bool IsExpired => DateTime.UtcNow - CreatedUtc > TimeSpan.FromMinutes(ValidMinutes);
}

// ======================================================================
// View models: what this server sends back to the React frontend
// None of them contain passwords, hashes, tokens, OTPs or staff PINs (except the admin staff view).
// ======================================================================

public static class DateStatus
{
    // an item is "Upcoming" before it starts, "Expired" after it ends, otherwise "Active"
    public static string For(DateTime? start, DateTime? end)
    {
        var now = DateTime.Now;

        if (end.HasValue && end.Value < now) return "Expired";
        if (start.HasValue && start.Value > now) return "Upcoming";

        return "Active";
    }
}

public record MemberDTO(
    int Id,
    string? Guid,
    string? Name,
    string? Email,
    string? PhoneNumber,
    string? BirthDate,
    string? ReferralCode,
    string? Tier,
    string? ImageUrl,
    int Point,
    string Status,
    DateTime? RegisterTime
)
{
    public static MemberDTO From(RemoteMember m, AlpacaService alpaca) => new(
        m.MemberID,
        m.MemberGUID,
        m.Name,
        m.Email,
        m.PhoneNumber,
        m.BirthDate,
        m.ReferralCode,
        m.Tier,
        alpaca.ImageUrl(AlpacaService.MemberFolder, m.Image),
        m.Point ?? 0,
        (m.AccountStatus ?? RemoteAccountStatus.Pending).ToString(),
        m.RegisterTime
    );
}

public record HighlightDTO(
    int Id,
    string? Guid,
    string? Title,
    string? SubTitle,
    string? Description,
    string? TnC,
    string? ImageUrl,
    DateTime? CreateDate,
    DateTime? ExpireDate,
    string Status
)
{
    public static HighlightDTO From(RemoteHighlight h, AlpacaService alpaca) => new(
        h.HighlightID,
        h.HighlightGUID,
        h.Title,
        h.SubTitle,
        h.Description,
        h.TnC,
        alpaca.ImageUrl(AlpacaService.HighlightFolder, h.Image),
        h.CreateDate,
        h.ExpireDate,
        DateStatus.For(h.CreateDate, h.ExpireDate)
    );
}

public record RewardDTO(
    int Id,
    string? Guid,
    string? Name,
    string? Title,
    string? SubTitle,
    string? ShortTitle,
    string? Description,
    string? TnC,
    int Point,
    string? ImageUrl,
    DateTime? CreateDate,
    DateTime? ExpireDate,
    string Status
)
{
    public static RewardDTO From(RemoteReward r, AlpacaService alpaca) => new(
        r.RewardsID,
        r.RewardGUID,
        r.Name,
        r.Title,
        r.SubTitle,
        r.ShortTitle,
        r.Description,
        r.TnC,
        r.Point ?? 0,
        alpaca.ImageUrl(AlpacaService.RewardFolder, r.Image),
        r.CreateDate,
        r.ExpireDate,
        DateStatus.For(r.CreateDate, r.ExpireDate)
    );
}

public record VoucherRuleDTO(int? Id, string DayOfWeek, string StartTime, string EndTime);

public record VoucherDTO(
    int Id,
    string? Guid,
    string? Name,
    string? Title,
    string? Subtitle,
    string? ShortTitle,
    string? Description,
    string? TnC,
    string? ImageUrl,
    DateTime? CreatedDate,
    DateTime? ExpiredDate,
    string Status,
    List<VoucherRuleDTO> Rules
)
{
    public static VoucherDTO From(RemoteVoucher v, AlpacaService alpaca) => new(
        v.VoucherID,
        v.VoucherGUID,
        v.VoucherName,
        v.Title,
        v.Subtitle,
        v.ShortTitle,
        v.Description,
        v.TNC,
        alpaca.ImageUrl(AlpacaService.RewardFolder, v.Image),
        v.CreatedDate,
        v.ExpiredDate,
        DateStatus.For(v.CreatedDate, v.ExpiredDate),
        (v.VoucherRules ?? []).Select(r => new VoucherRuleDTO(
            r.VoucherRuleID,
            r.DayOfWeek ?? "",
            (r.StartTime ?? TimeSpan.Zero).ToString(@"hh\:mm"),
            (r.EndTime ?? TimeSpan.Zero).ToString(@"hh\:mm")
        )).ToList()
    );
}

public record OutletDTO(int Id, string? Guid, string? Name, DateTime? CreatedDate, string Status)
{
    public static OutletDTO From(RemoteOutlet o) => new(
        o.OutletID,
        o.OutletGUID,
        o.OutletName,
        o.CreatedDate,
        (o.OutletStatus ?? RemoteOutletStatus.Pending).ToString()
    );
}

// Pin is only filled in for the admin portal
public record OutletStaffDTO(int Id, string? Name, string? Role, int? OutletId, string? OutletName, string? Pin)
{
    public static OutletStaffDTO From(RemoteOutletStaff s, bool includePin) => new(
        s.OutletStaffID,
        s.OutletStaffName,
        s.Role,
        s.OutletID,
        s.Outlet?.OutletName,
        includePin ? s.Pin : null
    );
}

// one line of the member history: a point record, a reward redemption or a voucher redemption
public record HistoryDTO(
    string? Guid,
    string Type,
    string Title,
    string? Description,
    int? Points,
    string Status,
    DateTime? Date,
    string? Remark
)
{
    public static HistoryDTO From(RemoteHistoryRecord h)
    {
        var title = h.RecordType switch
        {
            RemoteHistoryType.Voucher => h.VoucherDetail?.VoucherName ?? h.VoucherDetail?.Title ?? "Voucher",
            RemoteHistoryType.Reward => h.RewardDetail?.Name ?? h.RewardDetail?.Title ?? "Reward",
            _ => "Collect Points",
        };

        return new(h.RecordGUID, h.RecordType.ToString(), title, h.Description, h.Points, h.Status ?? "", h.Date, h.Remark);
    }
}

public record FeedbackDTO(
    int Id,
    string? Title,
    string? Description,
    string? Rating,
    string? Category,
    string? Location,
    int? MemberId,
    string? MemberName
)
{
    public static FeedbackDTO From(RemoteFeedback f, string? memberName) => new(
        f.FeedbackID,
        f.Title,
        f.Description,
        f.Rating,
        f.Category,
        f.Location,
        f.MemberID,
        memberName
    );
}

public record PointRecordDTO(
    int Id,
    string? Guid,
    string? Code,
    int Point,
    string Status,
    DateTime Date,
    string? Description,
    string? Remark,
    int? MemberId,
    string? MemberName,
    string? MemberPhone,
    string? StaffName,
    int? OutletId,
    string? OutletName
)
{
    public static PointRecordDTO From(RemotePointRecord p) => new(
        p.PointRecordID,
        p.PointRecordGUID,
        p.Code,
        p.Point,
        (p.PointRecordStatus ?? RemotePointStatus.Pending).ToString(),
        p.DateAssign,
        p.Description,
        p.Remark,
        p.MemberID,
        p.Member?.Name,
        p.Member?.PhoneNumber,
        p.OutletStaff?.OutletStaffName,
        p.OutletStaff?.OutletID,
        p.OutletStaff?.Outlet?.OutletName
    );
}

// a reward or voucher redemption, as the admin sees it
public record RedemptionDTO(
    int Id,
    string Type,
    string Title,
    string? Description,
    string? MemberName,
    string? MemberPhone,
    string? OutletName,
    string? StaffName,
    DateTime? Date
)
{
    public static RedemptionDTO From(RemoteRewardRecord r) => new(
        r.RewardRecordID,
        "Reward",
        r.RewardName ?? r.RewardTitle ?? "Reward",
        r.RewardDescription,
        r.MemberName,
        r.MemberPhoneNumber,
        r.OutletName,
        r.OutletStaffName,
        AlpacaService.FromUnixMilliseconds(r.MemberRedeemDateTime)
    );

    public static RedemptionDTO From(RemoteVoucherRecord v) => new(
        v.VoucherRecordID,
        "Voucher",
        v.VoucherName ?? v.Title ?? "Voucher",
        v.Description,
        v.MemberName,
        v.MemberPhoneNumber,
        v.OutletName,
        v.OutletStaffName,
        AlpacaService.FromUnixMilliseconds(v.MemberRedeemDateTime)
    );
}
