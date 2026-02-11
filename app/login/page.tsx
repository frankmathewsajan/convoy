"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/lib/firebase/config";
import {
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    ConfirmationResult,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [inviteCode, setInviteCode] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInvited, setIsInvited] = useState(false); // Should check status from DB

    useEffect(() => {
        // Initialize RecaptchaVerifier on mount
        if (typeof window !== "undefined" && !window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
                size: "invisible",
                callback: () => {
                    // reCAPTCHA solved - allowing signInWithPhoneNumber to proceed automatically
                },
                "expired-callback": () => {
                    // Response expired. Ask user to solve reCAPTCHA again.
                    setError("reCAPTCHA expired, please try again.");
                },
            });
        }
    }, []);

    const handleInviteSubmit = () => {
        if (inviteCode === "CONVOY2026") {
            setIsInvited(true);
            router.push("/map");
        } else {
            setError("Invalid invite code");
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Wait for AuthProvider to update user state, but we can optimistically redirect or show invite
            if (isInvited) {
                router.push("/map");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneLogin = async () => {
        setError("");
        setIsLoading(true);
        const appVerifier = window.recaptchaVerifier;

        if (!appVerifier) {
            setError("ReCAPTCHA not initialized. Please refresh the page.");
            setIsLoading(false);
            return;
        }

        try {
            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
        } catch (err: any) {
            console.error(err);
            setError("Failed to send code. Make sure phone number is in E.164 format (e.g. +15555555555)");
            // Reset reCAPTCHA so user can try again
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                // Re-init happens on reload or we'd need to re-create it. 
                // For simplicity, asking user to refresh or re-rendering logic could be needed.
                // But clear() usually allows re-rendering if we handle it right.
            }
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
            if (isInvited) {
                router.push("/map");
            }
        } catch (err: any) {
            setError("Invalid verification code.");
        } finally {
            setIsLoading(false);
        }
    };

    // If user is authenticated but not invited, show invite code screen
    if (user && !isInvited) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Enter Invite Code</CardTitle>
                        <CardDescription>You need an invite code to access Convoy.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="invite">Invite Code</Label>
                                <Input
                                    id="invite"
                                    placeholder="Code"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleInviteSubmit} className="w-full" disabled={isLoading}>
                            {isLoading ? "Checking..." : "Join Convoy"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // If user is authenticated AND invited, they shouldn't see this page (redirect handled in effect or by parent)
    if (user && isInvited) {
        // This return is a fallback, router.push happens in handlers/effects
        return null;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Convoy</CardTitle>
                    <CardDescription className="text-center">Login to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="email" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="email">Email</TabsTrigger>
                            <TabsTrigger value="phone">Phone</TabsTrigger>
                        </TabsList>
                        <TabsContent value="email">
                            <form onSubmit={handleEmailLogin} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {error && <p className="text-red-500 text-sm">{error}</p>}
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? "Logging in..." : "Login"}
                                </Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="phone">
                            <div className="space-y-4 pt-4">
                                {!confirmationResult ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="+1 555 555 5555"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                            />
                                        </div>
                                        <Button onClick={handlePhoneLogin} className="w-full" disabled={isLoading}>
                                            {isLoading ? "Sending..." : "Send Code"}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="otp">Verification Code</Label>
                                            <Input
                                                id="otp"
                                                type="text"
                                                placeholder="123456"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                            />
                                        </div>
                                        <Button onClick={verifyOtp} className="w-full" disabled={isLoading}>
                                            {isLoading ? "Verifying..." : "Verify Code"}
                                        </Button>
                                    </>
                                )}
                                {error && <p className="text-red-500 text-sm">{error}</p>}
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
