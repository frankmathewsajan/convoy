"use server";

import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { headers } from "next/headers";

export async function deleteAccountAction(token: string) {
    try {
        // 1. Verify the user's token
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        console.log(`[DeleteAccount] Starting deletion for user: ${uid}`);

        // 2. Delete Firestore Data
        // We delete: users/{uid}, vibe-interactions/{uid}, locationHistory/{uid}
        // We KEEP: invites/{inviteId} (as requested, to preserve invite lineage)

        await adminDb.collection("users").doc(uid).delete();
        await adminDb.collection("vibe-interactions").doc(uid).delete();

        // Note: Subcollections (like locationHistory/entries) are NOT automatically deleted by deleting the parent doc in Firestore.
        // However, for a single user's history, we can try to do a batch delete if it's critical. 
        // For this MVP, deleting the parent 'users' doc is the primary "soft delete" visibility-wise.
        // But let's try to be clean.

        // Delete location history entries (batch)
        const locationEntries = await adminDb.collection("locationHistory").doc(uid).collection("entries").limit(500).get();
        if (!locationEntries.empty) {
            const batch = adminDb.batch();
            locationEntries.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
        }
        await adminDb.collection("locationHistory").doc(uid).delete();

        // 3. Delete Auth User
        await adminAuth.deleteUser(uid);

        console.log(`[DeleteAccount] Successfully deleted user: ${uid}`);
        return { success: true };

    } catch (error: any) {
        console.error("[DeleteAccount] Error deleting user:", error);
        return { error: error.message || "Failed to delete account" };
    }
}
