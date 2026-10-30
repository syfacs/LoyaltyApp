using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;

namespace server.Controllers;

[ApiController]
[Route("test_api")]
public class APIController : ControllerBase
{
    [HttpGet("[action]")]
    public string GetString()
    {
        return "Hello World";
    }

    [HttpGet("[action]/{id:int}")]
    public object GetObject([FromRoute] int id)
    {
        return new
        {
            Id = id,
            Name = "John"
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
