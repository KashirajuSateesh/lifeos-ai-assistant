"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { saveMyProfile } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password.");
      return;
    }

    if (mode === "signup" && (!firstName.trim() || !lastName.trim())) {
      alert("Please enter first name and last name.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          throw loginError;
        }

        await saveMyProfile({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          birthdate,
        });

        router.push("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        router.push("/");
      }
    } catch (error) {
      console.error(error);
      alert("Authentication failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-400">LifeOS</p>
          <h1 className="text-3xl font-bold">
            {mode === "login" ? "Login" : "Create Account"}
          </h1>
          <p className="mt-2 text-slate-400">
            Sign in to use your personal AI assistant.
          </p>
        </div>

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
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
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