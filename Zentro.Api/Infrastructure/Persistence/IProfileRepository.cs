using Zentro.Api.Models;

namespace Zentro.Api.Infrastructure.Persistence;

public interface IProfileRepository
{
    FinancialProfile? Read();
    void Write(FinancialProfile profile);
    bool IsHealthy();
}
