"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MvLogo } from "@/components/MvLogo";
import {
  FolderKanban,
  Info,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Building,
} from "lucide-react";

export function AppHeader() {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <MvLogo size="sm" />
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                pathname === "/"
                  ? "bg-slate-100 text-[#0F382C]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Dine sager</span>
            </Link>

            <Link
              href="/om"
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                pathname === "/om"
                  ? "bg-slate-100 text-[#0F382C]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Om MVAI</span>
            </Link>
          </nav>
        </div>

        {/* Right status & user badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
            <ShieldCheck className="w-3 h-3 text-[#2E8B57]" />
            <span>GovTech Sikkerhed • EU Frankfurt</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F382C] text-white text-[10px] font-bold">
                J
              </div>
              <span className="hidden md:inline font-semibold">Sagsbehandler</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 text-xs">
                <div className="px-2 py-1.5 border-b border-slate-100">
                  <p className="font-semibold text-slate-800">Jon Munch-Petersen</p>
                  <p className="text-[11px] text-slate-500">jon@voresmiljo.dk</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                    <Building className="w-3 h-3" />
                    <span>Myndighedskonto (Aktiv)</span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-50"
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Mine sagsmapper</span>
                  </Link>
                  <Link
                    href="/om"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-50"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Metode & RAG-kilder</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      alert("Logget ud fra sikker myndighedssession.");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-red-600 hover:bg-red-50 text-left font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log ud</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
