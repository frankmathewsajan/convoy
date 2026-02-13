"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import MapView from "@/components/map-view";
import { useLocationTracker } from "@/hooks/use-location-tracker";

export default function MapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Track user location every 30s (only writes if moved 100m+)
  useLocationTracker(user?.uid);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-background">
        <div className="text-xl font-bold animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Should redirect
  }

  return (
    <div className="w-full h-screen bg-background">
      <MapView />
    </div>
  );
}
