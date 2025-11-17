"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function ThemedToaster() {
  const { theme } = useTheme();
  
  return (
    <Toaster 
      theme={theme as 'light' | 'dark' | 'system'}
      position="bottom-center"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          border: '2px solid hsl(var(--primary))',
          color: 'hsl(var(--foreground))',
        },
        className: 'toast-custom',
      }}
    />
  );
}

