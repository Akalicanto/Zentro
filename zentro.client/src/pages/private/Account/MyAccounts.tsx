import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const MyAccounts = () => {
    const { t } = useTranslation();
    
     return (
        <>
            <Typography variant="h4" gutterBottom>
                MIS CUENTAS
            </Typography>
        </>
    );
};

export default MyAccounts;