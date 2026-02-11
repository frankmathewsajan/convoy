import type { Metadata } from "next";
import {
  Public_Sans,
  DM_Sans,
  Archivo,
  Montserrat,
  Inter,
  Work_Sans,
  Red_Hat_Text,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
});
const redHatText = Red_Hat_Text({
  subsets: ["latin"],
  variable: "--font-red-hat-text",
});

export const metadata: Metadata = {
  title: "Convoy",
  description: "Van Life Community App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${publicSans.variable} ${dmSans.variable} ${archivo.variable} ${montserrat.variable} ${inter.variable} ${workSans.variable} ${redHatText.variable} antialiased font-public-sans`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            forcedTheme="light"
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
