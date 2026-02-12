"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { X, Heart, Undo2, MapPin, BadgeCheck, ArrowLeft, MessageCircle, ArrowUp, ArrowRight, ArrowLeft as ArrowLeftIcon } from "lucide-react";
import { PaywallModal } from "@/components/paywall-modal";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

// Mock Data
const PROFILES = [
    {
        id: 1,
        name: "Sarah & Mike",
        age: 28,
        description: "Vanlifers exploring the coast. Love surfing & coffee.",
        image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        distance: "2 mi",
        vehicle: "Sprinter 170",
        badge: "Builder",
    },
    {
        id: 2,
        name: "Alex",
        age: 32,
        description: "Solo traveler with a dog named Buster. Hiking enthusiast.",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        distance: "5 mi",
        vehicle: "Ford Transit",
        badge: "Hiker",
    },
    {
        id: 3,
        name: "The Wanderlust Fam",
        age: 35,
        description: "Full-time family on the road. Kids love playdates!",
        image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        distance: "8 mi",
        vehicle: "Skoolie",
        badge: "Family",
    },
    {
        id: 4,
        name: "Jessica",
        age: 26,
        description: "Digital nomad. Graphic designer looking for company.",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        distance: "12 mi",
        vehicle: "Promaster",
        badge: "Nomad",
    },
];

export default function VibePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | null>(null);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    // Auth guard
    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    const currentProfile = PROFILES[currentIndex % PROFILES.length];

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-12, 12]);
    const opacityLike = useTransform(x, [25, 100], [0, 1]);
    const opacityNope = useTransform(x, [-100, -25], [1, 0]);
    const opacityMessage = useTransform(y, [-100, -25], [1, 0]); // Swipe up (Message)
    const opacityDetails = useTransform(y, [25, 100], [0, 1]); // Swipe down (Details)

    const handleSwipe = useCallback((dir: "left" | "right" | "up" | "down") => {
        if (dir === "up") {
            setIsPaywallOpen(true);
            setTimeout(() => { x.set(0); y.set(0); }, 200);
            return;
        }
        if (dir === "down") {
            setShowDetails(true);
            setTimeout(() => { x.set(0); y.set(0); }, 200);
            return;
        }

        setExitDirection(dir);
        setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            setExitDirection(null);
            x.set(0);
            y.set(0);
        }, 250);
    }, [x, y]);

    const handleDragEnd = useCallback((_event: any, info: any) => {
        const xOffset = info.offset.x;
        const yOffset = info.offset.y;

        // Prioritize vertical swipes
        if (Math.abs(yOffset) > Math.abs(xOffset)) {
            if (yOffset < -80) handleSwipe("up"); // Drag Up -> Message
            else if (yOffset > 80) handleSwipe("down"); // Drag Down -> Details
        } else {
            if (xOffset > 80) handleSwipe("right");
            else if (xOffset < -80) handleSwipe("left");
        }
    }, [handleSwipe]);

    if (loading) return null;
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-background flex flex-col overflow-hidden font-public-sans">
            <PaywallModal open={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} userId={user?.uid} />

            {/* Details Modal (Swipe Down) */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 bg-background flex flex-col"
                    >
                        <div className="flex-1 overflow-y-auto pb-20">
                            {/* Hero Image */}
                            <div className="relative h-[50vh] w-full">
                                <img src={currentProfile.image} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="absolute top-4 right-4 h-10 w-10 bg-black/50 rounded-full text-white flex items-center justify-center backdrop-blur-sm"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                <div>
                                    <h2 className="text-3xl font-heading text-foreground">{currentProfile.name}, {currentProfile.age}</h2>
                                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                                        <BadgeCheck className="w-5 h-5 text-blue-500" />
                                        <span className="font-bold">{currentProfile.vehicle}</span>
                                        <span>·</span>
                                        <span>{currentProfile.badge}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-secondary-background rounded-base border-2 border-border">
                                    <h3 className="font-heading uppercase text-sm text-muted-foreground mb-2">About</h3>
                                    <p className="text-foreground leading-relaxed">
                                        {currentProfile.description}
                                    </p>
                                </div>

                                {/* Mock Gallery */}
                                <div className="grid grid-cols-2 gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="aspect-square bg-secondary-background rounded-base border-2 border-border flex items-center justify-center text-muted-foreground">
                                            <span className="text-xs font-bold">PHOTO {i}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between relative z-30">
                <Link
                    href="/map"
                    className="h-10 w-10 rounded-base border-2 border-border bg-secondary-background flex items-center justify-center text-foreground shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-heading uppercase tracking-tight text-foreground">
                    Vibe Zone
                </h1>
                <div className="w-10" />
            </div>

            {/* Card Stack */}
            <div className="flex-1 relative px-4 pb-2 pt-2 min-h-0">
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={currentIndex}
                        style={{ x, y, rotate }}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={
                            exitDirection === "left" || exitDirection === "right"
                                ? {
                                    x: exitDirection === "right" ? 400 : -400,
                                    opacity: 0,
                                    scale: 0.9,
                                    transition: { duration: 0.3 },
                                }
                                : undefined
                        }
                        transition={{ type: "spring", stiffness: 260, damping: 24 }}
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.7}
                        onDragEnd={handleDragEnd}
                        className="absolute inset-0 mx-4 mt-2 mb-2 cursor-grab active:cursor-grabbing"
                    >
                        {/* Overlays */}
                        {/* Like */}
                        <motion.div
                            style={{ opacity: opacityLike }}
                            className="absolute top-6 left-6 z-20 pointer-events-none -rotate-12 border-4 border-green-500 rounded-base px-3 py-1 bg-green-500/20"
                        >
                            <span className="text-2xl font-heading text-green-500 uppercase tracking-widest">Like</span>
                        </motion.div>
                        {/* Nope */}
                        <motion.div
                            style={{ opacity: opacityNope }}
                            className="absolute top-6 right-6 z-20 pointer-events-none rotate-12 border-4 border-red-500 rounded-base px-3 py-1 bg-red-500/20"
                        >
                            <span className="text-2xl font-heading text-red-500 uppercase tracking-widest">Nope</span>
                        </motion.div>
                        {/* Message (Swipe Up) */}
                        <motion.div
                            style={{ opacity: opacityMessage }}
                            className="absolute bottom-24 left-0 right-0 z-20 pointer-events-none flex justify-center"
                        >
                            <span className="text-2xl font-heading text-blue-500 uppercase tracking-widest bg-blue-500/20 border-4 border-blue-500 px-4 py-1 rounded-base transform -rotate-2">Message</span>
                        </motion.div>
                        {/* Details (Swipe Down) */}
                        <motion.div
                            style={{ opacity: opacityDetails }}
                            className="absolute top-24 left-0 right-0 z-20 pointer-events-none flex justify-center"
                        >
                            <span className="text-2xl font-heading text-yellow-500 uppercase tracking-widest bg-yellow-500/20 border-4 border-yellow-500 px-4 py-1 rounded-base transform rotate-2">Details</span>
                        </motion.div>

                        {/* Neobrutalist Card - Top Left Shadow */}
                        <div
                            className="w-full h-full rounded-base border-2 border-border overflow-hidden relative select-none bg-secondary-background"
                            style={{ boxShadow: "-4px -4px 0px 0px var(--border)" }}
                        >
                            {/* Image */}
                            <img
                                src={currentProfile.image}
                                alt={currentProfile.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                draggable={false}
                            />
                            {/* Bottom gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 via-[30%] to-transparent pointer-events-none" />

                            {/* Profile Info */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                                <h2 className="text-2xl font-heading tracking-tight leading-tight">
                                    {currentProfile.name}
                                    <span className="font-base text-white/60">, {currentProfile.age}</span>
                                </h2>
                                <div className="flex items-center gap-1.5 mt-1 text-sm font-base">
                                    <BadgeCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--main)" }} />
                                    <span className="font-bold text-white/90">{currentProfile.vehicle}</span>
                                    <span className="text-white/40">·</span>
                                    <MapPin className="w-3 h-3 text-white/50 shrink-0" />
                                    <span className="text-white/50">{currentProfile.distance}</span>
                                </div>
                                <span
                                    className="inline-block mt-2.5 px-3 py-0.5 rounded-base border-2 border-border text-[11px] font-heading uppercase tracking-wider"
                                    style={{ backgroundColor: "var(--main)", color: "var(--main-foreground)" }}
                                >
                                    {currentProfile.badge}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Action Buttons — Wider & Shorter */}
            <div className="relative z-10 pb-6 pt-2 flex items-center justify-center gap-4">
                {/* Rewind */}
                <button
                    onClick={() => setIsPaywallOpen(true)}
                    className="h-12 w-24 rounded-base border-2 border-border bg-main text-main-foreground flex flex-row items-center justify-center shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all gap-2"
                >
                    <Undo2 className="h-5 w-5" strokeWidth={2.5} />
                    <span className="text-xs font-bold uppercase tracking-wide">Undo</span>
                </button>

                {/* Message */}
                <button
                    onClick={() => setIsPaywallOpen(true)}
                    className="h-12 w-24 rounded-base border-2 border-border bg-blue-400 text-white flex flex-row items-center justify-center shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all gap-2"
                >
                    <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
                    <span className="text-xs font-bold uppercase tracking-wide">Msg</span>
                </button>
            </div>

            {/* Onboarding Guide Overlay */}
            <AnimatePresence>
                {showGuide && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center text-foreground p-6"
                        onClick={() => setShowGuide(false)}
                    >
                        <div className="relative w-full h-full max-w-sm flex flex-col justify-between py-20 px-8">
                            {/* Swipe Down (Details) */}
                            <div className="flex flex-col items-center gap-4 self-center">
                                <span className="font-black text-2xl uppercase tracking-[0.2em] text-foreground">Details</span>
                                <div className="p-4 rounded-full border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <ArrowUp className="w-8 h-8 text-black rotate-180" strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Middle Row */}
                            <div className="flex items-center justify-between w-full">
                                {/* Left (Skip) */}
                                <div className="flex flex-col items-center gap-4 -translate-y-8">
                                    <div className="p-4 rounded-full border-4 border-black bg-[#FF6B6B] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <ArrowLeftIcon className="w-8 h-8 text-black" strokeWidth={2.5} />
                                    </div>
                                    <span className="font-black text-lg uppercase tracking-[0.2em] text-[#FF6B6B]">Skip</span>
                                </div>

                                {/* Right (Like) */}
                                <div className="flex flex-col items-center gap-4 -translate-y-8">
                                    <div className="p-4 rounded-full border-4 border-black bg-[#4ECDC4] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <ArrowRight className="w-8 h-8 text-black" strokeWidth={2.5} />
                                    </div>
                                    <span className="font-black text-lg uppercase tracking-[0.2em] text-[#4ECDC4]">Like</span>
                                </div>
                            </div>

                            {/* Swipe Up (Message) */}
                            <div className="flex flex-col items-center gap-4 self-center">
                                <div className="p-4 rounded-full border-4 border-black bg-[#45B7D1] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <ArrowUp className="w-8 h-8 text-black" strokeWidth={2.5} />
                                </div>
                                <span className="font-black text-2xl uppercase tracking-[0.2em] text-[#45B7D1]">Message</span>
                            </div>
                        </div>

                        <div className="absolute bottom-10 flex items-center gap-2 animate-pulse">
                            <span className="text-sm font-black uppercase tracking-widest bg-black text-white px-3 py-1">Tap to Start</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
