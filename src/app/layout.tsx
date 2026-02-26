import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kaf'Map - Toilet Passwords & Menus",
  description: "Find toilet passwords and menu prices for cafes and restaurants.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Kaf'Map",
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-800 overflow-hidden w-screen h-screen flex flex-col md:flex-row font-sans`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof navigator.serviceWorker !== 'undefined') {
                navigator.serviceWorker.register('/sw.js')
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
