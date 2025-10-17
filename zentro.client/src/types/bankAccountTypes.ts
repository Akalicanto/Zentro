import { Transaction } from "./TransactionTypes";
import { AccountType } from "./enums"

export interface BankAccount {
    id?: number;
    userId: number;
    bank: string;
    type: AccountType;
    balance: number;
    InterestRate?: number;
    Transactions: Transaction[];
}