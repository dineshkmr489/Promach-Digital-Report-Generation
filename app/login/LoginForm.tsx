"use client";

import {
  Eye,
  EyeOff,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your administrator username and password.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      const payload = (await response.json()) as
        | { ok: true }
        | { error: string };
      if (!response.ok || !("ok" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to sign in.",
        );
      }
      window.location.replace(nextPath);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to sign in. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Promach report workflow">
        <div className="login-story-grid" />
        <div className="login-story-content">
          <div className="login-brand">
            <span className="login-brand-mark">
              <Image
                alt="Promach"
                height={52}
                priority
                src="/brand/promach-logo.png"
                width={57}
              />
            </span>
            <div>
              <strong>PROMACH</strong>
              <small>Digital service reports</small>
            </div>
          </div>

          <div className="login-message">
            <span className="login-eyebrow">Secure operational workspace</span>
            <h1>Build the report once. Keep every approval accountable.</h1>
            <p>
              Maintain master data, complete the service record, share it with
              the client, and retain the signed PDF with its audit history.
            </p>
          </div>

          <div className="login-workflow">
            <div>
              <FileCheck2 size={18} />
              <span>
                <strong>Structured reports</strong>
                <small>Created from reusable master data</small>
              </span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <span>
                <strong>Controlled signatures</strong>
                <small>Secure client links and locked records</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <span className="login-lock">
            <LockKeyhole size={21} />
          </span>
          <span className="login-card-overline">Promach administration</span>
          <h2>Welcome back</h2>
          <p className="login-card-copy">
            Sign in to manage service reports and master data.
          </p>

          <form onSubmit={signIn}>
            <label className="login-field">
              <span>Username</span>
              <input
                autoComplete="username"
                autoFocus
                maxLength={120}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter administrator username"
                value={username}
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <span className="login-password-control">
                <input
                  autoComplete="current-password"
                  maxLength={300}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error ? (
              <div className="login-error" role="alert">
                {error}
              </div>
            ) : null}

            <button
              className="login-submit"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="spin" size={18} /> Signing in…
                </>
              ) : (
                <>
                  Sign in securely <LockKeyhole size={16} />
                </>
              )}
            </button>
          </form>

          <p className="login-help">
            Access is limited to authorised Promach administrators.
          </p>
        </div>
      </section>
    </main>
  );
}
