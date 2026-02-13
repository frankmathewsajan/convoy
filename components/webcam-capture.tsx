"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, RefreshCw, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";

interface WebcamCaptureProps {
    open: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
};

export function WebcamCapture({ open, onClose, onCapture }: WebcamCaptureProps) {
    const webcamRef = useRef<Webcam>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const { user } = useAuth();

    // Toggle camera (front/back)
    const toggleCamera = () => {
        setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    };

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            // Convert base64 to File object
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });
                    onCapture(file);
                    onClose();
                });
        }
    }, [webcamRef, onCapture, onClose]);

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none text-white">
                <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
                    <DialogTitle className="text-white flex items-center justify-between">
                        <span>Take Photo</span>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-full h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogTitle>
                    <div className="sr-only">Capture a photo for your vibe profile</div>
                </DialogHeader>

                <div className="relative aspect-[3/4] sm:aspect-video bg-black flex items-center justify-center">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ ...videoConstraints, facingMode }}
                        className="w-full h-full object-cover"
                        mirrored={facingMode === "user"}
                    />
                </div>

                <div className="p-6 bg-black flex items-center justify-center gap-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-12 w-12 bg-white/10 hover:bg-white/20 text-white"
                        onClick={toggleCamera}
                    >
                        <RefreshCw className="h-5 w-5" />
                    </Button>

                    <Button
                        size="icon"
                        className="rounded-full h-16 w-16 bg-white border-4 border-white/30 hover:bg-gray-100 hover:scale-105 transition-all shadow-lg"
                        onClick={capture}
                    >
                        <div className="h-14 w-14 rounded-full border-2 border-black" />
                    </Button>

                    <div className="w-12" /> {/* Spacer for centering */}
                </div>
            </DialogContent>
        </Dialog>
    );
}
