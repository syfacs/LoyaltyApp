using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Services;

namespace server.Controllers;

[Authorize(Roles = Roles.Member)]
[ApiController]
[Route("api/[controller]")]
public class MemberController : ControllerBase
{
    public async Task<IActionResult> Register()
    {
        
        return Ok();
    }
}
