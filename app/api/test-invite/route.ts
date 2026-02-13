
import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const inviteData = {
            type: "phone",
            value: "+15550101", // Default test number
            invitedBy: "seed_script",
            inviterName: "Convoy Admin",
            createdAt: new Date(),
            used: false
        };

        const docRef = await adminDb.collection("invites").add(inviteData);

        return NextResponse.json({
            success: true,
            message: "Invite created successfully",
            inviteId: docRef.id,
            data: inviteData
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
