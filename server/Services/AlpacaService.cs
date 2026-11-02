using System.Drawing;

namespace server.Services;

public class AlpacaService
{
    private readonly HttpClient http_client;

    public AlpacaService(IHttpClientFactory v)
    {
        http_client = v.CreateClient("AlpacaAPI");
    }

    public async Task LoginAdmin()
    {
        
    }
}