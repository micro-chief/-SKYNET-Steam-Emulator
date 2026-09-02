using SKYNET_server.Models;

namespace SKYNET_server.Services.Mcp;

/// <summary>
/// Resolves the admin session from the current MCP HTTP request. Keeping the
/// token in the Authorization header prevents it from becoming part of MCP
/// tool arguments, schemas, traces, or conversation history.
/// </summary>
public sealed class McpAdminAuthorization
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly SteamApiStateService _state;

    public McpAdminAuthorization(IHttpContextAccessor httpContextAccessor, SteamApiStateService state)
    {
        _httpContextAccessor = httpContextAccessor;
        _state = state;
    }

    public bool IsAuthorized => _state.IsWebAdmin(GetBearerToken());

    public ApiAdminOverview? GetAdminOverview() => _state.GetAdminOverview(GetBearerToken());

    private string GetBearerToken()
    {
        var request = _httpContextAccessor.HttpContext?.Request;
        return request == null
            ? string.Empty
            : SteamApiStateService.GetBearerToken(request) ?? string.Empty;
    }
}
