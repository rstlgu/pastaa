"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function ThemedToaster() {
  const { theme } = useTheme();
  
  return (
    <Toaster 
      theme={theme as 'light' | 'dark' | 'system'}
    />
  );
}

