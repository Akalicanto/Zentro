import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";

const MyProfile = () => {
    const { t } = useTranslation();
    const { currentUser } = useAuth();

    return (
        <>
            <Typography variant="body1">
                <strong>Nombre:</strong> {currentUser?.name}
            </Typography>
            <Typography variant="body1">
                <strong>Apellido:</strong> {currentUser?.surname}
            </Typography>
            <Typography variant="body1">
                <strong>Email:</strong> {currentUser?.email}
            </Typography>
        </>
    );
};

export default MyProfile;