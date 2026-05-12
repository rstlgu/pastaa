import type { Metadata, Viewport } from "next";
import { Inter, Righteous } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ThemedToaster } from "@/components/themed-toaster";

const inter = Inter({ subsets: ["latin"] });
const righteous = Righteous({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-righteous"
});

export const metadata: Metadata = {
  title: "Pastaa - Text sharing",
  description: "Condividi testo in modo sicuro con crittografia end-to-end",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pastaa",
  },
};

export const viewport: Viewport = {
  themeColor: "#facc15",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} ${righteous.variable} h-full`}>
        <ThemeProvider defaultTheme="dark" storageKey="pasta-theme">
          <LanguageProvider>
            {children}
            <ThemedToaster />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

