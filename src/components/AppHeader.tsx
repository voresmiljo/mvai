"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MvLogo } from "@/components/MvLogo";
import { useAuth } from "@/components/AuthProvider";
import {
  FolderKanban,
  Info,
  ChevronDown,
  LogOut,
} from "lucide-react";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const initial = user?.email?.charAt(0).toUpperCase() || "?";

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 group"
            onClick={(event) => {
              if (pathname === "/") {
                event.preventDefault();
                window.location.assign("/");
              }
            }}
          >
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
          {loading ? (
            <span className="text-[11px] text-slate-400">Tjekker login...</span>
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F382C] text-white text-[10px] font-bold">
                  {initial}
                </div>
                <span className="hidden md:inline max-w-[180px] truncate font-semibold">{user.email}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 text-xs">
                  <div className="px-2 py-1.5 border-b border-slate-100">
                    <p className="font-semibold text-slate-800">Logget ind</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-50"
                    >
                      <FolderKanban className="w-3.5 h-3.5" />
                      <span>Dine sager</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-red-600 hover:bg-red-50 text-left font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log ud</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-[#0F382C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#14493a]"
            >
              Log ind
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
