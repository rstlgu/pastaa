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
      data-slot="avatar"
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

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, alt = "", ...props }, ref) => {
  return (
    <img
      ref={ref}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => {
  // Se style contiene backgroundColor o color, rimuovi le classi di default
  const hasCustomStyle = style && (style.backgroundColor || style.color);
  const defaultClasses = hasCustomStyle
    ? "flex h-full w-full items-center justify-center font-medium text-sm"
    : "flex h-full w-full items-center justify-center bg-primary/20 text-primary font-medium text-sm";
  
  return (
    <div
      ref={ref}
      className={cn(defaultClasses, className)}
      style={style}
      {...props}
    />
  );
});
AvatarFallback.displayName = "AvatarFallback";

const AvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale",
        className
      )}
      {...props}
    />
  );
});
AvatarGroup.displayName = "AvatarGroup";

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup };

