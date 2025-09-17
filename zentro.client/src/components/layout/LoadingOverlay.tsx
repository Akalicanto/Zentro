import { Backdrop, CircularProgress, Typography, Box } from "@mui/material";
import { useLoading } from "../../context/LoadingContext";
import { useTranslation } from "react-i18next";

const LoadingOverlay = () => {
    const { isLoading } = useLoading();
    const { t } = useTranslation();
    return (
        <Backdrop
            sx={{
                color: "#fff",
                zIndex: (theme) => theme.zIndex.modal + 1,
                display: "flex",
                flexDirection: "column"
            }}
            open={isLoading}
        >
            <CircularProgress color="inherit" />
            <Box mt={2}>
                <Typography variant="h6">{t('messages.loading')}</Typography>
            </Box>
        </Backdrop>
    );
};

export default LoadingOverlay;
