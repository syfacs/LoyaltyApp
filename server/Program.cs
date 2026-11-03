using Microsoft.AspNetCore.Authentication.Cookies;
using server;
using server.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// services
builder.Services.AddScoped<AlpacaService>();

// http clients
builder.Services.AddHttpClient("AlpacaAPI", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["API:AlpacaBaseUrl"]!);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// sessions and cookies
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(10);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;

        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;

        options.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
// policies (not using this because there is no need for a small application, but im keeping this here as an example)
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Client", p => p.RequireRole(Roles.Member))
    .AddPolicy("Admin", p => p.RequireRole(Roles.Admin));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
// app.MapControllerRoute(
//     name: "custom",
//     pattern: "api/{controller}/{action}/{id?}"
// );

app.UseHttpsRedirection();

app.UseCors("ReactPolicy");

app.UseAuthentication();
app.UseAuthorization();
app.UseSession();

app.MapControllers();

app.Run();
