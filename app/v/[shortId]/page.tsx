"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ShortLinkPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const shortId = params.shortId as string;
      const hash = window.location.hash;
      
      try {
        const response = await fetch(`/api/paste/short/${shortId}`);
        if (response.ok) {
          const { id } = await response.json();
          router.replace(`/view/${id}${hash}`);
        } else {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    }

    redirect();
  }, [params.shortId, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Reindirizzamento...</p>
    </div>
  );
}