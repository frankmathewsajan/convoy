"use client";

import { useEffect, useRef } from "react";
import { Purchases } from "@revenuecat/purchases-js";

// TODO: Replace with your actual RevenueCat Public API Key
const REVENUECAT_API_KEY = "appl_placeholder_key";

interface PaywallModalProps {
    open: boolean;
    onClose: () => void;
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && containerRef.current) {
            const initPaywall = async () => {
                try {
                    if (!Purchases.isConfigured()) {
                        Purchases.configure(REVENUECAT_API_KEY);
                    }

                    const purchases = Purchases.getSharedInstance();
                    const result = await purchases.presentPaywall({
                        htmlTarget: containerRef.current!,
                    });

                    if (result === "purchased" || result === "restored") {
                        onClose(); // Close on success
                    }
                } catch (e) {
                    console.error("Paywall error:", e);
                }
            };
            initPaywall();
        }
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border-4 border-black">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[200] p-2 bg-black text-white rounded-full hover:bg-zinc-800 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div ref={containerRef} className="w-full h-full overflow-y-auto" />
            </div>
        </div>
    );
}
