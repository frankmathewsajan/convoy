
import { adminDb } from "../lib/firebase/firebase-admin";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const INVITE_PHONE = "+919497182886"; // Placeholder, user can change or run as is
const INVITE_EMAIL = "[EMAIL_ADDRESS]"; // Placeholder

async function createInvite() {
    console.log("Creating dummy invite...");

    if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error("Error: FIREBASE_PRIVATE_KEY is missing. Make sure .env.local is loaded.");
        process.exit(1);
    }

    try {
        // accurate schema based on checkUserAccessAction
        const inviteData = {
            type: "phone", // or "email"
            value: INVITE_PHONE,
            invitedBy: "admin_seed_script",
            inviterName: "Convoy Admin",
            createdAt: new Date(),
            used: false
        };

        const docRef = await adminDb.collection("invites").add(inviteData);
        console.log(`✅ Invite created successfully!`);
        console.log(`ID: ${docRef.id}`);
        console.log(`Type: ${inviteData.type}`);
        console.log(`Value: ${inviteData.value}`);
        console.log("\nYou can now login with this phone number: " + INVITE_PHONE);
    } catch (error) {
        console.error("Error creating invite:", error);
    }
}

createInvite();
