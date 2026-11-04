using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Scrypt;
using server.RemoteModels;

namespace server.Services;

// What every call to the remote API gives back: either the data, or an error message with a status code.
public record ServiceResult<T>(bool Success, T? Data, string Message, int StatusCode)
{
    public static ServiceResult<T> Ok(T? data) => new(true, data, "", 200);

    public static ServiceResult<T> Fail(string message, int statusCode = 400) => new(false, default, message, statusCode);

    // Turns a failed result into the error body the frontend expects.
    // Pass sessionExpired = true for calls made with a token, so a 401 tells the frontend to go back to the login page.
    public IActionResult ToError(bool sessionExpired = false)
    {
        var expired = sessionExpired && StatusCode == 401;

        return new ObjectResult(new
        {
            success = false,
            message = expired ? "Your session has expired. Please log in again." : Message,
            sessionExpired = expired,
        })
        {
            StatusCode = StatusCode,
        };
    }
}

public class AlpacaService
{
    // folders on the remote API where uploaded images are kept
    public const string HighlightFolder = "MerchantHighlight";
    public const string RewardFolder = "MerchantReward";
    public const string MemberFolder = "MemberProfileImage";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private static readonly ScryptEncoder Encoder = new();

    private readonly HttpClient http_client;

    public AlpacaService(IHttpClientFactory v)
    {
        http_client = v.CreateClient("AlpacaAPI");
    }

    // ---------- calls to the remote API ----------

    public Task<ServiceResult<T>> GetAsync<T>(string path, string? token = null)
    {
        return SendAsync<T>(HttpMethod.Get, path, token, null);
    }

    public Task<ServiceResult<T>> DeleteAsync<T>(string path, string? token = null)
    {
        return SendAsync<T>(HttpMethod.Delete, path, token, null);
    }

    // sends a JSON body (body can be null)
    public Task<ServiceResult<T>> PostAsync<T>(string path, object? body = null, string? token = null)
    {
        HttpContent? content = body == null
            ? null
            : JsonContent.Create(body, body.GetType(), options: JsonOptions);

        return SendAsync<T>(HttpMethod.Post, path, token, content);
    }

    // sends multipart/form-data, which is what the remote API wants when there is an image
    public Task<ServiceResult<T>> PostFormAsync<T>(
        string path,
        Dictionary<string, string?> fields,
        IFormFile? file = null,
        string fileField = "file",
        string? token = null)
    {
        var form = new MultipartFormDataContent();

        foreach (var (key, value) in fields)
        {
            if (value != null) form.Add(new StringContent(value), key);
        }

        if (file != null && file.Length > 0)
        {
            var stream = new StreamContent(file.OpenReadStream());

            if (!string.IsNullOrEmpty(file.ContentType))
            {
                stream.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
            }

            form.Add(stream, fileField, file.FileName);
        }

        return SendAsync<T>(HttpMethod.Post, path, token, form);
    }

    public Task<ServiceResult<RemoteAdminLogin>> LoginAdmin(string username, string password)
    {
        return PostAsync<RemoteAdminLogin>("api/Admin/AdminLogin", new { username, password });
    }

    private async Task<ServiceResult<T>> SendAsync<T>(HttpMethod method, string path, string? token, HttpContent? content)
    {
        using var request = new HttpRequestMessage(method, path) { Content = content };

        if (!string.IsNullOrEmpty(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        try
        {
            using var response = await http_client.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return ServiceResult<T>.Fail(ReadError(response.StatusCode, body), MapStatus(response.StatusCode));
            }

            // some endpoints answer with a plain message such as "Redeem Successful"
            if (typeof(T) == typeof(string))
            {
                return ServiceResult<T>.Ok((T)(object)ReadText(body));
            }

            if (string.IsNullOrWhiteSpace(body))
            {
                return ServiceResult<T>.Ok(default);
            }

            return ServiceResult<T>.Ok(JsonSerializer.Deserialize<T>(body, JsonOptions));
        }
        catch (JsonException)
        {
            return ServiceResult<T>.Fail("The loyalty server sent an unexpected response.", 502);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return ServiceResult<T>.Fail("Unable to reach the loyalty server. Please try again later.", 503);
        }
    }

    // the remote API usually returns the error as plain text, sometimes as a JSON string or problem details
    private static string ReadError(HttpStatusCode status, string body)
    {
        body = body.Trim();

        if (body.StartsWith('"'))
        {
            try
            {
                return JsonSerializer.Deserialize<string>(body) ?? "The request failed.";
            }
            catch (JsonException) { }
        }

        if (body.StartsWith('{'))
        {
            try
            {
                using var doc = JsonDocument.Parse(body);

                if (doc.RootElement.TryGetProperty("errors", out var errors) && errors.ValueKind == JsonValueKind.Object)
                {
                    foreach (var field in errors.EnumerateObject())
                    {
                        foreach (var message in field.Value.EnumerateArray())
                        {
                            return message.GetString() ?? "The request was invalid.";
                        }
                    }
                }

                if (doc.RootElement.TryGetProperty("message", out var msg) && msg.ValueKind == JsonValueKind.String)
                {
                    return msg.GetString()!;
                }

                if (doc.RootElement.TryGetProperty("title", out var title) && title.ValueKind == JsonValueKind.String)
                {
                    return title.GetString()!;
                }
            }
            catch (JsonException) { }

            return "The request was invalid.";
        }

        // plain text (but never show an html error page)
        if (body.Length > 0 && !body.StartsWith('<')) return body;

        return status switch
        {
            HttpStatusCode.Unauthorized => "Unauthorized.",
            HttpStatusCode.Forbidden => "You are not allowed to do that.",
            HttpStatusCode.NotFound => "Not found.",
            >= HttpStatusCode.InternalServerError => "The loyalty server had a problem. Please try again later.",
            _ => "The request failed.",
        };
    }

    private static string ReadText(string body)
    {
        body = body.Trim();

        if (body.StartsWith('"'))
        {
            try
            {
                return JsonSerializer.Deserialize<string>(body) ?? "";
            }
            catch (JsonException) { }
        }

        return body;
    }

    // server errors of the remote API are shown as 502 (bad gateway), everything else keeps its code
    private static int MapStatus(HttpStatusCode status)
    {
        return status switch
        {
            HttpStatusCode.BadRequest => 400,
            HttpStatusCode.Unauthorized => 401,
            HttpStatusCode.Forbidden => 403,
            HttpStatusCode.NotFound => 404,
            _ => 502,
        };
    }

    // ---------- passwords ----------

    // The remote API gives us the Scrypt hash of the member password, so we can check a typed password
    // here and show a clear error before sending anything else.
    public bool VerifyPassword(string? password, string? hash)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hash)) return false;

        try
        {
            return Encoder.Compare(password, hash);
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    // ---------- images and dates ----------

    // images come back from the remote API as a file name only, so build the full address
    public string? ImageUrl(string folder, string? file)
    {
        if (string.IsNullOrWhiteSpace(file)) return null;

        if (Uri.TryCreate(file, UriKind.Absolute, out _)) return file;

        return new Uri(http_client.BaseAddress!, $"{folder}/{Uri.EscapeDataString(file)}").ToString();
    }

    // "2026-11-30" becomes "2026-11-30T00:00:00"
    public static string? StartOfDay(string? date)
    {
        return TryParseDate(date, out var day) ? day.ToString("yyyy-MM-dd'T'00:00:00") : null;
    }

    // "2026-11-30" becomes "2026-11-30T23:59:59", so an item still works on its last day
    public static string? EndOfDay(string? date)
    {
        return TryParseDate(date, out var day) ? day.ToString("yyyy-MM-dd'T'23:59:59") : null;
    }

    public static bool TryParseDate(string? date, out DateTime day)
    {
        var ok = DateTime.TryParse(date, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed);
        day = parsed.Date;

        return ok;
    }

    // the remote API stores redeem times as unix milliseconds, we show them in Malaysia time (UTC+8)
    public static DateTime? FromUnixMilliseconds(long? milliseconds)
    {
        if (milliseconds == null) return null;

        return DateTimeOffset.FromUnixTimeMilliseconds(milliseconds.Value).ToOffset(TimeSpan.FromHours(8)).DateTime;
    }
}
