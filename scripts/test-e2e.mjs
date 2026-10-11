import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const front = path.join(root, "Zentro.Front");
const origin = "http://127.0.0.1:5187";
let vite;

async function frontIsReady() {
  try {
    const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
    return response.ok && (await response.text()).includes("Zentro");
  } catch {
    return false;
  }
}

async function run(file) {
  const child = spawn(process.execPath, [file], {
    cwd: front,
    stdio: "inherit",
    windowsHide: true,
  });
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`${file}: ${code}`)),
    );
  });
}

try {
  if (!(await frontIsReady())) {
    vite = spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "--host",
        "127.0.0.1",
        "--port",
        "5187",
        "--strictPort",
      ],
      {
        cwd: front,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    for (let attempt = 0; !(await frontIsReady()); attempt++) {
      if (attempt >= 100 || vite.exitCode !== null)
        throw Error("El front de pruebas no arrancó.");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  // Each suite redirects API calls to synthetic data and an independent database.
  const selected = process.argv.slice(2);
  const suites = selected.length
    ? selected
    : [
        "tests/e2e/profile.test.mjs",
        "tests/e2e/internalDebt.test.mjs",
        "tests/e2e/debtDueDates.test.mjs",
        "tests/e2e/pageHeadings.test.mjs",
        "tests/e2e/android.test.mjs",
      ];
  for (const suite of suites) await run(suite);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (vite && vite.exitCode === null) {
    const exited = new Promise((resolve) => vite.once("exit", resolve));
    if (process.platform === "win32")
      spawnSync("taskkill", ["/PID", String(vite.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else vite.kill("SIGTERM");
    await exited;
  }
}
