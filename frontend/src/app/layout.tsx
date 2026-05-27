import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quizzer — MCQ Quiz Platform",
  description: "Conduct and take MCQ-based quizzes for development upskilling",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#0a0a0a] font-sans text-neutral-100 antialiased selection:bg-indigo-500/30">
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100dvh-3.5rem)] w-full overflow-x-hidden sm:min-h-[calc(100dvh-4rem)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
