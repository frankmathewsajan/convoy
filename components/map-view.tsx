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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider"; // Added import
import { VectorOnboarding } from "@/components/vector-onboarding";
import { ConvoyHUD } from "@/components/convoy-hud";
import { BuilderMarker } from "@/components/builder-marker";

// ... imports ...
import { useTheme } from "next-themes";
import { getMapStyle, MapStyleOptions } from "./map-styles";

// Mock builders data
const MOCK_BUILDERS = [
  { id: 1, lat: 16.4971, lng: 80.4992, name: "VIT-AP Solar Lab", role: "Solar Research", description: "Experimental solar setups and battery testing." },
  { id: 2, lat: 16.5062, lng: 80.6480, name: "Vijayawada Van Works", role: "Full Build Specialist", description: "Custom cabinetry and electrical systems for travellers." },
  { id: 3, lat: 16.5193, lng: 80.6115, name: "Amaravati Diesel", role: "Mechanic", description: "Expertise in heavy vehicle maintenance and repairs." },
];

export default function MapView() {
  const [center, setCenter] = useState({ lat: 16.4971, lng: 80.4992 });
  const [zoom, setZoom] = useState(12);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasVector, setHasVector] = useState(false);
  const [filter, setFilter] = useState<"all" | "route" | "verified">("all");
  const [mapSettings, setMapSettings] = useState<MapStyleOptions>({
    styleMode: "default",
    showRoads: true,
    showLandmarks: true,
    showLabels: true,
    roadDensity: 3,
    landmarkDensity: 2,
    labelDensity: 3
  });

  const [isEditingVector, setIsEditingVector] = useState(false); // Added state

  const { user, userData, refreshUserData, loading } = useAuth(); // Added loading
  const { theme, resolvedTheme } = useTheme();

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
      setZoom(15); // Zoom in when centering
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
              setZoom(12);
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

        {/* HUD Overlay */}
        <ConvoyHUD
          activeFilter={filter}
          onFilterChange={setFilter}
          safetyCount={3}
          mapSettings={mapSettings}
          onMapSettingsChange={setMapSettings}
          onCenterMap={handleCenterMap}
          onEditVector={() => setIsEditingVector(true)} // Pass handler
        />

        {/* Map */}
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          center={center}
          zoom={zoom}
          onCenterChanged={(ev) => setCenter(ev.detail.center)}
          onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
          styles={mapStyles}
          disableDefaultUI={true}
          style={{ width: "100%", height: "100%" }}
          gestureHandling={"greedy"}
        >
          {/* User Location Pulse */}
          {userLocation && (
            <CustomOverlay position={userLocation} zIndex={100} anchor="center">
              <div className="relative flex items-center justify-center w-12 h-12">
                <span
                  className="absolute inline-flex w-full h-full rounded-full opacity-50 animate-ping"
                  style={{ backgroundColor: "var(--main)" }}
                ></span>
                <span
                  className="relative inline-flex w-5 h-5 rounded-full border-4 border-white shadow-xl"
                  style={{ backgroundColor: "var(--main)" }}
                ></span>
                {/* Direction Arrow (Optional) */}
              </div>
            </CustomOverlay>
          )}

          {/* Builder Markers (Mock) */}
          {MOCK_BUILDERS.map((builder) => (
            <BuilderMarker
              key={builder.id}
              position={{ lat: builder.lat, lng: builder.lng }}
              name={builder.name}
              role={builder.role}
              description={builder.description}
            />
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
