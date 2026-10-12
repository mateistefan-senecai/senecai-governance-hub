"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/home";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-hairline bg-surface p-6 shadow-sm">
      <div>
        <label htmlFor="email" className="block font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[14px] text-ink"
        />
      </div>
      <div>
        <label htmlFor="password" className="block font-narrow text-[10.5px] font-semibold uppercase tracking-micro-wide text-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 block w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[14px] text-ink"
        />
      </div>
      {error && <p className="text-[13px] text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gold px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-gold-hover disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <p className="font-narrow text-[11px] font-semibold uppercase tracking-micro-wide text-gold-hover">SenecAI · EU AI Act</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Governance Hub</h1>
        <p className="mt-1 text-[13.5px] text-muted">Sign in to continue.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
