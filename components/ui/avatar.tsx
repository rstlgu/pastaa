"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const AvatarContext = React.createContext<{
  imageError: boolean;
  hasImage: boolean;
  setImageError: (error: boolean) => void;
  setHasImage: (has: boolean) => void;
}>({
  imageError: false,
  hasImage: false,
  setImageError: () => {},
  setHasImage: () => {},
});

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const [imageError, setImageError] = React.useState(false);
  const [hasImage, setHasImage] = React.useState(false);

  return (
    <AvatarContext.Provider value={{ imageError, hasImage, setImageError, setHasImage }}>
      <div
        ref={ref}
        data-slot="avatar"
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, alt = "", src, ...props }, ref) => {
  const { imageError, setImageError, setHasImage } = React.useContext(AvatarContext);

  React.useEffect(() => {
    if (src) {
      setHasImage(true);
    }
  }, [src, setHasImage]);

  if (imageError || !src) return null;

  return (
    <img
      ref={ref}
      alt={alt}
      src={src}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={() => setImageError(true)}
      onLoad={() => setImageError(false)}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, children, ...props }, ref) => {
  const { imageError, hasImage } = React.useContext(AvatarContext);
  
  // Mostra il fallback se:
  // 1. L'immagine ha dato errore, oppure
  // 2. Non c'è un'immagine da caricare
  const shouldShow = imageError || !hasImage;
  
  if (!shouldShow) {
    return null;
  }

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
    >
      {children}
    </div>
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
