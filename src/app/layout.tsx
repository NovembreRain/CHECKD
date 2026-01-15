import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext"; // Import
import { RoleProvider } from "@/context/RoleContext"; // Import

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CHECKD - Venue Intelligence",
  description: "AI-powered venue verification and discovery",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#263238] text-white`}>
        <AuthProvider>
          <RoleProvider>
            {/* Navbar is inside providers so it can access User/Role state */}
            <Navbar />
            {children}
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}