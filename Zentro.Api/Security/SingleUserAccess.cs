using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Zentro.Api.Security;

public sealed class SingleUserAccess
{
    private readonly string passwordHash;
    private readonly byte[] totpKey;
    private readonly string counterPath;
    private readonly object gate = new();
    public bool Enabled { get; }
    public string Stamp { get; }

    public SingleUserAccess(IConfiguration configuration, IHostEnvironment environment)
    {
        passwordHash = configuration["Zentro:Authentication:PasswordHash"] ?? "";
        Enabled = !environment.IsDevelopment() || passwordHash.Length > 0;
        var secret = configuration["Zentro:Authentication:TotpSecret"] ?? "";
        totpKey = DecodeBase32(secret);
        var database = Path.GetFullPath(configuration["Zentro:DatabasePath"] ?? "Data/zentro.db", environment.ContentRootPath);
        counterPath = Path.Combine(Path.GetDirectoryName(database)!, "security", "totp-counter");
        Stamp = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash + ":" + secret)));
        if (Enabled && (!ValidHash(passwordHash) || totpKey.Length < 20))
        {
            throw new InvalidOperationException("Configura la contraseña y el segundo factor de Zentro antes de iniciar en producción.");
        }
    }

    public bool Verify(string password, string code)
    {
        if (!Enabled || password.Length is < 1 or > 1024 || code.Length != 6 || !code.All(char.IsAsciiDigit))
        {
            return false;
        }

        var parts = passwordHash.Split('$');
        var salt = Convert.FromBase64String(parts[2]);
        var expected = Convert.FromBase64String(parts[3]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, int.Parse(parts[1], CultureInfo.InvariantCulture), HashAlgorithmName.SHA256, 32);
        if (!CryptographicOperations.FixedTimeEquals(actual, expected))
        {
            return false;
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30;
        lock (gate)
        {
            var last = File.Exists(counterPath) ? long.Parse(File.ReadAllText(counterPath), CultureInfo.InvariantCulture) : -1;
            for (var step = now - 1; step <= now + 1; step++)
            {
                if (step <= last)
                {
                    continue;
                }

                var bytes = BitConverter.GetBytes(step);
                if (BitConverter.IsLittleEndian)
                {
                    Array.Reverse(bytes);
                }

                var digest = HMACSHA1.HashData(totpKey, bytes);
                var offset = digest[^1] & 15;
                var number = ((digest[offset] & 127) << 24 | digest[offset + 1] << 16 | digest[offset + 2] << 8 | digest[offset + 3]) % 1000000;
                var candidate = Encoding.ASCII.GetBytes(number.ToString("D6", CultureInfo.InvariantCulture));
                if (!CryptographicOperations.FixedTimeEquals(candidate, Encoding.ASCII.GetBytes(code)))
                {
                    continue;
                }

                Directory.CreateDirectory(Path.GetDirectoryName(counterPath)!);
                File.WriteAllText(counterPath + ".tmp", step.ToString(CultureInfo.InvariantCulture));
                File.Move(counterPath + ".tmp", counterPath, true);
                return true;
            }
        }
        return false;
    }

    private static bool ValidHash(string value)
    {
        try
        {
            var parts = value.Split('$');
            return parts.Length == 4 && parts[0] == "pbkdf2-sha256" &&
                int.TryParse(parts[1], out var iterations) && iterations is >= 600000 and <= 2000000 &&
                Convert.FromBase64String(parts[2]).Length >= 16 && Convert.FromBase64String(parts[3]).Length == 32;
        }
        catch (FormatException) { return false; }
    }

    private static byte[] DecodeBase32(string value)
    {
        var output = new List<byte>(); var buffer = 0; var bits = 0;
        foreach (var c in value.TrimEnd('=').ToUpperInvariant())
        {
            var digit = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".IndexOf(c);
            if (digit < 0)
            {
                return [];
            }

            buffer = (buffer << 5) | digit; bits += 5;
            if (bits < 8)
            {
                continue;
            }

            bits -= 8; output.Add((byte)(buffer >> bits));
        }
        return output.ToArray();
    }
}
