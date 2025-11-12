import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// --- Global metadata for SEO and link previews ---
export const metadata: Metadata = {
  title: "Personal expense manager",
  description:
    "Track your daily expenses easily with this simple AI-powered expense tracker.",
  openGraph: {
    title: "Personal expense manager",
    description:
      "Track, categorize, and analyze your spending effortlessly.",
    url: "https://expense-tracker-rzvs.vercel.app",
    siteName: "Expense Tracker",
    images: [
      {
        url: "https://expense-tracker-rzvs.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Expense Tracker Preview",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Personal expense manager",
    description:
      "Track, categorize, and analyze your spending effortlessly.",
    images: ["https://expense-tracker-rzvs.vercel.app/og-image.png"],
  },
};

// --- Fonts ---
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- Root layout ---
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
