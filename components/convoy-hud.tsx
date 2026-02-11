"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Map as MapIcon, Users, Heart, X, Check, Undo2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";
import { PaywallModal } from "@/components/paywall-modal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type FilterType = "all" | "route" | "verified";

interface Profile {
    id: number;
    name: string;
    age: number;
    description: string;
    image: string;
    distance: string;
}

const DUMMY_PROFILES: Profile[] = [
    { id: 1, name: "Sarah & Mike", age: 28, description: "Vanlifers exploring the coast. Love surfing & coffee.", image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", distance: "2 miles away" },
    { id: 2, name: "Alex", age: 32, description: "Solo traveler with a dog named Buster. Hiking enthusiast.", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", distance: "5 miles away" },
    { id: 3, name: "The Wanderlust Fam", age: 35, description: "Full-time family on the road. Kids love playdates!", image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", distance: "8 miles away" },
    { id: 4, name: "Jessica", age: 26, description: "Digital nomad looking for good wifi and better company.", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", distance: "12 miles away" },
];

interface ConvoyHUDProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    safetyCount: number;
}

export function ConvoyHUD({ activeFilter, onFilterChange, safetyCount }: ConvoyHUDProps) {
    const [isSafetyDetailsOpen, setIsSafetyDetailsOpen] = useState(false);
    const [isSocialOpen, setIsSocialOpen] = useState(false);
    const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);

    // Logic for Paywall Trigger
    const handleRewind = () => {
        // Trigger Paywall for rewind action (Simulating non-pro user)
        setIsPaywallOpen(true);
    };

    const handleSkip = () => {
        if (currentProfileIndex < DUMMY_PROFILES.length - 1) {
            setCurrentProfileIndex(prev => prev + 1);
        } else {
            setCurrentProfileIndex(0); // Loop back for demo
        }
    };

    const handleConnect = () => {
        // Here we would send a connection request
        alert(`Request sent to ${DUMMY_PROFILES[currentProfileIndex].name}!`);
        handleSkip();
    };

    const currentProfile = DUMMY_PROFILES[currentProfileIndex];

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
        <Dialog open={isSocialOpen} onOpenChange={setIsSocialOpen}>
            <DialogTrigger asChild>
                <Button
                    className="pointer-events-auto h-12 w-12 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all bg-white p-0 flex items-center justify-center text-black"
                >
                    <Heart className="h-6 w-6 fill-current" style={{ color: "var(--main)" }} />
                </Button>
            </DialogTrigger>
            <DialogContent className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-sm sm:max-w-md p-0 overflow-hidden bg-gray-50">
                {/* Profile Card Stack */}
                <div className="relative h-[500px] w-full flex flex-col">
                    {/* Image & Overlay */}
                    <div className="relative flex-grow bg-black">
                        <img
                            src={currentProfile.image}
                            alt={currentProfile.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                        <div className="absolute bottom-20 left-6 text-white text-left">
                            <h3 className="text-3xl font-black drop-shadow-md">{currentProfile.name}, {currentProfile.age}</h3>
                            <p className="font-bold text-gray-200 drop-shadow-md flex items-center gap-1">
                                <MapIcon className="h-4 w-4" /> {currentProfile.distance}
                            </p>
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="bg-white p-6 border-t-2 border-black text-left">
                        <p className="text-gray-600 font-medium mb-4 line-clamp-2">{currentProfile.description}</p>
                    </div>

                    {/* Actions Bar */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 px-4">
                        {/* Rewind (Paywall Trigger) */}
                        <Button
                            onClick={handleRewind}
                            className="h-12 w-12 rounded-full border-2 border-black bg-yellow-400 text-black hover:bg-yellow-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-transform active:scale-95"
                        >
                            <Undo2 className="h-6 w-6" />
                        </Button>

                        {/* Skip */}
                        <Button
                            onClick={handleSkip}
                            className="h-14 w-14 rounded-full border-2 border-black bg-white text-red-500 hover:bg-red-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-transform active:scale-95"
                        >
                            <X className="h-8 w-8" />
                        </Button>

                        {/* Connect */}
                        <Button
                            onClick={handleConnect}
                            className="h-14 w-14 rounded-full border-2 border-black bg-white text-green-500 hover:bg-green-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-transform active:scale-95"
                        >
                            <Check className="h-8 w-8" />
                        </Button>

                        {/* Info/Details */}
                        <Button
                            variant="ghost"
                            className="h-10 w-10 rounded-full text-white/80 hover:bg-white/20 absolute top-4 right-4"
                        >
                            <Info className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );

    return (
        <>
            <PaywallModal open={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />

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
                        <SocialTrigger />
                        <UserMenu />
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar (Social & User Menu) */}
            <div className="absolute bottom-6 left-4 right-4 z-40 flex md:hidden justify-between items-end pointer-events-none">
                <div className="pointer-events-auto">
                    <SocialTrigger />
                </div>
                <div className="pointer-events-auto">
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
