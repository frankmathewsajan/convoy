"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import {
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    ConfirmationResult,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
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
import { ChevronDown } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { user, refreshUserData } = useAuth();
    const [inviteCode, setInviteCode] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [countryCode, setCountryCode] = useState("+91");

    const countryPlaceholders: Record<string, string> = {
        "+91": "98765 43210",
        "+1": "555-555-5555",
        "+44": "7700 900000",
        "+49": "123 4567890",
        "+33": "06 12 34 56 78",
        "+61": "0412 345 678",
    };

    // Derived state for dynamic placeholder
    const dynamicPlaceholder = countryPlaceholders[countryCode] || "Phone Number";

    const [phoneNumber, setPhoneNumber] = useState("");
    const [verificationId, setVerificationId] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [error, setError] = useState("");
    const [isInvited, setIsInvited] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined" && !(window as any).recaptchaVerifier) {
            (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
                size: "invisible",
                callback: (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
                "expired-callback": () => {
                    // Response expired. Ask user to solve reCAPTCHA again.
                },
            });
        }
    }, []);

    const handleInviteSubmit = async () => {
        if (inviteCode === "CONVOY2026") {
            try {
                if (user) {
                    const userRef = doc(db, "users", user.uid);
                    await updateDoc(userRef, {
                        didInvite: true
                    });
                    // Refresh user data to update context
                    // We might need to access refreshUserData from useAuth, but it's not destructured above.
                    // Actually we destructured it now.
                    await refreshUserData();
                }
                setIsInvited(true);
                router.push("/map");
            } catch (error) {
                console.error("Error saving invite status:", error);
                // Still allow entry for now if db fails, or show error? 
                // Let's allow entry but log error to be safe for user flow.
                setIsInvited(true);
                router.push("/map");
            }
        } else {
            setError("Invalid invite code");
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/map");
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSendCode = async () => {
        if (!phoneNumber) {
            setError("Please enter a phone number.");
            return;
        }

        const fullPhoneNumber = `${countryCode}${phoneNumber}`;

        try {
            const appVerifier = (window as any).recaptchaVerifier;
            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
            setConfirmationResult(result);
            setError("");
        } catch (err: any) {
            console.error("Error sending code:", err);
            setError(err.message);
            if ((window as any).recaptchaVerifier) {
                (window as any).recaptchaVerifier.clear();
                // (window as any).recaptchaVerifier = undefined; // Don't clear the instance, just the widget if needed, or re-render
                // Actually, clearing the widget is safer.
            }
        }
    };

    const handleVerifyCode = async () => {
        if (!confirmationResult) return;
        try {
            await confirmationResult.confirm(otp);
            router.push("/map");
        } catch (err: any) {
            console.error("Error verifying code:", err);
            setError(err.message);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
            <Card className="w-full max-w-md shadow-lg rounded-xl border-0 overflow-hidden">
                <CardHeader className="bg-black text-white p-8 text-center">
                    <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">🚚</span>
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight uppercase">Convoy</CardTitle>
                    <CardDescription className="text-zinc-400">
                        Join the builder network.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                    {!isInvited ? (
                        <div className="space-y-4">
                            {!user ? (
                                <Tabs defaultValue="phone" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="phone">Phone</TabsTrigger>
                                        <TabsTrigger value="email">Email</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="phone">
                                        {!confirmationResult ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="phone">Phone Number</Label>
                                                    <div className="flex gap-2">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" className="w-[80px] px-2 gap-1">
                                                                    <span>{countryCode}</span>
                                                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="start" className="w-[200px]">
                                                                <DropdownMenuItem onClick={() => setCountryCode("+91")}>🇮🇳 India (+91)</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setCountryCode("+1")}>🇺🇸 USA (+1)</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setCountryCode("+44")}>🇬🇧 UK (+44)</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setCountryCode("+49")}>🇩🇪 Germany (+49)</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setCountryCode("+33")}>🇫🇷 France (+33)</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setCountryCode("+61")}>🇦🇺 Australia (+61)</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <Input
                                                            id="phone"
                                                            type="tel"
                                                            placeholder={dynamicPlaceholder}
                                                            className="placeholder:text-muted-foreground/50 flex-1"
                                                            value={phoneNumber}
                                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div id="recaptcha-container"></div>
                                                <Button className="w-full mt-4 bg-black hover:bg-zinc-800" onClick={handleSendCode}>
                                                    Get Login Code
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="otp">Enter Code</Label>
                                                        <Input
                                                            id="otp"
                                                            type="text"
                                                            placeholder="123456"
                                                            value={otp}
                                                            onChange={(e) => setOtp(e.target.value)}
                                                            className="text-center text-2xl tracking-widest"
                                                        />
                                                    </div>
                                                    <Button className="w-full bg-black hover:bg-zinc-800" onClick={handleVerifyCode}>
                                                        Verify & Enter
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="email">
                                        <form onSubmit={handleEmailLogin} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="email@example.com"
                                                    className="placeholder:text-muted-foreground/50"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="password">Password</Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    placeholder="••••••••"
                                                    className="placeholder:text-muted-foreground/50"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                            </div>
                                            <Button type="submit" className="w-full bg-black hover:bg-zinc-800">
                                                Log In
                                            </Button>
                                        </form>
                                    </TabsContent>
                                </Tabs>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold">Welcome back!</h3>
                                        <p className="text-sm text-zinc-500 max-w-[200px] mx-auto">
                                            Enter your shipyard invite code to continue.
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <Label htmlFor="invite">Invite Code</Label>
                                        <Input
                                            id="invite"
                                            placeholder="ENTER CODE"
                                            className="uppercase tracking-widest text-center"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <Button className="w-full bg-black hover:bg-zinc-800" onClick={handleInviteSubmit}>
                                        Enter Shipyard
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                            <p>Entering Convoy...</p>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-zinc-50 p-4 text-center text-xs text-zinc-400">
                    &copy; 2026 Convoy Network. All rights reserved.
                </CardFooter>
            </Card>
        </div>
    );
}
