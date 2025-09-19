import { AppBar, Toolbar, Typography, IconButton, Box, Menu, MenuItem, ListItemIcon } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CustomThemeContext } from "../../context/ThemeContext";
import { useContext, useState } from "react";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import esFlag from "../../assets/flags/es.png";
import enFlag from "../../assets/flags/en.png";
import deFlag from "../../assets/flags/de.png";

const Navbar = () => {
    const { i18n, t } = useTranslation();
    const theme = useTheme();
    const themeContext = useContext(CustomThemeContext);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    const handleLanguageChange = (lng: string) => {
        i18n.changeLanguage(lng);
        handleMenuClose();
    };

    const languages = [
        { code: "es", label: t("languages.spanish"), flag: esFlag },
        { code: "en", label: t("languages.english"), flag: enFlag },
        { code: "de", label: t("languages.german"), flag: deFlag },
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

    return (
        <AppBar position="static">
            <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography
                    variant="h6"
                    component={Link}
                    to="/home"
                    sx={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
                >
                    Zentro
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {/* Botón que muestra la bandera del idioma actual */}
                    <IconButton onClick={handleMenuOpen} color="inherit">
                        <img src={currentLanguage.flag} alt={currentLanguage.code} style={{ width: 24 }} />
                    </IconButton>

                    {/* Menú de idiomas */}
                    <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                        {languages.map(lang => (
                            <MenuItem key={lang.code} onClick={() => handleLanguageChange(lang.code)}>
                                <ListItemIcon>
                                    <img src={lang.flag} alt={lang.code} style={{ width: 24 }} />
                                </ListItemIcon>
                                {lang.label}
                            </MenuItem>
                        ))}
                    </Menu>

                    {/* Toggle de tema */}
                    <IconButton onClick={themeContext?.toggleTheme} color="inherit">
                        {theme.palette.mode === "dark" ? <Brightness7 /> : <Brightness4 />}
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;