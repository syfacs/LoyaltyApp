namespace server.ViewModels;

public record LoginRequest(string PhoneNumber, string Password);
public record OtpRequest(string PhoneNumber, string Email);
public record ResetPasswordRequest(string PhoneNumber, string Email, string Otp, string NewPassword);
public record ChangePasswordRequest(string OldPassword, string NewPassword);
public record RedeemRewardRequest(string RewardGUID, string MemberPassword, string OutletStaffPin);
public record RedeemVoucherRequest(string VoucherGUID, string MemberPassword, string OutletStaffPin);
public record AssignPointRequest(int Point);
public record ApprovePointRequest(string Code, string OutletGUID, string Pin);
public record FeedbackRequest(string Title, string Description, string Rating, string Category, string Location);

public class RegisterRequest
{
    public string Name { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string? Birthday { get; init; }
    public IFormFile? Image { get; init; }

    public IReadOnlyDictionary<string, string?> ToFields() => new Dictionary<string, string?>
    {
        ["name"] = Name,
        ["phoneNumber"] = PhoneNumber,
        ["email"] = Email,
        ["password"] = Password,
        ["birthday"] = Birthday
    };
}

public class UpdateProfileRequest
{
    public string? Name { get; init; }
    public string? Email { get; init; }
    public IFormFile? Image { get; init; }

    public IReadOnlyDictionary<string, string?> ToFields() => new Dictionary<string, string?>
    {
        ["name"] = Name,
        ["email"] = Email
    };
}
