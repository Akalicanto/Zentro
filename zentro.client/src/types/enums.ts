export const AccountType = {
    Checking: "CHECKING",
    Savings: "SAVINGS",
    Business: "BUSINESS",
    Investment: "INVESTMENT"
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];