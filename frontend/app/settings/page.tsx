"use client";

import { ChangeEvent, useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import { getMyProfile, updateMyProfile } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/lib/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email, setEmail] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? "");

      const data = await getMyProfile();

      if (data.profile) {
        setProfile(data.profile);
        setFirstName(data.profile.first_name ?? "");
        setLastName(data.profile.last_name ?? "");
        setPhoneNumber(data.profile.phone_number ?? "");
        setBirthdate(data.profile.birthdate ?? "");
        setProfilePhotoUrl(data.profile.profile_photo_url ?? "");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);

    try {
      const data = await updateMyProfile({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        birthdate,
        profile_photo_url: profilePhotoUrl,
      });

      setProfile(data.profile);
      setIsEditing(false);
      alert("Profile updated successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhoneNumber(profile.phone_number ?? "");
      setBirthdate(profile.birthdate ?? "");
      setProfilePhotoUrl(profile.profile_photo_url ?? "");
    }

    setIsEditing(false);
  }

  async function uploadProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login again.");
        return;
      }

      const fileExtension = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      setProfilePhotoUrl(publicUrl);

      const updatedProfile = await updateMyProfile({
        profile_photo_url: publicUrl,
      });

      setProfile(updatedProfile.profile);

      alert("Profile photo updated.");
    } catch (error) {
      console.error(error);
      alert("Failed to upload profile photo. Check your Supabase Storage bucket.");
    }
  }

  async function changePassword() {
    if (!newPassword || !confirmPassword) {
      alert("Please enter and confirm your new password.");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password should be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setNewPassword("");
      setConfirmPassword("");

      alert("Password changed successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to change password.");
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-400">Settings</p>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="mt-2 text-slate-400">
            Manage your profile, password, and account preferences.
          </p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading settings...</p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Profile"
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold">
                      {initials || "U"}
                    </div>
                  )}

                  <div>
                    <h2 className="text-2xl font-bold">
                      {fullName || "Your Profile"}
                    </h2>
                    <p className="text-sm text-slate-400">{email}</p>

                    <label className="mt-3 inline-block cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadProfilePhoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>

                    <button
                      onClick={cancelEdit}
                      className="rounded-xl border border-slate-700 px-5 py-3 text-sm hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ReadableField label="First Name" value={firstName} />
                  <ReadableField label="Last Name" value={lastName} />
                  <ReadableField label="Email" value={email} />
                  <ReadableField label="Phone Number" value={phoneNumber} />
                  <ReadableField label="Birthdate" value={birthdate} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <EditableField
                    label="First Name"
                    value={firstName}
                    onChange={setFirstName}
                  />

                  <EditableField
                    label="Last Name"
                    value={lastName}
                    onChange={setLastName}
                  />

                  <div>
                    <label className="mb-1 block text-sm text-slate-400">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-slate-400 outline-none"
                    />
                  </div>

                  <EditableField
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    type="tel"
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
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <p className="text-sm font-medium text-blue-400">Security</p>
              <h2 className="mt-1 text-2xl font-bold">Change Password</h2>
              <p className="mt-2 text-sm text-slate-400">
                Update your password while you are logged in.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
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
              </div>

              <button
                onClick={changePassword}
                className="mt-4 rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-600"
              >
                Change Password
              </button>
            </section>

            <section className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6 shadow-xl">
              <p className="text-sm font-medium text-red-300">Danger Zone</p>
              <h2 className="mt-1 text-2xl font-bold">Delete Account</h2>
              <p className="mt-2 text-sm text-red-200/80">
                Account deletion will remove your profile and all related app data.
                We will implement this safely in the next step.
              </p>

              <button
                disabled
                className="mt-4 rounded-xl border border-red-500/40 px-5 py-3 text-sm text-red-300 opacity-60"
              >
                Delete Account Coming Next
              </button>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ReadableField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 font-medium">{value || "Not provided"}</p>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
      />
    </div>
  );
}