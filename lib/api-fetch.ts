let expiresAt = 0;
let pending: Promise<void> | undefined;
let resolvePending: (() => void) | undefined;
export const ACCESS_EVENT = "pastaa:access-required";
export function grantAccess(expiry: number) {
  expiresAt = expiry;
  resolvePending?.();
  pending = undefined;
  resolvePending = undefined;
}
export function hasAccess() {
  return Date.now() + 5000 < expiresAt;
}
function requireAccess() {
  if (hasAccess()) return Promise.resolve();
  if (!pending) {
    pending = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });
    window.dispatchEvent(new Event(ACCESS_EVENT));
  }
  return pending;
}
export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  await requireAccess();
  const response = await fetch(input, { ...init, credentials: "same-origin" });
  if (
    response.status === 401 ||
    response.headers.get("cf-mitigated") === "challenge"
  ) {
    expiresAt = 0;
    await requireAccess();
    // An access denial occurs before application side effects; retry once only.
    return fetch(input, { ...init, credentials: "same-origin" });
  }
  return response;
}
