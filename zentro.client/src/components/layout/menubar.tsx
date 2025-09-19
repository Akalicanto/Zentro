import { Box, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ExtraButton {
    text: string;
    onClick: () => void;
    color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
}

interface MenuBarProps {
    newRoute: string;
    extraButtons?: ExtraButton[];
}

const MenuBar = ({ newRoute, extraButtons = [] }: MenuBarProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Box mb={2}>
            <Stack direction="row" spacing={2}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate(newRoute)}
                >
                    {t("buttons.new")}
                </Button>

                {extraButtons.map((btn, idx) => (
                    <Button
                        key={idx}
                        variant="outlined"
                        color={btn.color || "primary"}
                        onClick={btn.onClick}
                    >
                        {btn.text}
                    </Button>
                ))}
            </Stack>
        </Box>
    );
};

export default MenuBar;