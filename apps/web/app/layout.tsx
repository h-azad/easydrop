import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyDrop",
  description: "Local P2P file and text sharing over WebRTC"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
