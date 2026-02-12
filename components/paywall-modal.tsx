"use client";

import { useEffect, useState, useCallback } from "react";
import { Purchases, Package, PackageType, PurchasesError, ErrorCode } from "@revenuecat/purchases-js";
import { Loader2, X, Check, Zap, Shield, Users, PartyPopper, RefreshCw } from "lucide-react";

const REVENUECAT_API_KEY = "test_UcfvVtEKTneUKCOYsCUAEYYHvLX"; // Project ID: proj6f764251

interface PaywallModalProps {
    open: boolean;
    onClose: () => void;
    userId?: string;
}

// Friendly name mapping using the actual PackageType enum values
const PACKAGE_DISPLAY: Record<string, { name: string; subtitle: string; badge?: string }> = {
    [PackageType.Monthly]: { name: "Monthly", subtitle: "Cancel anytime" },
    [PackageType.Annual]: { name: "Yearly", subtitle: "Best value — save ~40%", badge: "POPULAR" },
    [PackageType.Lifetime]: { name: "Lifetime", subtitle: "One-time purchase, forever access", badge: "BEST DEAL" },
    [PackageType.Weekly]: { name: "Weekly", subtitle: "Cancel anytime" },
    [PackageType.SixMonth]: { name: "6 Months", subtitle: "Great savings" },
    [PackageType.ThreeMonth]: { name: "3 Months", subtitle: "Good value" },
    [PackageType.TwoMonth]: { name: "2 Months", subtitle: "Cancel anytime" },
    [PackageType.Custom]: { name: "Custom", subtitle: "" },
    [PackageType.Unknown]: { name: "Plan", subtitle: "" },
};

function getPackageDisplay(pkg: Package) {
    return PACKAGE_DISPLAY[pkg.packageType] || {
        name: pkg.identifier.replace(/^\$rc_/, "").replace(/_/g, " "),
        subtitle: ""
    };
}

function getUserFriendlyError(rawMessage: string): string {
    const lower = rawMessage.toLowerCase();
    if (lower.includes("simulated") || lower.includes("test store")) {
        return "This is a test environment. Purchases will work once the app goes live.";
    }
    if (lower.includes("network") || lower.includes("timeout") || lower.includes("fetch")) {
        return "Connection issue. Please check your internet and try again.";
    }
    if (lower.includes("cancelled") || lower.includes("canceled")) {
        return "";
    }
    if (lower.includes("already") || lower.includes("owned")) {
        return "You already have an active subscription!";
    }
    if (lower.includes("configuration") || lower.includes("offering")) {
        return "Subscription plans are being configured. Please try again shortly.";
    }
    return "Something went wrong. Please try again or contact support.";
}

export function PaywallModal({ open, onClose, userId }: PaywallModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [purchasedPlanName, setPurchasedPlanName] = useState("");

    useEffect(() => {
        if (!open) return;
        setIsLoading(true);
        setErrorMsg(null);
        setPackages([]);
        setSelectedPkg(null);
        setPurchaseSuccess(false);
        setPurchasedPlanName("");

        const fetchOfferings = async () => {
            try {
                if (!Purchases.isConfigured()) {
                    const appUserId = userId || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserId });
                }

                const purchases = Purchases.getSharedInstance();
                const offerings = await purchases.getOfferings();

                if (offerings.current && offerings.current.availablePackages.length > 0) {
                    const availablePackages = offerings.current.availablePackages;
                    setPackages(availablePackages);
                    // Auto-select best value: annual > first
                    const annual = availablePackages.find(p => p.packageType === PackageType.Annual);
                    setSelectedPkg(annual || availablePackages[0]);
                } else {
                    setErrorMsg("No subscription plans available right now. Please check back later.");
                }
            } catch (err: any) {
                console.error("Failed to fetch offerings:", err);
                setErrorMsg(getUserFriendlyError(err.message || "Failed to load subscription plans."));
            } finally {
                setIsLoading(false);
            }
        };

        fetchOfferings();
    }, [open, userId]);

    const handlePurchase = useCallback(async () => {
        if (!selectedPkg) return;

        setIsPurchasing(true);
        setErrorMsg(null);

        try {
            const purchases = Purchases.getSharedInstance();
            const { customerInfo } = await purchases.purchase({ rcPackage: selectedPkg });

            const display = getPackageDisplay(selectedPkg);
            setPurchasedPlanName(display.name);
            setPurchaseSuccess(true);

            setTimeout(() => {
                onClose();
            }, 3000);
        } catch (err: any) {
            console.error("Purchase error:", err);

            if (err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError) {
                setIsPurchasing(false);
                return;
            }

            const friendlyMsg = getUserFriendlyError(err.message || "");
            if (friendlyMsg) {
                setErrorMsg(friendlyMsg);
            }
        } finally {
            setIsPurchasing(false);
        }
    }, [selectedPkg, onClose]);

    const formatPrice = (pkg: Package): string => {
        try {
            const product = pkg.webBillingProduct;
            if (product) {
                // Use the non-deprecated price property first
                if (product.price) return product.price.formattedPrice;
                // Fallback to currentPrice (deprecated but available)
                if (product.currentPrice) return product.currentPrice.formattedPrice;
            }
            return "—";
        } catch {
            return "—";
        }
    };

    const formatPeriod = (pkg: Package): string => {
        switch (pkg.packageType) {
            case PackageType.Monthly: return "/mo";
            case PackageType.Annual: return "/yr";
            case PackageType.Weekly: return "/wk";
            case PackageType.Lifetime: return " once";
            case PackageType.SixMonth: return "/6mo";
            case PackageType.ThreeMonth: return "/3mo";
            case PackageType.TwoMonth: return "/2mo";
            default: return "";
        }
    };

    const handleClose = useCallback(() => {
        setErrorMsg(null);
        onClose();
    }, [onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="relative w-full max-w-md bg-white rounded-xl overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-zinc-100 active:scale-95 transition-all"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* ─── SUCCESS STATE ─── */}
                {purchaseSuccess ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-green-400 border-4 border-black rounded-full flex items-center justify-center mb-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                            <PartyPopper className="w-9 h-9 text-black" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black uppercase mb-2">
                            Payment Successful!
                        </h3>
                        <p className="text-zinc-600 font-medium text-base mb-1">
                            You&apos;re now on the <span className="font-black text-black">{purchasedPlanName}</span> plan.
                        </p>
                        <p className="text-zinc-400 text-sm">
                            Full access to Convoy Pro is now unlocked.
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-green-600">
                            <Check className="w-4 h-4" strokeWidth={3} />
                            <span className="text-xs font-bold uppercase tracking-wider">All set — closing automatically</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ─── HEADER ─── */}
                        <div className="bg-[#FFD700] border-b-4 border-black p-6 pt-8">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-5 h-5" strokeWidth={3} />
                                <span className="text-xs font-black uppercase tracking-widest">Convoy Pro</span>
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                Unlock the Full Experience
                            </h2>
                            <p className="text-sm font-medium mt-1 text-black/70">
                                Join the builder network and go further.
                            </p>
                        </div>

                        {/* Scrollable content area */}
                        <div className="overflow-y-auto flex-1">
                            {/* ─── FEATURES ─── */}
                            <div className="px-6 pt-5 pb-3">
                                <div className="space-y-3">
                                    {[
                                        { icon: Users, text: "Access verified mechanics & builders" },
                                        { icon: Shield, text: "Unlimited messaging with builders" },
                                        { icon: Zap, text: "Priority route planning & vibe zones" },
                                    ].map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[#FFD700] border-2 border-black rounded-md flex items-center justify-center flex-shrink-0">
                                                <feature.icon className="w-4 h-4" strokeWidth={2.5} />
                                            </div>
                                            <span className="text-sm font-bold">{feature.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ─── ERROR MESSAGE ─── */}
                            {errorMsg && (
                                <div className="mx-6 mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-amber-200 border-2 border-amber-400 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <RefreshCw className="w-4 h-4 text-amber-700" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-amber-800 text-sm font-bold mb-1">Couldn&apos;t complete purchase</p>
                                            <p className="text-amber-700 text-xs font-medium leading-relaxed">{errorMsg}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setErrorMsg(null)}
                                        className="mt-3 w-full text-xs font-bold text-amber-600 hover:text-amber-800 uppercase tracking-wider flex items-center justify-center gap-1.5 py-1"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Dismiss & try again
                                    </button>
                                </div>
                            )}

                            {/* ─── LOADING ─── */}
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <Loader2 className="w-8 h-8 animate-spin text-black" />
                                    <p className="mt-3 text-sm font-bold uppercase tracking-widest text-zinc-400">
                                        Loading plans...
                                    </p>
                                </div>
                            )}

                            {/* ─── PACKAGES ─── */}
                            {!isLoading && packages.length > 0 && (
                                <div className="px-6 pb-4 space-y-3">
                                    {packages.map((pkg) => {
                                        const isSelected = selectedPkg?.identifier === pkg.identifier;
                                        const display = getPackageDisplay(pkg);
                                        return (
                                            <button
                                                key={pkg.identifier}
                                                onClick={() => setSelectedPkg(pkg)}
                                                className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${isSelected
                                                        ? "border-black bg-[#FFF9DB] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                                        : "border-zinc-200 bg-white hover:border-zinc-400"
                                                    }`}
                                            >
                                                {display.badge && (
                                                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                                                        {display.badge}
                                                    </span>
                                                )}
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-black bg-[#FFD700]" : "border-zinc-300 bg-white"
                                                            }`}>
                                                            {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-base capitalize">
                                                                {display.name}
                                                            </p>
                                                            <p className="text-xs text-zinc-500 font-medium mt-0.5">
                                                                {display.subtitle}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-lg">
                                                            {formatPrice(pkg)}
                                                        </p>
                                                        <p className="text-xs text-zinc-400 font-medium">
                                                            {formatPeriod(pkg)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ─── FALLBACK: No packages ─── */}
                            {!isLoading && packages.length === 0 && !errorMsg && (
                                <div className="px-6 pb-6">
                                    <div className="p-4 bg-zinc-50 border-2 border-zinc-200 rounded-xl text-center">
                                        <p className="font-bold text-sm">Coming Soon</p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Subscription plans are being set up. Check back shortly!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── PURCHASE BUTTON (sticky at bottom) ─── */}
                        {!isLoading && packages.length > 0 && (
                            <div className="px-6 pb-5 pt-3 border-t border-zinc-100 bg-white">
                                <button
                                    onClick={handlePurchase}
                                    disabled={!selectedPkg || isPurchasing}
                                    className="w-full h-12 bg-black text-white font-black uppercase tracking-wide text-sm rounded-xl border-2 border-black hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                                >
                                    {isPurchasing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Subscribe Now
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[11px] text-zinc-400 mt-2.5 font-medium">
                                    Secure checkout via Stripe · Cancel anytime
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
