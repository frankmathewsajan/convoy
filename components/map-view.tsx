"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, MapCameraChangedEvent, MapMouseEvent } from "@vis.gl/react-google-maps";
import { CustomOverlay } from "@/components/custom-overlay";
// It seems OverlayView is not directly exported in newer versions, or might be named differently (e.g. AdvancedMarkerElement is essentially an overlay).
// Wait, the error said "Map initialized without a valid Map ID, which will prevent use of Advanced Markers."
// If I use standard `OverlayView` (from @react-google-maps/api or similar), it works without Map ID.
// But this project uses `@vis.gl/react-google-maps`.
// In `@vis.gl/react-google-maps`, `AdvancedMarker` requires Map ID. 
// Standard `Marker` (legacy) does not. 
// But I want CUSTOM React content. 
// Check if `@vis.gl/react-google-maps` has `Overlay`. It usually does or relies on `AdvancedMarker`.
// Actually, for custom content *without* Map ID, we often have to use a custom OverlayView implementation or the legacy `OverlayView` if available.
// Let's assume for a moment I can use a simple custom overlay or revert to `Marker` with a custom icon if `OverlayView` isn't readily available in this lib without extra setup.
// However, the error is specific to `AdvancedMarker`.
// Let's check the imports again. 
// I will assume `OverlayView` is available or I can use a standard `Marker` with a custom icon, BUT `AdvancedMarker` allows *React Component* as marker.
// If I can't use `AdvancedMarker`, I lose the easy "React Component as Marker" feature unless I use `OverlayView`.
// Let's try importing `Overlay` or similar. If not, I might need to implement a Google Maps OverlayView class.
// A safe bet for now is to try finding `OverlayView` or `useMap` to add a custom overlay.
// Actually, `vis.gl/react-google-maps` DOES have `AdvancedMarker`. The "valid Map ID" error is because I passed `mapId={null}` but `AdvancedMarker` *needs* one.
// The user *wants* local styling (JSON), which *conflicts* with Map ID (Cloud Styling) in some contexts, but actually you CAN use Map ID + Local JSON if you just don't verify the Map ID or if the Map ID is set to "Raster" mode?
// Wait, the previous implementation had `mapId={null}` to FORCE local styles. 
// IF I set `mapId="DEMO_MAP_ID"`, local styles "might" be ignored if the Map ID is associated with a style.
// But if I use a Map ID that *has no style associated*, local JSON *should* work?
// Actually, the error says "Map initialized without a valid id... preventing Advanced Marker".
// So to use AdvancedMarker, I MUST have a Map ID.
// To use Local Styles, I usually avoid Map ID.
// CONUNDRUM: 
// 1. Use Map ID -> Get AdvancedMarker (React Components) -> Lose Local Styles? (Maybe not if ID is empty/raster?)
// 2. No Map ID -> Javascript styles work -> No AdvancedMarker.
//
// SOLUTION: Use `OverlayView` (if available in this lib) OR implement a custom `OverlayView`.
// `@vis.gl/react-google-maps` exports `useMap`. I can build a simple `<Overlay>` component using `google.maps.OverlayView`.
// Let's check `node_modules` is not possible.
// I'll stick to the plan: Use `OverlayView` if imported, or create a `MapOverlay` component.
// I will verify if `OverlayView` is exported.
// I'll guess it is NOT directly exported as a component in `0.x` or `1.x` of this specific lib sometimes. 
// Let's check the `map-view` imports again. 
// It imports `AdvancedMarker`.
// I will try to import `InfoWindow`? No.
// I will implement a `CustomOverlay` component in a new file `components/custom-overlay.tsx` to be safe, then usage it.
// This is the most robust way to get React content on the map without Map ID.
import { Loader2, Navigation, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider"; // Added import
import { VectorOnboarding } from "@/components/vector-onboarding";
import { ConvoyHUD } from "@/components/convoy-hud";
import { BuilderMarker } from "@/components/builder-marker";
import { NomadMarker } from "@/components/nomad-marker";

// ... imports ...
import { useTheme } from "next-themes";
import { getMapStyle, MapStyleOptions } from "./map-styles";
import { useNearbyNomads } from "@/hooks/use-nearby-nomads";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Eye, EyeOff } from "lucide-react";
import { useVibeLikeCount } from "@/hooks/use-vibe-likes";

export default function MapView() {
  const [center, setCenter] = useState({ lat: 16.4971, lng: 80.4992 });
  const [zoom, setZoom] = useState(12);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasVector, setHasVector] = useState(false);
  const [filter, setFilter] = useState<"all" | "builders" | "nomads">("all");
  const [mapReady, setMapReady] = useState(false);
  const [mapSettings, setMapSettings] = useState<MapStyleOptions>({
    styleMode: "retro",
    showRoads: true,
    showLandmarks: true,
    showLabels: true,
    roadDensity: 3,
    landmarkDensity: 2,
    labelDensity: 3
  });

  const [isEditingVector, setIsEditingVector] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);

  const { user, userData, refreshUserData, loading } = useAuth();
  const { theme, resolvedTheme } = useTheme();

  // Fetch nearby nomads (only non-incognito users with locations)
  const { nomads: nearbyNomads, loading: nomadsLoading } = useNearbyNomads(user?.uid);
  const vibeLikeCount = useVibeLikeCount(user?.uid);

  // Mark map as ready once user location is known and nomads first loaded
  useEffect(() => {
    if (userLocation && !nomadsLoading && !mapReady) {
      // Small delay to let markers render
      const t = setTimeout(() => setMapReady(true), 300);
      return () => clearTimeout(t);
    }
  }, [userLocation, nomadsLoading, mapReady]);

  // Fix: Initialize hasVector and incognito from userData
  useEffect(() => {
    if (userData) {
      if (userData.vector) setHasVector(true);
      if (typeof userData.incognito === "boolean") setIncognito(userData.incognito);
    }
  }, [userData]);

  // Load Map Settings from Local Storage OR Firebase on Mount/Update
  useEffect(() => {
    // 1. Try Firebase first (Source of Truth)
    if (userData?.mapSettings) {
      setMapSettings((prev) => ({ ...prev, ...userData.mapSettings }));
      return;
    }

    // 2. Fallback to Local Storage
    const savedSettings = localStorage.getItem("convoy-map-settings");
    if (savedSettings) {
      try {
        setMapSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
      } catch (e) {
        console.error("Failed to parse map settings", e);
      }
    }
  }, [userData]); // Run when userData loads

  // Save Map Settings to Local Storage AND Firebase (Debounced)
  useEffect(() => {
    // Local Storage (Instant)
    localStorage.setItem("convoy-map-settings", JSON.stringify(mapSettings));

    // Firebase (Debounced)
    const saveToFirebase = async () => {
      if (!user) return;
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase/config");
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          mapSettings: mapSettings
        });
      } catch (error) {
        console.error("Error syncing map settings to cloud:", error);
      }
    };

    const timeoutId = setTimeout(saveToFirebase, 1000); // 1s debounce
    return () => clearTimeout(timeoutId);
  }, [mapSettings, user]);

  const mapStyles = getMapStyle(theme, resolvedTheme === "dark" ? "dark" : "light", mapSettings);

  // ... (user location logic)

  // ...

  const handleCenterMap = () => {
    if (userLocation) {
      setCenter(userLocation);
      setZoom(15);
    }
  };

  const toggleIncognito = async () => {
    const newValue = !incognito;
    setIncognito(newValue);
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { incognito: newValue });
      } catch (err) {
        console.error("Error toggling incognito:", err);
      }
    }
  };

  const handleSetVector = async (destination: string) => {
    console.log("Vector set to:", destination);
    setHasVector(true);
    setIsEditingVector(false); // Close editor

    if (user) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase/config");
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          vector: destination
        });
        await refreshUserData();
      } catch (error) {
        console.error("Error saving vector:", error);
      }
    }
  };

  // Get user location
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          // Only snap to user once initially (we check if it was null before)
          setUserLocation((prev) => {
            if (!prev) {
              setCenter(pos);
              setZoom(14);
            }
            return pos;
          });
        },
        (error) => {
          console.error("Error getting location: ", error);
        }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []); // Empty dependency array to run once

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
      <div className="relative w-full h-screen bg-zinc-100">

        {/* Blur overlay until map is ready */}
        <div
          className={`absolute inset-0 z-40 pointer-events-none transition-all duration-700 ${mapReady ? "opacity-0" : "opacity-100"
            }`}
          style={{ backdropFilter: mapReady ? "none" : "blur(12px)" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--main)" }} />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading map…</p>
          </div>
        </div>

        {/* HUD Overlay */}
        <ConvoyHUD
          activeFilter={filter}
          onFilterChange={setFilter}
          safetyCount={3}
          mapSettings={mapSettings}
          onMapSettingsChange={setMapSettings}
          onCenterMap={handleCenterMap}
          onEditVector={() => setIsEditingVector(true)}
          incognito={incognito}
          onToggleIncognito={toggleIncognito}
          vibeLikeCount={vibeLikeCount}
        />

        {/* Subtle loading indicator */}
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${nomadsLoading ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full border border-zinc-200 shadow-sm text-[11px] font-medium text-zinc-500">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            Syncing nomads…
          </div>
        </div>

        {/* Map */}
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          center={center}
          zoom={zoom}
          onCenterChanged={(ev) => setCenter(ev.detail.center)}
          onZoomChanged={(ev) => { const z = ev.detail.zoom; setZoom(z); console.log(`[Convoy Map] zoom: ${z}`); }}
          styles={mapStyles}
          disableDefaultUI={true}
          style={{ width: "100%", height: "100%" }}
          gestureHandling={"greedy"}
        >
          {/* User Location Pulse */}
          {userLocation && (
            <CustomOverlay position={userLocation} zIndex={100} anchor="center">
              <div className="relative">
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="relative flex items-center justify-center w-12 h-12 cursor-pointer"
                >
                  <span
                    className="absolute inline-flex w-full h-full rounded-full opacity-50 animate-ping"
                    style={{ backgroundColor: "var(--main)" }}
                  ></span>
                  <span
                    className="relative inline-flex w-5 h-5 rounded-full border-4 border-white shadow-xl"
                    style={{ backgroundColor: "var(--main)" }}
                  ></span>
                </button>
                {/* User Info Popup */}
                {showUserInfo && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-14 w-52 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 z-50 bg-white">
                    <button onClick={() => setShowUserInfo(false)} className="absolute top-2 right-2">
                      <X className="h-3 w-3" />
                    </button>
                    <p className="font-black text-sm truncate">{userData?.displayName || "You"}</p>
                    {userData?.vector && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Navigation className="h-3 w-3" style={{ color: "var(--main)" }} />
                        Heading to {userData.vector}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">Your Location</p>
                  </div>
                )}
              </div>
            </CustomOverlay>
          )}

          {/* Builder Markers */}
          {nearbyNomads
            .filter((n) => n.isBuilder)
            .map((builder) => (
              <BuilderMarker
                key={builder.uid}
                uid={builder.uid}
                position={builder.location}
                name={builder.displayName || "Builder"}
                role="Verified Builder"
                description={builder.vector ? `Heading to ${builder.vector}` : "Available for work"}
                visible={filter === "all" || filter === "builders"}
              />
            ))}

          {/* Regular Nomad Markers */}
          {nearbyNomads
            .filter((n) => !n.isBuilder)
            .map((nomad) => (
              <NomadMarker key={nomad.uid} nomad={nomad} visible={filter === "all" || filter === "nomads"} />
            ))}

        </Map>

        {/* Vector Onboarding (Show if no vector set AND not loading, OR if editing) */}
        {((!hasVector && !loading) || isEditingVector) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm">
              {isEditingVector && (
                <button
                  onClick={() => setIsEditingVector(false)}
                  className="absolute -top-8 right-0 text-white font-bold uppercase text-xs hover:underline"
                >
                  Cancel
                </button>
              )}
              <VectorOnboarding onSetVector={handleSetVector} />
            </div>
          </div>
        )}
      </div>
    </APIProvider>
  );
}
