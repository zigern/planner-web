import "./globals.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import { SwDisable } from "@/components/sw-disable";

export const metadata: Metadata = {
  title: "Planqly Assets",
  description: "Personal budget planner",
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body>
        <SwDisable />
        {children}
      </body>
    </html>
  );
}
