import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EstateClips – AI Video Clips for Real Estate Agents",
  description:
    "Transform your property videos into compelling social media clips with AI-powered editing, captions, and real estate intelligence.",
  keywords: [
    "real estate video",
    "property clips",
    "AI video editing",
    "real estate marketing",
    "social media clips",
  ],
  openGraph: {
    title: "EstateClips",
    description: "AI-powered video clips for real estate agents",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${playfair.variable} font-body bg-obsidian-300 text-slate-200 antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: "12px",
            },
            success: {
              iconTheme: { primary: "#10B981", secondary: "#1e293b" },
            },
            error: {
              iconTheme: { primary: "#EF4444", secondary: "#1e293b" },
            },
          }}
        />
      </body>
    </html>
  );
}
