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
import { LogOut, User as UserIcon, Moon, Sun, Laptop, Share2 } from "lucide-react";
import { signOut, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore"; // Added imports
import { auth, db } from "@/lib/firebase/config"; // Added db import
import { InviteDialog } from "@/components/invite-dialog";

export function UserMenu() {
    const { user, userData, refreshUserData } = useAuth(); // Added refreshUserData
    const { setTheme } = useTheme();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isInviteSlotOpen, setIsInviteSlotOpen] = useState(false);
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
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10 border-2 border-black dark:border-white">
                                <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                                <AvatarFallback className="font-bold bg-amber-500 text-black">
                                    {user.displayName?.slice(0, 2).toUpperCase() || "CN"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user.displayName || "Nomad"}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>Edit Profile</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                        </DropdownMenuGroup>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Theme</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setTheme("theme-amber")}>
                                        <div className="mr-2 h-4 w-4 rounded-full bg-amber-500" />
                                        <span>Amber</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("theme-blue")}>
                                        <div className="mr-2 h-4 w-4 rounded-full bg-blue-500" />
                                        <span>Blue</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("theme-green")}>
                                        <div className="mr-2 h-4 w-4 rounded-full bg-green-500" />
                                        <span>Green</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("theme-rose")}>
                                        <div className="mr-2 h-4 w-4 rounded-full bg-orange-500" />
                                        <span>Rose</span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsInviteSlotOpen(true)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            <span>Invite a Nomad</span>
                            {userData && userData.invitesRemaining > 0 && (
                                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                                    {userData.invitesRemaining}
                                </span>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
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
