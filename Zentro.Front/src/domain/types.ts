export type MonthRow = {
  month: string;
  goal: number | null;
  actual: number | null;
  repayment: number;
  withdrawal: number;
  approximation: number | null;
};
export type CashRow = {
  id: string;
  concept: string;
  amount: number;
  status: "planned" | "done";
  includedInOpening: boolean;
};
export type InterestRow = {
  id: string;
  date: string;
  concept: string;
  amount: number;
};
export type DebtItem = {
  id: string;
  date: string;
  concept: string;
  amount: number;
  source: "work" | "interest";
  historical: boolean;
};
export type DebtPayment = {
  id: string;
  date: string;
  amount: number;
  historical: boolean;
  allocations: { item: string; amount: number }[];
};
export type DebtInstallment = {
  month: string;
  amount: number;
  status: "paid" | "reserved" | "pending";
};
export type ExternalDebt = {
  id: string;
  name: string;
  total: number;
  installments: DebtInstallment[];
  createdOn?: string;
  completedOn?: string;
  archivedOn?: string;
  notes?: string;
  activity?: DebtActivity[];
};
export type DebtActivity = { id: string; date: string; description: string };
export type SavingsPlacement = {
  id: string;
  name: string;
  kind: "deposit" | "remunerated";
  amount: number | null;
  annualRateBps: number;
  rateType: "tin" | "tae";
  dayCount?: "monthly" | "actual360";
  withholdingBps: number;
  start: string | null;
  months: number | null;
};
export type Profile = {
  version: 2;
  cash?: number;
  mortgageOffer?: number;
  debts?: ExternalDebt[];
  savingsPlacements?: SavingsPlacement[];
  possibleExpenses?: { id: string; concept: string; amount: number }[];
  daily: {
    opening: number;
    asOf: string;
    expenses: CashRow[];
    incomes: CashRow[];
  };
  savings: MonthRow[];
  investment: MonthRow[];
  interest: { opening: number; asOf: string; entries: InterestRow[] };
  internalDebt: {
    items: DebtItem[];
    payments: DebtPayment[];
    schedule: { month: string; amount: number }[];
  };
  plan: {
    start: string;
    saving: number;
    investment: number;
    repayment: number;
    horizon: string;
    savingsTarget: number | null;
  };
  commitments: { id: string; name: string; amount: number | null }[];
};
export type PossibleExpense = NonNullable<Profile["possibleExpenses"]>[number];
export type ContributionKind = "savings" | "investment";
