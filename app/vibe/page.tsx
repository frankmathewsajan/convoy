"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Heart, Undo2, MapPin, BadgeCheck, ArrowLeft, MessageCircle, ArrowUp, ArrowRight, ArrowLeft as ArrowLeftIcon, Loader2, Sparkles, Car, UserCircle, FileText, Tag, Camera, ImagePlus, Send, RefreshCw } from "lucide-react";
import Link from "next/link";
import { doc, updateDoc, query, where, documentId, collection, getDocs } from "firebase/firestore";
import imageCompression from "browser-image-compression";

import { db } from "@/lib/firebase/config";
import { useAuth } from "@/components/auth-provider";
import { PaywallModal } from "@/components/paywall-modal";
import { WebcamCapture } from "@/components/webcam-capture";
import { ConversationItem } from "@/components/conversation-item";
import { VibeChat } from "@/components/vibe-chat";
import { useVibeUsers, VibeUser } from "@/hooks/use-vibe-users";
import { sendVibeLike, removeVibeLike, recordInteraction, removeInteraction, getSeenUserIds, useVibeLikesReceived, markLikesSeen, sendVibeMessage, useVibeConversations } from "@/hooks/use-vibe-likes";

// --- Constants & Styles ---
const BADGE_OPTIONS = ["Nomad", "Builder", "Hiker", "Surfer", "Family", "Solo", "Digital Nomad", "Photographer", "Climber", "Cyclist"];
const VEHICLE_OPTIONS = ["Sprinter 170", "Sprinter 144", "Ford Transit", "Promaster", "Skoolie", "Truck Camper", "Car Camper", "Converted Bus", "RV/Motorhome", "Trailer", "Other"];
const THEME_COLORS: Record<string, string> = { yellow: "#FFD700", blue: "#60A5FA", green: "#34D399", pink: "#F472B6", purple: "#A78BFA", orange: "#FB923C", red: "#F87171", teal: "#2DD4BF" };

const btnBase = "rounded-base border-2 border-border shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all font-bold uppercase tracking-wide text-sm flex items-center justify-center";
const inputBase = "w-full px-4 py-3 rounded-base border-2 border-border bg-white text-foreground font-bold text-lg shadow-shadow focus:outline-none focus:ring-2 focus:ring-[var(--main)]";

const getProfileImage = (p: VibeUser) => p.photos?.[0] || p.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.displayName)}&backgroundColor=f59e0b`;

/* ================= VIBE SETUP ================= */
function VibeSetup({ onComplete }: { onComplete: () => void }) {
    const { user, userData, refreshUserData } = useAuth();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    // Form State
    const [form, setForm] = useState({
        displayName: userData?.displayName || "",
        age: userData?.vibeProfile?.age?.toString() || "",
        description: userData?.vibeProfile?.description || "",
        vehicle: userData?.vibeProfile?.vehicle || "",
        badge: userData?.vibeProfile?.badge || "",
        photos: userData?.vibeProfile?.photos || [] as string[]
    });

    const [step, setStep] = useState(() => {
        if ((userData?.displayName || "").length < 2) return 0;
        if (!userData?.vibeProfile?.age) return 1;
        if (!userData?.vibeProfile?.vehicle) return 2;
        if (!userData?.vibeProfile?.badge) return 3;
        if ((userData?.vibeProfile?.photos || []).length === 0) return 4;
        return 5;
    });

    const steps = [
        { title: "Your Name", sub: "How should other nomads know you?", Icon: UserCircle },
        { title: "Your Age", sub: "Just a number, no judgement", Icon: Sparkles },
        { title: "Your Rig", sub: "What are you rolling in?", Icon: Car },
        { title: "Your Vibe", sub: "Pick a badge that fits", Icon: Tag },
        { title: "Your Photos", sub: "Show off your rig and adventures", Icon: Camera },
        { title: "Your Bio", sub: "Tell the world about your journey", Icon: FileText },
    ];

    const updateForm = (key: keyof typeof form, val: any) => setForm(prev => ({ ...prev, [key]: val }));
    const canProceed = () => {
        switch (step) {
            case 0: return form.displayName.trim().length >= 2;
            case 1: return Number(form.age) > 0;
            case 2: return !!form.vehicle;
            case 3: return !!form.badge;
            case 4: return form.photos.length > 0;
            case 5: return form.description.trim().length >= 5;
            default: return false;
        }
    };

    const handlePhotoUpload = async (files: File[]) => {
        if (!user || !files.length) return;
        setUploading(true);
        try {
            const token = await user.getIdToken();
            const { uploadVibePhoto } = await import("@/app/actions/upload-actions");
            const newUrls = [];
            for (let file of files.slice(0, 4 - form.photos.length)) {
                if (file.type.startsWith("image/")) file = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
                const formData = new FormData(); formData.append("photo", file);
                const res = await uploadVibePhoto(token, formData);
                if (res.success && res.url) newUrls.push(res.url);
            }
            updateForm("photos", [...form.photos, ...newUrls]);
        } finally { setUploading(false); }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                displayName: form.displayName.trim(),
                "vibeProfile.age": Number(form.age) || 0,
                "vibeProfile.description": form.description.trim(),
                "vibeProfile.vehicle": form.vehicle,
                "vibeProfile.badge": form.badge,
                "vibeProfile.photos": form.photos,
                vibeActive: true
            });
            await refreshUserData();
            onComplete();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-background flex flex-col z-50 overflow-hidden font-public-sans">
            <div className="px-4 pt-4 flex justify-between items-center">
                <Link href="/map" className={`h-10 w-10 bg-secondary-background ${btnBase}`}><ArrowLeft className="w-5 h-5" /></Link>
                <h1 className="text-xl font-heading uppercase">Activate Vibing</h1><div className="w-10" />
            </div>
            <div className="px-6 pt-2 flex gap-1.5">{steps.map((_, i) => <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{ backgroundColor: i <= step ? "var(--main)" : "var(--border)" }} />)}</div>

            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-sm space-y-6 text-center">
                        <div className="space-y-2">
                            <div className="inline-flex p-3 rounded-full border-2 border-border bg-white shadow-shadow mb-2" style={{ color: "var(--main)" }}>{(() => { const I = steps[step].Icon; return <I className="h-8 w-8" /> })()}</div>
                            <h2 className="text-2xl font-heading">{steps[step].title}</h2>
                            <p className="text-sm text-muted-foreground">{steps[step].sub}</p>
                        </div>

                        {step === 0 && <input value={form.displayName} onChange={e => updateForm("displayName", e.target.value)} placeholder="Your name" className={inputBase} autoFocus />}
                        {step === 1 && <input type="number" value={form.age} onChange={e => updateForm("age", e.target.value)} placeholder="Your age" className={`${inputBase} text-center`} autoFocus />}
                        {step === 2 && <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">{VEHICLE_OPTIONS.map(v => <button key={v} onClick={() => updateForm("vehicle", v)} className={`px-3 py-2 rounded-base border-2 text-sm font-bold ${form.vehicle === v ? "border-black shadow-shadow" : "border-border"}`} style={form.vehicle === v ? { backgroundColor: "var(--main)" } : {}}>{v}</button>)}</div>}
                        {step === 3 && <div className="flex flex-wrap gap-2 justify-center">{BADGE_OPTIONS.map(b => <button key={b} onClick={() => updateForm("badge", b)} className={`px-4 py-2 rounded-full border-2 text-sm font-bold ${form.badge === b ? "border-black shadow-shadow" : "border-border"}`} style={form.badge === b ? { backgroundColor: "var(--main)" } : {}}>{b}</button>)}</div>}
                        {step === 4 && <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {form.photos.map((url, i) => <div key={i} className="relative aspect-square rounded-base border-2 border-border overflow-hidden"><img src={url} className="object-cover w-full h-full" /><button onClick={() => updateForm("photos", form.photos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 rounded-full p-1"><X className="w-3 h-3 text-white" /></button></div>)}
                                {form.photos.length < 4 && !uploading && <>
                                    <button onClick={() => setShowCamera(true)} className="aspect-square rounded-base border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground"><Camera className="h-6 w-6" /><span className="text-[10px] font-bold mt-1">TAKE PHOTO</span></button>
                                    <label className="aspect-square rounded-base border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer"><input type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(Array.from(e.target.files || []))} className="hidden" /><ImagePlus className="h-6 w-6" /><span className="text-[10px] font-bold mt-1">GALLERY</span></label>
                                </>}
                                {uploading && <div className="aspect-square flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>}
                            </div>
                        </div>}
                        {step === 5 && <textarea value={form.description} onChange={e => updateForm("description", e.target.value)} placeholder="Your story..." rows={4} className={`${inputBase} resize-none`} autoFocus />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <WebcamCapture open={showCamera} onClose={() => setShowCamera(false)} onCapture={file => handlePhotoUpload([file])} />

            <div className="px-6 pb-8 flex gap-3">
                {step > 0 && <button onClick={() => setStep(step - 1)} className={`h-12 flex-1 bg-secondary-background ${btnBase}`}>Back</button>}
                <button onClick={() => step < 5 ? canProceed() && setStep(step + 1) : handleSave()} disabled={!canProceed() || saving} className={`h-12 flex-1 text-black ${btnBase} disabled:opacity-40`} style={{ backgroundColor: "var(--main)" }}>
                    {step < 5 ? "Next" : (saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Vibing")}
                </button>
            </div>
        </div>
    );
}

/* ================= MAIN PAGE ================= */
export default function VibePage() {
    const { user, userData, loading, isPro, refreshProStatus, refreshUserData } = useAuth();
    const router = useRouter();
    const { users: vibeUsers, loading: usersLoading } = useVibeUsers(user?.uid);
    const { likes: receivedLikes, loading: likesLoading } = useVibeLikesReceived(user?.uid);

    const [idx, setIdx] = useState(0);
    const [exitDir, setExitDir] = useState<"left" | "right" | "up" | null>(null);
    const [activeTab, setActiveTab] = useState<"discover" | "likes" | "messages">("discover");
    const [modals, setModals] = useState({ paywall: false, guide: true, details: false, message: false, setup: false });
    const [toast, setToast] = useState<string | null>(null);
    const [msgText, setMsgText] = useState("");
    const [isSending, setIsSending] = useState(false);

    // History & Logic
    const [history, setHistory] = useState<{ uid: string; action: "like" | "skip" }[]>([]);
    const [seen, setSeen] = useState<Set<string>>(new Set());

    // Framer Motion
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-12, 12]);

    const currentProfile = vibeUsers[idx % Math.max(vibeUsers.length, 1)] || null;
    const isSeen = currentProfile ? seen.has(currentProfile.uid) : false;

    // Effects
    useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
    useEffect(() => { if (!loading && userData && (!userData.vibeActive || !userData.vibeProfile?.photos?.length)) setModals(prev => ({ ...prev, setup: true })); }, [loading, userData]);
    useEffect(() => { if (user?.uid) getSeenUserIds(user.uid).then(setSeen); }, [user]);
    useEffect(() => { if (activeTab === "likes" && user?.uid && (userData?.vibeLikesReceived || 0) > 0) markLikesSeen(user.uid); }, [activeTab, user?.uid, userData]);
    useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2000); return () => clearTimeout(t); } }, [toast]);

    // Handlers
    const handleSwipe = useCallback((dir: "left" | "right" | "up" | "down") => {
        if (!currentProfile || !user) return;
        if (dir === "up") { isPro ? setModals(m => ({ ...m, message: true })) : setModals(m => ({ ...m, paywall: true })); setTimeout(() => { x.set(0); y.set(0); }, 200); return; }
        if (dir === "down") { setModals(m => ({ ...m, details: true })); setTimeout(() => { x.set(0); y.set(0); }, 200); return; }

        recordInteraction(user.uid, currentProfile.uid);
        setSeen(prev => new Set(prev).add(currentProfile.uid));

        if (dir === "right") sendVibeLike(user.uid, currentProfile.uid, userData?.displayName || "Someone", userData?.photoURL || undefined, userData?.theme || "yellow");
        setHistory(prev => [...prev, { uid: currentProfile.uid, action: dir === "right" ? "like" : "skip" }]);

        setExitDir(dir as any);
        setTimeout(() => { setIdx(prev => prev + 1); setExitDir(null); x.set(0); y.set(0); }, 250);
    }, [currentProfile, user, isPro, x, y, userData]);

    const handleSendMessage = async () => {
        if (!user || !currentProfile || !msgText.trim()) return;
        setIsSending(true);
        try {
            await sendVibeMessage(user.uid, currentProfile.uid, msgText.trim(), userData?.displayName || undefined);
            setToast(`Message sent to ${currentProfile.displayName}!`);
            setMsgText("");
            setModals(m => ({ ...m, message: false }));
        } catch (e) { setToast("Failed to send"); } finally { setIsSending(false); }
    };

    const handleUndo = () => {
        if (!isPro) return setModals(m => ({ ...m, paywall: true }));
        if (idx > 0 && history.length > 0) {
            const last = history[history.length - 1];
            removeInteraction(user!.uid, last.uid);
            setSeen(prev => { const n = new Set(prev); n.delete(last.uid); return n; });
            if (last.action === "like") removeVibeLike(user!.uid, last.uid);
            setHistory(h => h.slice(0, -1));
            setIdx(i => i - 1);
        } else setToast("Nothing to undo!");
    };

    if (loading || !user) return null;
    if (modals.setup) return <VibeSetup onComplete={() => { setModals(m => ({ ...m, setup: false })); refreshUserData(); }} />;

    return (
        <div className="fixed inset-0 bg-background flex flex-col overflow-hidden font-public-sans">
            <PaywallModal open={modals.paywall} onClose={() => setModals(m => ({ ...m, paywall: false }))} userId={user.uid} onPurchaseSuccess={refreshProStatus} />
            <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 bg-black text-white rounded-xl font-bold text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">{toast}</motion.div>}</AnimatePresence>

            {currentProfile && <QuickMessageDialog open={modals.message} onClose={() => setModals(m => ({ ...m, message: false }))} profile={currentProfile} text={msgText} setText={setMsgText} onSend={handleSendMessage} loading={isSending} />}
            {currentProfile && <DetailsModal open={modals.details} onClose={() => setModals(m => ({ ...m, details: false }))} profile={currentProfile} />}
            <GuideModal open={modals.guide && vibeUsers.length > 0} onClose={() => setModals(m => ({ ...m, guide: false }))} />

            {/* Header & Tabs */}
            <div className="px-4 pt-4 pb-2 flex items-center relative z-30">
                <Link href="/map" className={`h-10 w-10 bg-secondary-background flex-none ${btnBase}`}><ArrowLeft className="w-5 h-5" /></Link>
                <div className="flex-1 flex justify-center">
                    <div className="flex bg-secondary-background rounded-base border-2 border-border overflow-hidden">
                        {["discover", "likes", "messages"].map((t) => (
                            <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === t ? "text-black" : "text-muted-foreground"}`} style={activeTab === t ? { backgroundColor: "var(--main)" } : {}}>
                                {t} {t === "likes" && (userData?.vibeLikesReceived || 0) > 0 && activeTab !== "likes" && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center border border-white">{userData?.vibeLikesReceived}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            {activeTab === "likes" && <LikesTab likes={receivedLikes} loading={likesLoading} />}
            {activeTab === "messages" && <MessagesTab user={user} isPro={isPro} onPaywall={() => setModals(m => ({ ...m, paywall: true }))} />}
            {activeTab === "discover" && (
                <>
                    <div className="flex-1 relative px-4 pb-2 pt-2 min-h-0">
                        {usersLoading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-[var(--main)]" /><p className="text-xs font-bold uppercase">Loading...</p></div>}
                        {!usersLoading && vibeUsers.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8">
                                <div className="p-4 rounded-full border-2 border-border bg-secondary-background text-[var(--main)]"><Heart className="h-10 w-10" /></div>
                                <h2 className="text-xl font-heading">No Vibers Nearby</h2>
                                <Link href="/map" className={`px-6 py-2.5 bg-[var(--main)] ${btnBase}`}>Back to Map</Link>
                            </div>
                        )}
                        {!usersLoading && vibeUsers.length > 0 && currentProfile && (
                            <AnimatePresence mode="popLayout">
                                <motion.div key={idx} style={{ x, y, rotate }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={exitDir ? { x: exitDir === "right" ? 400 : -400, opacity: 0, scale: 0.9, transition: { duration: 0.3 } } : undefined} drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} dragElastic={0.7} onDragEnd={(_e, info) => {
                                    const { x: ox, y: oy } = info.offset;
                                    if (Math.abs(oy) > Math.abs(ox)) { if (oy < -80) handleSwipe("up"); else if (oy > 80) handleSwipe("down"); }
                                    else { if (ox > 80) handleSwipe("right"); else if (ox < -80) handleSwipe("left"); }
                                }} className="absolute inset-0 mx-4 mt-2 mb-2 cursor-grab active:cursor-grabbing">
                                    <VibeCard profile={currentProfile} x={x} y={y} isSeen={isSeen} />
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                    {vibeUsers.length > 0 && <div className="relative z-10 pb-6 pt-2 flex justify-center gap-4">
                        <button onClick={handleUndo} className={`h-12 w-24 bg-main text-main-foreground gap-2 ${btnBase}`}><Undo2 className="h-5 w-5" /><span className="text-xs">Undo</span></button>
                        <button onClick={() => isPro ? setModals(m => ({ ...m, message: true })) : setModals(m => ({ ...m, paywall: true }))} className={`h-12 w-24 bg-blue-400 text-white gap-2 ${btnBase}`}><MessageCircle className="h-5 w-5" /><span className="text-xs">Msg</span></button>
                    </div>}
                </>
            )}
        </div>
    );
}

/* ================= COMPONENT EXTRACTIONS ================= */
function VibeCard({ profile, x, y, isSeen }: { profile: VibeUser; x: any; y: any, isSeen: boolean }) {
    const color = THEME_COLORS[profile.theme] || THEME_COLORS.yellow;
    const opacityLike = useTransform(x, [25, 100], [0, 1]);
    const opacityNope = useTransform(x, [-100, -25], [1, 0]);
    const opacityMsg = useTransform(y, [-100, -25], [1, 0]);
    const opacityDet = useTransform(y, [25, 100], [0, 1]);

    return (
        <div className="w-full h-full rounded-base border-2 border-border overflow-hidden relative select-none bg-secondary-background shadow-[var(--border)]" style={{ boxShadow: "-4px -4px 0px 0px var(--border)" }}>
            <motion.div style={{ opacity: opacityLike }} className="absolute top-6 left-6 z-20 -rotate-12 border-4 border-green-500 rounded-base px-3 py-1 bg-green-500/20"><span className="text-2xl font-heading text-green-500 uppercase tracking-widest">Like</span></motion.div>
            <motion.div style={{ opacity: opacityNope }} className="absolute top-6 right-6 z-20 rotate-12 border-4 border-red-500 rounded-base px-3 py-1 bg-red-500/20"><span className="text-2xl font-heading text-red-500 uppercase tracking-widest">Nope</span></motion.div>
            <motion.div style={{ opacity: opacityMsg }} className="absolute bottom-24 w-full z-20 flex justify-center"><span className="text-2xl font-heading text-blue-500 uppercase tracking-widest bg-blue-500/20 border-4 border-blue-500 px-4 py-1 rounded-base -rotate-2">Message</span></motion.div>
            <motion.div style={{ opacity: opacityDet }} className="absolute top-24 w-full z-20 flex justify-center"><span className="text-2xl font-heading text-yellow-500 uppercase tracking-widest bg-yellow-500/20 border-4 border-yellow-500 px-4 py-1 rounded-base rotate-2">Details</span></motion.div>

            <img src={getProfileImage(profile)} alt={profile.displayName} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 via-[30%] to-transparent pointer-events-none" />
            {isSeen && <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/20"><RefreshCw className="h-3 w-3 text-white/80" /><span className="text-[10px] font-bold uppercase text-white/80">Seen</span></div>}

            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h2 className="text-2xl font-heading leading-tight">{profile.displayName}{profile.age && <span className="text-white/60 font-base">, {profile.age}</span>}</h2>
                <div className="flex items-center gap-1.5 mt-1 text-sm"><BadgeCheck className="w-3.5 h-3.5" style={{ color }} /><span className="font-bold">{profile.vehicle}</span><span className="text-white/40">·</span><MapPin className="w-3 h-3 text-white/50" /><span className="text-white/50">Nearby</span></div>
                <span className="inline-block mt-2.5 px-3 py-0.5 rounded-base border-2 border-white/30 text-[11px] font-heading uppercase" style={{ backgroundColor: color, color: "#000" }}>{profile.badge}</span>
            </div>
        </div>
    );
}

const chunkArray = (arr: string[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

function LikesTab({ likes, loading }: { likes: any[], loading: boolean }) {
    const [profiles, setProfiles] = useState<Record<string, VibeUser>>({});

    useEffect(() => {
        const fetchProfiles = async () => {
            const uids = Array.from(new Set(likes.map(l => l.fromUid))).filter(Boolean);
            if (uids.length === 0) return;

            // Firestore 'in' limit is 10 (or 30 depending on version, sticking to 10 for safety)
            const chunks = chunkArray(uids, 10);
            const newProfiles: Record<string, VibeUser> = {};

            for (const chunk of chunks) {
                try {
                    const q = query(collection(db, "users"), where(documentId(), "in", chunk));
                    const snap = await getDocs(q);
                    snap.forEach(doc => {
                        const d = doc.data();
                        newProfiles[doc.id] = {
                            uid: doc.id,
                            displayName: d.displayName,
                            theme: d.theme || "yellow",
                            photoURL: d.photoURL,
                            photos: d.vibeProfile?.photos || [],
                            age: d.vibeProfile?.age,
                            vehicle: d.vibeProfile?.vehicle,
                            badge: d.vibeProfile?.badge,
                            description: d.vibeProfile?.description
                        } as VibeUser;
                    });
                } catch (e) {
                    console.error("Error fetching liker profiles:", e);
                }
            }
            setProfiles(newProfiles);
        };
        fetchProfiles();
    }, [likes]);

    if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-[var(--main)]" /></div>;
    if (likes.length === 0) return <div className="flex flex-col items-center justify-center h-64 gap-4 text-center"><div className="p-4 rounded-full border-2 border-border bg-secondary-background text-[var(--main)]"><Heart className="h-10 w-10" /></div><h2 className="text-xl font-heading">No Likes Yet</h2></div>;
    return (
        <div className="flex-1 overflow-y-auto px-4 pb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">{likes.length} people liked you</p>
            <div className="grid grid-cols-2 gap-3">
                {likes.map((l, i) => {
                    const profile = profiles[l.fromUid];
                    const photo = profile?.vibeProfile?.photos?.[0] || profile?.photoURL || l.fromPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${l.fromName}`;
                    const name = profile?.displayName || l.fromName;
                    const theme = profile?.theme || l.fromTheme || "yellow";

                    return (
                        <div key={i} className="rounded-base border-2 border-border overflow-hidden bg-secondary-background shadow-shadow">
                            <div className="aspect-square relative"><img src={photo} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><p className="absolute bottom-2 left-2 text-white font-black text-sm">{name}</p></div>
                            <div className="p-2 flex items-center gap-1.5"><Heart className="h-3 w-3 fill-current" style={{ color: THEME_COLORS[theme] }} /><span className="text-[10px] font-bold uppercase text-muted-foreground">Liked you</span></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MessagesTab({ user, isPro, onPaywall }: { user: any, isPro: boolean, onPaywall: () => void }) {
    const { conversations, loading } = useVibeConversations(user?.uid);
    const [sel, setSel] = useState<any>(null);
    if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin" /></div>;
    if (!conversations.length) return <div className="text-center pt-20 text-muted-foreground"><MessageCircle className="w-12 h-12 mx-auto mb-4 text-border" /><h3 className="font-heading text-lg text-foreground">No Messages</h3></div>;
    return (
        <div className="w-full h-full overflow-y-auto bg-secondary-background p-4 pb-20 space-y-3">
            {conversations.map(c => <ConversationItem key={c.id} conversation={c} currentUserId={user.uid} isPro={isPro} onClick={() => setSel({ id: c.id, uid: c.otherUserUid })} />)}
            {sel && <VibeChat isOpen={true} onClose={() => setSel(null)} conversationId={sel.id} otherUserUid={sel.uid} isPro={isPro} />}
        </div>
    );
}

function DetailsModal({ open, onClose, profile }: { open: boolean, onClose: () => void, profile: VibeUser }) {
    const color = THEME_COLORS[profile.theme] || THEME_COLORS.yellow;
    return (
        <AnimatePresence>{open && (
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-50 bg-background flex flex-col">
                <div className="flex-1 overflow-y-auto pb-20">
                    <div className="relative h-[50vh] w-full"><img src={getProfileImage(profile)} className="w-full h-full object-cover" /><button onClick={onClose} className="absolute top-4 right-4 h-10 w-10 bg-black/50 rounded-full text-white flex items-center justify-center backdrop-blur-sm"><X className="w-6 h-6" /></button></div>
                    <div className="p-6 space-y-6">
                        <div><h2 className="text-3xl font-heading">{profile.displayName}{profile.age && <span className="text-muted-foreground">, {profile.age}</span>}</h2><div className="flex items-center gap-2 mt-2 text-muted-foreground"><BadgeCheck className="w-5 h-5" style={{ color }} /><span className="font-bold">{profile.vehicle}</span><span>·</span><span>{profile.badge}</span></div></div>
                        <div className="p-4 bg-secondary-background rounded-base border-2 border-border"><h3 className="font-heading uppercase text-sm text-muted-foreground mb-2">About</h3><p className="leading-relaxed">{profile.description || "No bio yet."}</p></div>
                    </div>
                </div>
            </motion.div>
        )}</AnimatePresence>
    );
}

function QuickMessageDialog({ open, onClose, profile, text, setText, onSend, loading }: any) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 200); }, [open]);
    return (
        <AnimatePresence>{open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }} className="w-full max-w-md bg-white rounded-t-2xl border-t-2 border-x-2 border-black p-4 pb-8" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-4"><img src={getProfileImage(profile)} className="w-10 h-10 rounded-full border-2 border-black object-cover" /><div><p className="font-black text-sm">{profile.displayName}</p><p className="text-[10px] text-muted-foreground uppercase font-bold">Quick Message</p></div></div>
                    <div className="flex gap-2"><input ref={inputRef} type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Say something nice..." className="flex-1 px-4 py-2.5 rounded-base border-2 border-border bg-secondary-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--main)]" onKeyDown={e => e.key === "Enter" && onSend()} />
                        <button onClick={onSend} disabled={!text.trim() || loading} className={`h-10 w-10 bg-[var(--main)] ${btnBase} disabled:opacity-40`}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
                    </div>
                </motion.div>
            </motion.div>
        )}</AnimatePresence>
    );
}

function GuideModal({ open, onClose }: { open: boolean, onClose: () => void }) {
    const GuideIcon = ({ I, color, label, rot = 0 }: any) => (
        <div className="flex flex-col items-center gap-4">
            <div
                className="p-4 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                style={{ backgroundColor: color }}
            >
                <I
                    className="w-8 h-8 text-black"
                    style={{ transform: `rotate(${rot}deg)` }}
                    strokeWidth={2.5}
                />
            </div>
            <span
                className="font-black text-lg uppercase tracking-[0.2em]"
                style={{ color: color }}
            >
                {label}
            </span>
        </div>
    );
    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center p-6" onClick={onClose}>
                    <div className="relative w-full h-full max-w-sm flex flex-col justify-between py-20 px-8">
                        <div className="self-center"><GuideIcon I={ArrowUp} color="#FFFFFF" label="Details" rot={180} /></div>
                        <div className="flex items-center justify-between w-full"><GuideIcon I={ArrowLeftIcon} color="#FF6B6B" label="Skip" /><GuideIcon I={ArrowRight} color="#4ECDC4" label="Like" /></div>
                        <div className="self-center"><GuideIcon I={ArrowUp} color="#45B7D1" label="Message" /></div>
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center animate-pulse"><span className="text-sm font-black uppercase tracking-widest bg-black text-white px-3 py-1">Tap to Start</span></div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}