using System.Text.Json.Nodes;

namespace server.ViewModels;

public record AlpacaResponse(bool Success, int StatusCode, string Message, JsonNode? Data);

public record ApiResponse(bool Success, string Message, JsonNode? Data)
{
    public static ApiResponse Failure(string message) => new(false, message, null);
}
