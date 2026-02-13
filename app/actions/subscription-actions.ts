"use server";

import { verifyIdToken, adminDb } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Syncs a successful purchase to Firestore for record-keeping.
 * This should be called immediately after a successful RevenueCat purchase on the client.
 */
export async function syncSubscriptionAction(
    idToken: string,
    customerInfo: any // We accept the full object now
) {
    console.log("[ServerAction] syncSubscriptionAction called");
    try {
        const decoded = await verifyIdToken(idToken);
        const uid = decoded.uid;
        console.log(`[ServerAction] Verified UID: ${uid}`);
        console.log("[ServerAction] Payload:", JSON.stringify(customerInfo, null, 2));

        // Store the full raw data in a subcollection or main doc? 
        // User asked for "saved in firestore under the user". 
        // Let's put the big object in a 'revenueCat' field in the main doc for easy access, 
        // OR in a 'subscription' subcollection if it's huge. 
        // Given the requirement "reference it later", main doc 'revenueCat' field or 'subscription' doc is best.
        // Let's stick to the existing pattern but more robust.

        // 1. Save detailed purchase log in subcollection (Keep existing but expand?)
        // Actually, user said "exact way it is returned".
        // Let's update the main user document with the full object.

        // 1. Sanitize the payload
        const plainData = JSON.parse(JSON.stringify(customerInfo));

        // 2. Smart Parse: Find the "Latest" subscription
        // Even if expired, we want to know what they HAD.
        let latestPlan = "free";
        let latestDate = 0;
        let latestExpiration: string | null = null;
        let isActuallyPro = false;

        // Check active first (Source of Truth for Access)
        const activeEntitlements = plainData.entitlements?.active || {};
        const activeSubscriptions = plainData.activeSubscriptions || [];

        if (Object.keys(activeEntitlements).length > 0 || activeSubscriptions.length > 0) {
            isActuallyPro = true;
            // Use the first active entitlement's product identifier as the plan name
            const firstActive = Object.values(activeEntitlements)[0] as any;
            if (firstActive) {
                latestPlan = firstActive.productIdentifier;
                latestExpiration = firstActive.expirationDate;
            }
        }

        // 2b. Fallback: Check non-subscription transactions (Lifetime purchases often land here if not entitled)
        if (!isActuallyPro) {
            console.log("[ServerAction] checking nonSubscriptionTransactions:", JSON.stringify(plainData.nonSubscriptionTransactions));
            if (plainData.nonSubscriptionTransactions && plainData.nonSubscriptionTransactions.length > 0) {
                console.log("[ServerAction] Found non-subscription transactions (Lifetime?)");
                // Ideally we check if it's a known "Pro" product, but for this MVP, if they bought *anything* non-sub, it's likely Lifetime.
                // We can check the purchase date.
                const latesttxn = plainData.nonSubscriptionTransactions.sort((a: any, b: any) =>
                    new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
                )[0];

                // Assume it's valid if we found one
                isActuallyPro = true;
                latestPlan = latesttxn.productIdentifier;
                latestExpiration = null; // Lifetime
            }
        }

        // If not active, find the most recent purchase to populate the UI
        if (!isActuallyPro && plainData.allPurchaseDatesByProduct) {
            Object.entries(plainData.allPurchaseDatesByProduct).forEach(([productId, dateStr]) => {
                const dateMs = new Date(dateStr as string).getTime();
                if (dateMs > latestDate) {
                    latestDate = dateMs;
                    latestPlan = productId;
                    // Try to find expiration for this product
                    if (plainData.allExpirationDatesByProduct && plainData.allExpirationDatesByProduct[productId]) {
                        latestExpiration = plainData.allExpirationDatesByProduct[productId];
                    }
                }
            });
        }

        // 3. Save to Firestore
        await adminDb.collection("users").doc(uid).set({
            isPro: isActuallyPro, // Strict access control
            lastPurchaseDate: FieldValue.serverTimestamp(),
            subscriptionStatus: isActuallyPro ? "active" : "expired",
            proDetails: {
                planName: latestPlan,
                expirationDate: latestExpiration,
                managementURL: plainData.managementURL
            },
            revenueCatData: plainData
        }, { merge: true });

        console.log(`[ServerAction] Sync complete. User ${uid} isPro=${isActuallyPro}. Plan=${latestPlan}`);
        return { success: true, isPro: isActuallyPro };
    } catch (error) {
        console.error("Error syncing subscription to Firestore:", error);
        return { error: "Failed to sync subscription" };
    }
}
