"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useVibeMessages, sendVibeMessage } from "@/hooks/use-vibe-likes";
import { adminDb } from "@/lib/firebase/firebase-admin"; // Wait, can't use admin in client component
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface VibeChatProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    otherUserUid: string;
    otherUserName?: string;
    otherUserPhoto?: string;
    isPro: boolean;
}

export function VibeChat({
    isOpen,
    onClose,
    conversationId,
    otherUserUid,
    otherUserName = "Anonymous Vibe",
    otherUserPhoto,
    isPro
}: VibeChatProps) {
    const { user, userData } = useAuth();
    const { messages, loading } = useVibeMessages(isOpen ? conversationId : null);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [realOtherUser, setRealOtherUser] = useState<{ displayName: string; photoURL: string } | null>(null);

    // Fetch real user details if Pro
    useEffect(() => {
        if (isOpen && isPro && otherUserUid) {
            getDoc(doc(db, "users", otherUserUid)).then((snap) => {
                if (snap.exists()) {
                    setRealOtherUser(snap.data() as any);
                }
            });
        }
    }, [isOpen, isPro, otherUserUid]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!user || !inputText.trim()) return;
        setSending(true);
        try {
            await sendVibeMessage(
                user.uid,
                otherUserUid,
                inputText.trim(),
                userData?.displayName || undefined
            );
            setInputText("");
        } catch (err) {
            console.error("Failed to send:", err);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    // Display Name Logic
    const displayName = isPro
        ? (realOtherUser?.displayName || otherUserName)
        : "Anonymous Vibe";

    // Photo Logic
    const displayPhoto = isPro
        ? (realOtherUser?.photoURL || otherUserPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${otherUserUid}`)
        : `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUserUid}&backgroundColor=e5e7eb`;

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col font-public-sans">
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-border flex items-center justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={displayPhoto}
                            alt={displayName}
                            className={`w-10 h-10 rounded-full border-2 border-black object-cover ${!isPro ? "blur-[2px]" : ""}`}
                        />
                        {!isPro && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
                                <Lock className="w-4 h-4 text-black" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className={`font-black text-base flex items-center gap-2 ${!isPro ? "blur-[2px] select-none" : ""}`}>
                            {displayName}
                        </h3>
                        {!isPro && <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Identity Hidden (Pro Only)</p>}
                        {isPro && <p className="text-[10px] uppercase font-bold text-green-600 tracking-wider">Online</p>}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="h-9 w-9 bg-zinc-100 rounded-full flex items-center justify-center border-2 border-transparent hover:border-black transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
                {loading && (
                    <div className="flex justify-center pt-10">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!loading && messages.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground px-10">
                        <p className="font-bold">No messages yet.</p>
                        <p className="text-sm">Start the conversation!</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.from === user?.uid;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${isMe
                                    ? "bg-[var(--main)] border-black text-black rounded-tr-none"
                                    : "bg-white border-zinc-200 text-foreground rounded-tl-none"
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t-2 border-border">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-secondary-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--main)] focus:border-black transition-all"
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || sending}
                        className="h-12 w-12 rounded-xl border-2 border-black flex items-center justify-center shadow-shadow active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none transition-all disabled:opacity-40"
                        style={{ backgroundColor: "var(--main)" }}
                    >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                </div>
            </div>

        </div>
    );
}
