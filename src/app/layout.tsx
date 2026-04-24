import "./globals.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Planqly Assets",
  description: "Personal budget planner",
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
