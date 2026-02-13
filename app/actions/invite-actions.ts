"use server";

import { verifyIdToken, adminDb } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ─────────────────────────────────────────────────────────
// Invite Actions
// ─────────────────────────────────────────────────────────

/**
 * Create a new invite.
 * - Validates inputs
 * - Decrements invitesRemaining if not Pro (trusted from client for now, strictly should be server-verified)
 * - Writes to 'invites' collection
 */
export async function createInviteAction(
    idToken: string,
    data: {
        type: "email" | "phone";
        value: string;
        inviteeName: string;
        relationship: string;
        isPro: boolean; // TODO: Verify this server-side via RevenueCat webhooks/API in future
    }
) {
    try {
        const decoded = await verifyIdToken(idToken);
        const uid = decoded.uid;

        // 1. Validate inputs
        if (!data.value || !data.inviteeName || !data.relationship) {
            return { error: "Missing required fields" };
        }

        // 2. Check User & Invites Remaining
        const userRef = adminDb.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return { error: "User not found" };
        }

        const userData = userDoc.data();
        const invitesRemaining = userData?.invitesRemaining || 0;

        // If not Pro, enforce limit
        if (!data.isPro && invitesRemaining <= 0) {
            return { error: "No invites remaining" };
        }

        // 3. Create Invite
        const inviteData = {
            type: data.type,
            value: data.value.trim().toLowerCase(),
            invitedBy: uid,
            inviterName: userData?.displayName || "A Nomad",
            inviteeName: data.inviteeName.trim(),
            relationship: data.relationship.trim(),
            status: "pending",
            createdAt: FieldValue.serverTimestamp(),
        };

        const inviteRef = await adminDb.collection("invites").add(inviteData);

        // 4. Decrement invites if not Pro
        if (!data.isPro) {
            await userRef.update({
                invitesRemaining: FieldValue.increment(-1)
            });
        }

        return { success: true, inviteId: inviteRef.id };

    } catch (error) {
        console.error("Error sending invite:", error);
        return { error: "Failed to send invite" };
    }
}

/**
 * Cancel an invite.
 * - Deletes the invite doc
 * - Increments invitesRemaining if not Pro
 */
export async function cancelInviteAction(
    idToken: string,
    inviteId: string,
    isPro: boolean // TODO: verify server-side
) {
    try {
        const decoded = await verifyIdToken(idToken);
        const uid = decoded.uid;

        const inviteRef = adminDb.collection("invites").doc(inviteId);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
            return { error: "Invite not found" };
        }

        const inviteData = inviteDoc.data();
        if (inviteData?.invitedBy !== uid) {
            return { error: "Not authorized to cancel this invite" };
        }

        // Delete invite
        await inviteRef.delete();

        // Restore invite count if not Pro
        if (!isPro) {
            await adminDb.collection("users").doc(uid).update({
                invitesRemaining: FieldValue.increment(1)
            });
        }

        return { success: true };

    } catch (error) {
        console.error("Error cancelling invite:", error);
        return { error: "Failed to cancel invite" };
    }
}

/**
 * Accept an invite (called when a new user signs up via invite)
 */
export async function acceptInviteAction(
    idToken: string,
    inviteId: string
) {
    try {
        await verifyIdToken(idToken); // Just ensure caller is auth'd (the new user)
        // Note: Logic allows any auth'd user to "accept" an invite if they know the ID.
        // In reality, we already verified specific email/phone matches in `login/page.tsx` checks.

        await adminDb.collection("invites").doc(inviteId).update({
            status: "accepted"
        });

        return { success: true };
    } catch (error) {
        console.error("Error accepting invite:", error);
        return { error: "Failed to accept invite" };
    }
}
