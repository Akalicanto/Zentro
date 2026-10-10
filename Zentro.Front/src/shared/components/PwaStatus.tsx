import { Button } from "../ui/index.tsx";
import { useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff } from "lucide-react";
import { registerSW } from "virtual:pwa-register";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export default function PwaStatus() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => setInstall(null);
    const connection = () => setOnline(navigator.onLine);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    if (import.meta.env.PROD) {
      const updateSW = registerSW({
        onNeedRefresh: () => setUpdate(() => () => updateSW(true)),
        onRegisterError: () => {
          /* La app sigue funcionando si el navegador no permite instalarla. */
        },
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);
  return (
    <>
      {!online && (
        <span className="connection-status" role="status">
          <WifiOff size={16} /> Sin conexión
        </span>
      )}
      {install && (
        <Button
          className="pwa-action"
          aria-label="Instalar Zentro"
          onClick={async () => {
            await install.prompt();
            await install.userChoice;
            setInstall(null);
          }}
        >
          <Download size={16} />
          <span>Instalar Zentro</span>
        </Button>
      )}
      {update && (
        <Button
          className="pwa-action"
          aria-label="Actualizar app"
          onClick={() => void update()}
        >
          <RefreshCw size={16} />
          <span>Actualizar app</span>
        </Button>
      )}
    </>
  );
}
