using System;

namespace server.RemoteModels;

// These mirror the JSON that the remote API (alpacaapi) sends back.
// They are only used inside the server. Some of them contain private data
// (password hash, staff PIN, OTP), so they must never be returned to the frontend as they are.
// Use the DTOs in DTO/DTOs.cs for that.

// ---------- enums (the remote API sends them as numbers) ----------

public enum RemoteAccountStatus { Pending, Active, Inactive }

public enum RemoteOutletStatus { Pending, Active, Deactive }

public enum RemotePointStatus { Pending, Approve, Rejected }

public enum RemoteHistoryType { Voucher, Reward, Point }

// ---------- members ----------

public record RemoteMember(
    int MemberID,
    string? MemberGUID,
    string? Name,
    string? Email,
    string? PhoneNumber,
    string? BirthDate,
    string? ReferralCode,
    string? ReferralBy,
    string? Password,
    string? Tier,
    string? Image,
    RemoteAccountStatus? AccountStatus,
    DateTime? RegisterTime,
    int? Point,
    string? SuccessToken
);

public record RemoteLoginResult(string? SuccessToken, string? Email, string? Otp, DateTime? OtpCreated);

public record RemoteOtpResult(
    string? Message,
    string? PhoneNumber,
    string? Email,
    bool EmailSent,
    string? EmailError,
    string? Otp,
    DateTime? OtpCreated
);

// the live API answers { message, adminID, username } without a token, older versions send a SuccessToken
public record RemoteAdminLogin(int AdminID, string? Username, string? Message, string? SuccessToken, string? RefreshToken, string? TokenMinutes);

public record RemoteMessage(string? Message);

// ---------- content ----------

public record RemoteHighlight(
    int HighlightID,
    string? HighlightGUID,
    string? Image,
    string? Title,
    string? SubTitle,
    string? Description,
    string? TnC,
    DateTime? CreateDate,
    DateTime? ExpireDate,
    string? Status
);

public record RemoteReward(
    int RewardsID,
    string? RewardGUID,
    string? Name,
    string? Image,
    string? Title,
    string? SubTitle,
    int? Point,
    string? ShortTitle,
    string? Description,
    string? TnC,
    DateTime? CreateDate,
    DateTime? ExpireDate,
    string? Status
);

public record RemoteVoucherRule(
    int? VoucherRuleID,
    int VoucherID,
    string? DayOfWeek,
    TimeSpan? StartTime,
    TimeSpan? EndTime
);

public record RemoteVoucher(
    int VoucherID,
    string? VoucherGUID,
    string? VoucherName,
    string? Image,
    string? Title,
    string? Subtitle,
    string? ShortTitle,
    string? Description,
    string? TNC,
    DateTime? CreatedDate,
    DateTime? ExpiredDate,
    string? VoucherStatus,
    List<RemoteVoucherRule>? VoucherRules
);

public record RemoteFilterVouchers(
    List<RemoteVoucher>? ActiveVouchers,
    List<RemoteVoucher>? ClaimedVouchers,
    List<RemoteVoucher>? ExpiredVouchers
);

// ---------- outlets ----------

public record RemoteOutlet(
    int OutletID,
    string? OutletGUID,
    string? OutletName,
    DateTime? CreatedDate,
    RemoteOutletStatus? OutletStatus
);

// "Pin" is the secret staff PIN
public record RemoteOutletStaff(
    int OutletStaffID,
    string? OutletStaffName,
    string? Pin,
    string? Role,
    int? OutletID,
    RemoteOutlet? Outlet
);

// ---------- points, history and records ----------

public record RemoteAssignPoint(int Point, string? Code);

public record RemotePointRecord(
    int PointRecordID,
    string? PointRecordGUID,
    string? Code,
    int Point,
    int? MemberID,
    DateTime DateAssign,
    string? Description,
    int? OutletStaffID,
    RemotePointStatus? PointRecordStatus,
    string? Remark,
    RemoteMember? Member,
    RemoteOutletStaff? OutletStaff
);

public record RemoteHistoryRecord(
    int RecordID,
    string? RecordGUID,
    DateTime? Date,
    string? Description,
    RemoteHistoryType RecordType,
    int? Points,
    string? Remark,
    string? Status,
    RemoteVoucher? VoucherDetail,
    RemoteReward? RewardDetail
);

public record RemoteRewardRecord(
    int RewardRecordID,
    long? MemberRedeemDateTime,
    string? OutletName,
    string? OutletStaffName,
    string? MemberName,
    string? MemberPhoneNumber,
    string? RewardTitle,
    string? RewardName,
    string? RewardDescription
);

public record RemoteVoucherRecord(
    int VoucherRecordID,
    string? VoucherName,
    string? Title,
    string? Description,
    string? MemberName,
    string? MemberPhoneNumber,
    string? OutletName,
    string? OutletStaffName,
    long? MemberRedeemDateTime
);

public record RemoteFeedback(
    int FeedbackID,
    string? Title,
    string? Description,
    string? Rating,
    string? Category,
    int? MemberID,
    string? MemberGUID,
    string? Location
);
