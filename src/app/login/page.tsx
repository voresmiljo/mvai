"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh, configured, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nextPath = safeNextPath(searchParams.get("next"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Login kunne ikke gennemføres.");
        return;
      }

      if (data.needsConfirmation) {
        setMode("login");
        setInfo(data.message || "Bekræft e-mailen, og log derefter ind.");
        return;
      }

      await refresh();
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Forbindelsen til login fejlede. Prøv igen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7FAFA]">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
          <h1 className="text-xl font-extrabold text-slate-900">
            {mode === "login" ? "Log ind" : "Opret konto"}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Når du er logget ind i denne browser, åbner mvai.dk direkte på dine sager. Du bliver, indtil du trykker Log ud.
          </p>

          {!loading && !configured && (
            <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              Login er ikke klar på serveren endnu. Den publishable Supabase-nøgle skal hedde SUPABASE_ANON_KEY.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              E-mail
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-[#0F382C] focus:outline-none"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Adgangskode
              <input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-[#0F382C] focus:outline-none"
              />
            </label>

            {error && <p className="text-xs font-medium text-red-700">{error}</p>}
            {info && <p className="text-xs font-medium text-emerald-800">{info}</p>}

            <button
              type="submit"
              disabled={submitting || (!loading && !configured)}
              className="w-full rounded-lg bg-[#0F382C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14493a] disabled:opacity-50"
            >
              {submitting ? "Arbejder..." : mode === "login" ? "Log ind" : "Opret konto"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setInfo("");
            }}
            className="mt-4 text-xs font-semibold text-[#0F382C] hover:underline"
          >
            {mode === "login" ? "Ny bruger? Opret konto" : "Har du allerede en konto? Log ind"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Indlæser login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
