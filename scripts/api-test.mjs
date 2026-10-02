import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testProfile } from "../Zentro.Front/tests/profile.ts";
import { DatabaseSync } from "node:sqlite";
import { withdrawSavings, repayDebt, today } from "../Zentro.Front/src/model.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const folder = mkdtempSync(path.join(os.tmpdir(), "zentro-api-test-"));
const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const base = `http://127.0.0.1:${port}`;
const dotnet = process.platform === "win32" ? path.join(process.env.ProgramFiles || "C:/Program Files", "dotnet/dotnet.exe") : "dotnet";
let child;
let output = "";
async function start() {
  child = spawn(dotnet, [path.join(root, "Zentro.Api/bin/Debug/net10.0/Zentro.Api.dll")], {
    cwd: path.join(root, "Zentro.Api"), windowsHide: true,
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Development", ASPNETCORE_URLS: base, Zentro__DatabasePath: path.join(folder, "test.db") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  child.on("error", (error) => { output += error.message; });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`La API no arrancó: ${output}`);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else child.kill("SIGTERM");
  await exited;
}
async function put(data) {
  return fetch(`${base}/api/state`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}
try {
  await start();
  assert.equal((await fetch(`${base}/api/state`)).status, 204);
  assert.equal((await fetch(`${base}/swagger/index.html`)).status, 200);
  const specification = await (await fetch(`${base}/swagger/v1/swagger.json`)).json();
  assert.ok(specification.paths["/api/state"].put);
  const state = testProfile();
  state.cash = 1700;
  state.mortgageOffer = 9000000;
  state.savingsPlacements = [
    {id:"deposit-test",name:"Depósito de prueba",kind:"deposit",amount:40000,annualRateBps:400,rateType:"tin",withholdingBps:1900,start:"2026-01-31",months:12},
    {id:"account-test",name:"Cuenta de prueba",kind:"remunerated",amount:null,annualRateBps:200,rateType:"tin",dayCount:"actual360",withholdingBps:1900,start:null,months:null}
  ];
  state.debts = [{ id: "external-test", name: "Dentista", total: 25000, installments: [
    { month: "2026-01", amount: 10000, status: "paid" },
    { month: "2026-02", amount: 5000, status: "reserved" },
    { month: "2026-03", amount: 10000, status: "pending" }
  ] }];
  state.possibleExpenses = [{ id: "possible-test", concept: "Posible gasto de prueba", amount: 8000 }];
  assert.equal((await put(state)).status, 204);
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  for (const invalid of [[], { version: 2 }, { ...state, cash: -1 }, { ...state, mortgageOffer: -1 }, { ...state, possibleExpenses: [{ id: "invalid", concept: "", amount: 100 }] }, { ...state, savings: [{ month: "bad" }] }, { ...state, daily: { ...state.daily, opening: 0.5 } }]) {
    assert.equal((await put(invalid)).status, 400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  for (const row of [
    { ...state.savings[0], month: "2026-13" },
    { ...state.savings[0], repayment: -1 },
    { ...state.savings[0], actual: 0.5 },
  ]) {
    const invalid = structuredClone(state);
    invalid.savings[0] = row;
    assert.equal((await put(invalid)).status, 400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  await stop();
  await start();
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  for(const external of [
    {...state.debts[0],total:20000},
    {...state.debts[0],installments:[...state.debts[0].installments,state.debts[0].installments[0]]},
    {...state.debts[0],installments:[{month:"2026-13",amount:100,status:"paid"}]},
    {...state.debts[0],installments:[{month:"2026-01",amount:100,status:"unknown"}]}
  ]) {
    assert.equal((await put({...state,debts:[external]})).status,400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  const invalidGlobal = structuredClone(state);
  for(const placements of [
    [{...state.savingsPlacements[0],start:"2026-02-30"}],
    [{...state.savingsPlacements[0],annualRateBps:-1}],
    [{...state.savingsPlacements[0],amount:null}],
    [state.savingsPlacements[1],{...state.savingsPlacements[1],id:"another-account"}],
    [{...state.savingsPlacements[1],rateType:"tae"}]
  ]) {
    assert.equal((await put({...state,savingsPlacements:placements})).status,400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  invalidGlobal.savings.push({ ...invalidGlobal.savings[0] });
  assert.equal((await put(invalidGlobal)).status, 400);
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  const withdrawn=withdrawSavings(state,1000,"Retirada de prueba",today(),"work");
  const repaid=repayDebt(withdrawn,1000,today());
  assert.equal((await put(repaid)).status,204);
  assert.deepEqual(await(await fetch(`${base}/api/state`)).json(),repaid);
  const sql=new DatabaseSync(path.join(folder,"test.db"),{readOnly:true});
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM savings_months").get().count,2);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM investment_months").get().count,1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM internal_debt_payments").get().count,2);
  const metadata=JSON.parse(sql.prepare("SELECT document FROM profile_settings WHERE id=1").get().document);
  assert.equal(metadata.savings,undefined);
  assert.equal(metadata.accounts,undefined);
  assert.equal(metadata.cash, 1700);
  assert.equal(metadata.mortgageOffer, 9000000);
  assert.equal(metadata.possibleExpenses, undefined);
  assert.equal(metadata.debts, undefined);
  assert.equal(metadata.savingsPlacements, undefined);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM savings_placements").get().count,2);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM external_debts").get().count,1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM possible_expenses").get().count, 1);
  sql.close();
  console.log("API OK: Swagger, validación, escritura/lectura y persistencia tras reiniciar. Base de pruebas independiente.");
} finally {
  await stop();
  for (const file of readdirSync(folder)) unlinkSync(path.join(folder, file));
  rmdirSync(folder);
}
