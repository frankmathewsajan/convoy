"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export interface VibeUser {
    uid: string;
    displayName: string;
    age: number | null;
    description: string;
    vehicle: string;
    badge: string;
    photos: string[];
    theme: string;
    photoURL: string | null;
    location?: { lat: number; lng: number };
    isBuilder?: boolean;
    vibeProfile?: any;
}

/**
 * Fetches users who have vibeActive === true from Firestore.
 * Excludes the current user.
 */
export function useVibeUsers(currentUserId: string | undefined) {
    const [users, setUsers] = useState<VibeUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        if (!currentUserId) return;
        setLoading(true);
        try {
            const usersRef = collection(db, "users");
            const snap = await getDocs(usersRef);

            const results: VibeUser[] = [];
            snap.docs.forEach((doc) => {
                if (doc.id === currentUserId) return;
                const data = doc.data();
                // Only include users who have activated vibing
                if (data.vibeActive !== true) return;
                if (!data.vibeProfile) return;

                results.push({
                    uid: doc.id,
                    displayName: data.displayName || "Anonymous Nomad",
                    age: data.vibeProfile.age || null,
                    description: data.vibeProfile.description || "",
                    vehicle: data.vibeProfile.vehicle || "Unknown",
                    badge: data.vibeProfile.badge || "Nomad",
                    photos: data.vibeProfile.photos || [],
                    theme: data.theme || "yellow",
                    photoURL: data.photoURL || null,
                    location: data.location || undefined,
                    isBuilder: data.isBuilder === true,
                });
            });
            setUsers(results);
        } catch (err) {
            console.error("Error fetching vibe users:", err);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) return;
        fetchUsers();
    }, [currentUserId, fetchUsers]);

    return { users, loading, refetch: fetchUsers };
}
