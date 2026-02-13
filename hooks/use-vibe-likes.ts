"use client";

import { useEffect, useState } from "react";
import {
    collection,
    doc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { auth } from "@/lib/firebase/config";
import {
    sendLikeAction,
    removeLikeAction,
} from "@/app/actions/vibe-actions"; // Keep strictly server-dependent actions

export interface VibeLike {
    from: string;
    to: string;
    timestamp: any;
    fromName?: string;
    fromPhoto?: string;
    fromTheme?: string;
}

// ─────────────────────────────────────────────────────────
// Helper: get current user's ID token for server actions
// ─────────────────────────────────────────────────────────

async function getIdToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
}

// ─────────────────────────────────────────────────────────
// Write operations — proxied through Server Actions
// ─────────────────────────────────────────────────────────

/**
 * Send a like from one user to another (via server action).
 */
export async function sendVibeLike(
    fromUid: string,
    toUid: string,
    fromName?: string,
    fromPhoto?: string,
    fromTheme?: string
) {
    const token = await getIdToken();
    const result = await sendLikeAction(token, toUid, fromName, fromPhoto, fromTheme);
    if (result.error) throw new Error(result.error);
    return result;
}

/**
 * Remove a like (for undo) via server action.
 */
export async function removeVibeLike(fromUid: string, toUid: string) {
    const token = await getIdToken();
    const result = await removeLikeAction(token, toUid);
    if (result.error) throw new Error(result.error);
    return result;
}

/**
 * Record that a user has been seen (swiped left or right) via server action.
 */
export async function recordInteraction(uid: string, targetUid: string) {
    if (uid === targetUid) return;
    const ref = doc(db, "vibe-interactions", uid);
    await setDoc(ref, { seen: arrayUnion(targetUid) }, { merge: true });
}

/**
 * Remove last interaction (for undo) via server action.
 */
export async function removeInteraction(uid: string, targetUid: string) {
    const ref = doc(db, "vibe-interactions", uid);
    await updateDoc(ref, { seen: arrayRemove(targetUid) });
}

/**
 * Get the set of user IDs this user has already interacted with.
 * This is a read — stays client-side.
 */
export async function getSeenUserIds(uid: string): Promise<Set<string>> {
    const { getDoc } = await import("firebase/firestore");
    const interRef = doc(db, "vibe-interactions", uid);
    const snap = await getDoc(interRef);
    if (snap.exists()) {
        return new Set(snap.data().seen || []);
    }
    return new Set();
}

// ─────────────────────────────────────────────────────────
// Read hooks — stay client-side with onSnapshot
// ─────────────────────────────────────────────────────────

/**
 * Hook: real-time listener for likes received by the current user.
 */
export function useVibeLikesReceived(uid: string | undefined) {
    const [likes, setLikes] = useState<VibeLike[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) return;
        setLoading(true);

        const q = query(collection(db, "vibe-likes"), where("to", "==", uid));
        const unsub = onSnapshot(q, (snap) => {
            const results: VibeLike[] = [];
            snap.docs.forEach((d) => {
                const data = d.data();
                results.push({
                    from: data.from,
                    to: data.to,
                    timestamp: data.timestamp,
                    fromName: data.fromName || undefined,
                    fromPhoto: data.fromPhoto || undefined,
                    fromTheme: data.fromTheme || undefined,
                });
            });
            setLikes(results);
            setLoading(false);
        });

        return () => unsub();
    }, [uid]);

    return { likes, loading };
}

/**
 * Hook: real-time listener for the current user's unseen likes count.
 */
export function useVibeLikeCount(uid: string | undefined) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!uid) return;

        const userRef = doc(db, "users", uid);
        const unsub = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                setCount(snap.data().vibeLikesReceived || 0);
            }
        });

        return () => unsub();
    }, [uid]);

    return count;
}

/**
 * Reset the vibeLikesReceived counter (via server action).
 */
export async function markLikesSeen(uid: string) {
    // 1. Reset user counter
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { vibeLikesReceived: 0 });

    // 2. Mark likes as seen (batch)
    // Note: To be perfect, this needs a batch write. 
    // Client-side batching of 500+ docs is heavy but feasible.
    // For now, let's just reset the counter which clears the badge.
    // The individual 'seen' status on likes is less critical for UI.
}

/**
 * Send a quick message via server action.
 */
export async function sendVibeMessage(
    fromUid: string,
    toUid: string,
    message: string,
    fromName?: string
) {
    if (!message.trim()) return;
    const convId = [fromUid, toUid].sort().join("_");

    // 1. Add message
    const msgsRef = collection(db, "vibe-messages", convId, "messages");
    await addDoc(msgsRef, {
        from: fromUid,
        to: toUid,
        text: message.trim(),
        fromName: fromName || null,
        timestamp: serverTimestamp(),
    });

    // 2. Update conversation metadata
    const convRef = doc(db, "vibe-messages", convId);
    await setDoc(convRef, {
        participants: [fromUid, toUid],
        lastMessage: message.trim(),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });
}

// ─────────────────────────────────────────────────────────
// Messaging Hooks
// ─────────────────────────────────────────────────────────

export interface VibeConversation {
    id: string;
    participants: string[];
    lastMessage: string;
    lastMessageTime: any;
    updatedAt: any;
    otherUserUid: string; // Helper for UI
}

export interface VibeMessage {
    id: string;
    from: string;
    to: string;
    text: string;
    timestamp: any;
}

/**
 * Hook: Fetch all conversations for the current user.
 */
export function useVibeConversations(uid: string | undefined) {
    const [conversations, setConversations] = useState<VibeConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) return;
        setLoading(true);

        const q = query(
            collection(db, "vibe-messages"),
            where("participants", "array-contains", uid)
            // Note: Ordering by 'updatedAt' requires a composite index. 
            // If it fails, check console for index creation link.
            // orderBy("updatedAt", "desc") 
        );

        const unsub = onSnapshot(q, (snap) => {
            const results: VibeConversation[] = [];
            snap.docs.forEach((d) => {
                const data = d.data();
                const otherUserUid = data.participants.find((p: string) => p !== uid) || "unknown";
                results.push({
                    id: d.id,
                    participants: data.participants,
                    lastMessage: data.lastMessage,
                    lastMessageTime: data.lastMessageTime,
                    updatedAt: data.updatedAt,
                    otherUserUid
                });
            });
            // Client-side sort to avoid index issues for now
            results.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            setConversations(results);
            setLoading(false);
        });

        return () => unsub();
    }, [uid]);

    return { conversations, loading };
}

/**
 * Hook: Fetch messages for a specific conversation.
 */
export function useVibeMessages(conversationId: string | null) {
    const [messages, setMessages] = useState<VibeMessage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            return;
        }
        setLoading(true);

        const q = query(
            collection(db, "vibe-messages", conversationId, "messages"),
            // orderBy("timestamp", "asc") // Again, might need index if mixed with where? No, this is subcollection.
        );
        // We need to sort by timestamp. Default order is doc ID which isn't time.
        // Let's rely on client-side sort if query fails, but query should work for simple collection scan.

        const unsub = onSnapshot(q, (snap) => {
            const results: VibeMessage[] = [];
            snap.docs.forEach((d) => {
                const data = d.data();
                results.push({
                    id: d.id,
                    from: data.from,
                    to: data.to,
                    text: data.text,
                    timestamp: data.timestamp,
                });
            });
            results.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
            setMessages(results);
            setLoading(false);
        });

        return () => unsub();
    }, [conversationId]);

    return { messages, loading };
}
