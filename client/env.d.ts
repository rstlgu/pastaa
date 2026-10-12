/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_PUSHER_KEY: string;
  readonly VITE_PUSHER_CLUSTER: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
}
