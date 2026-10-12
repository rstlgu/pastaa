import type { Env } from "./types";
import { assert, HttpError, json, validateId } from "./http";
import { checkCreationBudget, limitApi } from "./rate-limit";
import { cleanup } from "./cleanup";
import {
  createFile,
  uploadChunk,
  completeFile,
  fileInfo,
  downloadChunk,
  deleteFile,
} from "./files";
import { createPaste, getPaste, shortPaste } from "./pastes";
import { getPage, savePage } from "./pages";
import { chatAuth, chatEvent, pageBroadcast } from "./pusher";
import { POST as shareEmail } from "./email-share";
import { POST as verifyEmail } from "./email-verify";
import {
  accessEndpoint,
  accessRequired,
  accessSession,
  assertRequestOrigin,
  fastLimit,
} from "./access";
export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname,
    method = request.method;
  if (!["GET", "POST", "PUT", "DELETE"].includes(method))
    return json({ error: "Metodo non consentito" }, 405);
  assertRequestOrigin(request, env);
  await fastLimit(
    env.API_LIMITER,
    request.headers.get("CF-Connecting-IP") ?? "local",
  );
  if (path === "/api/access") return accessEndpoint(request, env);
  const session = await accessSession(request, env);
  if (!session) return accessRequired();
  await fastLimit(env.SESSION_LIMITER, session.id);
  if (
    method === "POST" &&
    ["/api/files", "/api/paste", "/api/public-page"].includes(path)
  )
    await fastLimit(env.WRITE_LIMITER, session.id);
  // Unknown paths must not read/write D1 counters.
  if (
    !/^\/api\/(?:health|files(?:\/[A-Za-z0-9_-]{1,100}(?:\/chunks\/\d{1,3}|\/complete)?)?|paste(?:\/(?:short\/)?[A-Za-z0-9_-]{1,100})?|public-page(?:\/[A-Za-z0-9_-]{1,100}\/(?:broadcast|broadcast-presence))?|chat\/(?:auth|send|join|leave|sync)|share-paste-email(?:\/verify)?)$/.test(
      path,
    )
  )
    return json({ error: "API non trovata" }, 404);
  if (method === "POST" && path === "/api/files") checkCreationBudget("file");
  if (method === "POST" && path === "/api/paste") checkCreationBudget("paste");
  const client = await limitApi(request, env);
  if (path === "/api/health" && method === "GET") {
    await env.DB.prepare("SELECT id FROM StorageBudget WHERE id=1").first();
    return json({ status: "ok", storage: "D1" });
  }
  if (path === "/api/files" && method === "POST")
    return createFile(request, env, client);
  let m = path.match(
    /^\/api\/files\/([a-zA-Z0-9_-]+)(?:\/chunks\/(\d+)|\/(complete))?$/,
  );
  if (m) {
    validateId(m[1]);
    if (m[2] !== undefined && method === "PUT")
      return uploadChunk(request, env, m[1], Number(m[2]));
    if (m[2] !== undefined && method === "GET")
      return downloadChunk(request, env, m[1], Number(m[2]));
    if (m[3] && method === "POST") return completeFile(request, env, m[1]);
    if (!m[2] && !m[3] && method === "GET") return fileInfo(request, env, m[1]);
    if (!m[2] && !m[3] && method === "DELETE")
      return deleteFile(request, env, m[1]);
    return json({ error: "Metodo non consentito" }, 405);
  }
  if (path === "/api/paste" && method === "POST")
    return createPaste(request, env);
  m = path.match(/^\/api\/paste\/short\/([a-zA-Z0-9_-]+)$/);
  if (m && method === "GET") return shortPaste(env, m[1]);
  m = path.match(/^\/api\/paste\/([a-zA-Z0-9_-]+)$/);
  if (m && method === "GET") return getPaste(env, m[1]);
  if (path === "/api/public-page" && method === "GET")
    return getPage(env, url.searchParams.get("id") ?? "");
  if (path === "/api/public-page" && method === "POST")
    return savePage(request, env);
  m = path.match(
    /^\/api\/public-page\/([a-zA-Z0-9_-]+)\/(broadcast|broadcast-presence)$/,
  );
  if (m && method === "POST")
    return pageBroadcast(request, env, m[1], m[2] === "broadcast-presence");
  if (path === "/api/chat/auth" && method === "POST")
    return chatAuth(request, env);
  m = path.match(/^\/api\/chat\/(send|join|leave|sync)$/);
  if (m && method === "POST") return chatEvent(request, env, m[1]);
  if (path === "/api/share-paste-email" && method === "POST")
    return shareEmail(request, env);
  if (path === "/api/share-paste-email/verify" && method === "POST")
    return verifyEmail(request, env);
  return json({ error: "API non trovata" }, 404);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith("/api/"))
      return env.ASSETS.fetch(request);
    if (env.MIGRATION_FREEZE === "1") {
      const response = json(
        { error: "Aggiornamento in corso. Riprova tra pochi secondi." },
        503,
      );
      response.headers.set("Retry-After", "30");
      return response;
    }
    try {
      return await handleApi(request, env);
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("StorageBudget") || message.includes("used BETWEEN"))
        return json({ error: "Spazio gratuito temporaneamente esaurito" }, 507);
      if (
        message.includes("invalid_attachments") ||
        message.includes("invalid_upload_ticket") ||
        message.includes("UNIQUE constraint failed")
      )
        return json({ error: "Upload non valido o già utilizzato" }, 409);
      console.error("Pastaa API failed", {
        type: error instanceof Error ? error.name : "unknown",
      });
      return json({ error: "Servizio temporaneamente non disponibile" }, 503);
    }
  },
  async scheduled(_event: ScheduledController, env: Env) {
    await cleanup(env);
  },
} satisfies ExportedHandler<Env>;
