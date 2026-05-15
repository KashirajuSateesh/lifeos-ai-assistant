"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Notice, { NoticeType } from "@/components/ui/Notice";
import { getMyProfile, saveMyProfile } from "@/lib/api";
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

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");

  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmed = params.get("confirmed");

    if (confirmed === "true") {
      setNotice({
        type: "success",
        message: "Email confirmed successfully. You can now login.",
      });

      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function handleAuth() {
    setNotice(null);

    if (!email.trim() || !password.trim()) {
      setNotice({
        type: "error",
        message: "Please enter email and password.",
      });
      return;
    }

    if (mode === "signup" && (!firstName.trim() || !lastName.trim())) {
      setNotice({
        type: "error",
        message: "Please enter first name and last name.",
      });
      return;
    }

    if (mode === "signup" && birthdate) {
      const selectedBirthdate = new Date(birthdate);
      const today = new Date();

      selectedBirthdate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (selectedBirthdate > today) {
        setNotice({
          type: "error",
          message: "Birthdate cannot be in the future.",
        });
        return;
      }
    }

    if (mode === "signup") {
      const passwordValidation = validatePassword(password);

      if (!passwordValidation.isValid) {
        setNotice({
          type: "error",
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?confirmed=true`,
            data: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              birthdate,
            },
          },
        });

        if (error) {
          throw error;
        }

        setNotice({
          type: "success",
          message:
            "If this email is new, we sent a confirmation link. If you already signed up, check your inbox or login after confirming your email.",
        });

        setMode("login");
        setPassword("");

        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setNotice({
            type: "error",
            message:
              "Your email is not confirmed yet. Please check your inbox and confirm your account before logging in.",
          });
          return;
        }

        throw error;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const profileResponse = await getMyProfile();

      if (!profileResponse.profile && user?.user_metadata) {
        await saveMyProfile({
          first_name: user.user_metadata.first_name ?? "",
          last_name: user.user_metadata.last_name ?? "",
          phone_number: user.user_metadata.phone_number ?? "",
          birthdate: user.user_metadata.birthdate ?? "",
        });
      }

      router.push("/");
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Authentication failed. Please check your details and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setNotice(null);
    setMode(mode === "login" ? "signup" : "login");
    setPassword("");
  }

  const passwordValidation = validatePassword(password);

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
            Personal AI Operating System
          </p>

          <h2 className="mt-6 text-2xl font-bold">
            {mode === "login" ? "Welcome Back" : "Create Your Account"}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Your personal AI assistant for expenses, tasks, journals, places, and
            daily planning.
          </p>
        </div>

        {notice && <Notice type={notice.type} message={notice.message} />}

        <div className="space-y-3">
          {mode === "signup" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
                />

                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <input
                type="tel"
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
              />

              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Birthdate
                </label>
                <input
                  type="date"
                  value={birthdate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(event) => setBirthdate(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
          />

          {mode === "signup" && (
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
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </div>

        <button
          onClick={switchMode}
          className="mt-5 text-sm text-blue-400 hover:text-blue-300"
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Login"}
        </button>
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