"use client";

import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col h-full w-full items-center justify-center bg-background text-foreground transition-bg",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "absolute -inset-[10px] opacity-50 will-change-transform pointer-events-none",
            "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.13),transparent_50%)]",
            "after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_80%_50%,rgba(250,204,21,0.13),transparent_50%)]",
            "before:animate-aurora",
            "after:animate-aurora after:animation-delay-2000",
            showRadialGradient &&
              "opacity-60"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-aurora" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-primary/5 to-transparent animate-aurora animation-delay-4000" />
        </div>
      </div>
      {children}
    </div>
  );
};

