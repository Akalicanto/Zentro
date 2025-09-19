import { Typography, Card, CardContent, Box, CardActionArea } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import MenuBar from "../../../components/layout/menubar";

const MyAccounts = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Datos simulados
    const accounts = [
        { id: 1, bank: "Banco Santander", iban: "ES12 3456 7890 1234 5678 9012", balance: "3.500 €" },
        { id: 2, bank: "BBVA", iban: "ES98 7654 3210 9876 5432 1098", balance: "7.200 €" },
        { id: 3, bank: "CaixaBank", iban: "ES56 1111 2222 3333 4444 5555", balance: "1.150 €" },
        { id: 4, bank: "ING", iban: "ES22 4444 5555 6666 7777 8888", balance: "9.820 €" },
    ];

    const handleCardClick = (id: number) => {
        navigate(`/my-accounts/${id}`);
    };

    return (
        <>
            <Typography variant="h4" gutterBottom>
                {t("titles.my-accounts")}
            </Typography>

            <MenuBar newRoute="/my-accounts/new" />

            <Box display="flex" flexWrap="wrap" gap={2}>
                {accounts.map((acc) => (
                    <Box
                        key={acc.id}
                        flex="1 1 calc(25% - 16px)"
                        minWidth="220px"
                    >
                        <CardActionArea
                            onClick={() => handleCardClick(acc.id)}
                            sx={{
                                borderRadius: 2,
                                display: 'block',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-5px)',
                                    boxShadow: 6,
                                },
                            }}
                        >
                            <Card>
                                <CardContent>
                                    <Typography variant="h6">{acc.bank}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {acc.iban}
                                    </Typography>
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {acc.balance}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </CardActionArea>
                    </Box>
                ))}
            </Box>
        </>
    );
};

export default MyAccounts;