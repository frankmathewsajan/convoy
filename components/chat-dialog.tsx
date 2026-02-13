"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    where,
    limit,
    doc,
    setDoc,
    getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: any;
}

interface ChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipientId: string;
    recipientName: string;
    recipientPhoto?: string;
}

export function ChatDialog({ open, onOpenChange, recipientId, recipientName, recipientPhoto }: ChatDialogProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate a consistent conversation ID
    const getConversationId = (uid1: string, uid2: string) => {
        return [uid1, uid2].sort().join("_");
    };

    useEffect(() => {
        if (!open || !user || !recipientId) return;

        setLoading(true);
        const conversationId = getConversationId(user.uid, recipientId);
        const messagesRef = collection(db, "vibe-messages", conversationId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(msgs);
            setLoading(false);

            // Scroll to bottom
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [open, user, recipientId]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user || !recipientId || sending) return;

        setSending(true);
        const text = newMessage.trim();
        setNewMessage(""); // Optimistic clear

        try {
            // Client-side send
            const conversationId = getConversationId(user.uid, recipientId);

            // 1. Add message
            const msgsRef = collection(db, "vibe-messages", conversationId, "messages");
            await addDoc(msgsRef, {
                from: user.uid,
                to: recipientId,
                text: text,
                fromName: user.displayName || "Nomad",
                timestamp: serverTimestamp(),
            });

            // 2. Update conversation metadata
            const convRef = doc(db, "vibe-messages", conversationId);
            await setDoc(convRef, {
                participants: [user.uid, recipientId],
                lastMessage: text,
                lastMessageTime: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
            setNewMessage(text); // Restore on error
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white h-[500px] flex flex-col gap-0">

                {/* Header */}
                <div className="p-3 border-b-2 border-black bg-zinc-50 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-black">
                        <AvatarImage src={recipientPhoto} />
                        <AvatarFallback><UserIcon className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-bold truncate">{recipientName}</p>
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Convoy Chat</p>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white" ref={scrollRef}>
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-zinc-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400 space-y-2">
                            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-2">
                                <Send className="w-5 h-5 opacity-50" />
                            </div>
                            <p className="text-sm font-medium">No messages yet</p>
                            <p className="text-xs px-6">Start the conversation with {recipientName.split(" ")[0]}.</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm font-medium ${isMe
                                            ? "bg-black text-white rounded-br-none"
                                            : "bg-zinc-100 text-black border border-zinc-200 rounded-bl-none"
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 border-t-2 border-black bg-zinc-50">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="bg-white border-2 border-zinc-200 focus-visible:ring-0 focus-visible:border-black"
                            autoFocus
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!newMessage.trim() || sending}
                            className="bg-[var(--main)] text-black border-2 border-black hover:opacity-90 shrink-0"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </form>
                </div>

            </DialogContent>
        </Dialog>
    );
}
