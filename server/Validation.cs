using System.ComponentModel.DataAnnotations;

namespace server;

// small input checks shared by the controllers
public static class Validation
{
    public const int PasswordMinLength = 8;
    public const int MaxImageBytes = 5 * 1024 * 1024;

    private static readonly string[] ImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    // removes spaces and dashes, so "012-345 6789" becomes "0123456789"
    public static string CleanPhone(string? phone)
    {
        return (phone ?? "").Replace(" ", "").Replace("-", "").Trim();
    }

    // same rule as the remote API: starts with 0 and has 10 or 11 digits
    public static bool IsPhone(string? phone)
    {
        return !string.IsNullOrEmpty(phone)
            && phone.StartsWith('0')
            && (phone.Length == 10 || phone.Length == 11)
            && phone.All(char.IsAsciiDigit);
    }

    // outlet staff PINs are exactly 6 digits
    public static bool IsPin(string? pin)
    {
        return pin is { Length: 6 } && pin.All(char.IsAsciiDigit);
    }

    public static bool IsEmail(string? email)
    {
        return !string.IsNullOrWhiteSpace(email) && new EmailAddressAttribute().IsValid(email.Trim());
    }

    // returns an error message, or null when the password is fine
    public static string? PasswordError(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < PasswordMinLength)
        {
            return $"Password must be at least {PasswordMinLength} characters.";
        }

        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
        {
            return "Password must contain at least one letter and one number.";
        }

        return null;
    }

    // returns an error message, or null when there is no file or the file is a normal image
    public static string? ImageError(IFormFile? file)
    {
        if (file == null || file.Length == 0) return null;

        if (!ImageTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return "Image must be a JPG, PNG, GIF or WEBP file.";
        }

        if (file.Length > MaxImageBytes)
        {
            return "Image must be smaller than 5 MB.";
        }

        return null;
    }

    // "alex@example.com" becomes "a***@example.com"
    public static string MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) return "your email";

        var parts = email.Split('@', 2);
        var name = parts[0];
        var shown = name.Length <= 1 ? name : name[..1];

        return $"{shown}***@{parts[1]}";
    }
}
