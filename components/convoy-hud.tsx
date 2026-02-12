"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Map as MapIcon, Users, Heart, Settings, Palette, Layers, Edit2, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { MapStyleOptions, MapStyleMode } from "@/components/map-styles";
import { Slider } from "@/components/ui/slider";

type FilterType = "all" | "route" | "verified";

interface ConvoyHUDProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    safetyCount: number;
    mapSettings: MapStyleOptions;
    onMapSettingsChange: (settings: MapStyleOptions) => void;
    onCenterMap: () => void;
}

const SocialTrigger = () => (
    <Link href="/vibe">
        <Button
            className="pointer-events-auto h-12 w-12 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all bg-white p-0 flex items-center justify-center text-black"
        >
            <Heart className="h-6 w-6 fill-current" style={{ color: "var(--main)" }} />
        </Button>
    </Link>
);

export function ConvoyHUD({ activeFilter, onFilterChange, safetyCount, mapSettings, onMapSettingsChange, onCenterMap }: ConvoyHUDProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const SettingsDialog = () => (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white max-w-[320px] p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
                        <Settings className="h-5 w-5" /> Map Editor
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Adjust style and density.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-4 pb-6">
                    {/* Style Selector */}
                    <div className="space-y-2">
                        <h4 className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
                            <Palette className="h-3 w-3" /> Theme
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {(["default", "retro", "silver", "dark"] as MapStyleMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => onMapSettingsChange({ ...mapSettings, styleMode: mode })}
                                    className={cn(
                                        "px-2 py-1.5 rounded border-2 font-bold text-xs capitalize transition-all",
                                        mapSettings.styleMode === mode
                                            ? "border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                                            : "border-zinc-200 bg-white text-zinc-600 hover:border-black hover:text-black"
                                    )}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Density Sliders */}
                    <div className="space-y-2">
                        <h4 className="font-bold flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
                            <Layers className="h-3 w-3" /> Feature Density
                        </h4>
                        <div className="space-y-4 rounded-lg border-2 border-zinc-100 p-3 bg-zinc-50/50">
                            {/* Roads */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>Roads</span>
                                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">{["Off", "Low", "Med", "High"][mapSettings.roadDensity]}</span>
                                </div>
                                <Slider
                                    value={[mapSettings.roadDensity]}
                                    min={0}
                                    max={3}
                                    step={1}
                                    onValueChange={([v]) => onMapSettingsChange({ ...mapSettings, roadDensity: v })}
                                    className="cursor-pointer"
                                />
                            </div>

                            {/* Landmarks */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>Landmarks</span>
                                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">{["Off", "Low", "Med", "High"][mapSettings.landmarkDensity]}</span>
                                </div>
                                <Slider
                                    value={[mapSettings.landmarkDensity]}
                                    min={0}
                                    max={3}
                                    step={1}
                                    onValueChange={([v]) => onMapSettingsChange({ ...mapSettings, landmarkDensity: v })}
                                    className="cursor-pointer"
                                />
                            </div>

                            {/* Labels */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>Labels</span>
                                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">{["Off", "Low", "Med", "High"][mapSettings.labelDensity]}</span>
                                </div>
                                <Slider
                                    value={[mapSettings.labelDensity]}
                                    min={0}
                                    max={3}
                                    step={1}
                                    onValueChange={([v]) => onMapSettingsChange({ ...mapSettings, labelDensity: v })}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );

    return (
        <>
            <SettingsDialog />

            {/* Top Bar (Filters) */}
            <div className="absolute top-14 left-4 right-4 z-40 flex justify-between items-start pointer-events-none">
                {/* Filters (Left) */}
                <div className="pointer-events-auto flex items-center gap-2 rounded-lg border-2 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <FilterButton
                        active={activeFilter === "all"}
                        onClick={() => onFilterChange("all")}
                        icon={<Users className="h-4 w-4" />}
                        label="all"
                        fullLabel="All Nomads"
                    />
                    <FilterButton
                        active={activeFilter === "route"}
                        onClick={() => onFilterChange("route")}
                        icon={<MapIcon className="h-4 w-4" />}
                        label="route"
                        fullLabel="On Route"
                    />
                    <FilterButton
                        active={activeFilter === "verified"}
                        onClick={() => onFilterChange("verified")}
                        icon={<ShieldCheck className="h-4 w-4" />}
                        label="verified"
                        fullLabel="Verified"
                        badge={safetyCount}
                    />
                </div>

                {/* Right Side (Desktop: Social + User) */}
                <div className="hidden md:flex items-center gap-4 pointer-events-auto">
                    <SocialTrigger />
                    <UserMenu onOpenMapEditor={() => setIsSettingsOpen(true)} />
                </div>
            </div>

            {/* Mobile Bottom Bar (Social Left, User Right) */}
            <div className="absolute bottom-6 left-4 right-4 z-40 flex md:hidden justify-between items-end pointer-events-none">
                <div className="pointer-events-auto">
                    <SocialTrigger />
                </div>
                <div className="pointer-events-auto">
                    <UserMenu onOpenMapEditor={() => setIsSettingsOpen(true)} />
                </div>
            </div>
        </>
    );
}

// ... FilterButton ...

function FilterButton({ active, onClick, icon, label, fullLabel, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; fullLabel: string; badge?: number }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex items-center gap-2 rounded px-3 py-1.5 text-sm font-bold transition-all uppercase",
                active
                    ? "text-black dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
                    : "hover:bg-zinc-100 text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800 border-2 border-transparent"
            )}
            style={active ? { backgroundColor: "var(--main)" } : {}}
        >
            {icon}
            <span className="hidden sm:inline">{fullLabel}</span>
            <span className="sm:hidden">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-black border-2 border-white shadow-sm z-50" style={{ backgroundColor: "var(--main)" }}>
                    {badge}
                </span>
            )}
        </button>
    );
}
