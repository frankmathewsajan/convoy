"use client";

import { CustomOverlay } from "@/components/custom-overlay";
import { NearbyNomad } from "@/hooks/use-nearby-nomads";
import { useState } from "react";
import { MapPin, Navigation, X } from "lucide-react";

// Theme color map — matches the app's theme system
const THEME_COLORS: Record<string, string> = {
    yellow: "#FFD700",
    blue: "#60A5FA",
    green: "#34D399",
    pink: "#F472B6",
    purple: "#A78BFA",
    orange: "#FB923C",
    red: "#F87171",
    teal: "#2DD4BF",
};

const ACTIVE_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

interface NomadMarkerProps {
    nomad: NearbyNomad;
    visible?: boolean;
}

export function NomadMarker({ nomad, visible = true }: NomadMarkerProps) {
    const [showInfo, setShowInfo] = useState(false);
    const color = THEME_COLORS[nomad.theme] || THEME_COLORS.yellow;

    const isRecentlyActive = nomad.lastLocationUpdate
        ? (Date.now() - nomad.lastLocationUpdate) < ACTIVE_THRESHOLD_MS
        : false;

    // Pin marker uses bottom anchor (tip on point), pulse uses center
    const anchor = isRecentlyActive ? "center" : "bottom";

    return (
        <CustomOverlay position={nomad.location} zIndex={50} anchor={anchor} visible={visible}>
            <div className="relative">
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="relative flex items-center justify-center cursor-pointer group"
                >
                    {isRecentlyActive ? (
                        /* Active: pulsing dot */
                        <div className="relative flex items-center justify-center w-10 h-10">
                            <span
                                className="absolute inline-flex w-8 h-8 rounded-full opacity-30 animate-pulse"
                                style={{ backgroundColor: color }}
                            />
                            <span
                                className="relative inline-flex w-4 h-4 rounded-full border-[3px] border-white shadow-lg"
                                style={{ backgroundColor: color }}
                            />
                        </div>
                    ) : (
                        /* Inactive: small themed pin marker */
                        <div style={{ filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.25))" }}>
                            <svg width="20" height="28" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M12 0C5.37258 0 0 5.37258 0 12C0 20.5 12 32 12 32C12 32 24 20.5 24 12C24 5.37258 18.6274 0 12 0Z"
                                    fill={color}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                                <circle cx="12" cy="12" r="5" fill="white" />
                            </svg>
                        </div>
                    )}
                </button>

                {/* Info popup */}
                {showInfo && (
                    <div
                        className={`absolute left-1/2 -translate-x-1/2 w-52 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 z-50 ${isRecentlyActive ? "bottom-12" : "bottom-14"
                            }`}
                        style={{ backgroundColor: "white" }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
                            className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-black"
                        >
                            <X className="h-3 w-3" />
                        </button>

                        {/* Color accent bar */}
                        <div className="absolute top-0 left-0 w-full h-1 rounded-t-md" style={{ backgroundColor: color }} />

                        {/* Name */}
                        <div className="flex items-center gap-2 mb-1.5 mt-1">
                            <div
                                className="w-3 h-3 rounded-full border border-black shrink-0"
                                style={{ backgroundColor: color }}
                            />
                            <p className="font-black text-sm text-black truncate">
                                {nomad.displayName}
                            </p>
                        </div>

                        {/* Active status */}
                        <div className="flex items-center gap-1.5 text-[10px] mb-1.5">
                            <span
                                className={`inline-flex w-1.5 h-1.5 rounded-full ${isRecentlyActive ? "animate-pulse" : ""}`}
                                style={{ backgroundColor: isRecentlyActive ? "#22c55e" : "#a1a1aa" }}
                            />
                            <span className={isRecentlyActive ? "text-green-600 font-bold" : "text-zinc-400"}>
                                {isRecentlyActive ? "Active now" : "Last seen a while ago"}
                            </span>
                        </div>

                        {/* Vector */}
                        {nomad.vector ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                                <Navigation className="h-3 w-3 shrink-0" style={{ color }} />
                                <span className="font-bold truncate">{nomad.vector}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="italic">No vector set</span>
                            </div>
                        )}

                        {/* Theme badge */}
                        <div className="mt-2 flex items-center gap-1">
                            <span
                                className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-black"
                                style={{ backgroundColor: color, color: "black" }}
                            >
                                {nomad.theme}
                            </span>
                        </div>

                        {/* Arrow */}
                        <div
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r-2 border-b-2 border-black"
                            style={{ backgroundColor: "white" }}
                        />
                    </div>
                )}
            </div>
        </CustomOverlay>
    );
}
