"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { LogOut, User as UserIcon, Moon, Sun, Laptop, Share2, ChevronDown, Settings } from "lucide-react";
import { signOut, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore"; // Added imports
import { auth, db } from "@/lib/firebase/config"; // Added db import
import { InviteDialog } from "@/components/invite-dialog";

export function UserMenu({ onOpenMapEditor }: { onOpenMapEditor: () => void }) {
    const { user, userData, refreshUserData, saveTheme } = useAuth(); // Added refreshUserData
    const { setTheme: setMode } = useTheme();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isInviteSlotOpen, setIsInviteSlotOpen] = useState(false);
    const [showThemes, setShowThemes] = useState(false);
    const [newName, setNewName] = useState(user?.displayName || "");
    const [newPhotoURL, setNewPhotoURL] = useState(user?.photoURL || "");
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const handleUpdateProfile = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Update Auth Profile
            await updateProfile(user, {
                displayName: newName,
                photoURL: newPhotoURL,
            });

            // Update Firestore Profile
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                displayName: newName,
                photoURL: newPhotoURL
            });

            await refreshUserData(); // Refresh local state
            setIsEditProfileOpen(false);
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <>
            <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="relative h-12 w-12 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all bg-white p-0 overflow-hidden"
                        >
                            <Avatar className="h-full w-full">
                                <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                                <AvatarFallback className="font-bold text-black border-2 border-black h-full w-full flex items-center justify-center" style={{ backgroundColor: "var(--main)" }}>
                                    <UserIcon className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" align="end" forceMount sideOffset={20}>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user.displayName || "Nomad"}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-black/20" />
                        <DropdownMenuGroup>
                            <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-zinc-100 cursor-pointer">
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>Edit Profile</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                            <DropdownMenuItem onClick={onOpenMapEditor} className="focus:bg-zinc-100 cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Map Editor</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-black/20" />

                        <DropdownMenuItem
                            onSelect={(e) => {
                                e.preventDefault();
                                setShowThemes(!showThemes);
                            }}
                            className="focus:bg-zinc-100 cursor-pointer justify-between group"
                        >
                            <div className="flex items-center">
                                <div className="mr-2 h-4 w-4 rounded-full" style={{ backgroundColor: "var(--main)" }} />
                                <span>Theme</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showThemes ? "rotate-180" : ""}`} />
                        </DropdownMenuItem>

                        {showThemes && (
                            <>
                                <DropdownMenuItem onClick={() => saveTheme("yellow")} className="pl-8 focus:bg-zinc-100 cursor-pointer">
                                    <div className="mr-2 h-4 w-4 rounded-full bg-[#FACC00]" />
                                    <span>Yellow (Default)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => saveTheme("amber")} className="pl-8 focus:bg-zinc-100 cursor-pointer">
                                    <div className="mr-2 h-4 w-4 rounded-full bg-[#FFBF00]" />
                                    <span>Amber</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => saveTheme("rose")} className="pl-8 focus:bg-zinc-100 cursor-pointer">
                                    <div className="mr-2 h-4 w-4 rounded-full bg-[#FF6678]" />
                                    <span>Rose</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => saveTheme("pink")} className="pl-8 focus:bg-zinc-100 cursor-pointer">
                                    <div className="mr-2 h-4 w-4 rounded-full bg-[#FC64AB]" />
                                    <span>Pink</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => saveTheme("lime")} className="pl-8 focus:bg-zinc-100 cursor-pointer">
                                    <div className="mr-2 h-4 w-4 rounded-full bg-[#8AE500]" />
                                    <span>Lime</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => saveTheme("green")} className="pl-8 focus:bg-zinc-100 cursor-pointer">
                                    <div className="mr-2 h-4 w-4 rounded-full bg-[#00D696]" />
                                    <span>Green</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => saveTheme("emerald")} className="pl-8 focus:bg-zinc-100 cursor-pointer">
                                    <div className="mr-2 h-4 w-4 rounded-full bg-[#00BD84]" />
                                    <span>Emerald</span>
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuSeparator className="bg-black/20" />
                        <DropdownMenuItem onClick={handleLogout} className="focus:bg-red-100 text-red-600 font-bold cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                            Make changes to your profile here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="photo" className="text-right">
                                Photo URL
                            </Label>
                            <Input
                                id="photo"
                                value={newPhotoURL}
                                onChange={(e) => setNewPhotoURL(e.target.value)}
                                className="col-span-3"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleUpdateProfile} disabled={loading}>
                            {loading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <InviteDialog open={isInviteSlotOpen} onOpenChange={setIsInviteSlotOpen} />
        </>
    );
}
