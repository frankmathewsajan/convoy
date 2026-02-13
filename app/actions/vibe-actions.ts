"use server";

import { verifyIdToken, adminDb, adminStorage } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ─────────────────────────────────────────────────────────
// Vibe Like Actions
// ─────────────────────────────────────────────────────────

/**
 * Send a like from the authenticated user to another user.
 * Server validates the token, checks for duplicates, and writes atomically.
 */
export async function sendLikeAction(
    idToken: string,
    toUid: string,
    fromName?: string,
    fromPhoto?: string,
    fromTheme?: string
) {
    // 1. Verify auth
    const decoded = await verifyIdToken(idToken);
    const fromUid = decoded.uid;

    if (fromUid === toUid) {
        return { error: "Cannot like yourself" };
    }

    // 2. Check target user exists
    const targetDoc = await adminDb.collection("users").doc(toUid).get();
    if (!targetDoc.exists) {
        return { error: "User not found" };
    }

    // 3. Check if like already exists (prevent duplicates)
    const likeId = `${fromUid}_${toUid}`;
    const existingLike = await adminDb.collection("vibe-likes").doc(likeId).get();
    if (existingLike.exists) {
        return { error: "Already liked this user" };
    }

    // 4. Write like + increment counter atomically via batch
    const batch = adminDb.batch();
    batch.set(adminDb.collection("vibe-likes").doc(likeId), {
        from: fromUid,
        to: toUid,
        timestamp: FieldValue.serverTimestamp(),
        seen: false,
        fromName: fromName || null,
        fromPhoto: fromPhoto || null,
        fromTheme: fromTheme || null,
    });
    batch.update(adminDb.collection("users").doc(toUid), {
        vibeLikesReceived: FieldValue.increment(1),
    });
    await batch.commit();

    return { success: true };
}

/**
 * Remove a like (undo). Only the sender can undo their own like.
 */
export async function removeLikeAction(idToken: string, toUid: string) {
    const decoded = await verifyIdToken(idToken);
    const fromUid = decoded.uid;

    const likeId = `${fromUid}_${toUid}`;
    const likeDoc = await adminDb.collection("vibe-likes").doc(likeId).get();

    if (!likeDoc.exists) {
        return { error: "Like not found" };
    }

    // Verify ownership — only the sender can undo
    if (likeDoc.data()?.from !== fromUid) {
        return { error: "Not authorized" };
    }

    const batch = adminDb.batch();
    batch.delete(adminDb.collection("vibe-likes").doc(likeId));
    batch.update(adminDb.collection("users").doc(toUid), {
        vibeLikesReceived: FieldValue.increment(-1),
    });
    await batch.commit();

    return { success: true };
}

// Output: "interaction actions removed"

// Output: "markLikesSeenAction removed"

// Output: "sendMessageAction removed"

// Output: "updateVibeProfileAction removed"
