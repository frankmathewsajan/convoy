"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export interface NearbyNomad {
    uid: string;
    displayName: string | null;
    vector: string | null;
    theme: string;
    location: { lat: number; lng: number };
    photoURL: string | null;
    isBuilder: boolean;
    lastLocationUpdate: number | null; // epoch ms, null if unknown
}

/**
 * Real-time listener for nearby nomads from Firestore.
 * Excludes the current user and anyone in incognito mode.
 * Uses onSnapshot for live updates — no more disappearing markers on navigation.
 */
export function useNearbyNomads(currentUserId: string | undefined) {
    const [nomads, setNomads] = useState<NearbyNomad[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUserId) {
            setNomads([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const usersRef = collection(db, "users");

        const unsubscribe = onSnapshot(
            usersRef,
            (snap) => {
                const results: NearbyNomad[] = [];
                snap.docs.forEach((doc) => {
                    if (doc.id === currentUserId) return;
                    const data = doc.data();
                    if (data.incognito === true) return;
                    if (!data.location?.lat || !data.location?.lng) return;
                    results.push({
                        uid: doc.id,
                        displayName: data.displayName || "Anonymous Nomad",
                        vector: data.vector || null,
                        theme: data.theme || "yellow",
                        location: { lat: data.location.lat, lng: data.location.lng },
                        photoURL: data.photoURL || null,
                        isBuilder: data.isBuilder === true,
                        lastLocationUpdate: data.lastLocationUpdate?.toMillis?.() ?? null,
                    });
                });
                setNomads(results);
                setLoading(false);
            },
            (err) => {
                console.error("Error listening to nearby nomads:", err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUserId]);

    return { nomads, loading };
}
