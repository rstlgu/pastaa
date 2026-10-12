import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import "@/app/globals.css";
const Home = lazy(() => import("@/app/page"));
const Send = lazy(() => import("@/app/send/page"));
const Share = lazy(() => import("@/app/[id]/page"));
const View = lazy(() => import("@/app/view/[id]/page"));
const Short = lazy(() => import("@/app/v/[shortId]/page"));
const Chat = lazy(() => import("@/app/chat/page"));
const Room = lazy(() => import("@/app/chat/room/page"));
const Privacy = lazy(() => import("@/app/privacy/page"));
const Terms = lazy(() => import("@/app/terms/page"));
function AppRoutes() {
  const location = useLocation();
  const chatHost = window.location.hostname.startsWith("chat.");
  const pathname =
    chatHost &&
    !location.pathname.startsWith("/chat") &&
    !["/privacy", "/terms"].includes(location.pathname)
      ? "/chat" + (location.pathname === "/" ? "" : location.pathname)
      : location.pathname;
  return (
    <Suspense
      fallback={
        <div role="status" className="p-8 text-center">
          Caricamento…
        </div>
      }
    >
      <Routes location={{ ...location, pathname }}>
        <Route path="/" element={<Home />} />
        <Route path="/send" element={<Send />} />
        <Route path="/view/:id" element={<View key={pathname} />} />
        <Route path="/v/:shortId" element={<Short key={pathname} />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/room" element={<Room />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/:id" element={<Share key={pathname} />} />
      </Routes>
    </Suspense>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ThemeProvider defaultTheme="dark" storageKey="pasta-theme">
      <LanguageProvider>
        <AppRoutes />
        <ThemedToaster />
      </LanguageProvider>
    </ThemeProvider>
  </BrowserRouter>,
);
