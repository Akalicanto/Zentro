import { createContext, useContext, useState, useMemo } from "react";
import { ReactNode } from "react";
import { UserLoginRequest, UserTokenResponse } from "../types/userTypes";
import { login as loginService } from "../services/userService";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
    name: string;
    surname: string;
    email: string;
}

interface AuthContextType {
    token: string | null;
    currentUser : DecodedToken | null;
    isAuthenticated: boolean;
    login: (data: UserLoginRequest) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem("jwtToken");
    });

    const isAuthenticated = !!token;

    const currentUser = useMemo(() => {
        if (!token) return null;
        try {
            return jwtDecode<DecodedToken>(token);
        } catch {
            return null;
        }
    }, [token]);

    const login = async (data: UserLoginRequest) => {
        const result: UserTokenResponse = await loginService(data);
        setToken(result.token);
        localStorage.setItem("jwtToken", result.token);
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem("jwtToken");
    };

    return (
        <AuthContext.Provider value={{ token, currentUser, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};