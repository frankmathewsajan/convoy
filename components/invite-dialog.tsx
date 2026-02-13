"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Send, Check, Mail, Phone, Crown, Lock, Clock, UserCheck, Trash2, ChevronLeft } from "lucide-react";
import { PaywallModal } from "@/components/paywall-modal";

interface Invite {
    id: string;
    type: "email" | "phone";
    value: string;
    inviteeName: string;
    relationship: string;
    status: "pending" | "accepted";
    createdAt: any;
}

interface InviteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
    const { user, userData, isPro, refreshUserData, refreshProStatus } = useAuth();

    // Form state
    const [emailValue, setEmailValue] = useState("");
    const [phoneValue, setPhoneValue] = useState("");
    const [inviteeName, setInviteeName] = useState("");
    const [relationship, setRelationship] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);

    // Sent invites state
    const [sentInvites, setSentInvites] = useState<Invite[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [view, setView] = useState<"form" | "history">("form");
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const fetchSentInvites = useCallback(async () => {
        if (!user) return;
        setLoadingInvites(true);
        try {
            const q = query(collection(db, "invites"), where("invitedBy", "==", user.uid));
            const snap = await getDocs(q);
            const invites: Invite[] = snap.docs.map(d => ({
                id: d.id,
                ...(d.data() as Omit<Invite, "id">),
            }));
            // Sort by createdAt descending
            invites.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
            setSentInvites(invites);
        } catch (err) {
            console.error("Error fetching invites:", err);
        } finally {
            setLoadingInvites(false);
        }
    }, [user]);

    // Fetch invites when dialog opens
    useEffect(() => {
        if (open && user) {
            fetchSentInvites();
        }
    }, [open, user, fetchSentInvites]);

    if (!user || !userData) return null;

    const hasInvites = isPro || userData.invitesRemaining > 0;

    const resetForm = () => {
        setEmailValue("");
        setPhoneValue("");
        setInviteeName("");
        setRelationship("");
        setError(null);
    };

    const handleInvite = async (type: "email" | "phone", value: string) => {
        if (!value.trim() || !inviteeName.trim() || !relationship.trim()) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const token = await user.getIdToken();
            const { createInviteAction } = await import("@/app/actions/invite-actions");

            const result = await createInviteAction(token, {
                type,
                value: value.trim().toLowerCase(),
                inviteeName: inviteeName.trim(),
                relationship: relationship.trim(),
                isPro
            });

            if (result.error) {
                throw new Error(result.error);
            }

            // Refresh local data to show updated invite count
            if (!isPro && userData.invitesRemaining > 0) {
                await refreshUserData();
            }

            setSuccess(inviteeName.trim());
            resetForm();
            await fetchSentInvites();

            setTimeout(() => setSuccess(null), 4000);
        } catch (err: any) {
            console.error("Error sending invite:", err);
            setError(err.message || "Failed to send invite. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        setCancellingId(inviteId);
        try {
            const token = await user.getIdToken();
            const { cancelInviteAction } = await import("@/app/actions/invite-actions");

            const result = await cancelInviteAction(token, inviteId, isPro);

            if (result.error) {
                throw new Error(result.error);
            }

            setSentInvites(prev => prev.filter(i => i.id !== inviteId));

            // Restore invite count for non-pro users
            if (!isPro) {
                await refreshUserData();
            }
        } catch (err) {
            console.error("Error cancelling invite:", err);
        } finally {
            setCancellingId(null);
        }
    };

    const formatDate = (ts: any) => {
        if (!ts?.seconds) return "";
        return new Date(ts.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setView("form"); resetForm(); } }}>
                <DialogContent className="sm:max-w-[460px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
                                {view === "history" && (
                                    <button onClick={() => setView("form")} className="hover:opacity-70">
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                )}
                                <Send className="h-5 w-5" />
                                {view === "form" ? "Invite" : "Sent Invites"}
                            </DialogTitle>
                            {view === "form" && sentInvites.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setView("history")}
                                    className="text-xs font-bold uppercase tracking-wider"
                                >
                                    <Clock className="h-3 w-3 mr-1" /> History ({sentInvites.length})
                                </Button>
                            )}
                        </div>
                        <DialogDescription>
                            {view === "form"
                                ? "Grow the convoy. Invite friends by email or phone number."
                                : "Track the status of your sent invitations."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {/* === INVITE FORM VIEW === */}
                    {view === "form" && (
                        <>
                            {hasInvites ? (
                                <div className="space-y-4 py-2">
                                    {success && (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                                            <Check className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-bold text-green-800">
                                                Invite sent to {success}!
                                            </span>
                                        </div>
                                    )}
                                    {error && (
                                        <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                                            <span className="text-sm font-bold text-red-800">{error}</span>
                                        </div>
                                    )}

                                    {/* Name & Relationship (shared across tabs) */}
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="font-bold text-xs uppercase tracking-wider">
                                                Their Name
                                            </Label>
                                            <Input
                                                placeholder="e.g. Alex Rivera"
                                                value={inviteeName}
                                                onChange={(e) => setInviteeName(e.target.value)}
                                                className="border-2 border-black"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="font-bold text-xs uppercase tracking-wider">
                                                How do you know them?
                                            </Label>
                                            <Textarea
                                                placeholder="e.g. Met at a campsite in Joshua Tree, traveled together for 2 weeks"
                                                value={relationship}
                                                onChange={(e) => setRelationship(e.target.value)}
                                                className="border-2 border-black resize-none h-16 text-sm"
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                For the safety of our community, we ask how you know the person you're inviting.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Email / Phone tabs */}
                                    <Tabs defaultValue="email" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 border-2 border-black">
                                            <TabsTrigger value="email" className="font-bold uppercase text-xs data-[state=active]:bg-black data-[state=active]:text-white">
                                                <Mail className="h-3 w-3 mr-1.5" /> Email
                                            </TabsTrigger>
                                            <TabsTrigger value="phone" className="font-bold uppercase text-xs data-[state=active]:bg-black data-[state=active]:text-white">
                                                <Phone className="h-3 w-3 mr-1.5" /> Phone
                                            </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="email" className="mt-3">
                                            <div className="flex gap-2">
                                                <Input
                                                    type="email"
                                                    placeholder="friend@example.com"
                                                    value={emailValue}
                                                    onChange={(e) => setEmailValue(e.target.value)}
                                                    className="border-2 border-black"
                                                />
                                                <Button
                                                    onClick={() => handleInvite("email", emailValue)}
                                                    disabled={loading || !emailValue.trim() || !inviteeName.trim() || !relationship.trim()}
                                                    className="border-2 border-black font-bold text-black hover:opacity-90 shrink-0"
                                                    style={{ backgroundColor: "var(--main)" }}
                                                >
                                                    {loading ? "..." : <Send className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="phone" className="mt-3">
                                            <div className="flex gap-2">
                                                <Input
                                                    type="tel"
                                                    placeholder="+1 555-123-4567"
                                                    value={phoneValue}
                                                    onChange={(e) => setPhoneValue(e.target.value)}
                                                    className="border-2 border-black"
                                                />
                                                <Button
                                                    onClick={() => handleInvite("phone", phoneValue)}
                                                    disabled={loading || !phoneValue.trim() || !inviteeName.trim() || !relationship.trim()}
                                                    className="border-2 border-black font-bold text-black hover:opacity-90 shrink-0"
                                                    style={{ backgroundColor: "var(--main)" }}
                                                >
                                                    {loading ? "..." : <Send className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TabsContent>
                                    </Tabs>

                                    {!isPro && (
                                        <p className="text-xs text-muted-foreground font-medium text-center">
                                            {userData.invitesRemaining} invite{userData.invitesRemaining !== 1 ? "s" : ""} remaining.{" "}
                                            <button onClick={() => setShowPaywall(true)} className="underline font-bold" style={{ color: "var(--main)" }}>
                                                Go Pro for unlimited
                                            </button>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="py-4">
                                    <div className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center">
                                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 border-2 border-zinc-200">
                                            <Lock className="h-6 w-6 text-zinc-400" />
                                        </div>
                                        <h3 className="text-lg font-black">No invites left</h3>
                                        <p className="mb-4 text-sm text-muted-foreground">
                                            Upgrade to Pro for unlimited invites.
                                        </p>
                                        <Button
                                            onClick={() => setShowPaywall(true)}
                                            className="w-full text-black border-2 border-black hover:opacity-90 font-bold"
                                            style={{ backgroundColor: "var(--main)" }}
                                        >
                                            <Crown className="h-4 w-4 mr-2" /> Unlock Unlimited Invites
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* === INVITE HISTORY VIEW === */}
                    {view === "history" && (
                        <div className="space-y-3 py-2">
                            {loadingInvites ? (
                                <div className="text-center py-8">
                                    <div className="mx-auto h-8 w-8 border-4 border-black border-t-transparent rounded-full animate-spin" style={{ borderTopColor: "var(--main)" }} />
                                </div>
                            ) : sentInvites.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="font-bold">No invites sent yet</p>
                                </div>
                            ) : (
                                sentInvites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="p-3 border-2 border-black rounded-lg bg-white space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-sm truncate">{invite.inviteeName || "Unknown"}</p>
                                                    {invite.status === "accepted" ? (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 border border-green-400 rounded text-[9px] font-black text-green-800 uppercase shrink-0">
                                                            <UserCheck className="w-2.5 h-2.5" /> Joined
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-300 rounded text-[9px] font-black text-amber-700 uppercase shrink-0">
                                                            <Clock className="w-2.5 h-2.5" /> Pending
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    {invite.type === "email" ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                                                    {invite.value}
                                                </p>
                                                {invite.relationship && (
                                                    <p className="text-[11px] text-zinc-500 mt-1 italic">"{invite.relationship}"</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] text-muted-foreground">{formatDate(invite.createdAt)}</span>
                                                {invite.status === "pending" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCancelInvite(invite.id)}
                                                        disabled={cancellingId === invite.id}
                                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        {cancellingId === invite.id ? (
                                                            <div className="h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <PaywallModal
                open={showPaywall}
                onClose={() => setShowPaywall(false)}
                userId={user?.uid}
                onPurchaseSuccess={refreshProStatus}
            />
        </>
    );
}
