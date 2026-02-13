import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Firebase Admin SDK — server-side only.
 * Used by Next.js Server Actions to bypass Firestore/Storage security rules
 * and validate Firebase ID tokens.
 *
 * NEVER import this file in client components.
 */

function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Missing Firebase Admin environment variables. " +
            "Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set."
        );
    }

    return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}

const adminApp = getAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);
const adminStorage = getStorage(adminApp);

/**
 * Verify a Firebase ID token and return the decoded claims.
 * Throws if the token is invalid or expired.
 */
export async function verifyIdToken(idToken: string) {
    return adminAuth.verifyIdToken(idToken);
}

export { adminApp, adminAuth, adminDb, adminStorage };
