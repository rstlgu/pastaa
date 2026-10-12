import { spawnSync } from "node:child_process";
export const ACCOUNT_ID = "5047cd4a2fb6e12bc13dc99bc62a7dc6";
let credentials;
export function wrangler(args, options = {}) {
  return spawnSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", ...args],
    { encoding: "utf8", ...options },
  );
}
async function authentication() {
  if (credentials) return credentials;
  const result = wrangler(["auth", "token", "--json"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0)
    throw new Error("Accesso Wrangler mancante. Esegui npx wrangler login.");
  credentials = JSON.parse(result.stdout);
  return credentials;
}
export async function cloudflare(
  path,
  body,
  method = body === undefined ? "GET" : "POST",
) {
  const auth = await authentication();
  const headers = { "Content-Type": "application/json" };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  else {
    headers["X-Auth-Key"] = auth.key;
    headers["X-Auth-Email"] = auth.email;
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data.success === false)
    throw new Error(
      `Cloudflare request failed (${response.status}): ${data.errors?.map((e) => e.code).join(",") ?? "unknown"}`,
    );
  return data.result;
}
export async function d1(databaseId, statements) {
  if (!/^[a-f0-9-]{36}$/.test(databaseId)) throw new Error("ID D1 non valido");
  const result = await cloudflare(
    `/accounts/${ACCOUNT_ID}/d1/database/${databaseId}/query`,
    { batch: statements },
  );
  if (result.some((r) => r.success === false))
    throw new Error("Query D1 non riuscita");
  return result;
}
