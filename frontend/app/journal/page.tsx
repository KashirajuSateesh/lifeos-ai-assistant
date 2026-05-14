"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import AppShell from "@/components/layout/AppShell";
import {
  deleteJournal as deleteJournalApi,
  getMonthlyJournals,
  getRecentJournals,
  sendChatMessage,
} from "@/lib/api";
import {
  JournalItem,
  MonthlyJournalsResponse,
  RecentJournalsResponse,
} from "@/lib/types";

const monthOptions = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

function getWeekOfMonth(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDate();

  if (day <= 7) return "Week 1";
  if (day <= 14) return "Week 2";
  if (day <= 21) return "Week 3";
  return "Week 4";
}

function groupJournalsByWeek(journals: JournalItem[]) {
  const grouped: Record<string, JournalItem[]> = {
    "Week 1": [],
    "Week 2": [],
    "Week 3": [],
    "Week 4": [],
  };

  journals.forEach((journal) => {
    const week = getWeekOfMonth(journal.entry_date);
    grouped[week].push(journal);
  });

  return grouped;
}

function moodBadgeClass(mood?: string | null) {
  if (mood === "positive") return "bg-emerald-500/20 text-emerald-300";
  if (mood === "negative") return "bg-rose-500/20 text-rose-300";
  if (mood === "mixed") return "bg-purple-500/20 text-purple-300";
  return "bg-slate-700 text-slate-300";
}

export default function JournalPage() {
  const router = useRouter();
  const currentDate = new Date();

  const [journalText, setJournalText] = useState("");
  const [recentJournals, setRecentJournals] =
    useState<RecentJournalsResponse | null>(null);
  const [monthlyJournals, setMonthlyJournals] =
    useState<MonthlyJournalsResponse | null>(null);

  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({
    "Week 1": true,
    "Week 2": false,
    "Week 3": false,
    "Week 4": false,
  });

  const [saving, setSaving] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const groupedJournals = useMemo(() => {
    return groupJournalsByWeek(monthlyJournals?.journals ?? []);
  }, [monthlyJournals]);

  async function fetchRecentJournals() {
    setLoadingRecent(true);

    try {
      const data = await getRecentJournals();
      setRecentJournals(data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch recent journals.");
    } finally {
      setLoadingRecent(false);
    }
  }

  async function fetchMonthlyJournals(year = selectedYear, month = selectedMonth) {
    setLoadingMonthly(true);

    try {
      const data = await getMonthlyJournals(year, month);
      setMonthlyJournals(data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch monthly journals.");
    } finally {
      setLoadingMonthly(false);
    }
  }

  async function saveJournal() {
    if (journalText.trim().length < 10) {
      alert("Please write at least 10 characters for a meaningful journal entry.");
      return;
    }

    setSaving(true);

    try {
      const data = await sendChatMessage(journalText);

      if (data.selected_agent !== "journal_agent") {
        alert(
          "The orchestrator did not route this to Journal Agent. Try starting with: Today I felt..."
        );
        return;
      }

      setJournalText("");
      await fetchRecentJournals();
      await fetchMonthlyJournals();
    } catch (error) {
      console.error(error);
      alert("Failed to save journal entry.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteJournal(journalId: string) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this journal entry?"
    );

    if (!confirmDelete) return;

    try {
      await deleteJournalApi(journalId);
      await fetchRecentJournals();
      await fetchMonthlyJournals();
    } catch (error) {
      console.error(error);
      alert("Failed to delete journal entry.");
    }
  }

  function toggleWeek(week: string) {
    setOpenWeeks((previous) => ({
      ...previous,
      [week]: !previous[week],
    }));
  }

  async function handleMonthSearch() {
    await fetchMonthlyJournals(selectedYear, selectedMonth);
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      await fetchRecentJournals();
      await fetchMonthlyJournals(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );
    }

    loadPage();
  }, []);

  const years = Array.from({ length: 6 }, (_, index) => currentDate.getFullYear() - index);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-400">Journal</p>
          <h1 className="text-3xl font-bold">Daily Journal</h1>
          <p className="mt-2 text-slate-400">
            Write long reflections, track mood, and view journals by month and week.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Write Today&apos;s Journal</h2>
            <p className="mt-2 text-slate-400">
              Write freely. 100–300+ characters is completely fine.
            </p>
          </div>

          <textarea
            value={journalText}
            onChange={(event) => setJournalText(event.target.value)}
            placeholder="Example: Today I felt productive but tired. I worked on my AI assistant project and made good progress..."
            className="min-h-48 w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
          />

          <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-400">
              Characters: {journalText.length}
            </p>

            <button
              onClick={saveJournal}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Journal"}
            </button>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-400">Recent</p>
              <h2 className="text-2xl font-bold">Recent 5 Journals</h2>
              <p className="mt-2 text-slate-400">
                Your latest reflections, mood, tags, and summaries.
              </p>
            </div>

            <button
              onClick={fetchRecentJournals}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {loadingRecent ? (
            <p className="text-slate-400">Loading recent journals...</p>
          ) : recentJournals && recentJournals.journals.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recentJournals.journals.map((journal) => (
                <div
                  key={journal.id}
                  className="rounded-2xl border border-slate-700 bg-slate-800 p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {new Date(`${journal.entry_date}T00:00:00`).toDateString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Created: {new Date(journal.created_at).toLocaleString()}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs capitalize ${moodBadgeClass(
                        journal.mood
                      )}`}
                    >
                      {journal.mood ?? "neutral"}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-slate-300">
                    {journal.summary ?? journal.entry_text}
                  </p>

                  {journal.tags && journal.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {journal.tags.map((tag) => (
                        <span
                          key={`${journal.id}-${tag}`}
                          className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => deleteJournal(journal.id)}
                    className="mt-4 rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No recent journals yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5">
            <p className="text-sm font-medium text-blue-400">Monthly View</p>
            <h2 className="text-2xl font-bold">Browse by Year, Month, and Week</h2>
            <p className="mt-2 text-slate-400">
              Select a month to view daily journal cards grouped into weeks.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Year</label>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-400">Month</label>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleMonthSearch}
                className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600"
              >
                Load Month
              </button>
            </div>
          </div>

          {loadingMonthly ? (
            <p className="text-slate-400">Loading monthly journals...</p>
          ) : (
            <div className="space-y-3">
              {["Week 1", "Week 2", "Week 3", "Week 4"].map((week) => (
                <div
                  key={week}
                  className="rounded-xl border border-slate-700 bg-slate-800"
                >
                  <button
                    onClick={() => toggleWeek(week)}
                    className="flex w-full items-center justify-between px-4 py-4 text-left"
                  >
                    <div>
                      <p className="font-semibold">{week}</p>
                      <p className="text-sm text-slate-400">
                        {groupedJournals[week].length} journal(s)
                      </p>
                    </div>

                    <span className="text-slate-400">
                      {openWeeks[week] ? "−" : "+"}
                    </span>
                  </button>

                  {openWeeks[week] && (
                    <div className="border-t border-slate-700 p-4">
                      {groupedJournals[week].length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {groupedJournals[week].map((journal) => (
                            <div
                              key={journal.id}
                              className="rounded-xl border border-slate-700 bg-slate-900 p-4"
                            >
                              <div className="mb-2 flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold">
                                    {new Date(
                                      `${journal.entry_date}T00:00:00`
                                    ).toDateString()}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(journal.created_at).toLocaleString()}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs capitalize ${moodBadgeClass(
                                    journal.mood
                                  )}`}
                                >
                                  {journal.mood ?? "neutral"}
                                </span>
                              </div>

                              <p className="text-sm leading-6 text-slate-300">
                                {journal.entry_text}
                              </p>

                              {journal.tags && journal.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {journal.tags.map((tag) => (
                                    <span
                                      key={`${journal.id}-${tag}`}
                                      className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-300"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <button
                                onClick={() => deleteJournal(journal.id)}
                                className="mt-4 rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">
                          No journal entries for this week.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}