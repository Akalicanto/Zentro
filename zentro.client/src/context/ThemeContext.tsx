import { createContext, useState, useMemo, useEffect } from "react";
import { ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getTheme } from "../theme";

interface ThemeContextType {
    toggleTheme: () => void;
}

export const CustomThemeContext = createContext<ThemeContextType | null>(null);

export const CustomThemeProvider = ({ children }: { children: ReactNode }) => {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const storedMode = localStorage.getItem("themeMode") as "light" | "dark" | null;

    const [mode, setMode] = useState<"light" | "dark">(
        storedMode || (prefersDarkMode ? "dark" : "light")
    );

    const toggleTheme = () => {
        const newMode = mode === "light" ? "dark" : "light";
        setMode(newMode);
        localStorage.setItem("themeMode", newMode);
    };

    useEffect(() => {
        localStorage.setItem("themeMode", mode);
    }, [mode]);

    const theme = useMemo(() => getTheme(mode), [mode]);

    return (
        <CustomThemeContext.Provider value={{ toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </CustomThemeContext.Provider>
    );
};