using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using server.ViewModels;

namespace server.Services;

public class AlpacaService
{
    private readonly HttpClient _httpClient;

    public AlpacaService(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient("AlpacaAPI");
    }

    public Task<AlpacaResponse> GetAsync(string path, string? token, CancellationToken cancellationToken)
    {
        return SendAsync(HttpMethod.Get, path, null, token, cancellationToken);
    }

    public Task<AlpacaResponse> PostAsync(string path, object? body, string? token, CancellationToken cancellationToken)
    {
        return SendAsync(HttpMethod.Post, path, body, token, cancellationToken);
    }

    public async Task<AlpacaResponse> PostFormAsync(
        string path,
        IReadOnlyDictionary<string, string?> fields,
        IFormFile? image,
        string? token,
        CancellationToken cancellationToken)
    {
        using var content = new MultipartFormDataContent();

        foreach (var field in fields.Where(field => !string.IsNullOrWhiteSpace(field.Value)))
        {
            content.Add(new StringContent(field.Value!), field.Key);
        }

        if (image is { Length: > 0 })
        {
            var imageContent = new StreamContent(image.OpenReadStream());
            imageContent.Headers.ContentType = new MediaTypeHeaderValue(image.ContentType);
            content.Add(imageContent, "image", image.FileName);
        }

        return await SendAsync(HttpMethod.Post, path, content, token, cancellationToken);
    }

    private async Task<AlpacaResponse> SendAsync(
        HttpMethod method,
        string path,
        object? body,
        string? token,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, path);

        if (body is HttpContent content)
        {
            request.Content = content;
        }
        else if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        try
        {
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var rawContent = await response.Content.ReadAsStringAsync(cancellationToken);
            var data = ToJsonNode(rawContent);
            var message = GetMessage(data, response.IsSuccessStatusCode);

            return new AlpacaResponse(response.IsSuccessStatusCode, (int)response.StatusCode, message, data);
        }
        catch (HttpRequestException)
        {
            return new AlpacaResponse(false, StatusCodes.Status503ServiceUnavailable,
                "The loyalty service is unavailable. Please try again shortly.", null);
        }
    }

    private static JsonNode? ToJsonNode(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return null;
        }

        try
        {
            return JsonNode.Parse(content);
        }
        catch
        {
            return JsonValue.Create(content);
        }
    }

    private static string GetMessage(JsonNode? data, bool isSuccessful)
    {
        if (data is JsonObject json && json["message"] is JsonValue message)
        {
            return message.ToString();
        }

        if (!isSuccessful && data is JsonObject problem && problem["title"] is JsonValue title)
        {
            return title.ToString();
        }

        if (data is JsonValue value && value.TryGetValue<string>(out var text) && !string.IsNullOrWhiteSpace(text))
        {
            return text;
        }

        return isSuccessful ? "Request completed successfully." : "The request could not be completed.";
    }
}
