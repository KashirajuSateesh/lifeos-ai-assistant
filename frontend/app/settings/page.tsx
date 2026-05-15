"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Notice, { NoticeType } from "@/components/ui/Notice";
import { deleteMyAccount, getMyProfile, updateMyProfile } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);

  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email, setEmail] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    setNotice(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");

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

      setNotice({
        type: "error",
        message: "Failed to load settings. Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setNotice(null);
    setSaving(true);

    try {
      if (birthdate) {
        const selectedBirthdate = new Date(birthdate);
        const today = new Date();

        selectedBirthdate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (selectedBirthdate > today) {
          setNotice({
            type: "error",
            message: "Birthdate cannot be in the future.",
          });

          setSaving(false);
          return;
        }
      }

      const data = await updateMyProfile({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        birthdate,
        profile_photo_url: profilePhotoUrl,
      });

      setProfile(data.profile);
      setIsEditing(false);

      setNotice({
        type: "success",
        message: "Profile updated successfully.",
      });
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to update profile. Please try again.",
      });
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

    setNotice(null);
    setIsEditing(false);
  }

  async function uploadProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    setNotice(null);

    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotice({
          type: "error",
          message: "Please login again.",
        });
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

      setNotice({
        type: "success",
        message: "Profile photo updated successfully.",
      });
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message:
          "Failed to upload profile photo. Please check your storage settings.",
      });
    }
  }

  async function changePassword() {
    setNotice(null);

    if (!newPassword || !confirmPassword) {
      setNotice({
        type: "error",
        message: "Please enter and confirm your new password.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setNotice({
        type: "error",
        message: "Password should be at least 8 characters.",
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

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setNewPassword("");
      setConfirmPassword("");

      setNotice({
        type: "success",
        message: "Password changed successfully.",
      });
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to change password. Please try again.",
      });
    }
  }

  function requestDeleteAccount() {
    setNotice(null);

    if (deleteConfirmText !== "DELETE") {
      setNotice({
        type: "error",
        message: 'Please type "DELETE" to confirm account deletion.',
      });
      return;
    }

    setShowDeleteModal(true);
  }

  function cancelDeleteAccount() {
    if (deletingAccount) return;
    setShowDeleteModal(false);
  }

  async function confirmDeleteAccount() {
    setDeletingAccount(true);
    setNotice(null);

    try {
      await deleteMyAccount();
      await supabase.auth.signOut();

      window.location.href = "/login";
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to delete account. Please try again.",
      });

      setShowDeleteModal(false);
    } finally {
      setDeletingAccount(false);
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
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="mt-2 text-slate-400">
            View and update your profile, password, and account preferences.
          </p>
        </div>

        {notice && <Notice type={notice.type} message={notice.message} />}

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
                    onClick={() => {
                      setNotice(null);
                      setIsEditing(true);
                    }}
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
                      max={new Date().toISOString().split("T")[0]}
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
                This will permanently delete your profile, expenses, tasks,
                journals, places, and login account. This action cannot be
                undone.
              </p>

              <div className="mt-5">
                <label className="mb-2 block text-sm text-red-200">
                  Type DELETE to confirm
                </label>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-red-900/60 bg-slate-950 px-3 py-3 text-white outline-none focus:border-red-500"
                />
              </div>

              <button
                onClick={requestDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== "DELETE"}
                className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingAccount ? "Deleting Account..." : "Delete My Account"}
              </button>
            </section>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-900/60 bg-slate-900 p-6 text-white shadow-2xl">
            <p className="text-sm font-medium text-red-300">Delete Account</p>

            <h2 className="mt-2 text-2xl font-bold">Are you absolutely sure?</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              This will permanently delete your account and all LifeOS data,
              including expenses, tasks, journals, saved places, profile, and
              login account. This action cannot be undone.
            </p>

            <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 p-4">
              <p className="text-sm text-red-200">
                Account: <span className="font-semibold">{email}</span>
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDeleteAccount}
                disabled={deletingAccount}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteAccount}
                disabled={deletingAccount}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {deletingAccount ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
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