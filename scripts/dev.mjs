import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const windows = process.platform === "win32";
const installedDotnet = path.join(process.env.ProgramFiles || "C:/Program Files", "dotnet/dotnet.exe");
const dotnet = windows && existsSync(installedDotnet) ? installedDotnet : "dotnet";
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (windows) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  process.exit(code);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
process.on("exit", () => {
  for (const child of children) {
    if (child.exitCode === null && child.pid && windows)
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  }
});

async function freePort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`El puerto ${port} está ocupado. Detén el arranque anterior antes de iniciar Zentro.`)));
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}
function start(command, args, cwd) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.VSCODE_INSPECTOR_OPTIONS;
  const child = spawn(command, args, { cwd, stdio: "inherit", env, windowsHide: true });
  children.push(child);
  child.on("error", (error) => { console.error(error.message); stop(1); });
  child.on("exit", (code) => { if (!stopping) stop(code || 1); });
}
async function ready(url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No se pudo arrancar ${url}. Revisa los errores de la terminal.`);
}
function openBrowser(url) {
  const command = windows ? "rundll32.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = windows ? ["url.dll,FileProtocolHandler", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", () => console.log(`Abre en el navegador: ${url}`));
  child.unref();
}
try {
  if (!existsSync(path.join(root, "Zentro.Front/node_modules/vite/bin/vite.js")))
    throw new Error("Faltan dependencias. Ejecuta npm.cmd run setup.");
  await freePort(5080);
  await freePort(5187);
  start(dotnet, ["watch", "--project", "Zentro.Api", "--non-interactive", "run", "--launch-profile", "http"], root);
  start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5187", "--strictPort"], path.join(root, "Zentro.Front"));
  await Promise.all([ready("http://127.0.0.1:5080/api/health"), ready("http://127.0.0.1:5187")]);
  console.log("\nZentro listo. Front: http://127.0.0.1:5187 | Swagger: http://127.0.0.1:5080/swagger\nDetener ambos: Ctrl+C o Stop en VS Code.\n");
  if (!process.argv.includes("--no-browser")) {
    openBrowser("http://127.0.0.1:5080/swagger");
    openBrowser("http://127.0.0.1:5187");
  }
} catch (error) { console.error(error.message); stop(1); }
