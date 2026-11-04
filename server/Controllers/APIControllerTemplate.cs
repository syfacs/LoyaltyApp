using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using server.Services;

namespace server.Controllers;

// learn how to use route mapping, route params and query params

[ApiController]
[Route("[controller]")]
public class APIController : ControllerBase
{
    [HttpGet("[action]")]
    public string GetString()
    {
        return "Hello World";
    }

    // mix of both Route Params and Query Params
    [HttpGet("[action]/{id:int}/other/{other_id:int}")]
    public object GetObject([FromRoute] int id, [FromRoute] int other_id, [FromQuery] string? name)
    {
        return new
        {
            Id = id,
            OtherId = other_id,
            Name = name,
        };
    }

    [HttpGet("[action]")]
    public IActionResult GetStatus()
    {
        return Ok(new
        {
            Success = true,
            Message = "Request successful"
        });
    }

    [HttpGet("[action]")]
    public IActionResult GetNotFound()
    {
        return NotFound();
    }
}
