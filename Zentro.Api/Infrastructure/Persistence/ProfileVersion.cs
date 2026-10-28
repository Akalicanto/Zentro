using System.Security.Cryptography;
using System.Text.Json;
using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence;

public static class ProfileVersion
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
    public static string For(FinancialProfile? profile) => "\"" + Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(profile, Options))) + "\"";
}
