"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Map as MapIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

type FilterType = "all" | "route" | "verified";

interface ConvoyHUDProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    safetyCount: number;
}

export function ConvoyHUD({ activeFilter, onFilterChange, safetyCount }: ConvoyHUDProps) {
    return (
        <div className="absolute top-4 left-4 right-4 z-40 flex flex-col gap-4 pointer-events-none md:flex-row md:justify-between md:items-start">
            {/* Search/Filter Bar */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border-2 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <FilterButton
                    active={activeFilter === "all"}
                    onClick={() => onFilterChange("all")}
                    icon={<Users className="h-4 w-4" />}
                    label="All Nomads"
                />
                <FilterButton
                    active={activeFilter === "route"}
                    onClick={() => onFilterChange("route")}
                    icon={<MapIcon className="h-4 w-4" />}
                    label="On Route"
                />
                <FilterButton
                    active={activeFilter === "verified"}
                    onClick={() => onFilterChange("verified")}
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label="Verified"
                />
            </div>

            {/* Right Side: Safety Ping & User Menu */}
            <div className="flex items-center gap-3">
                {/* Safety Ping */}
                <div className="pointer-events-auto flex items-center gap-3 rounded-full border-2 border-black bg-amber-400 px-4 py-2 font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-amber-400 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1/0.5)]">
                    <div className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-black"></span>
                    </div>
                    <span>{safetyCount} Verified Nearby</span>
                </div>

                {/* User Menu */}
                <div className="pointer-events-auto">
                    <UserMenu />
                </div>
            </div>
        </div>
    );
}

function FilterButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 rounded px-3 py-1.5 text-sm font-bold transition-all uppercase",
                active
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "hover:bg-zinc-100 text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            )}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
