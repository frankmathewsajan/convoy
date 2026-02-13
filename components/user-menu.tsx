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
    DropdownMenuSeparator,
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
import { LogOut, User as UserIcon, Moon, Sun, Laptop, Share2, ChevronDown, Settings, Navigation, CreditCard, Crown, ExternalLink, Send, Camera, ImagePlus, Loader2 } from "lucide-react";
import { signOut, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { InviteDialog } from "@/components/invite-dialog";
import { PaywallModal } from "@/components/paywall-modal";
import { WebcamCapture } from "@/components/webcam-capture";

export function UserMenu({ onOpenMapEditor, onEditVector }: { onOpenMapEditor: () => void; onEditVector: () => void }) {
    const { user, userData, isPro, refreshUserData, refreshProStatus, saveTheme } = useAuth();
    const { setTheme: setMode } = useTheme();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isInviteSlotOpen, setIsInviteSlotOpen] = useState(false);
    const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [showThemes, setShowThemes] = useState(false);
    const [newName, setNewName] = useState(user?.displayName || "");
    const [newPhotoURL, setNewPhotoURL] = useState(user?.photoURL || "");
    const [loading, setLoading] = useState(false);

    // Photo Upload State
    const [uploading, setUploading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    /**
     * Process and upload a file (from input or camera).
     * Applies "magic" client-side compression for speed.
     */
    const processAndUploadFile = async (file: File) => {
        if (!user) return;
        setUploading(true);

        try {
            const token = await user.getIdToken();
            // Lazy load the upload action and compression library
            const { uploadVibePhoto } = await import("@/app/actions/upload-actions");
            const imageCompression = (await import("browser-image-compression")).default;

            // Compression options: max 1MB, max 1920px (fast & good quality)
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.8,
            };

            // "Magic": Compress if it's an image
            if (file.type.startsWith("image/")) {
                try {
                    file = await imageCompression(file, options);
                } catch (error) {
                    console.error("Compression failed, using original:", error);
                }
            }

            const formData = new FormData();
            formData.append("photo", file);

            const result = await uploadVibePhoto(token, formData);

            if (result.success && result.url) {
                setNewPhotoURL(result.url); // Update the preview/state
            } else {
                console.error("Upload failed:", result.error);
                alert("Failed to upload photo. Please try again.");
            }
        } catch (err) {
            console.error("Error uploading photo:", err);
            alert("Error uploading photo.");
        } finally {
            setUploading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        await processAndUploadFile(files[0]);
        e.target.value = ""; // Reset input
    };

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
                            {/* PRO Badge */}

                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" align="end" forceMount sideOffset={20}>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium leading-none">{user.displayName || "Nomad"}</p>
                                    {isPro && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded text-[9px] font-black text-black uppercase tracking-wider border border-amber-600">
                                            <Crown className="w-2.5 h-2.5" strokeWidth={3} />
                                            PRO
                                        </span>
                                    )}
                                </div>
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
                            <DropdownMenuItem onClick={onEditVector} className="focus:bg-zinc-100 cursor-pointer">
                                <Navigation className="mr-2 h-4 w-4" />
                                <span>Edit Vector</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsInviteSlotOpen(true)} className="focus:bg-zinc-100 cursor-pointer">
                                <Send className="mr-2 h-4 w-4" />
                                <span>Invite a Nomad</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-black/20" />

                        {/* Manage Subscription */}
                        <DropdownMenuItem
                            onClick={() => {
                                if (isPro) {
                                    setIsSubscriptionOpen(true);
                                } else {
                                    setIsPaywallOpen(true);
                                }
                            }}
                            className="focus:bg-zinc-100 cursor-pointer"
                        >
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>{isPro ? "Manage Subscription" : "Upgrade to Pro"}</span>
                            {!isPro && (
                                <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded text-[8px] font-black text-black uppercase tracking-wider">
                                    <Crown className="w-2 h-2" strokeWidth={3} />
                                    PRO
                                </span>
                            )}
                        </DropdownMenuItem>

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
                            <Label className="text-right">
                                Photo
                            </Label>
                            <div className="col-span-3 flex gap-4 items-center">
                                {/* Preview */}
                                <div className="h-16 w-16 rounded-full border-2 border-black overflow-hidden bg-gray-100 shrink-0">
                                    <img
                                        src={newPhotoURL || user.photoURL || "https://github.com/shadcn.png"}
                                        alt="Profile"
                                        className="h-full w-full object-cover"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    {/* Camera */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 border-2 border-dashed border-zinc-300 hover:border-black"
                                        onClick={() => setShowCamera(true)}
                                        disabled={uploading}
                                    >
                                        <Camera className="h-4 w-4 text-muted-foreground" />
                                    </Button>

                                    {/* Gallery */}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            disabled={uploading}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 border-2 border-dashed border-zinc-300 hover:border-black pointer-events-none"
                                        >
                                            {uploading ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            ) : (
                                                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="destructive"
                            type="button"
                            disabled={loading}
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                                    setLoading(true);
                                    try {
                                        const { deleteAccountAction } = await import("@/app/actions/user-actions");
                                        const token = await user.getIdToken();
                                        await deleteAccountAction(token);
                                        await signOut(auth);
                                        window.location.reload();
                                    } catch (error) {
                                        console.error("Delete account error:", error);
                                        alert("Failed to delete account. Please try again.");
                                        setLoading(false);
                                    }
                                }
                            }}
                            className="mr-auto bg-red-100 text-red-600 hover:bg-red-200 border-2 border-transparent hover:border-red-300"
                        >
                            Delete Account
                        </Button>
                        <Button type="submit" onClick={handleUpdateProfile} disabled={loading}>
                            {loading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Subscription Dialog */}
            <Dialog open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
                <DialogContent className="sm:max-w-[400px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase">
                            <Crown className="w-5 h-5 text-amber-500" strokeWidth={3} />
                            Your Subscription
                        </DialogTitle>
                        <DialogDescription>
                            Manage your Convoy Pro subscription.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {/* Current Plan */}
                        <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Current Plan</p>
                                    <p className="text-lg font-black text-black mt-0.5 capitalize">
                                        {useAuth().proDetails?.planName.replace(/_/g, " ").replace("rc ", "") || "Convoy Pro"}
                                    </p>
                                    {useAuth().proDetails?.expirationDate && (
                                        <p className="text-xs text-amber-800 mt-1 font-bold">
                                            Renews: {new Date(useAuth().proDetails!.expirationDate!).toLocaleDateString()}
                                        </p>
                                    )}
                                    {!useAuth().proDetails?.expirationDate && isPro && (
                                        <p className="text-xs text-amber-800 mt-1 font-bold">
                                            Lifetime Access
                                        </p>
                                    )}
                                </div>
                                <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-yellow-500 border-2 border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Crown className="w-5 h-5 text-black" strokeWidth={2.5} />
                                </div>
                            </div>
                            <p className="text-xs text-amber-700 mt-2 font-medium">
                                All premium features are unlocked.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Included Features</p>
                            {[
                                "Unlimited builder messaging",
                                "Priority route planning",
                                "Vibe Zone undo & messaging",
                                "All future premium features",
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <div className="w-4 h-4 bg-green-400 border border-green-600 rounded flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] text-white font-bold">✓</span>
                                    </div>
                                    <span className="font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                        <Button
                            variant="outline"
                            className="w-full border-2 border-black font-bold"
                            onClick={() => setIsSubscriptionOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Paywall for upgrade */}
            <PaywallModal
                open={isPaywallOpen}
                onClose={() => setIsPaywallOpen(false)}
                userId={user?.uid}
                onPurchaseSuccess={refreshProStatus}
            />

            <InviteDialog open={isInviteSlotOpen} onOpenChange={setIsInviteSlotOpen} />

            {/* Webcam Modal */}
            <WebcamCapture
                open={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={(file) => {
                    processAndUploadFile(file);
                }}
            />
        </>
    );
}
