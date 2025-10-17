export interface Transaction {
    id: number;
    bankAccountId: number;
    date: string;
    description: string;
    amount: number;
    category?: string;
    balanceAfter?: number;
}