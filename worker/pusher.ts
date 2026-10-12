import { createHash } from "node:crypto";
import type { Env } from "./types";
import { assert, json, readBytes, readJson } from "./http";
export async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function trigger(
  env: Env,
  channel: string,
  event: string,
  data: unknown,
) {
  assert(
    env.PUSHER_APP_ID && env.PUSHER_KEY && env.PUSHER_SECRET,
    "Realtime non configurato",
    503,
  );
  const cluster = env.PUSHER_CLUSTER ?? "eu";
  assert(/^[a-z0-9-]+$/.test(cluster), "Cluster non valido", 503);
  const body = JSON.stringify({
    name: event,
    channels: [channel],
    data: JSON.stringify(data),
  });
  assert(
    new TextEncoder().encode(body).length <= 10000,
    "Evento troppo grande",
    413,
  );
  const path = `/apps/${env.PUSHER_APP_ID}/events`;
  const query = new URLSearchParams({
    auth_key: env.PUSHER_KEY,
    auth_timestamp: String(Math.floor(Date.now() / 1000)),
    auth_version: "1.0",
    body_md5: createHash("md5").update(body).digest("hex"),
  });
  query.sort();
  const signature = await hmac(env.PUSHER_SECRET, `POST\n${path}\n${query}`);
  query.set("auth_signature", signature);
  const response = await fetch(
    `https://api-${cluster}.pusher.com${path}?${query}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
  );
  assert(response.ok, "Realtime temporaneamente non disponibile", 502);
}
export async function chatAuth(request: Request, env: Env) {
  assert(env.PUSHER_KEY && env.PUSHER_SECRET, "Realtime non configurato", 503);
  const bytes = await readBytes(
    request,
    2048,
    "application/x-www-form-urlencoded",
  );
  const form = new URLSearchParams(new TextDecoder().decode(bytes));
  const socket = form.get("socket_id"),
    channel = form.get("channel_name");
  assert(
    socket &&
      /^\d+\.\d+$/.test(socket) &&
      channel &&
      /^private-chat-[a-f0-9]{64}$/.test(channel),
    "Canale non valido",
  );
  return json({
    auth: `${env.PUSHER_KEY}:${await hmac(env.PUSHER_SECRET, `${socket}:${channel}`)}`,
  });
}
export async function chatEvent(request: Request, env: Env, action: string) {
  const b = await readJson(request, 10000);
  assert(
    typeof b.channelHash === "string" && /^[a-f0-9]{64}$/.test(b.channelHash),
    "Canale non valido",
  );
  const userId = b.userId ?? b.fromUserId;
  assert(
    typeof userId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(userId),
    "Utente non valido",
  );
  let event: string, data: Record<string, unknown>;
  if (action === "send") {
    assert(
      typeof b.encryptedContent === "string" &&
        b.encryptedContent.length <= 8000 &&
        typeof b.nonce === "string" &&
        b.nonce.length <= 100,
      "Messaggio non valido",
    );
    assert(
      typeof b.fromUsername === "string" &&
        b.fromUsername.length <= 100 &&
        typeof b.senderPublicKey === "string" &&
        b.senderPublicKey.length <= 200,
      "Mittente non valido",
    );
    event = "message";
    data = {
      id: b.messageId,
      from: userId,
      fromUsername: b.fromUsername,
      encryptedContent: b.encryptedContent,
      nonce: b.nonce,
      senderPublicKey: b.senderPublicKey,
      timestamp: Date.now(),
    };
  } else if (action === "leave") {
    event = "member-leave";
    data = { userId };
  } else {
    assert(
      typeof b.username === "string" &&
        b.username.length <= 100 &&
        typeof b.publicKey === "string" &&
        b.publicKey.length <= 200,
      "Partecipante non valido",
    );
    event = action === "join" ? "member-join" : "member-sync";
    data = {
      userId,
      username: b.username,
      publicKey: b.publicKey,
      ...(action === "sync" ? { replyTo: b.replyTo } : {}),
    };
  }
  await trigger(env, `private-chat-${b.channelHash}`, event, data);
  return json({ success: true, messageId: data.id });
}
export async function pageBroadcast(
  request: Request,
  env: Env,
  id: string,
  presence: boolean,
) {
  assert(/^[a-zA-Z0-9_-]{1,100}$/.test(id), "Pagina non valida");
  const b = await readJson(request, presence ? 4096 : 115 * 1024);
  assert(
    typeof b.userId === "string" && b.userId.length <= 100,
    "Utente non valido",
  );
  if (!presence) {
    assert(
      typeof b.content === "string" &&
        new TextEncoder().encode(b.content).length <= 100 * 1024,
      "Contenuto non valido",
    );
    await trigger(
      env,
      `page-${id}`,
      "content-update",
      new TextEncoder().encode(b.content).length > 7000
        ? { userId: b.userId, refresh: true, timestamp: Date.now() }
        : {
            content: b.content,
            userId: b.userId,
            editorMode: b.editorMode,
            timestamp: Date.now(),
          },
    );
  } else {
    const event =
      b.action === "join"
        ? "presence-join"
        : b.action === "leave"
          ? "presence-leave"
          : "presence-update";
    await trigger(env, `page-${id}`, event, { ...b, timestamp: Date.now() });
  }
  return json({ success: true });
}
