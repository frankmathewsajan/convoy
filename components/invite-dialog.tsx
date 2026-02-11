"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Lock, Send, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InviteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
    const { user, userData, refreshUserData } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // If user data isn't loaded yet, show nothing or loading state
    if (!user || !userData) return null;

    const hasInvites = userData.invitesRemaining > 0;

    const handleInvite = async () => {
        if (!phoneNumber.trim()) return;

        setLoading(true);
        try {
            // 1. Decrement invites
            // 2. Add phone number to sent invites (optional, but good for tracking)
            // 3. Mark didInvite as true

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                invitesRemaining: userData.invitesRemaining - 1,
                didInvite: true,
                bg_sent_invites: arrayUnion(phoneNumber) // hypothetical field to track who they invited
            });

            await refreshUserData();
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setPhoneNumber("");
            }, 3000);

        } catch (error) {
            console.error("Error sending invite:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite a Nomad</DialogTitle>
                    <DialogDescription>
                        Grow the convoy. Send an invite to a friend to join you on the route.
                    </DialogDescription>
                </DialogHeader>

                {hasInvites ? (
                    /* Active Invite UI */
                    <div className="grid gap-4 py-4">
                        {success ? (
                            <Alert className="bg-green-50 border-green-200">
                                <Check className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">Invite Sent!</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    We've texted {phoneNumber} with your invite link.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="phone"
                                        placeholder="(555) 123-4567"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                    />
                                    <Button onClick={handleInvite} disabled={loading || !phoneNumber}>
                                        {loading ? <span className="animate-spin mr-2">⏳</span> : <Send className="h-4 w-4 mr-2" />}
                                        Send
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    You have {userData.invitesRemaining} invite remaining.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Locked Paywall UI */
                    <div className="grid gap-4 py-4">
                        <div className="rounded-lg border-2 border-dashed border-zinc-200 p-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                                <Lock className="h-6 w-6 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-bold">You've used your invite</h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Join Shipyard Pro to unlock unlimited invites and build your massive convoy.
                            </p>
                            <Button className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold border-2 border-black">
                                Unlock Unlimited Invites ($4.99/mo)
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
