"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { auth, db } from "@/lib/firebase/config";
import {
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    createUserWithEmailAndPassword,
    RecaptchaVerifier,
    ConfirmationResult,
    signOut,
} from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, X } from "lucide-react";

const countryConfig: Record<string, { label: string; placeholder: string }> = {
    "+91": { label: "🇮🇳 India", placeholder: "98765 43210" },
    "+1": { label: "🇺🇸 USA", placeholder: "555-555-5555" },
    "+44": { label: "🇬🇧 UK", placeholder: "7700 900000" },
    "+49": { label: "🇩🇪 Germany", placeholder: "151 12345678" },
    "+33": { label: "🇫🇷 France", placeholder: "06 12 34 56 78" },
    "+61": { label: "🇦🇺 Australia", placeholder: "0412 345 678" },
    "+81": { label: "🇯🇵 Japan", placeholder: "090-1234-5678" },
    "+55": { label: "🇧🇷 Brazil", placeholder: "11 91234-5678" },
};

/**
 * Check if a user (by email or phone) has been invited.
 * Returns the inviter's name if found, or null if not invited.
 */
async function checkInviteStatus(email: string | null, phone: string | null): Promise<{ invited: boolean; inviterName: string | null; inviterUid: string | null; inviteDocId: string | null }> {
    const invitesRef = collection(db, "invites");

    // Check by email
    if (email) {
        const emailQuery = query(invitesRef, where("type", "==", "email"), where("value", "==", email.toLowerCase()));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
            const inviteDoc = emailSnap.docs[0];
            const data = inviteDoc.data();
            return { invited: true, inviterName: data.inviterName || "Someone", inviterUid: data.invitedBy, inviteDocId: inviteDoc.id };
        }
    }

    // Check by phone
    if (phone) {
        const phoneQuery = query(invitesRef, where("type", "==", "phone"), where("value", "==", phone));
        const phoneSnap = await getDocs(phoneQuery);
        if (!phoneSnap.empty) {
            const inviteDoc = phoneSnap.docs[0];
            const data = inviteDoc.data();
            return { invited: true, inviterName: data.inviterName || "Someone", inviterUid: data.invitedBy, inviteDocId: inviteDoc.id };
        }
    }

    return { invited: false, inviterName: null, inviterUid: null, inviteDocId: null };
}

/**
 * Pre-check: is this email/phone an existing user OR invited?
 * Runs BEFORE any auth attempt (no OTP sent, no account created for strangers).
 */
async function preCheckAccess(opts: { email?: string; phone?: string }): Promise<{ allowed: boolean; reason: string }> {
    const usersRef = collection(db, "users");

    // 1. Check if they're already a registered user
    if (opts.email) {
        const q = query(usersRef, where("email", "==", opts.email.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) return { allowed: true, reason: "returning_user" };
    }
    if (opts.phone) {
        const q = query(usersRef, where("phoneNumber", "==", opts.phone));
        const snap = await getDocs(q);
        if (!snap.empty) return { allowed: true, reason: "returning_user" };
    }

    // 2. Check if they have a pending invite
    const invite = await checkInviteStatus(opts.email || null, opts.phone || null);
    if (invite.invited) return { allowed: true, reason: "invited" };

    // 3. Neither — not allowed
    return { allowed: false, reason: "not_invited" };
}

export default function LoginPage() {
    const router = useRouter();
    const { user, userData } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
    const [checkingInvite, setCheckingInvite] = useState(false);

    // Cleanup reCAPTCHA on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== "undefined" && window.recaptchaVerifier) {
                try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
                window.recaptchaVerifier = undefined;
            }
        };
    }, []);

    // After auth, check if returning user or invited — then redirect
    useEffect(() => {
        if (!user) return;

        const verifyAccess = async () => {
            setCheckingInvite(true);
            setError("");

            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                // ── Returning user: already has a Firestore doc → let them in ──
                if (userSnap.exists()) {
                    router.push("/map");
                    return;
                }

                // ── New user: check if they have an invite ──
                const result = await checkInviteStatus(user.email, user.phoneNumber);

                if (result.invited) {
                    // Ensure Firestore doc exists with invite + auth data
                    await setDoc(userRef, {
                        invitedBy: result.inviterUid,
                        email: user.email || null,
                        phoneNumber: user.phoneNumber || null,
                        displayName: user.displayName || null,
                        photoURL: user.photoURL || null,
                    }, { merge: true });

                    // Mark the invite as accepted
                    if (result.inviteDocId) {
                        try {
                            const token = await user.getIdToken();
                            const { acceptInviteAction } = await import("@/app/actions/invite-actions");
                            await acceptInviteAction(token, result.inviteDocId);
                        } catch { /* ignore */ }
                    }

                    setWelcomeMessage(`You were invited by ${result.inviterName}! Welcome to the community!`);
                    setTimeout(() => {
                        router.push("/map");
                    }, 2500);
                } else {
                    setError("You haven't been invited yet. Make sure you're using the same email or phone number that received the invite.");
                    setTimeout(async () => {
                        await signOut(auth);
                    }, 5000);
                }
            } catch (err) {
                console.error("Error checking access:", err);
                setError("Something went wrong. Please try again.");
            } finally {
                setCheckingInvite(false);
            }
        };

        verifyAccess();
    }, [user, router]);

    // Lazy-init reCAPTCHA: fully tear down old widget before creating a new one
    const getOrCreateRecaptcha = (): RecaptchaVerifier => {
        if (window.recaptchaVerifier) {
            try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
            window.recaptchaVerifier = undefined;
        }
        // Clear the DOM container so reCAPTCHA doesn't see a stale widget
        const container = document.getElementById("recaptcha-container");
        if (container) container.innerHTML = "";

        const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
        });
        window.recaptchaVerifier = verifier;
        return verifier;
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            // Pre-check: is this email a known user or invited?
            const access = await preCheckAccess({ email });
            if (!access.allowed) {
                setError("Convoy is invite-only. You haven't been invited yet — ask a member to send you an invite using your email address.");
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err: any) {
                if (err?.code === "auth/user-not-found" || err?.code === "auth/invalid-credential") {
                    // They're invited but don't have an account yet — create one
                    if (access.reason === "invited") {
                        await createUserWithEmailAndPassword(auth, email, password);
                    } else {
                        setError("Incorrect password. Please try again.");
                    }
                } else {
                    setError(err.message);
                }
            }
            // Invite check / redirect happens in useEffect above
        } catch (err: any) {
            if (!error) setError(err.message || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneLogin = async () => {
        setError("");
        setIsLoading(true);

        const fullPhoneNumber = `${countryCode}${phoneNumber}`;

        try {
            // For phone login, skip pre-check. Firebase Auth handles returning
            // users natively — if they already exist, signInWithPhoneNumber
            // signs them in. Post-auth verifyAccess will check their Firestore
            // doc and let returning users through without needing an invite.
            const appVerifier = getOrCreateRecaptcha();
            const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
            setConfirmationResult(confirmation);
        } catch (err: any) {
            console.error(err);
            const code = err?.code || "";
            const msg = code === "auth/invalid-phone-number"
                ? "Invalid phone number format. Please check and try again."
                : code === "auth/too-many-requests"
                    ? "Too many attempts. Please wait a moment and try again."
                    : code === "auth/quota-exceeded"
                        ? "SMS quota exceeded. Please try again later."
                        : (code === "auth/invalid-app-credential" || code === "auth/captcha-check-failed" || err?.message?.includes("reCAPTCHA"))
                            ? "Verification failed — your browser's tracking protection is blocking reCAPTCHA. Please disable tracking prevention for this site, or try a different browser."
                            : "Failed to send verification code. Please try again.";
            setError(msg);
            if (window.recaptchaVerifier) {
                try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
                window.recaptchaVerifier = undefined;
            }
            const container = document.getElementById("recaptcha-container");
            if (container) container.innerHTML = "";
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!confirmationResult) return;
        setError("");
        setIsLoading(true);
        try {
            await confirmationResult.confirm(otp);
            // Invite check happens in useEffect above
        } catch (err: any) {
            setError("Invalid verification code.");
        } finally {
            setIsLoading(false);
        }
    };

    // Show checking/welcome/blocked state after auth
    if (user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-sm border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <CardContent className="pt-8 pb-8 text-center space-y-4">
                        {checkingInvite && (
                            <>
                                <div className="mx-auto h-10 w-10 border-4 border-black border-t-transparent rounded-full animate-spin" style={{ borderTopColor: "var(--main)" }} />
                                <p className="font-bold text-sm">Checking your invite...</p>
                            </>
                        )}

                        {welcomeMessage && (
                            <>
                                <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center border-4 border-black" style={{ backgroundColor: "var(--main)" }}>
                                    <Check className="h-8 w-8 text-black" strokeWidth={3} />
                                </div>
                                <p className="font-black text-lg">{welcomeMessage}</p>
                                <p className="text-sm text-muted-foreground">Redirecting to the map...</p>
                            </>
                        )}

                        {error && !checkingInvite && !welcomeMessage && (
                            <>
                                <div className="mx-auto h-14 w-14 rounded-full bg-red-100 flex items-center justify-center border-4 border-red-400">
                                    <X className="h-8 w-8 text-red-600" strokeWidth={3} />
                                </div>
                                <p className="font-bold text-red-600 text-sm leading-relaxed">{error}</p>
                                <p className="text-xs text-muted-foreground">Signing you out in a moment...</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader>
                    <CardTitle className="text-2xl font-black text-center uppercase">Convoy</CardTitle>
                    <CardDescription className="text-center">Login or sign up to join the community</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="email" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 border-2 border-black">
                            <TabsTrigger value="email" className="font-bold uppercase text-xs data-[state=active]:bg-black data-[state=active]:text-white">Email</TabsTrigger>
                            <TabsTrigger value="phone" className="font-bold uppercase text-xs data-[state=active]:bg-black data-[state=active]:text-white">Phone</TabsTrigger>
                        </TabsList>
                        <TabsContent value="email">
                            <form onSubmit={handleEmailLogin} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="font-bold text-xs uppercase tracking-wider">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="border-2 border-black"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="font-bold text-xs uppercase tracking-wider">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="border-2 border-black"
                                    />
                                </div>
                                {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                                <Button
                                    type="submit"
                                    className="w-full border-2 border-black font-bold text-black hover:opacity-90"
                                    style={{ backgroundColor: "var(--main)" }}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Logging in..." : "Login / Sign Up"}
                                </Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="phone">
                            <div className="space-y-4 pt-4">
                                {!confirmationResult ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="font-bold text-xs uppercase tracking-wider">Phone Number</Label>
                                            <div className="flex gap-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" className="w-[100px] justify-between border-2 border-black">
                                                            {countryCode}
                                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-[200px] border-2 border-black">
                                                        {Object.entries(countryConfig).map(([code, config]) => (
                                                            <DropdownMenuItem
                                                                key={code}
                                                                onClick={() => setCountryCode(code)}
                                                            >
                                                                <span className="mr-2">{config.label.split(" ")[0]}</span>
                                                                <span>{config.label.split(" ").slice(1).join(" ")}</span>
                                                                <span className="ml-auto text-muted-foreground">{code}</span>
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    placeholder={countryConfig[countryCode]?.placeholder || "Phone Number"}
                                                    value={phoneNumber}
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    className="flex-1 border-2 border-black"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handlePhoneLogin}
                                            className="w-full border-2 border-black font-bold text-black hover:opacity-90"
                                            style={{ backgroundColor: "var(--main)" }}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? "Sending..." : "Send Code"}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="otp" className="font-bold text-xs uppercase tracking-wider">Verification Code</Label>
                                            <Input
                                                id="otp"
                                                type="text"
                                                placeholder="123456"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                className="border-2 border-black"
                                            />
                                        </div>
                                        <Button
                                            onClick={verifyOtp}
                                            className="w-full border-2 border-black font-bold text-black hover:opacity-90"
                                            style={{ backgroundColor: "var(--main)" }}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? "Verifying..." : "Verify Code"}
                                        </Button>
                                    </>
                                )}
                                {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                            </div>
                        </TabsContent>
                    </Tabs>
                    <div id="recaptcha-container"></div>
                </CardContent>
            </Card>
        </div>
    );
}
// Add global type for recaptcha
declare global {
    interface Window {
        recaptchaVerifier: any;
    }
}