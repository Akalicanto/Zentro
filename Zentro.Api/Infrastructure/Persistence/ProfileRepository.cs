using Zentro.Api.Models;
using Zentro.Api.Infrastructure.Persistence.Stores;

namespace Zentro.Api.Infrastructure.Persistence;

/// <summary>Persiste el perfil en tablas relacionales. Una transacción evita estados parciales.</summary>
public sealed class ProfileRepository(SqliteConnectionFactory connections) : IProfileRepository
{
    public FinancialProfile? Read()
    {
        using var connection = connections.Open();
        using var transaction = connection.BeginTransaction(deferred: true);
        var profile = ReadSnapshot(new SqliteSession(connection, transaction));
        transaction.Commit();
        return profile;
    }

    public void Write(FinancialProfile profile)
    {
        using var connection = connections.Open();
        using var transaction = connection.BeginTransaction();
        WriteSnapshot(new SqliteSession(connection, transaction), profile);
        transaction.Commit();
    }

    public bool IsHealthy()
    {
        using var connection = connections.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1";
        return Convert.ToInt32(command.ExecuteScalar()) == 1;
    }

    internal static FinancialProfile? ReadSnapshot(SqliteSession session)
    {
        var settings = ProfileSettingsStore.Read(session);
        if (settings is null)
        {
            return null;
        }
        var payments = RepaymentStore.Read(session).Select(payment => payment with
        {
            Allocations = AllocationStore.Read(session, payment.Id)
        }).ToList();
        var debts = ExternalDebtStore.Read(session).Select(debt => debt with
        {
            Installments = InstallmentStore.Read(session, debt.Id)
        }).ToList();
        return settings with
        {
            Daily = settings.Daily with
            {
                Expenses = DailyMovementStore.Read(session, "gasto"),
                Incomes = DailyMovementStore.Read(session, "ingreso")
            },
            Interest = settings.Interest with { Entries = InterestEntryStore.Read(session) },
            Savings = SavingsMonthStore.Read(session),
            Investment = InvestmentMonthStore.Read(session),
            InternalDebt = new InternalDebt
            {
                Items = WithdrawalStore.Read(session),
                Payments = payments,
                Schedule = RepaymentScheduleStore.Read(session)
            },
            Debts = debts,
            SavingsPlacements = SavingsPlacementStore.Read(session),
            PossibleExpenses = PossibleExpenseStore.Read(session),
            Commitments = CommitmentStore.Read(session)
        };
    }

    internal static void WriteSnapshot(SqliteSession session, FinancialProfile profile)
    {
        // El contrato actual envía el perfil completo. La sustitución y todas sus relaciones son atómicas.
        session.Execute("DELETE FROM perfil WHERE id=1");
        ProfileSettingsStore.Write(session, profile);
        DailyMovementStore.Write(session, profile.Daily.Expenses, "gasto");
        DailyMovementStore.Write(session, profile.Daily.Incomes, "ingreso");
        SavingsMonthStore.Write(session, profile.Savings);
        InvestmentMonthStore.Write(session, profile.Investment);
        WithdrawalStore.Write(session, profile.InternalDebt.Items);
        RepaymentStore.Write(session, profile.InternalDebt.Payments);
        foreach (var payment in profile.InternalDebt.Payments)
        {
            AllocationStore.Write(session, payment.Allocations, payment.Id);
        }
        RepaymentScheduleStore.Write(session, profile.InternalDebt.Schedule);
        InterestEntryStore.Write(session, profile.Interest.Entries);
        ExternalDebtStore.Write(session, profile.Debts ?? []);
        foreach (var debt in profile.Debts ?? [])
        {
            InstallmentStore.Write(session, debt.Installments, debt.Id);
        }
        SavingsPlacementStore.Write(session, profile.SavingsPlacements ?? []);
        PossibleExpenseStore.Write(session, profile.PossibleExpenses ?? []);
        CommitmentStore.Write(session, profile.Commitments);
    }
}
