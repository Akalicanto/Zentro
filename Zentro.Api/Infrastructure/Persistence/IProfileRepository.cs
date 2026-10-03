namespace Zentro.Api.Infrastructure.Persistence;

public interface IProfileRepository
{
    string? Read();
    void Write(string document);
    bool IsHealthy();
}
