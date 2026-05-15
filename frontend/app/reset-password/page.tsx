"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Notice, { NoticeType } from "@/components/ui/Notice";
import { supabase } from "@/lib/supabase";

function validatePassword(password: string) {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  const isValid = Object.values(checks).every(Boolean);

  return {
    isValid,
    checks,
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function checkRecoverySession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setNotice({
            type: "error",
            message:
              "Password reset session not found. Please open the latest reset link from your email.",
          });
        }
      } catch (error) {
        console.error(error);

        setNotice({
          type: "error",
          message: "Unable to verify reset session.",
        });
      } finally {
        setCheckingSession(false);
      }
    }

    checkRecoverySession();
  }, []);

  async function updatePassword() {
    setNotice(null);

    const passwordValidation = validatePassword(newPassword);

    if (!passwordValidation.isValid) {
      setNotice({
        type: "error",
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice({
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      router.replace("/login?reset=success");
    } catch (error) {
      console.error(error);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to update password.";

      setNotice({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  const passwordValidation = validatePassword(newPassword);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/lifeos-logo.png"
            alt="LifeOS Logo"
            className="h-24 w-24 rounded-2xl object-cover shadow-lg"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-white">
            LifeOS
          </h1>

          <p className="mt-2 text-sm text-blue-400">
            Reset your password
          </p>

          <h2 className="mt-6 text-2xl font-bold">Create New Password</h2>

          <p className="mt-2 text-sm text-slate-400">
            Enter a new password for your LifeOS account.
          </p>
        </div>

        {notice && <Notice type={notice.type} message={notice.message} />}

        {checkingSession ? (
          <p className="text-center text-sm text-slate-400">
            Checking reset session...
          </p>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
            />

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs">
              <p className="mb-2 font-medium text-slate-300">
                Password must include:
              </p>

              <div className="space-y-1">
                <PasswordRule
                  valid={passwordValidation.checks.minLength}
                  label="At least 8 characters"
                />
                <PasswordRule
                  valid={passwordValidation.checks.hasUppercase}
                  label="One uppercase letter"
                />
                <PasswordRule
                  valid={passwordValidation.checks.hasLowercase}
                  label="One lowercase letter"
                />
                <PasswordRule
                  valid={passwordValidation.checks.hasNumber}
                  label="One number"
                />
                <PasswordRule
                  valid={passwordValidation.checks.hasSymbol}
                  label="One symbol"
                />
              </div>
            </div>

            <button
              onClick={updatePassword}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            <button
              onClick={() => router.push("/login")}
              className="w-full text-sm text-blue-400 hover:text-blue-300"
            >
              Back to login
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function PasswordRule({ valid, label }: { valid: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={valid ? "text-emerald-400" : "text-slate-500"}>
        {valid ? "✓" : "○"}
      </span>
      <span className={valid ? "text-emerald-300" : "text-slate-400"}>
        {label}
      </span>
    </div>
  );
}