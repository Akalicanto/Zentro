namespace Zentro.Api.Infrastructure.Persistence;

internal sealed record ProfileCollection(
    string Table,
    string Parent,
    string Property,
    string Key = "id",
    string? Period = null,
    string? Amount = null);
internal static class ProfileCollections
{
    // Only these fixed table names enter SQL. Collection order is persisted explicitly.
    public static readonly ProfileCollection[] All =
    [
        new("savings_months", "", "savings", "month", "month", "actual"),
        new("investment_months", "", "investment", "month", "month", "actual"),
        new("daily_expenses", "daily", "expenses", Period: "month", Amount: "amount"),
        new("daily_incomes", "daily", "incomes", Period: "month", Amount: "amount"),
        new("interest_entries", "interest", "entries", Period: "date", Amount: "amount"),
        new("internal_debt_items", "internalDebt", "items", Period: "date", Amount: "amount"),
        new("internal_debt_payments", "internalDebt", "payments", Period: "date", Amount: "amount"),
        new("internal_debt_schedule", "internalDebt", "schedule", "month", "month", "amount"),
        new("commitments", "", "commitments", Amount: "amount"),
        new("possible_expenses", "", "possibleExpenses", Amount: "amount"),
        new("external_debts", "", "debts"),
        new("savings_placements", "", "savingsPlacements", Amount: "amount")
    ];
}
