"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    src?: string;
    alt?: string;
    fallback?: string;
  }
>(({ className, src, alt, fallback, ...props }, ref) => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          className="aspect-square h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/20 text-primary font-medium text-sm">
          {fallback || alt?.charAt(0).toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
});
Avatar.displayName = "Avatar";

const AvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex -space-x-2", className)}
      {...props}
    />
  );
});
AvatarGroup.displayName = "AvatarGroup";

export { Avatar, AvatarGroup };

