"use server";

import { verifyIdToken, adminDb, adminStorage } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTOS_PER_USER = 4;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * Upload a vibe photo via server action.
 * Validates auth, file size (max 5MB), MIME type, and photo count (max 4).
 * Writes directly to Firebase Storage via Admin SDK.
 */
export async function uploadVibePhoto(idToken: string, formData: FormData) {
    // 1. Verify auth
    const decoded = await verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2. Get file from form data
    const file = formData.get("photo") as File | null;
    if (!file) {
        return { error: "No file provided" };
    }

    // 3. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, HEIC` };
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
        return { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` };
    }

    // 5. Check current photo count
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const currentPhotos: string[] = userDoc.data()?.vibeProfile?.photos || [];
    if (currentPhotos.length >= MAX_PHOTOS_PER_USER) {
        return { error: `Maximum ${MAX_PHOTOS_PER_USER} photos allowed` };
    }

    // 6. Upload to Firebase Storage
    const bucket = adminStorage.bucket();
    const fileName = `vibe-photos/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const fileRef = bucket.file(fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fileRef.save(buffer, {
        metadata: {
            contentType: file.type,
            metadata: {
                uploadedBy: uid,
                uploadedAt: new Date().toISOString(),
            },
        },
    });

    // Make file publicly readable
    await fileRef.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return { success: true, url: publicUrl };
}
