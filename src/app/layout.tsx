import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
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
  title: "MVAI.dk — Afgørelsesklar AI for miljøvurderinger",
  description:
    "Fagspecifik AI for miljøsagsbehandlere, rådgivere og forskere. Objektiv, kildeforankret RAG-analyse af planer og projekter uden hallucinationer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-[#F7FAFA] text-[#1A202C]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
