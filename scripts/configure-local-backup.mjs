import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { localDirectory } from "./monthly-backup.mjs";

if (process.platform !== "win32")
  throw Error("Este configurador protege la credencial con Windows DPAPI.");
const configPath = path.join(localDirectory, "config.json");
const previous = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf8"))
  : {};
let hidden = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!hidden) process.stdout.write(chunk, encoding);
    callback();
  },
});
const terminal = createInterface({
  input: process.stdin,
  output,
  terminal: true,
});
try {
  console.log("Zentro · Copia mensual por correo\n");
  const recipient =
    (
      await terminal.question(`Destinatario [${previous.recipient || ""}]: `)
    ).trim() || previous.recipient;
  const smtpUser =
    (
      await terminal.question(
        `Gmail remitente [${previous.smtpUser || recipient}]: `,
      )
    ).trim() ||
    previous.smtpUser ||
    recipient;
  if (
    ![recipient, smtpUser].every(
      (value) =>
        typeof value === "string" &&
        /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value),
    )
  )
    throw Error("Direccion de correo invalida.");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const database =
    previous.database ||
    path.resolve(
      root,
      "Zentro.Api",
      process.env.Zentro__DatabasePath || "Data/zentro.db",
    );
  if (!existsSync(database))
    throw Error("No existe la base de datos configurada.");
  console.log(
    "Usa una contrasena de aplicacion de Google. No la pegues en el chat.",
  );
  console.log(
    "El adjunto contiene tus datos financieros comprimidos, sin contrasena.",
  );
  process.stdout.write("Contrasena de aplicacion (entrada oculta): ");
  hidden = true;
  let password = await terminal.question("");
  hidden = false;
  console.log("\nComprobando conexion y autenticacion con Gmail...");
  // Google displays app passwords grouped with spaces.
  password = password.replace(/\s/g, "");
  if (!password) throw Error("La credencial esta vacia.");
  const config = {
    enabled: true,
    recipient,
    database,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpUser,
    credentialFile: path.join(localDirectory, "smtp.credential.xml"),
  };
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: password },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: { minVersion: "TLSv1.2" },
  });
  try {
    await transport.verify();
  } finally {
    transport.close();
  }
  mkdirSync(localDirectory, { recursive: true });
  // Only the Windows credential-storage cmdlets run in PowerShell. Secrets enter
  // through stdin, never through command-line arguments, logs, or environment.
  const command = `$ErrorActionPreference='Stop'; [Console]::InputEncoding=[Text.Encoding]::UTF8; $data=[Console]::In.ReadToEnd() | ConvertFrom-Json; $identity=[Security.Principal.WindowsIdentity]::GetCurrent(); $acl=[Security.AccessControl.DirectorySecurity]::new(); $acl.SetOwner($identity.User); $acl.SetAccessRuleProtection($true,$false); foreach($sid in @($identity.User,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))}; Set-Acl -LiteralPath $env:ZENTRO_MAIL_DIRECTORY -AclObject $acl; $secure=ConvertTo-SecureString -String $data.password -AsPlainText -Force; [Management.Automation.PSCredential]::new($data.user,$secure) | Export-Clixml -LiteralPath $env:ZENTRO_MAIL_CREDENTIAL`;
  await new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      {
        windowsHide: true,
        stdio: ["pipe", "ignore", "ignore"],
        env: {
          ...process.env,
          ZENTRO_MAIL_DIRECTORY: localDirectory,
          ZENTRO_MAIL_CREDENTIAL: config.credentialFile,
        },
      },
    );
    child.on("error", reject);
    child.stdin.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(Error("No se pudo proteger la credencial con Windows.")),
    );
    child.stdin.end(JSON.stringify({ user: smtpUser, password }));
  });
  password = "";
  writeFileSync(configPath + ".tmp", JSON.stringify(config, null, 2));
  renameSync(configPath + ".tmp", configPath);
  console.log(
    "Configurado. Gmail ha validado la credencial. No se ha enviado ningun correo.",
  );
  console.log(
    "Despues del dia 15, Zentro pedira confirmacion para la copia mensual. Si no confirmas, recordara pasadas 24 horas.",
  );
} catch (error) {
  hidden = false;
  console.error(
    "\nNo se ha activado el envio. " +
      (error.code
        ? "Codigo: " +
          error.code +
          ". Revisa la contrasena de aplicacion y la conexion."
        : error.message),
  );
  process.exitCode = 1;
} finally {
  terminal.close();
}
