"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Map as MapIcon, Users, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

type FilterType = "all" | "route" | "verified";

interface ConvoyHUDProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    safetyCount: number;
}

export function ConvoyHUD({ activeFilter, onFilterChange, safetyCount }: ConvoyHUDProps) {
    const [isSafetyDetailsOpen, setIsSafetyDetailsOpen] = useState(false);

    const SafetyPing = ({ mobile = false }: { mobile?: boolean }) => (
        <Dialog open={isSafetyDetailsOpen} onOpenChange={setIsSafetyDetailsOpen}>
            <DialogTrigger asChild>
                <div
                    className={cn(
                        "pointer-events-auto flex items-center gap-3 rounded-full border-2 border-black font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1/0.5)] cursor-pointer transition-transform hover:scale-105 active:scale-95 bg-white",
                        mobile ? "px-3 py-1.5 text-xs" : "px-4 py-2"
                    )}
                    style={{ backgroundColor: "var(--main)" }}
                >
                    <div className={cn("relative flex", mobile ? "h-2 w-2" : "h-3 w-3")}>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-75"></span>
                        <span className="relative inline-flex h-full w-full rounded-full bg-black"></span>
                    </div>
                    <span>{safetyCount} Verified Nearby</span>
                </div>
            </DialogTrigger>
            <DialogContent className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <DialogHeader>
                    <DialogTitle>Verified Nomads</DialogTitle>
                    <DialogDescription>
                        There are {safetyCount} verified users active in your area within the last hour.
                        <br /><br />
                        <strong>Safety Status:</strong> Green (Safe)
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );

    const SocialTrigger = () => (
        <Link href="/vibe">
            <Button
                className="pointer-events-auto h-12 w-12 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all bg-white p-0 flex items-center justify-center text-black"
            >
                <Heart className="h-6 w-6 fill-current" style={{ color: "var(--main)" }} />
            </Button>
        </Link>
    );

    return (
        <>
            {/* Top Bar (Filters & Safety Ping) */}
            <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start pointer-events-none">
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

                {/* Right Side (Desktop: User Menu & Social) */}
                <div className="flex items-center gap-4">
                    {/* Desktop User Menu & Social */}
                    <div className="hidden md:flex items-center gap-4 pointer-events-auto">
                        <SafetyPing />
                        <SocialTrigger />
                        <UserMenu />
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar (Social & User Menu) */}
            <div className="absolute bottom-6 left-4 right-4 z-40 flex md:hidden justify-between items-end pointer-events-none">
                <div className="pointer-events-auto">
                    <SafetyPing mobile />
                </div>
                <div className="flex items-center gap-4 pointer-events-auto">
                    <SocialTrigger />
                    <UserMenu />
                </div>
            </div>
        </>
    );
}

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
