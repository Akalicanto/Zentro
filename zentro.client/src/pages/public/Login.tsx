import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper, Link } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import { UserLoginRequest } from "../../types/userTypes";
import { useTranslation } from "react-i18next";
import { useLoading } from "../../context/LoadingContext";

const Login = () => {
    const { t } = useTranslation();
    const { setLoading } = useLoading();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const { login } = useAuth();
    const { showMessage } = useSnackbar();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);

            const data: UserLoginRequest = { email, password };
            await login(data);

            showMessage(t("messages.logged"), "success");
            navigate("/");
        } catch (err: any) {
            showMessage(err?.response?.data || t("messages.logged_error"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                bgcolor: "background.default",
            }}
        >
            <Paper sx={{ p: 5, width: 360, borderRadius: 2, boxShadow: 3 }}>
                <Typography variant="h4" align="center" gutterBottom>
                    Zentro
                </Typography>
                <Typography variant="h6" align="center" gutterBottom>
                    {t("fields.login")}
                </Typography>

                <form onSubmit={handleSubmit}>
                    <TextField
                        label={t("fields.email")}
                        variant="outlined"
                        fullWidth
                        sx={{ mb: 2 }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        label={t("fields.password")}
                        type="password"
                        variant="outlined"
                        fullWidth
                        sx={{ mb: 3 }}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mb: 2 }}>
                        {t("fields.enter")}
                    </Button>
                </form>

                <Typography align="center">
                    {t("messages.ask_account")}{" "}
                    <Link component={RouterLink} to="/register">
                        {t("fields.register")}
                    </Link>
                </Typography>
            </Paper>
        </Box>
    );
};

export default Login;