"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Heart, Undo2, MapPin, BadgeCheck, ArrowLeft, MessageCircle, ArrowUp, ArrowRight, ArrowLeft as ArrowLeftIcon, Loader2, Sparkles, Car, UserCircle, FileText, Tag, Camera, ImagePlus, Send, RefreshCw } from "lucide-react";
import { PaywallModal } from "@/components/paywall-modal";
import imageCompression from "browser-image-compression";
import { WebcamCapture } from "@/components/webcam-capture";
import { useAuth } from "@/components/auth-provider";
import { useVibeUsers, VibeUser } from "@/hooks/use-vibe-users";
import {
    sendVibeLike,
    removeVibeLike,
    recordInteraction,
    removeInteraction,
    getSeenUserIds,
    useVibeLikesReceived,
    markLikesSeen,
    sendVibeMessage,
} from "@/hooks/use-vibe-likes";
import { db } from "@/lib/firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import Link from "next/link";

// Badge options for the setup form
const BADGE_OPTIONS = ["Nomad", "Builder", "Hiker", "Surfer", "Family", "Solo", "Digital Nomad", "Photographer", "Climber", "Cyclist"];
const VEHICLE_OPTIONS = ["Sprinter 170", "Sprinter 144", "Ford Transit", "Promaster", "Skoolie", "Truck Camper", "Car Camper", "Converted Bus", "RV/Motorhome", "Trailer", "Other"];

// Theme colors for card accents
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

/* ============================================================
   VIBE PROFILE SETUP — shown when vibeActive is not true
   ============================================================ */
function VibeSetup({ onComplete }: { onComplete: () => void }) {
    const { user, userData, refreshUserData } = useAuth();
    const [saving, setSaving] = useState(false);

    // Form state — auto-fill from existing userData
    const [displayName, setDisplayName] = useState(userData?.displayName || "");
    const [age, setAge] = useState<string>(userData?.vibeProfile?.age?.toString() || "");
    const [description, setDescription] = useState(userData?.vibeProfile?.description || "");
    const [vehicle, setVehicle] = useState(userData?.vibeProfile?.vehicle || "");
    const [badge, setBadge] = useState(userData?.vibeProfile?.badge || "");
    const [photos, setPhotos] = useState<string[]>(userData?.vibeProfile?.photos || []);
    const [uploading, setUploading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    // Auto-skip to the first incomplete step
    const computeInitialStep = () => {
        const name = userData?.displayName || "";
        const existingAge = userData?.vibeProfile?.age;
        const existingVehicle = userData?.vibeProfile?.vehicle || "";
        const existingBadge = userData?.vibeProfile?.badge || "";
        const existingPhotos = userData?.vibeProfile?.photos || [];
        const existingDesc = userData?.vibeProfile?.description || "";

        if (name.trim().length < 2) return 0;
        if (!existingAge || existingAge <= 0) return 1;
        if (!existingVehicle) return 2;
        if (!existingBadge) return 3;
        if (existingPhotos.length === 0) return 4;
        if (existingDesc.trim().length < 5) return 5;
        return 0; // All filled — show from start (shouldn't happen since they'd be vibeActive)
    };

    const [step, setStep] = useState(computeInitialStep);

    const steps = [
        { title: "Your Name", subtitle: "How should other nomads know you?" },
        { title: "Your Age", subtitle: "Just a number, no judgement" },
        { title: "Your Rig", subtitle: "What are you rolling in?" },
        { title: "Your Vibe", subtitle: "Pick a badge that fits" },
        { title: "Your Photos", subtitle: "Show off your rig and adventures" },
        { title: "Your Bio", subtitle: "Tell the world about your journey" },
    ];

    const canProceed = () => {
        switch (step) {
            case 0: return displayName.trim().length >= 2;
            case 1: return age.trim().length > 0 && Number(age) > 0;
            case 2: return vehicle.length > 0;
            case 3: return badge.length > 0;
            case 4: return photos.length > 0;
            case 5: return description.trim().length >= 5;
            default: return false;
        }
    };

    /**
     * Process and upload a list of files (from input or camera).
     * Applies "magic" client-side compression for speed.
     */
    const processAndUploadFiles = async (fileList: File[]) => {
        if (!user || fileList.length === 0) return;
        setUploading(true);

        try {
            const token = await user.getIdToken();
            const { uploadVibePhoto } = await import("@/app/actions/upload-actions");
            const newUrls: string[] = [];

            // Compression options: max 1MB, max 1920px (fast & good quality)
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.8,
            };

            for (let i = 0; i < Math.min(fileList.length, 4 - photos.length); i++) {
                let file = fileList[i];

                // "Magic": Compress if it's an image
                if (file.type.startsWith("image/")) {
                    try {
                        file = await imageCompression(file, options);
                    } catch (error) {
                        console.error("Compression failed, using original:", error);
                    }
                }

                const formData = new FormData();
                formData.append("photo", file);

                const result = await uploadVibePhoto(token, formData);

                if (result.success && result.url) {
                    newUrls.push(result.url);
                } else {
                    console.error("Upload failed:", result.error);
                }
            }

            setPhotos((prev) => [...prev, ...newUrls].slice(0, 4));
        } catch (err) {
            console.error("Error uploading photos:", err);
        } finally {
            setUploading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        await processAndUploadFiles(Array.from(files));
        e.target.value = ""; // Reset input
    };

    const removePhoto = (idx: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const token = await user.getIdToken();
            const userRef = doc(db, "users", user.uid);
            // Client-side update
            await updateDoc(userRef, {
                displayName: displayName.trim(),
                "vibeProfile.age": Number(age) || 0, // Dot notation for nested fields
                "vibeProfile.description": description.trim(),
                "vibeProfile.vehicle": vehicle,
                "vibeProfile.badge": badge,
                "vibeProfile.photos": photos,
                vibeActive: true
            });

            // Success simulated
            const result = { success: true, error: null };

            if (result.error) {
                console.error("Save error:", result.error);
                return;
            }

            await refreshUserData();
            onComplete();
        } catch (err) {
            console.error("Error saving vibe profile:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background flex flex-col overflow-hidden font-public-sans z-50">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <Link
                    href="/map"
                    className="h-10 w-10 rounded-base border-2 border-border bg-secondary-background flex items-center justify-center text-foreground shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-heading uppercase tracking-tight text-foreground">
                    Activate Vibing
                </h1>
                <div className="w-10" />
            </div>

            {/* Progress bar */}
            <div className="px-6 pt-2">
                <div className="flex gap-1.5">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 h-1.5 rounded-full transition-all duration-300"
                            style={{
                                backgroundColor: i <= step ? "var(--main)" : "var(--border)",
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Step content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className="w-full max-w-sm space-y-6"
                    >
                        {/* Icon + Title */}
                        <div className="text-center space-y-2">
                            <div className="inline-flex p-3 rounded-full border-2 border-border bg-white shadow-shadow mb-2"
                                style={{ color: "var(--main)" }}>
                                {step === 0 && <UserCircle className="h-8 w-8" />}
                                {step === 1 && <Sparkles className="h-8 w-8" />}
                                {step === 2 && <Car className="h-8 w-8" />}
                                {step === 3 && <Tag className="h-8 w-8" />}
                                {step === 4 && <Camera className="h-8 w-8" />}
                                {step === 5 && <FileText className="h-8 w-8" />}
                            </div>
                            <h2 className="text-2xl font-heading text-foreground">{steps[step].title}</h2>
                            <p className="text-sm text-muted-foreground">{steps[step].subtitle}</p>
                        </div>

                        {/* Components for each step */}
                        {step === 0 && (
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name or crew name"
                                className="w-full px-4 py-3 rounded-base border-2 border-border bg-white text-foreground font-bold text-lg shadow-shadow focus:outline-none focus:ring-2 focus:ring-[var(--main)]"
                                autoFocus
                            />
                        )}

                        {step === 1 && (
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="Your age"
                                min={1}
                                max={120}
                                className="w-full px-4 py-3 rounded-base border-2 border-border bg-white text-foreground font-bold text-lg shadow-shadow focus:outline-none focus:ring-2 focus:ring-[var(--main)] text-center"
                                autoFocus
                            />
                        )}

                        {step === 2 && (
                            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                {VEHICLE_OPTIONS.map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setVehicle(v)}
                                        className={`px-3 py-2.5 rounded-base border-2 text-sm font-bold transition-all ${vehicle === v
                                            ? "border-black shadow-shadow text-black"
                                            : "border-border text-muted-foreground hover:border-black"
                                            }`}
                                        style={vehicle === v ? { backgroundColor: "var(--main)" } : {}}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {BADGE_OPTIONS.map((b) => (
                                    <button
                                        key={b}
                                        onClick={() => setBadge(b)}
                                        className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-all ${badge === b
                                            ? "border-black shadow-shadow text-black"
                                            : "border-border text-muted-foreground hover:border-black"
                                            }`}
                                        style={badge === b ? { backgroundColor: "var(--main)" } : {}}
                                    >
                                        {b}
                                    </button>
                                ))}
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {photos.map((url, i) => (
                                        <div key={i} className="relative aspect-square rounded-base border-2 border-border overflow-hidden group">
                                            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removePhoto(i)}
                                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                    {photos.length < 4 && !uploading && (
                                        <>
                                            {/* Camera capture */}
                                            <button
                                                onClick={() => setShowCamera(true)}
                                                type="button"
                                                className="aspect-square rounded-base border-2 border-dashed border-border bg-secondary-background flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors"
                                            >
                                                <Camera className="h-6 w-6 text-muted-foreground" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                                                    Take Photo
                                                </span>
                                            </button>

                                            {/* Gallery picker */}
                                            <label className="aspect-square rounded-base border-2 border-dashed border-border bg-secondary-background flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handlePhotoUpload}
                                                    className="hidden"
                                                />
                                                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                                                    Gallery
                                                </span>
                                            </label>
                                        </>
                                    )}
                                    {photos.length < 4 && uploading && (
                                        <div className="aspect-square rounded-base border-2 border-dashed border-border bg-secondary-background flex flex-col items-center justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                                                Optimizing...
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                    Show your rig, your vibe, or your view. Max 4 photos.
                                </p>
                            </div>
                        )}

                        {step === 5 && (
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Tell nomads about yourself, your travels, what you're looking for..."
                                rows={4}
                                className="w-full px-4 py-3 rounded-base border-2 border-border bg-white text-foreground text-sm shadow-shadow focus:outline-none focus:ring-2 focus:ring-[var(--main)] resize-none"
                                autoFocus
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Webcam Modal */}
            <WebcamCapture
                open={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={(file) => {
                    processAndUploadFiles([file]);
                }}
            />

            {/* Bottom buttons */}
            <div className="px-6 pb-8 flex gap-3">
                {step > 0 && (
                    <button
                        onClick={() => setStep(step - 1)}
                        className="h-12 flex-1 rounded-base border-2 border-border bg-secondary-background text-foreground font-bold uppercase tracking-wide text-sm shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all"
                    >
                        Back
                    </button>
                )}
                {step < steps.length - 1 ? (
                    <button
                        onClick={() => canProceed() && setStep(step + 1)}
                        disabled={!canProceed()}
                        className="h-12 flex-1 rounded-base border-2 border-border text-black font-bold uppercase tracking-wide text-sm shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none"
                        style={{ backgroundColor: "var(--main)" }}
                    >
                        Next
                    </button>
                ) : (
                    <button
                        onClick={handleSave}
                        disabled={!canProceed() || saving}
                        className="h-12 flex-1 rounded-base border-2 border-border text-black font-bold uppercase tracking-wide text-sm shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                        style={{ backgroundColor: "var(--main)" }}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {saving ? "Saving..." : "Start Vibing"}
                    </button>
                )}
            </div>
        </div>
    );
}

/* ============================================================
   MAIN VIBE PAGE — swipe cards with real user data
   ============================================================ */
export default function VibePage() {
    const { user, userData, loading, isPro, refreshProStatus, refreshUserData } = useAuth();
    const router = useRouter();
    const { users: vibeUsers, loading: usersLoading } = useVibeUsers(user?.uid);
    const { likes: receivedLikes, loading: likesLoading } = useVibeLikesReceived(user?.uid);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | null>(null);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [showToast, setShowToast] = useState<string | null>(null);
    const [showSetup, setShowSetup] = useState(false);

    // New states for likes & messaging
    const [activeTab, setActiveTab] = useState<"discover" | "likes">("discover");
    const [seenUserIds, setSeenUserIds] = useState<Set<string>>(new Set());
    const [history, setHistory] = useState<{ uid: string; action: "like" | "skip" }[]>([]);
    const [showMessageDialog, setShowMessageDialog] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const messageInputRef = useRef<HTMLInputElement>(null);

    // Auth guard
    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    // Show setup if vibeActive is not true OR if they have no photos
    useEffect(() => {
        if (!loading && userData) {
            if (!userData.vibeActive) {
                setShowSetup(true);
            } else if (!userData.vibeProfile?.photos || userData.vibeProfile.photos.length === 0) {
                setShowSetup(true);
            }
        }
    }, [loading, userData]);

    // Load seen user IDs on mount
    useEffect(() => {
        if (user?.uid) {
            getSeenUserIds(user.uid).then(setSeenUserIds);
        }
    }, [user?.uid]);

    // Mark likes as seen when user views the Likes tab
    useEffect(() => {
        if (activeTab === "likes" && user?.uid && (userData?.vibeLikesReceived || 0) > 0) {
            markLikesSeen(user.uid);
        }
    }, [activeTab, user?.uid, userData?.vibeLikesReceived]);

    // Auto-dismiss toast
    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => setShowToast(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    // Focus message input when dialog opens
    useEffect(() => {
        if (showMessageDialog) {
            setTimeout(() => messageInputRef.current?.focus(), 200);
        }
    }, [showMessageDialog]);

    const currentProfile = vibeUsers[currentIndex % Math.max(vibeUsers.length, 1)] || null;
    const color = currentProfile ? (THEME_COLORS[currentProfile.theme] || THEME_COLORS.yellow) : THEME_COLORS.yellow;
    const isSeenBefore = currentProfile ? seenUserIds.has(currentProfile.uid) : false;

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-12, 12]);
    const opacityLike = useTransform(x, [25, 100], [0, 1]);
    const opacityNope = useTransform(x, [-100, -25], [1, 0]);
    const opacityMessage = useTransform(y, [-100, -25], [1, 0]);
    const opacityDetails = useTransform(y, [25, 100], [0, 1]);

    const handleSwipe = useCallback(async (dir: "left" | "right" | "up" | "down") => {
        if (!currentProfile || !user) return;

        if (dir === "up") {
            if (isPro) {
                setShowMessageDialog(true);
            } else {
                setIsPaywallOpen(true);
            }
            setTimeout(() => { x.set(0); y.set(0); }, 200);
            return;
        }
        if (dir === "down") {
            setShowDetails(true);
            setTimeout(() => { x.set(0); y.set(0); }, 200);
            return;
        }

        // Record interaction (seen)
        recordInteraction(user.uid, currentProfile.uid);
        setSeenUserIds((prev) => new Set(prev).add(currentProfile.uid));

        if (dir === "right") {
            // Like!
            sendVibeLike(
                user.uid,
                currentProfile.uid,
                userData?.displayName || "Someone",
                userData?.photoURL || undefined,
                userData?.theme || "yellow"
            );
            setHistory((prev) => [...prev, { uid: currentProfile.uid, action: "like" }]);
        } else {
            // Skip
            setHistory((prev) => [...prev, { uid: currentProfile.uid, action: "skip" }]);
        }

        setExitDirection(dir);
        setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            setExitDirection(null);
            x.set(0);
            y.set(0);
        }, 250);
    }, [x, y, isPro, currentProfile, user, userData]);

    const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const xOffset = info.offset.x;
        const yOffset = info.offset.y;

        if (Math.abs(yOffset) > Math.abs(xOffset)) {
            if (yOffset < -80) handleSwipe("up");
            else if (yOffset > 80) handleSwipe("down");
        } else {
            if (xOffset > 80) handleSwipe("right");
            else if (xOffset < -80) handleSwipe("left");
        }
    }, [handleSwipe]);

    const handleUndo = async () => {
        if (!user) return;
        if (isPro) {
            if (currentIndex > 0 && history.length > 0) {
                const lastAction = history[history.length - 1];
                // Remove interaction
                removeInteraction(user.uid, lastAction.uid);
                setSeenUserIds((prev) => {
                    const next = new Set(prev);
                    next.delete(lastAction.uid);
                    return next;
                });
                // Remove like if it was a like
                if (lastAction.action === "like") {
                    removeVibeLike(user.uid, lastAction.uid);
                }
                setHistory((prev) => prev.slice(0, -1));
                setCurrentIndex((prev) => prev - 1);
            } else {
                setShowToast("Nothing to undo!");
            }
        } else {
            setIsPaywallOpen(true);
        }
    };

    const handleMessage = () => {
        if (isPro) {
            setShowMessageDialog(true);
        } else {
            setIsPaywallOpen(true);
        }
    };

    const handleSendMessage = async () => {
        if (!user || !currentProfile || !messageText.trim()) return;
        setSendingMessage(true);
        try {
            await sendVibeMessage(
                user.uid,
                currentProfile.uid,
                messageText.trim(),
                userData?.displayName || undefined
            );
            setShowToast(`Message sent to ${currentProfile.displayName}!`);
            setMessageText("");
            setShowMessageDialog(false);
        } catch (err) {
            console.error("Error sending message:", err);
            setShowToast("Failed to send message");
        } finally {
            setSendingMessage(false);
        }
    };

    if (loading) return null;
    if (!user) return null;

    // Show vibe setup flow
    if (showSetup) {
        return <VibeSetup onComplete={() => { setShowSetup(false); refreshUserData(); }} />;
    }

    // Placeholder image for users without photos
    const getProfileImage = (profile: VibeUser) => {
        if (profile.photos && profile.photos.length > 0) return profile.photos[0];
        if (profile.photoURL) return profile.photoURL;
        return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.displayName)}&backgroundColor=f59e0b`;
    };

    return (
        <div className="fixed inset-0 bg-background flex flex-col overflow-hidden font-public-sans">
            <PaywallModal
                open={isPaywallOpen}
                onClose={() => setIsPaywallOpen(false)}
                userId={user?.uid}
                onPurchaseSuccess={refreshProStatus}
            />

            {/* Toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 bg-black text-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] font-bold text-sm"
                    >
                        {showToast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Message Dialog */}
            <AnimatePresence>
                {showMessageDialog && currentProfile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => setShowMessageDialog(false)}
                    >
                        <motion.div
                            initial={{ y: 200, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 200, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full max-w-md bg-white rounded-t-2xl border-t-2 border-x-2 border-black p-4 pb-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <img
                                    src={getProfileImage(currentProfile)}
                                    alt={currentProfile.displayName}
                                    className="w-10 h-10 rounded-full border-2 border-black object-cover"
                                />
                                <div>
                                    <p className="font-black text-sm">{currentProfile.displayName}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Quick Message</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    ref={messageInputRef}
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Say something nice..."
                                    className="flex-1 px-4 py-2.5 rounded-base border-2 border-border bg-secondary-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--main)]"
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageText.trim() || sendingMessage}
                                    className="h-10 w-10 rounded-base border-2 border-black flex items-center justify-center shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all disabled:opacity-40"
                                    style={{ backgroundColor: "var(--main)" }}
                                >
                                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Details Modal */}
            <AnimatePresence>
                {showDetails && currentProfile && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 bg-background flex flex-col"
                    >
                        <div className="flex-1 overflow-y-auto pb-20">
                            <div className="relative h-[50vh] w-full">
                                <img src={getProfileImage(currentProfile)} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="absolute top-4 right-4 h-10 w-10 bg-black/50 rounded-full text-white flex items-center justify-center backdrop-blur-sm"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <h2 className="text-3xl font-heading text-foreground">
                                        {currentProfile.displayName}
                                        {currentProfile.age && <span className="text-muted-foreground">, {currentProfile.age}</span>}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                                        <BadgeCheck className="w-5 h-5" style={{ color }} />
                                        <span className="font-bold">{currentProfile.vehicle}</span>
                                        <span>·</span>
                                        <span>{currentProfile.badge}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-secondary-background rounded-base border-2 border-border">
                                    <h3 className="font-heading uppercase text-sm text-muted-foreground mb-2">About</h3>
                                    <p className="text-foreground leading-relaxed">
                                        {currentProfile.description || "No bio yet."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header with Discover / Likes tabs */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between relative z-30">
                <Link
                    href="/map"
                    className="h-10 w-10 rounded-base border-2 border-border bg-secondary-background flex items-center justify-center text-foreground shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                {/* Tab toggle */}
                <div className="flex bg-secondary-background rounded-base border-2 border-border overflow-hidden">
                    <button
                        onClick={() => setActiveTab("discover")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "discover"
                            ? "text-black"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        style={activeTab === "discover" ? { backgroundColor: "var(--main)" } : {}}
                    >
                        Discover
                    </button>
                    <button
                        onClick={() => setActiveTab("likes")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === "likes"
                            ? "text-black"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        style={activeTab === "likes" ? { backgroundColor: "var(--main)" } : {}}
                    >
                        Likes
                        {(userData?.vibeLikesReceived || 0) > 0 && activeTab !== "likes" && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                                {userData?.vibeLikesReceived}
                            </span>
                        )}
                    </button>
                </div>

                <div className="w-10" />
            </div>

            {/* ============ LIKES TAB ============ */}
            {activeTab === "likes" && (
                <div className="flex-1 overflow-y-auto px-4 pb-8">
                    {likesLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--main)" }} />
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading likes...</p>
                        </div>
                    ) : receivedLikes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                            <div className="p-4 rounded-full border-2 border-border bg-secondary-background" style={{ color: "var(--main)" }}>
                                <Heart className="h-10 w-10" />
                            </div>
                            <h2 className="text-xl font-heading text-foreground">No Likes Yet</h2>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                When someone likes you in the Vibe Zone, they&apos;ll show up here!
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">
                                {receivedLikes.length} {receivedLikes.length === 1 ? "person" : "people"} liked you
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {receivedLikes.map((like) => {
                                    const likeColor = THEME_COLORS[like.fromTheme || "yellow"] || THEME_COLORS.yellow;
                                    const photoUrl = like.fromPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(like.fromName || "?")}&backgroundColor=f59e0b`;
                                    return (
                                        <div
                                            key={like.from}
                                            className="rounded-base border-2 border-border overflow-hidden bg-secondary-background shadow-shadow"
                                        >
                                            <div className="aspect-square relative">
                                                <img src={photoUrl} className="w-full h-full object-cover" alt={like.fromName || "User"} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <p className="text-white font-black text-sm truncate">{like.fromName || "Anonymous"}</p>
                                                </div>
                                            </div>
                                            <div className="p-2 flex items-center gap-1.5">
                                                <Heart className="h-3 w-3 fill-current" style={{ color: likeColor }} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Liked you</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ============ DISCOVER TAB ============ */}
            {activeTab === "discover" && (
                <>
                    {/* Card Stack */}
                    <div className="flex-1 relative px-4 pb-2 pt-2 min-h-0">
                        {/* Loading state */}
                        {usersLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20">
                                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--main)" }} />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Finding nomads...</p>
                            </div>
                        )}

                        {/* No users */}
                        {!usersLoading && vibeUsers.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 px-8 text-center">
                                <div className="p-4 rounded-full border-2 border-border bg-secondary-background" style={{ color: "var(--main)" }}>
                                    <Heart className="h-10 w-10" />
                                </div>
                                <h2 className="text-xl font-heading text-foreground">No Vibers Nearby</h2>
                                <p className="text-sm text-muted-foreground">
                                    No one is vibing yet. Be the first to activate your vibe profile and others will start showing up!
                                </p>
                                <Link
                                    href="/map"
                                    className="mt-2 px-6 py-2.5 rounded-base border-2 border-border font-bold text-sm uppercase shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all"
                                    style={{ backgroundColor: "var(--main)" }}
                                >
                                    Back to Map
                                </Link>
                            </div>
                        )}

                        {/* Cards */}
                        {!usersLoading && vibeUsers.length > 0 && currentProfile && (
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
                                    <motion.div
                                        style={{ opacity: opacityLike }}
                                        className="absolute top-6 left-6 z-20 pointer-events-none -rotate-12 border-4 border-green-500 rounded-base px-3 py-1 bg-green-500/20"
                                    >
                                        <span className="text-2xl font-heading text-green-500 uppercase tracking-widest">Like</span>
                                    </motion.div>
                                    <motion.div
                                        style={{ opacity: opacityNope }}
                                        className="absolute top-6 right-6 z-20 pointer-events-none rotate-12 border-4 border-red-500 rounded-base px-3 py-1 bg-red-500/20"
                                    >
                                        <span className="text-2xl font-heading text-red-500 uppercase tracking-widest">Nope</span>
                                    </motion.div>
                                    <motion.div
                                        style={{ opacity: opacityMessage }}
                                        className="absolute bottom-24 left-0 right-0 z-20 pointer-events-none flex justify-center"
                                    >
                                        <span className="text-2xl font-heading text-blue-500 uppercase tracking-widest bg-blue-500/20 border-4 border-blue-500 px-4 py-1 rounded-base transform -rotate-2">Message</span>
                                    </motion.div>
                                    <motion.div
                                        style={{ opacity: opacityDetails }}
                                        className="absolute top-24 left-0 right-0 z-20 pointer-events-none flex justify-center"
                                    >
                                        <span className="text-2xl font-heading text-yellow-500 uppercase tracking-widest bg-yellow-500/20 border-4 border-yellow-500 px-4 py-1 rounded-base transform rotate-2">Details</span>
                                    </motion.div>

                                    {/* Card */}
                                    <div
                                        className="w-full h-full rounded-base border-2 border-border overflow-hidden relative select-none bg-secondary-background"
                                        style={{ boxShadow: "-4px -4px 0px 0px var(--border)" }}
                                    >
                                        <img
                                            src={getProfileImage(currentProfile)}
                                            alt={currentProfile.displayName}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            draggable={false}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 via-[30%] to-transparent pointer-events-none" />

                                        {/* Seen Before badge */}
                                        {isSeenBefore && (
                                            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/20">
                                                <RefreshCw className="h-3 w-3 text-white/80" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Seen Before</span>
                                            </div>
                                        )}

                                        {/* Profile Info */}
                                        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                                            <h2 className="text-2xl font-heading tracking-tight leading-tight">
                                                {currentProfile.displayName}
                                                {currentProfile.age && (
                                                    <span className="font-base text-white/60">, {currentProfile.age}</span>
                                                )}
                                            </h2>
                                            <div className="flex items-center gap-1.5 mt-1 text-sm font-base">
                                                <BadgeCheck className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                                                <span className="font-bold text-white/90">{currentProfile.vehicle}</span>
                                                <span className="text-white/40">·</span>
                                                <MapPin className="w-3 h-3 text-white/50 shrink-0" />
                                                <span className="text-white/50">Nearby</span>
                                            </div>
                                            <span
                                                className="inline-block mt-2.5 px-3 py-0.5 rounded-base border-2 border-white/30 text-[11px] font-heading uppercase tracking-wider"
                                                style={{ backgroundColor: color, color: "#000" }}
                                            >
                                                {currentProfile.badge}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {vibeUsers.length > 0 && (
                        <div className="relative z-10 pb-6 pt-2 flex items-center justify-center gap-4">
                            <button
                                onClick={handleUndo}
                                className="h-12 w-24 rounded-base border-2 border-border bg-main text-main-foreground flex flex-row items-center justify-center shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all gap-2"
                            >
                                <Undo2 className="h-5 w-5" strokeWidth={2.5} />
                                <span className="text-xs font-bold uppercase tracking-wide">Undo</span>
                            </button>

                            <button
                                onClick={handleMessage}
                                className="h-12 w-24 rounded-base border-2 border-border bg-blue-400 text-white flex flex-row items-center justify-center shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all gap-2"
                            >
                                <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
                                <span className="text-xs font-bold uppercase tracking-wide">Msg</span>
                            </button>
                        </div>
                    )}

                    {/* Onboarding Guide */}
                    <AnimatePresence>
                        {showGuide && vibeUsers.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center text-foreground p-6"
                                onClick={() => setShowGuide(false)}
                            >
                                <div className="relative w-full h-full max-w-sm flex flex-col justify-between py-20 px-8">
                                    <div className="flex flex-col items-center gap-4 self-center">
                                        <span className="font-black text-2xl uppercase tracking-[0.2em] text-foreground">Details</span>
                                        <div className="p-4 rounded-full border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                            <ArrowUp className="w-8 h-8 text-black rotate-180" strokeWidth={2.5} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex flex-col items-center gap-4 -translate-y-8">
                                            <div className="p-4 rounded-full border-4 border-black bg-[#FF6B6B] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                <ArrowLeftIcon className="w-8 h-8 text-black" strokeWidth={2.5} />
                                            </div>
                                            <span className="font-black text-lg uppercase tracking-[0.2em] text-[#FF6B6B]">Skip</span>
                                        </div>

                                        <div className="flex flex-col items-center gap-4 -translate-y-8">
                                            <div className="p-4 rounded-full border-4 border-black bg-[#4ECDC4] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                <ArrowRight className="w-8 h-8 text-black" strokeWidth={2.5} />
                                            </div>
                                            <span className="font-black text-lg uppercase tracking-[0.2em] text-[#4ECDC4]">Like</span>
                                        </div>
                                    </div>

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
                </>
            )}
        </div>
    );
}
