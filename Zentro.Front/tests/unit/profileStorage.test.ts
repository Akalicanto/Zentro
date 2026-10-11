import type { Profile } from "../../src/domain/types.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { createProfileStorage } from "../../src/features/profile/services/profileStorage.ts";
import { testProfile } from "../fixtures/profile.ts";
const pendingKey = "zentro.v3.pending";
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
test("Recuperar un cambio pendiente normaliza el contrato de una copia antigua", async () => {
  const storage = memoryStorage();
  const profile = testProfile();
  const legacy = {
    ...profile,
    daily: {
      ...profile.daily,
      expenses: profile.daily.expenses.map((row) => ({
        ...row,
        month: "2024-01",
      })),
    },
  };
  storage.setItem(pendingKey, JSON.stringify(legacy));
  let sent = "";
  const client = createProfileStorage(storage, async (method, body) => {
    if (method === "PUT") {
      sent = body!;
      return new Response(null, { status: 204 });
    }
    return Response.json(profile);
  });
  assert.deepEqual(await client.loadData(), profile);
  assert.ok(
    !JSON.parse(sent).daily.expenses.some((row: object) => "month" in row),
  );
  assert.equal(storage.getItem(pendingKey), null);
});
test("Una escritura posterior guarda el último cambio y limpia el error anterior", async () => {
  const storage = memoryStorage();
  let fails = true;
  const statuses: string[] = [];
  const sent: string[] = [];
  const client = createProfileStorage(storage, async (_method, body) => {
    if (fails) throw Error("Sin conexión");
    sent.push(body!);
    return new Response(null, { status: 204 });
  });
  await client.saveData(testProfile(), (message) => statuses.push(message));
  assert.match(statuses.at(-1)!, /conservado/);
  assert.ok(storage.getItem(pendingKey));
  fails = false;
  const first = client.saveData({ ...testProfile(), cash: 100 }, (message) =>
    statuses.push(message),
  );
  const last = client.saveData({ ...testProfile(), cash: 200 }, (message) =>
    statuses.push(message),
  );
  await Promise.all([first, last]);
  assert.equal(sent.length, 1);
  assert.equal(JSON.parse(sent[0]).cash, 200);
  assert.equal(storage.getItem(pendingKey), null);
  assert.equal(statuses.at(-1), "");
});
test("Un error en una escritura anterior no reemplaza el estado de un cambio nuevo", async () => {
  const storage = memoryStorage();
  let rejectFirst!: (reason: Error) => void;
  const messages: string[] = [];
  let calls = 0;
  const client = createProfileStorage(storage, async () => {
    if (++calls === 1)
      return new Promise<Response>((_resolve, reject) => {
        rejectFirst = reject;
      });
    return new Response(null, { status: 204 });
  });
  const first = client.saveData(testProfile(), (message) =>
    messages.push(message),
  );
  await Promise.resolve();
  const last = client.saveData({ ...testProfile(), cash: 300 }, (message) =>
    messages.push(message),
  );
  rejectFirst(Error("Escritura anterior fallida"));
  await Promise.all([first, last]);
  assert.deepEqual(messages, [""]);
  assert.equal(storage.getItem(pendingKey), null);
});
test("Si el navegador no conserva el cambio, no se anuncia un guardado ni se envía", () => {
  const storage = memoryStorage();
  storage.setItem = () => {
    throw Error("QuotaExceededError");
  };
  let requests = 0;
  const client = createProfileStorage(storage, async () => {
    requests++;
    return new Response();
  });
  assert.throws(
    () => client.saveData(testProfile(), () => {}),
    /almacenamiento/,
  );
  assert.equal(requests, 0);
});

test("Borrar espera las escrituras anteriores y bloquea cambios que podrían reponer los datos", async () => {
  const storage = memoryStorage();
  let release!: () => void;
  const bodies: Profile[] = [];
  const client = createProfileStorage(storage, async (_method, body) => {
    bodies.push(JSON.parse(body!));
    if (bodies.length === 1)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    return new Response(null, { status: 204 });
  });
  const saving = client.saveData(testProfile(), () => {});
  await Promise.resolve();
  const resetting = client.resetData();
  assert.throws(
    () => client.saveData(testProfile(), () => {}),
    /termine el borrado/,
  );
  await assert.rejects(client.resetData(), /en curso/);
  assert.equal(bodies.length, 1);
  release();
  await saving;
  const empty = await resetting;
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[1], empty);
  assert.equal(empty.cash, 0);
  assert.deepEqual(empty.debts, []);
  assert.deepEqual(empty.savings, []);
  assert.deepEqual(empty.investment, []);
  assert.equal(storage.getItem(pendingKey), null);
});

test("Un borrado fallido conserva los cambios anteriores y nunca guarda un borrado para reintentarlo al arrancar", async () => {
  const storage = memoryStorage();
  const previous = JSON.stringify(testProfile());
  storage.setItem(pendingKey, previous);
  let fail = true;
  const client = createProfileStorage(storage, async () => {
    if (fail) throw Error("Sin conexión");
    return new Response(null, { status: 204 });
  });
  await assert.rejects(client.resetData(), /Sin conexión/);
  assert.equal(storage.getItem(pendingKey), previous);
  fail = false;
  await client.saveData({ ...testProfile(), cash: 200 }, () => {});
  assert.equal(storage.getItem(pendingKey), null);
});

test("Si no se puede limpiar la copia pendiente del navegador, no se envía el borrado a la API", async () => {
  const storage = memoryStorage();
  const previous = JSON.stringify(testProfile());
  storage.setItem(pendingKey, previous);
  storage.removeItem = () => {
    throw Error("Almacenamiento bloqueado");
  };
  let calls = 0;
  const client = createProfileStorage(storage, async () => {
    calls++;
    return new Response();
  });
  await assert.rejects(client.resetData(), /bloqueado/);
  assert.equal(calls, 0);
  assert.equal(storage.getItem(pendingKey), previous);
});
