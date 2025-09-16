import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const MyProfile = () => {
    const { t } = useTranslation();
    
     return (
        <>
            <Typography variant="h4" gutterBottom>
                MI PERFIL
            </Typography>
        </>
    );
};

export default MyProfile;