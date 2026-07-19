import {ClerkProvider} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chronicle AI — Autonomous Deep Research Engine | AI-Powered Fact-Checked Reports",
  description: "Chronicle AI is an autonomous deep research engine powered by Qwen LLMs. It conducts live web research, extracts atomic evidence units, cross-references claims with FAISS vector search, and produces multi-pass fact-checked reports with full source provenance and adversarial verification.",
  keywords: ["AI research", "deep research", "autonomous research agent", "Qwen AI", "fact-checking", "FAISS", "evidence-based reports", "AI-powered research", "Chronicle AI"],
  authors: [{ name: "Chronicle AI" }],
  openGraph: {
    title: "Chronicle AI — Autonomous Deep Research Engine",
    description: "Conduct deep, fact-checked research autonomously. Powered by Qwen LLMs, FAISS vector search, and a 7-pass synthesis pipeline with adversarial verification.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}