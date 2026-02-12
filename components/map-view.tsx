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

const MAP_ID = "DEMO_MAP_ID"; // In production, use a Map ID with "Vector" styling enabled

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

  const { user, userData, refreshUserData } = useAuth();
  const { theme, resolvedTheme } = useTheme();

  // Load Map Settings from Local Storage on Mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("convoy-map-settings");
    if (savedSettings) {
      try {
        setMapSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
      } catch (e) {
        console.error("Failed to parse map settings", e);
      }
    }
  }, []);

  // Save Map Settings to Local Storage
  useEffect(() => {
    localStorage.setItem("convoy-map-settings", JSON.stringify(mapSettings));
  }, [mapSettings]);

  const mapStyles = getMapStyle(theme, resolvedTheme === "dark" ? "dark" : "light", mapSettings);

  // ... (user location logic)

  // ...

  const handleCenterMap = () => {
    if (userLocation) {
      setCenter(userLocation);
      setZoom(15); // Zoom in when centering
    }
  };

  // ...

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
        />

        {/* Map */}
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          center={center}
          zoom={zoom}
          onCenterChanged={(ev) => setCenter(ev.detail.center)}
          onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
          mapId={null} // Remove Map ID to enforce local styles if needed, or keep it if concurrent. 
          // For local styles to work fully, we might need to remove MapId or ensure it doesn't conflict. 
          // But user asked for local styling. nulling mapId ensures local JSON works.
          styles={mapStyles}
          disableDefaultUI={true}
          style={{ width: "100%", height: "100%" }}
          gestureHandling={"greedy"}
        >
          {/* User Location Pulse */}
          {userLocation && (
            <CustomOverlay position={userLocation} zIndex={100}>
              <div className="relative flex items-center justify-center w-8 h-8">
                <span
                  className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping"
                  style={{ backgroundColor: "var(--main)" }}
                ></span>
                <span
                  className="relative inline-flex w-4 h-4 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: "var(--main)" }}
                ></span>

                {/* Heading Indicator (Mock) */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white whitespace-nowrap">
                  YOU
                </div>
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

        {/* Vector Onboarding (Show if no vector set) */}
        {!hasVector && (
          <VectorOnboarding onSetVector={handleSetVector} />
        )}
      </div>
    </APIProvider>
  );
}
