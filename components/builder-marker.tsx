/// <reference types="google.maps" />
"use client";

import { CustomOverlay } from "@/components/custom-overlay";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Hammer, MessageSquare, Navigation, X } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BuilderMarkerProps {
    position: google.maps.LatLngLiteral;
    name: string;
    role: string;
    description: string;
}

export function BuilderMarker({ position, name, role, description }: BuilderMarkerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);

    const handlePaywallTrigger = () => {
        setShowPaywall(true);
    };

    return (
        <>
            <CustomOverlay position={position} zIndex={50}>
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
                                onClick={handlePaywallTrigger}
                                className="w-full bg-zinc-100 text-black border-2 border-black hover:bg-zinc-200"
                            >
                                <MessageSquare className="h-4 w-4 mr-2" /> Message
                            </Button>
                            <Button
                                onClick={handlePaywallTrigger}
                                className="w-full text-black border-2 border-black hover:opacity-90"
                                style={{ backgroundColor: 'var(--main)' }}
                            >
                                <Navigation className="h-4 w-4 mr-2" /> Navigate
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            <AlertDialog open={showPaywall} onOpenChange={setShowPaywall}>
                <AlertDialogContent className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ boxShadow: '8px 8px 0px 0px var(--main)' }}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase">Unlock Builder Network</AlertDialogTitle>
                        <AlertDialogDescription asChild className="text-base">
                            <div>
                                Get unlimited access to verified mechanics, solar installers, and builders on your route.

                                <div className="mt-4 p-4 bg-zinc-50 border-2 border-zinc-200 rounded text-center font-bold text-black">
                                    Join Shipyard Pro for $4.99/mo
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-2 border-black">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="text-black border-2 border-black hover:opacity-90 font-bold" style={{ backgroundColor: 'var(--main)' }}>
                            Unlock Now
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
