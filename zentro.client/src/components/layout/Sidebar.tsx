import { Box, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next";

interface SidebarProps {
    drawerWidth: number;
}

const Sidebar = ({ drawerWidth }: SidebarProps) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const { t } = useTranslation();

    const menuItems = [
        { text: t('titles.home'), path: "/home" },
        { text: t('titles.my-profile'), path: "/my-profile" },
        { text: t('titles.my-accounts'), path: "/my-accounts" }
    ];

    return (
        <Box
            sx={{
                width: drawerWidth,
                bgcolor: "background.paper",
                borderRight: "1px solid #ddd",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={Link}
                            to={item.path}
                            sx={{
                                "&:hover": {
                                    bgcolor: "secondary.main",
                                    color: "secondary.contrastText",
                                },
                            }}
                        >
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {/* Logout al final */}
            <List sx={{ mt: "auto" }}>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            color: "error.main",
                            "&:hover": {
                                bgcolor: "error.light",
                                color: "white",
                            },
                        }}
                    >
                        <ListItemText primary="Cerrar sesión" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );
};

export default Sidebar;