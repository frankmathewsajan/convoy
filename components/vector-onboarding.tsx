"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Navigation } from "lucide-react";

interface VectorOnboardingProps {
    onSetVector: (destination: string) => void;
}

export function VectorOnboarding({ onSetVector }: VectorOnboardingProps) {
    const [destination, setDestination] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (destination.trim()) {
            onSetVector(destination);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-50 p-4 transition-transform duration-300 ease-in-out md:bottom-8 md:left-1/2 md:w-[400px] md:-translate-x-1/2">
            <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-zinc-900 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-black uppercase">
                        <Navigation className="h-6 w-6" />
                        Set Your Vector
                    </CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-zinc-400 font-medium">
                        Where are you headed? Connect with nomads on your route.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider">Current Location</label>
                            <div className="flex items-center gap-2 rounded-md border-2 border-black bg-zinc-100 p-2 opacity-75 dark:border-white dark:bg-zinc-800">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
                                <span className="text-sm font-medium">Auto-detected</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="destination" className="text-sm font-bold uppercase tracking-wider">
                                Destination
                            </label>
                            <Input
                                id="destination"
                                placeholder="e.g., Moab, UT"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="border-2 border-black bg-white focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white dark:bg-black"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full border-2 border-black bg-main text-main-foreground hover:translate-y-1 hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] font-bold uppercase"
                        >
                            Confirm Vector
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
