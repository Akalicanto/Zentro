import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper, Link } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { createOrUpdate } from "../../services/userService";
import { User } from "../../types/userTypes";
import { useTranslation } from "react-i18next";
import { useLoading } from "../../context/LoadingContext";

const Register = () => {
    const { t } = useTranslation();
    const { setLoading } = useLoading();

    const [formData, setFormData] = useState<Omit<User, "id">>({
        name: "",
        surname: "",
        email: "",
        password: "",
        birthDate: ""
    });

    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const navigate = useNavigate();

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name) newErrors.name = t("messages.required_name");
        if (!formData.surname) newErrors.surname = t("messages.required_surname");
        if (!formData.email.includes("@")) newErrors.email = t("messages.invalid_email");
        if (formData.password.length < 6) newErrors.password = t("messages.min_password");
        if (formData.password !== confirmPassword) newErrors.confirmPassword = t("messages.password_mismatch");
        if (!formData.birthDate) newErrors.birthDate = t("messages.required_birthDate");

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);

            const response: boolean = await createOrUpdate(formData);

            navigate("/login");
        } catch (error) {
            console.error(t("messages.register_error"), error);
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
            <Paper sx={{ p: 5, width: 400, borderRadius: 2, boxShadow: 3 }}>
                <Typography variant="h4" align="center" gutterBottom>
                    Zentro
                </Typography>
                <Typography variant="h6" align="center" gutterBottom>
                    {t("fields.create_account")}
                </Typography>

                <form onSubmit={handleSubmit}>
                    <TextField
                        label={t("fields.name")}
                        variant="outlined"
                        fullWidth
                        sx={{ mb: 2 }}
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name}
                    />
                    <TextField
                        label={t("fields.surname")}
                        variant="outlined"
                        fullWidth
                        sx={{ mb: 2 }}
                        value={formData.surname}
                        onChange={(e) => handleChange("surname", e.target.value)}
                        error={!!errors.surname}
                        helperText={errors.surname}
                    />
                    <TextField
                        label={t("fields.email")}
                        variant="outlined"
                        fullWidth
                        sx={{ mb: 2 }}
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        error={!!errors.email}
                        helperText={errors.email}
                    />
                    <TextField
                        label={t("fields.birthDate")}
                        type="date"
                        variant="outlined"
                        fullWidth
                        sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={formData.birthDate}
                        onChange={(e) => handleChange("birthDate", e.target.value)}
                        error={!!errors.birthDate}
                        helperText={errors.birthDate}
                    />
                    <TextField
                        label={t("fields.password")}
                        type="password"
                        variant="outlined"
                        fullWidth
                        sx={{ mb: 2 }}
                        value={formData.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        error={!!errors.password}
                        helperText={errors.password}
                    />
                    <TextField
                        label={t("fields.confirm_password")}
                        type="password"
                        variant="outlined"
                        fullWidth
                        sx={{ mb: 3 }}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                    />
                    <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mb: 2 }}>
                        {t("fields.register_in")}
                    </Button>
                </form>

                <Typography align="center">
                    {t("messages.already_account")}{" "}
                    <Link component={RouterLink} to="/login">
                        {t("fields.login")}
                    </Link>
                </Typography>
            </Paper>
        </Box>
    );
};

export default Register;