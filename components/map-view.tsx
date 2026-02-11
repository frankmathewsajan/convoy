"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider"; // Added import
import { VectorOnboarding } from "@/components/vector-onboarding";
import { ConvoyHUD } from "@/components/convoy-hud";
import { BuilderMarker } from "@/components/builder-marker";

// Mock builders data
const MOCK_BUILDERS = [
  { id: 1, lat: 16.4971, lng: 80.4992, name: "VIT-AP Solar Lab", role: "Solar Research", description: "Experimental solar setups and battery testing." },
  { id: 2, lat: 16.5062, lng: 80.6480, name: "Vijayawada Van Works", role: "Full Build Specialist", description: "Custom cabinetry and electrical systems for travellers." },
  { id: 3, lat: 16.5193, lng: 80.6115, name: "Amaravati Diesel", role: "Mechanic", description: "Expertise in heavy vehicle maintenance and repairs." },
];

const MAP_ID = "DEMO_MAP_ID"; // In production, use a Map ID with "Vector" styling enabled
const DRIVING_MAP_STYLE = [
  {
    "featureType": "poi",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "transit",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  }
];


export default function MapView() {
  const [center, setCenter] = useState({ lat: 16.4971, lng: 80.4992 });
  const [zoom, setZoom] = useState(12);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasVector, setHasVector] = useState(false);
  const [filter, setFilter] = useState<"all" | "route" | "verified">("all");

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          // Only snap to user once initially or if tracking is enabled (simplified here)
          if (!userLocation) {
            setCenter(pos);
            setZoom(12);
          }
          setUserLocation(pos);
        },
        (error) => {
          console.error("Error getting location: ", error);
        }
      );
    }
  }, [userLocation]);

  // Get auth state for vector saving
  const { user, userData, refreshUserData } = useAuth();

  useEffect(() => {
    if (userData?.vector) {
      setHasVector(true);
    }
  }, [userData]);

  const handleSetVector = async (destination: string) => {
    console.log("Vector set to:", destination);
    setHasVector(true);

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

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
      <div className="relative w-full h-screen bg-zinc-100">

        {/* HUD Overlay */}
        <ConvoyHUD
          activeFilter={filter}
          onFilterChange={setFilter}
          safetyCount={3}
        />

        {/* Map */}
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          center={center}
          zoom={zoom}
          onCenterChanged={(ev) => setCenter(ev.detail.center)}
          onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
          mapId={MAP_ID}
          disableDefaultUI={true}
          style={{ width: "100%", height: "100%" }}
          gestureHandling={"greedy"}
        >
          {/* User Location Pulse */}
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="relative flex items-center justify-center w-8 h-8">
                <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-main/80"></span>
                <span className="relative inline-flex w-4 h-4 rounded-full bg-main border-2 border-white shadow-lg"></span>

                {/* Heading Indicator (Mock) */}
                <div className="absolute -top-6 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white">
                  YOU
                </div>
              </div>
            </AdvancedMarker>
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
