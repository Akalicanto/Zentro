import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const drawerWidth = 200;

const Home = () => {
    const { t } = useTranslation();
    
    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            {/* Navbar arriba */}
            <Navbar />

            {/* Contenido debajo del Navbar */}
            <Box sx={{ display: "flex", flex: 1 }}>
                {/* Sidebar a la izquierda, debajo del Navbar */}
                <Sidebar drawerWidth={drawerWidth} />

                {/* Main content */}
                <Box component="main" sx={{ flex: 1, p: 3 }}>
                    <Typography variant="h4" gutterBottom>
                        {t('titles.welcome')}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default Home;