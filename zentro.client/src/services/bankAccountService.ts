import axios from "axios";
import { BankAccount } from "../types/bankAccountTypes";
import { API_BASE_URL } from "./apiConfig";

export const getAll = async (): Promise<BankAccount[]> => {
    try {
        const response = await axios.get<BankAccount[]>(`${API_BASE_URL}/bankAccounts/all`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || error.message;
    }
};

export const get = async (bankAccountId: number): Promise<BankAccount> => {
    try {
        const response = await axios.get<BankAccount>(`${API_BASE_URL}/bankAccounts/${bankAccountId}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || error.message;
    }
};

export const createOrUpdate = async (data: BankAccount): Promise<BankAccount> => {
    try {
        const response = await axios.post<BankAccount>(`${API_BASE_URL}/bankAccounts`, data);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || error.message;
    }
};