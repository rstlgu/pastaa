import { readFileSync } from "node:fs";
import { parse } from "jsonc-parser";
import { ACCOUNT_ID, wrangler } from "./cloudflare-api.mjs";
const parseErrors = [];
const config = parse(readFileSync("wrangler.jsonc", "utf8"), parseErrors, {
  allowTrailingComma: true,
});
if (parseErrors.length) throw new Error("Configurazione Wrangler non valida");
if (config.account_id !== ACCOUNT_ID)
  throw new Error("Account Cloudflare diverso da quello di Pastaa");
for (const resource of [
  "r2_buckets",
  "durable_objects",
  "queues",
  "ai",
  "vectorize",
  "containers",
  "workflows",
])
  if (config[resource])
    throw new Error(`Risorsa esclusa dal deployment gratuito: ${resource}`);
if (
  !config.d1_databases?.[0]?.database_id ||
  config.d1_databases[0].database_id.startsWith("00000000-")
)
  throw new Error(
    "Crea il database D1 e configura il suo ID prima del deployment",
  );
// OAuth cannot read billing subscriptions. The operator must verify Workers Free in the authenticated dashboard before each deployment.
if (process.env.PASTAA_FREE_PLAN_VERIFIED !== ACCOUNT_ID)
  throw new Error(
    "Verifica Workers Free nel dashboard. Imposta PASTAA_FREE_PLAN_VERIFIED con l’ID account solo dopo la verifica.",
  );
const identity = wrangler(["whoami", "--json"], {
  stdio: ["ignore", "pipe", "pipe"],
});
if (identity.status !== 0) throw new Error("Accesso Wrangler mancante");
const who = JSON.parse(identity.stdout);
if (!who.accounts?.some((a) => a.id === ACCOUNT_ID))
  throw new Error("Wrangler non ha accesso all’account di Pastaa");
const result = wrangler(["deploy", ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
