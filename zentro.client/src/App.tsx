import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SnackbarProvider } from "./context/SnackbarContext";
import { LoadingProvider } from "./context/LoadingContext";
import LoadingOverlay from "./components/layout/LoadingOverlay";
import AppRouter from "./router/AppRouter";

function App() {
    return (
        <SnackbarProvider>
            <AuthProvider>
                <LoadingProvider>
                    <BrowserRouter>
                        <AppRouter />
                        <LoadingOverlay />
                    </BrowserRouter>
                </LoadingProvider>
            </AuthProvider>
        </SnackbarProvider>
    );
}

export default App;