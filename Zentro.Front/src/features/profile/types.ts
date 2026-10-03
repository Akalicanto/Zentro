import type {
  Profile,
  CashRow,
  MonthRow,
  DebtItem,
  PossibleExpense,
  SavingsPlacement,
} from "../../domain/types.ts";
export type ProfileModal =
  | { type: "settings" }
  | { type: "placement"; item: SavingsPlacement }
  | { type: "cash"; kind: "expenses" | "incomes"; item?: CashRow }
  | { type: "month"; kind: "savings" | "investment"; item?: MonthRow }
  | { type: "possibleExpense"; item?: PossibleExpense }
  | { type: "editDebt" | "deleteDebt"; item: DebtItem }
  | { type: "schedule"; item: { month: string; amount: number } }
  | {
      type:
        | "balance"
        | "cashBalance"
        | "mortgageBalance"
        | "interestBalance"
        | "withdraw"
        | "repay"
        | "plan";
    };
export type Modal = ProfileModal | null;
export type OpenProfileForm = (modal: ProfileModal) => void;
export type SaveProfile = (profile: Profile) => boolean;
