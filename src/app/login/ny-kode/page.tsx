"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("Adgangskoderne er ikke ens.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, passwordConfirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Adgangskoden kunne ikke gemmes.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Forbindelsen fejlede. Prøv igen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7FAFA]">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
          <h1 className="text-xl font-extrabold text-slate-900">Ny adgangskode</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Vælg en ny adgangskode på mindst 8 tegn. Derefter er du logget ind.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              Ny adgangskode
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-[#0F382C] focus:outline-none"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Gentag adgangskode
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-[#0F382C] focus:outline-none"
              />
            </label>
            {error && <p className="text-xs font-medium text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#0F382C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14493a] disabled:opacity-50"
            >
              {submitting ? "Arbejder..." : "Gem adgangskode"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
