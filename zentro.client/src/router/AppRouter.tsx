import { Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./PrivateRoute";
import { PublicRoute } from "./PublicRoute";
import PrivateLayout from "../layouts/PrivateLayout";

// Páginas públicas
import Login from "../pages/public/Login";
import Register from "../pages/public/Register";

// Páginas privadas
import Home from "../pages/private/Home";
import MyProfile from "../pages/private/Profile/MyProfile";
import MyAccounts from "../pages/private/Account/MyAccounts";

const AppRouter = () => {
    return (
        <Routes>
            {/* Públicas */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            {/* Privadas */}
            <Route path="/" element={<PrivateRoute><PrivateLayout /></PrivateRoute>}>
                <Route path="home" element={<Home />} />
                <Route path="my-profile" element={<MyProfile />} />
                <Route path="my-accounts" element={<MyAccounts />} />
            </Route>

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
    );
};

export default AppRouter;