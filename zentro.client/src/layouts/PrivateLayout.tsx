import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";

const PrivateLayout = () => {
    const drawerWidth = 200;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            <Navbar />

            <Box sx={{ display: "flex", flex: 1 }}>
                <Sidebar drawerWidth={drawerWidth} />

                <Box component="main" sx={{ flex: 1, p: 3, overflow: "auto" }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export default PrivateLayout;