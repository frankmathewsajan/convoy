"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Loader2, Lock, ChevronRight } from "lucide-react";

interface ConversationItemProps {
    conversation: any;
    currentUserId: string;
    isPro: boolean;
    onClick: () => void;
}

export function ConversationItem({ conversation, currentUserId, isPro, onClick }: ConversationItemProps) {
    const otherUserUid = conversation.otherUserUid;
    const [otherUser, setOtherUser] = useState<{ displayName: string; photoURL: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isPro && otherUserUid) {
            setLoading(true);
            getDoc(doc(db, "users", otherUserUid)).then((snap) => {
                if (snap.exists()) {
                    setOtherUser(snap.data() as any);
                }
                setLoading(false);
            });
        }
    }, [isPro, otherUserUid]);

    // Display Name Logic
    const displayName = isPro
        ? (otherUser?.displayName || "Loading...")
        : "Anonymous Vibe";

    // Photo Logic
    const displayPhoto = isPro
        ? (otherUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUserUid}`)
        : `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUserUid}&backgroundColor=e5e7eb`;

    // Time formatting
    const timeString = conversation.updatedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "";

    return (
        <div
            onClick={onClick}
            className="p-4 bg-white border-2 border-border rounded-xl shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
        >
            <div className="relative">
                <img
                    src={displayPhoto}
                    alt="User"
                    className={`w-12 h-12 rounded-full border-2 border-black object-cover ${!isPro ? "blur-[2px]" : ""}`}
                />
                {!isPro && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
                        <Lock className="w-5 h-5 text-black" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                    <h3 className={`font-bold text-sm ${!isPro ? "blur-[2px] select-none" : ""}`}>
                        {displayName}
                    </h3>
                    <span className="text-[10px] font-bold text-muted-foreground">{timeString}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate font-medium">
                    {conversation.lastMessage}
                </p>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
    );
}
