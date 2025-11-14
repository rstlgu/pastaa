import type { Metadata } from "next";
import { Inter, Righteous } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${inter.className} ${righteous.variable}`}>
        <ThemeProvider defaultTheme="dark" storageKey="pasta-theme">
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

