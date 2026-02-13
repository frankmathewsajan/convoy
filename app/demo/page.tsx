"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Smartphone, ExternalLink, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function DemoPage() {
    const expoUrl = "exp://u.expo.dev/bc3beea2-a9f0-49bc-87ee-583fb43aa582/group/b2ef716e-5034-47f2-a466-6da727042718";
    const previewUrl = "https://expo.dev/preview/update?message=navarea&updateRuntimeVersion=1.0.0&createdAt=2026-02-13T08%3A11%3A34.416Z&slug=exp&projectId=bc3beea2-a9f0-49bc-87ee-583fb43aa582&group=b2ef716e-5034-47f2-a466-6da727042718";
    const phoneNumber = "9876543210";
    const otp = "159753";
    const [copied, setCopied] = useState("");

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(""), 2000);
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <main className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                        Convoy Demo
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Experience the future of Van Life community connection.
                    </p>
                </div>

                {/* Video Section */}
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl mb-16 bg-black">
                    <iframe
                        src="https://player.vimeo.com/video/1164607065?h=6407086877&badge=0&autopause=0&player_id=0&app_id=58479"
                        width="100%"
                        height="100%"
                        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                        title="Convoy Demo Video"
                        className="w-full h-full"
                    ></iframe>
                </div>

                {/* Installation & Demo Instructions */}
                <div className="grid md:grid-cols-2 gap-12">
                    {/* Left Column: Installation */}
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Download className="w-6 h-6 text-primary" />
                            Try It on Your Device
                        </h2>

                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                            <h3 className="font-semibold mb-4 text-lg">Prerequisites</h3>
                            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
                                <li>Download <strong>Expo Go</strong> app from App Store (iOS) or Play Store (Android).</li>
                                <li>Ensure you have a stable internet connection.</li>
                            </ul>

                            <h3 className="font-semibold mb-4 text-lg">Scan & Play</h3>
                            <div className="flex flex-col items-center p-6 bg-white rounded-lg w-fit mx-auto border-2 border-primary/20">
                                <QRCodeSVG value={expoUrl} size={180} level="M" includeMargin={true} />
                                <p className="mt-2 text-sm text-center text-slate-500 font-medium">Scan with Expo Go or Camera</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <a
                                href={expoUrl}
                                className="block w-full text-center bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-6 rounded-lg font-medium transition-colors"
                            >
                                Open in Expo Go
                            </a>
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center border-2 border-primary text-primary hover:bg-primary/10 py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                View Build Details <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Demo Credentials */}
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Smartphone className="w-6 h-6 text-primary" />
                            Demo Credentials
                        </h2>

                        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
                            <p className="text-muted-foreground">
                                Use these test credentials to log in and explore the full features of Convoy without creating a new account.
                            </p>

                            {/* Phone Number */}
                            <div className="group relative">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                                    Phone Number
                                </label>
                                <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg border group-hover:border-primary transition-colors">
                                    <code className="text-lg font-mono flex-1">{phoneNumber}</code>
                                    <button
                                        onClick={() => copyToClipboard(phoneNumber, "phone")}
                                        className="p-2 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                        title="Copy Phone Number"
                                    >
                                        {copied === "phone" ? <span className="text-xs font-bold text-green-500">Copied!</span> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* OTP */}
                            <div className="group relative">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                                    OTP Code
                                </label>
                                <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg border group-hover:border-primary transition-colors">
                                    <code className="text-lg font-mono flex-1">{otp}</code>
                                    <button
                                        onClick={() => copyToClipboard(otp, "otp")}
                                        className="p-2 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                        title="Copy OTP"
                                    >
                                        {copied === "otp" ? <span className="text-xs font-bold text-green-500">Copied!</span> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Wait, how do I install this?</h3>
                            <ol className="list-decimal list-inside space-y-2 text-blue-700 dark:text-blue-400 text-sm">
                                <li>Install <strong>Expo Go</strong> on your phone.</li>
                                <li>Scan the QR code on the left with your camera app (iOS) or Expo Go app (Android).</li>
                                <li>The app will load instantly!</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
