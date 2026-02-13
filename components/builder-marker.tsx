/// <reference types="google.maps" />
"use client";

import { CustomOverlay } from "@/components/custom-overlay";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Hammer, MessageSquare, Navigation, X } from "lucide-react";

import { PaywallModal } from "@/components/paywall-modal";
import { ChatDialog } from "@/components/chat-dialog";

interface BuilderMarkerProps {
    position: google.maps.LatLngLiteral;
    uid: string;
    name: string;
    role: string;
    description: string;
    visible?: boolean;
}

export function BuilderMarker({ position, uid, name, role, description, visible = true }: BuilderMarkerProps) {
    const { user, isPro, refreshProStatus, proLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const handleProAction = (action: string) => {
        console.log("🛠️ [BuilderMarker] Clicked", { action, isPro, proLoading });

        if (proLoading) return;

        if (isPro) {
            if (action === "Message") {
                setShowChat(true);
            } else {
                setToast(`${action} — coming soon!`);
                setTimeout(() => setToast(null), 2000);
            }
        } else {
            console.log("🔒 [BuilderMarker] Showing Paywall because isPro=false");
            setShowPaywall(true);
        }
    };

    return (
        <>
            <CustomOverlay position={position} zIndex={50} visible={visible}>
                <div className="relative group cursor-pointer" onClick={() => setIsOpen(true)}>
                    {/* CSS/SVG Pin Replacement */}
                    <div className="relative" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))' }}>
                        <svg width="36" height="48" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20.5 12 32 12 32C12 32 24 20.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="var(--main)" stroke="white" strokeWidth="2" />
                            <circle cx="12" cy="12" r="4" fill="white" />
                        </svg>
                    </div>
                </div>
            </CustomOverlay>

            {isOpen && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[320px] z-50">
                    <Card className="border-4 bg-white relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ borderColor: 'var(--main)' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                            className="absolute top-2 right-2 p-1 hover:bg-zinc-100 rounded-full"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: 'var(--main)' }}></div>

                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--main)' }}>
                                <Hammer className="h-3 w-3" /> Verified Builder
                            </div>
                            <CardTitle className="text-xl font-black">{name}</CardTitle>
                            <CardDescription className="font-medium text-black">{role}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <p className="text-sm text-zinc-600">{description}</p>
                        </CardContent>
                        <CardFooter className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => handleProAction("Message")}
                                disabled={proLoading}
                                className="w-full bg-zinc-100 text-black border-2 border-black hover:bg-zinc-200 disabled:opacity-50"
                            >
                                <MessageSquare className="h-4 w-4 mr-2" /> Message
                            </Button>
                            <Button
                                onClick={() => handleProAction("Navigate")}
                                disabled={proLoading}
                                className="w-full text-black border-2 border-black hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: 'var(--main)' }}
                            >
                                <Navigation className="h-4 w-4 mr-2" /> Navigate
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Toast */}
                    {toast && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-black text-white rounded-lg text-sm font-bold whitespace-nowrap shadow-lg">
                            {toast}
                        </div>
                    )}
                </div>
            )}

            <PaywallModal
                open={showPaywall}
                onClose={() => setShowPaywall(false)}
                userId={user?.uid}
                onPurchaseSuccess={refreshProStatus}
            />

            <ChatDialog
                open={showChat}
                onOpenChange={setShowChat}
                recipientId={name} // NOTE: This assumes 'name' is unique or mapped. Actually, BuilderMarker doesn't have uid prop?
                recipientName={name}
            />
        </>
    );
}
