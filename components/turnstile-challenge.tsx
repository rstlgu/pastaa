import { useEffect, useRef, useState } from "react";
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
interface TurnstileInstance {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  remove(id: string): void;
  reset(id?: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}
let scriptReady: Promise<void> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptReady)
    scriptReady = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptReady = undefined;
        script.remove();
        reject(new Error("Verifica non disponibile"));
      };
      document.head.appendChild(script);
    });
  return scriptReady;
}
export function TurnstileChallenge({
  onTokenChange,
  action,
}: {
  onTokenChange: (token: string) => void;
  action?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onTokenChange);
  callback.current = onTokenChange;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let id: string | undefined;
    if (!SITE_KEY) {
      setFailed(true);
      return;
    }
    loadTurnstile()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        id = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          action,
          theme: "auto",
          callback: (token) => {
            setFailed(false);
            callback.current(token);
          },
          "expired-callback": () => callback.current(""),
          "error-callback": () => {
            setFailed(true);
            callback.current("");
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [action]);
  return (
    <div className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
      <div ref={container} />
      {failed ? (
        <p role="alert" className="text-center text-xs text-destructive">
          La verifica anti-bot non è disponibile. Riprova.
        </p>
      ) : null}
    </div>
  );
}
