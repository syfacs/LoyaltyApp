using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Services;

namespace server.Controllers;

public enum AuthenticationStatus
{
    NotAuthenticated,
    IdentifierNotSet,
    NotFound,
    Authenticated,
}

[Authorize(Roles = Roles.Member)]
[ApiController]
[Route("api/[controller]")]
public class AUTHTemplate : ControllerBase
{
    private readonly HttpClient _client;
    private readonly IAuthorizationService _auth;

    public AUTHTemplate(IHttpClientFactory factory, IAuthorizationService authorizationService)
    {
        _client = factory.CreateClient("AlpacaAPI");

        // this service can be used to check for policies
        _auth = authorizationService;
    }

    private void SIGNIN()
    {
        var claims = new List<Claim>
        {
            
        };

    }

    private (AuthenticationStatus Status, int? UserToken) IsUserAuthenticated()
    {
        // checks if user is authenticated
        if (HttpContext.User.Identity?.IsAuthenticated != true) return (AuthenticationStatus.NotAuthenticated, null);
        
        // makes sure role is correct
        if (!HttpContext.User.IsInRole(Roles.Member)) return (AuthenticationStatus.NotAuthenticated, null);

        string? id_string = HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(id_string, out int user_id)) return (AuthenticationStatus.IdentifierNotSet, null);

        return (AuthenticationStatus.Authenticated, user_id);
    }

    [AllowAnonymous]
    public async Task<IActionResult> Register()
    {
        
        return Ok();
    }
}
