"use client";

import { useEffect, useRef, useState } from "react";
import { Purchases } from "@revenuecat/purchases-js";
import { Loader2, AlertTriangle, X } from "lucide-react";

const REVENUECAT_API_KEY = "test_UcfvVtEKTneUKCOYsCUAEYYHvLX"; // Project ID: proj6f764251

interface PaywallModalProps {
    open: boolean;
    onClose: () => void;
    userId?: string;
}

export function PaywallModal({ open, onClose, userId }: PaywallModalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (open && containerRef.current) {
            setIsLoading(true);
            setErrorMsg(null);

            const initPaywall = async () => {
                try {
                    if (!Purchases.isConfigured()) {
                        const appUserId = userId || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserId });
                    }

                    const purchases = Purchases.getSharedInstance();

                    // Debug: Check offerings
                    try {
                        const offerings = await purchases.getOfferings();
                        console.log("RevenueCat Offerings:", offerings);
                        if (!offerings.current) {
                            console.warn("No 'current' offering found. Ensure creating an offering in RC dashboard.");
                        }
                    } catch (err) {
                        console.error("Failed to fetch offerings:", err);
                    }

                    // Try to load the paywall
                    const result = await purchases.presentPaywall({
                        htmlTarget: containerRef.current!,
                    });

                    // If we get here, paywall loaded successfully (SDK handles the rest)
                    if (result === undefined) {
                        // SDK presented it (or started to).
                        setIsLoading(false);
                    } else if (result) {
                        // Purchased
                        onClose();
                    }

                } catch (paywallError: any) {
                    console.error("Paywall Load Error:", paywallError);
                    setIsLoading(false);

                    // Handle specific errors
                    if (paywallError.message?.includes("doesn't have a paywall attached")) {
                        setErrorMsg("Configuration Error: The current offering has no Paywall UI attached in RevenueCat Dashboard.");
                    } else {
                        setErrorMsg(`Paywall Error: ${paywallError.message || "Unknown error"}`);
                    }
                }
            };
            initPaywall();
        }
    }, [open, onClose, userId]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-secondary-background rounded-base overflow-hidden border-2 border-border shadow-shadow flex flex-col max-h-[85vh] min-h-[300px]">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-[200] h-9 w-9 rounded-base border-2 border-border bg-main text-main-foreground flex items-center justify-center shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* RevenueCat Container */}
                <div ref={containerRef} className="w-full h-full overflow-y-auto" />

                {/* Loading State */}
                {isLoading && !errorMsg && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-background z-10">
                        <Loader2 className="w-10 h-10 animate-spin text-main" />
                        <p className="mt-4 font-heading text-muted-foreground uppercase tracking-widest text-sm">Loading Paywall...</p>
                    </div>
                )}

                {/* Error State */}
                {errorMsg && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-background z-20 p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <h3 className="font-heading text-xl text-foreground mb-2">Paywall Error</h3>
                        <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-main text-main-foreground border-2 border-border shadow-shadow rounded-base font-bold uppercase tracking-wide active:translate-y-1 active:shadow-none transition-all"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
