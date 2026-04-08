import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planner App",
  description: "Personal budget planner"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
