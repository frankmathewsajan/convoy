"use server";

import { adminDb } from "@/lib/firebase/firebase-admin";

/**
 * Check if an email or phone number is allowed to access the app.
 * Access is allowed if:
 * 1. The user already exists in the 'users' collection (returning user).
 * 2. The user has a valid invite in the 'invites' collection (new user with invite).
 * 
 * This MUST be a Server Action because unauthenticated users cannot query the 'users' collection.
 */
export async function checkUserAccessAction(opts: { email?: string; phone?: string }) {
    try {
        const { email, phone } = opts;

        // 1. Check if they are an existing user
        if (email) {
            const userQuery = await adminDb.collection("users")
                .where("email", "==", email.toLowerCase())
                .limit(1)
                .get();

            if (!userQuery.empty) {
                return { allowed: true, reason: "returning_user" };
            }
        }

        if (phone) {
            const userQuery = await adminDb.collection("users")
                .where("phoneNumber", "==", phone)
                .limit(1)
                .get();

            if (!userQuery.empty) {
                return { allowed: true, reason: "returning_user" };
            }
        }

        // 2. Check for Invites
        const invitesRef = adminDb.collection("invites");
        let inviteDoc = null;

        if (email) {
            const emailQuery = await invitesRef
                .where("type", "==", "email")
                .where("value", "==", email.toLowerCase())
                .limit(1)
                .get();

            if (!emailQuery.empty) inviteDoc = emailQuery.docs[0];
        }

        if (!inviteDoc && phone) {
            const phoneQuery = await invitesRef
                .where("type", "==", "phone")
                .where("value", "==", phone)
                .limit(1)
                .get();

            if (!phoneQuery.empty) inviteDoc = phoneQuery.docs[0];
        }

        if (inviteDoc) {
            const data = inviteDoc.data();
            return {
                allowed: true,
                reason: "invited",
                inviterName: data.inviterName || "Someone",
                inviterUid: data.invitedBy,
                inviteDocId: inviteDoc.id
            };
        }

        // 3. Not found
        return { allowed: false, reason: "not_invited" };

    } catch (error: any) {
        console.error("Error checking user access:", error);
        return { allowed: false, error: error.message };
    }
}
