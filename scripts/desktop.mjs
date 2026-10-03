import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const local = path.join(process.env.LOCALAPPDATA || tmpdir(), "Zentro");
const profile = path.join(local, "firefox");
const children = [];
let stopping = false;
let log;

function cleanup() {
  for (const child of [...children].reverse()) {
    if (child.exitCode !== null || !child.pid) continue;
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  }
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  cleanup();
  if (log !== undefined) closeSync(log);
  process.exit(code);
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
process.on("exit", () => {
  if (!stopping) cleanup();
});

async function ensureFree(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () =>
      reject(
        Error(
          `Zentro ya está abierto o el puerto ${port} está ocupado. Cierra el arranque anterior antes de usar el acceso directo.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}

function start(command, args, visible = false) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ["ignore", log, log],
    windowsHide: !visible,
  });
  children.push(child);
  child.on("error", (error) => {
    writeFileSync(path.join(local, "desktop-error.txt"), error.message);
    stop(1);
  });
  return child;
}

async function ready(url, runner) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (runner.exitCode !== null)
      throw Error("No se pudo arrancar Zentro. Consulta desktop.log.");
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw Error("Zentro no respondió durante el arranque. Consulta desktop.log.");
}

try {
  if (process.platform !== "win32")
    throw Error("El acceso directo está preparado para Windows.");
  mkdirSync(local, { recursive: true });
  rmSync(path.join(local, "desktop-error.txt"), { force: true });
  const firefox = [
    process.env.ZENTRO_FIREFOX_PATH,
    path.join(
      process.env.ProgramFiles || "C:/Program Files",
      "Mozilla Firefox/firefox.exe",
    ),
    path.join(
      process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)",
      "Mozilla Firefox/firefox.exe",
    ),
    path.join(process.env.LOCALAPPDATA || "", "Mozilla Firefox/firefox.exe"),
  ].find((file) => file && existsSync(file));
  if (!firefox)
    throw Error(
      "Instala Firefox o configura ZENTRO_FIREFOX_PATH para usar este acceso directo.",
    );
  await Promise.all([ensureFree(5080), ensureFree(5187)]);
  log = openSync(path.join(local, "desktop.log"), "w");
  mkdirSync(profile, { recursive: true });
  writeFileSync(
    path.join(profile, "user.js"),
    [
      'user_pref("browser.shell.checkDefaultBrowser", false);',
      'user_pref("browser.aboutwelcome.enabled", false);',
      'user_pref("browser.startup.homepage_override.mstone", "ignore");',
      'user_pref("browser.startup.page", 0);',
      'user_pref("browser.sessionstore.resume_from_crash", false);',
      'user_pref("browser.tabs.warnOnClose", false);',
      'user_pref("browser.warnOnQuitShortcut", false);',
    ].join("\n") + "\n",
  );

  const runner = start(process.execPath, ["scripts/dev.mjs", "--no-browser"]);
  runner.on("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
  await Promise.all([
    ready("http://127.0.0.1:5080/api/health", runner),
    ready("http://127.0.0.1:5187", runner),
  ]);

  // On Windows the Firefox launcher otherwise exits before its browser window.
  // https://wiki.mozilla.org/Platform/Integration/InjectEject/Launcher_Process/
  const browser = start(
    firefox,
    [
      "--wait-for-browser",
      "--no-remote",
      "--profile",
      profile,
      "--new-window",
      "http://127.0.0.1:5187",
    ],
    true,
  );
  browser.on("exit", (code) => stop(code || 0));
} catch (error) {
  mkdirSync(local, { recursive: true });
  writeFileSync(path.join(local, "desktop-error.txt"), error.message);
  stop(1);
}
