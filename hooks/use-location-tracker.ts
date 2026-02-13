"use client";

import { useEffect, useRef, useCallback } from "react";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const UPDATE_INTERVAL_MS = 30_000; // 30 seconds
const MIN_DISTANCE_METERS = 100; // Only update if moved 100+ meters

/**
 * Haversine formula: calculate distance between two lat/lng points in meters
 */
function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Custom hook: tracks user location and writes to Firestore
 * - Polls every 30 seconds
 * - Only writes if moved >= 100 meters from last saved position
 * - Updates `users/{uid}.location` (live position)
 * - Appends to `locationHistory/{uid}/entries` (1-month retention)
 */
export function useLocationTracker(userId: string | undefined) {
    const lastSavedPos = useRef<{ lat: number; lng: number } | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const saveLocation = useCallback((lat: number, lng: number) => {
        if (!userId) return;

        // Update position ref immediately (non-blocking)
        lastSavedPos.current = { lat, lng };

        // Fire-and-forget: don't await, don't block anything
        const userRef = doc(db, "users", userId);
        updateDoc(userRef, {
            location: { lat, lng },
            lastLocationUpdate: serverTimestamp(),
        }).catch(() => { /* silently ignore */ });

        const historyRef = collection(db, "locationHistory", userId, "entries");
        addDoc(historyRef, {
            lat,
            lng,
            timestamp: serverTimestamp(),
        }).catch(() => { /* silently ignore */ });
    }, [userId]);

    const checkAndUpdate = useCallback(() => {
        if (!userId || typeof window === "undefined" || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // If no previous position, save immediately
                if (!lastSavedPos.current) {
                    saveLocation(latitude, longitude);
                    return;
                }

                // Calculate distance from last saved position
                const distance = haversineDistance(
                    lastSavedPos.current.lat, lastSavedPos.current.lng,
                    latitude, longitude
                );

                // Only save if moved >= 100 meters
                if (distance >= MIN_DISTANCE_METERS) {
                    saveLocation(latitude, longitude);
                }
            },
            (error) => {
                console.warn("Geolocation error:", error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000,
            }
        );
    }, [userId, saveLocation]);

    useEffect(() => {
        if (!userId) return;

        // Initial check
        checkAndUpdate();

        // Set up interval
        intervalRef.current = setInterval(checkAndUpdate, UPDATE_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [userId, checkAndUpdate]);
}
