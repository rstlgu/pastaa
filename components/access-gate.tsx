import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { TurnstileChallenge } from "./turnstile-challenge";
import { ACCESS_EVENT, grantAccess, hasAccess } from "@/lib/api-fetch";
import { Button } from "./ui/button";
import { PastaLogo } from "./pasta-logo";

export function AccessGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const publicPage = ["/", "/chat", "/privacy", "/terms"].includes(pathname);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(!publicPage);
  const [required, setRequired] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const accept = useCallback((expiry: number) => {
    grantAccess(expiry);
    setReady(true);
    setRequired(false);
    setChecking(false);
    setError("");
    clearTimeout(timer.current);
    // Re-check shortly before expiry; keep the editor/chat mounted during renewal.
    timer.current = setTimeout(
      () => setRequired(true),
      Math.max(0, expiry - Date.now() - 15000),
    );
  }, []);
  useEffect(() => {
    const require = () => {
      setRequired(true);
      setChecking(false);
    };
    window.addEventListener(ACCESS_EVENT, require);
    return () => {
      window.removeEventListener(ACCESS_EVENT, require);
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (publicPage || hasAccess()) return;
    let cancelled = false;
    setChecking(true);
    fetch("/api/access", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (
          !Number.isFinite(result.expiresAt) ||
          result.expiresAt <= Date.now()
        )
          throw new Error();
        if (!cancelled) accept(result.expiresAt);
      })
      .catch(() => {
        if (!cancelled) {
          setChecking(false);
          setRequired(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [publicPage, accept]);
  const verify = useCallback(
    async (token: string) => {
      if (!token || busy.current) return;
      busy.current = true;
      setError("");
      try {
        const response = await fetch("/api/access", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!response.headers.get("content-type")?.includes("application/json"))
          throw new Error("Verifica non riuscita. Riprova.");
        const result = await response.json();
        if (!response.ok || !Number.isFinite(result.expiresAt))
          throw new Error(result.error || "Verifica non riuscita.");
        accept(result.expiresAt);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Verifica non riuscita.",
        );
      } finally {
        busy.current = false;
      }
    },
    [accept],
  );
  const blocked = required || (!publicPage && !ready);
  return (
    <>
      {ready || publicPage ? (
        <div
          {...(blocked ? { inert: "" } : {})}
          aria-hidden={blocked || undefined}
        >
          {children}
        </div>
      ) : null}
      {blocked ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="access-title"
        >
          <section className="w-full max-w-md space-y-4 rounded-2xl border border-primary/20 bg-background p-6 text-center shadow-xl">
            <div className="flex justify-center">
              <PastaLogo />
            </div>
            <h1 id="access-title" className="text-xl font-semibold">
              Verifica di sicurezza
            </h1>
            <p className="text-sm text-muted-foreground">
              Un rapido controllo aiuta a mantenere Pastaa gratuito e
              disponibile.
            </p>
            {checking ? (
              <p role="status">Controllo in corso…</p>
            ) : (
              <TurnstileChallenge
                key={attempt}
                action="pastaa-access"
                onTokenChange={verify}
              />
            )}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {!checking ? (
              <Button
                variant="outline"
                onClick={() => {
                  setError("");
                  setAttempt((n) => n + 1);
                }}
              >
                Riprova
              </Button>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
