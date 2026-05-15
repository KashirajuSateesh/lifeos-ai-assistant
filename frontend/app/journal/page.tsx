"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Notice, { NoticeType } from "@/components/ui/Notice";
import {
  createJournalEntry,
  deleteJournal as deleteJournalApi,
  getMonthlyJournals,
  getRecentJournals,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

type JournalEntry = {
  id: string;
  user_id?: string;
  entry_text: string;
  mood?: string | null;
  tags?: string[] | null;
  summary?: string | null;
  entry_date?: string | null;
  created_at: string;
};

type WeekGroup = {
  label: string;
  entries: JournalEntry[];
};

export default function JournalPage() {
  const router = useRouter();

  const currentDate = new Date();

  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);

  const [recentJournals, setRecentJournals] = useState<JournalEntry[]>([]);
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);

  const [entryText, setEntryText] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const [expandedWeek, setExpandedWeek] = useState<string | null>("Week 1");

  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);

  const [journalToDelete, setJournalToDelete] = useState<JournalEntry | null>(
    null
  );
  const [deletingJournal, setDeletingJournal] = useState(false);

  async function fetchRecentJournals() {
    setNotice(null);
    setLoadingRecent(true);

    try {
      const data = await getRecentJournals();
      setRecentJournals(data.journals ?? []);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to fetch recent journals.",
      });
    } finally {
      setLoadingRecent(false);
    }
  }

  async function fetchMonthlyJournalData(year: number, month: number) {
    setNotice(null);
    setLoadingMonthly(true);

    try {
      const data = await getMonthlyJournals(year, month);
      setWeekGroups(normalizeWeekGroups(data));
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to fetch monthly journals.",
      });
    } finally {
      setLoadingMonthly(false);
    }
  }

  function normalizeWeekGroups(data: any): WeekGroup[] {
    const possibleWeeks = data?.weeks ?? data?.week_groups ?? data?.journals_by_week;

    if (Array.isArray(possibleWeeks)) {
      return possibleWeeks.map((week: any, index: number) => ({
        label: week.label ?? week.week_label ?? `Week ${index + 1}`,
        entries: week.entries ?? week.journals ?? [],
      }));
    }

    if (possibleWeeks && typeof possibleWeeks === "object") {
      return Object.entries(possibleWeeks).map(([key, value]) => ({
        label: key,
        entries: Array.isArray(value) ? (value as JournalEntry[]) : [],
      }));
    }

    const journals = data?.journals ?? [];

    if (Array.isArray(journals)) {
      const grouped: Record<string, JournalEntry[]> = {
        "Week 1": [],
        "Week 2": [],
        "Week 3": [],
        "Week 4": [],
      };

      journals.forEach((journal: JournalEntry) => {
        const dateValue = journal.entry_date ?? journal.created_at;
        const day = new Date(dateValue).getDate();

        if (day <= 7) grouped["Week 1"].push(journal);
        else if (day <= 14) grouped["Week 2"].push(journal);
        else if (day <= 21) grouped["Week 3"].push(journal);
        else grouped["Week 4"].push(journal);
      });

      return Object.entries(grouped).map(([label, entries]) => ({
        label,
        entries,
      }));
    }

    return [
      { label: "Week 1", entries: [] },
      { label: "Week 2", entries: [] },
      { label: "Week 3", entries: [] },
      { label: "Week 4", entries: [] },
    ];
  }

  async function saveJournalEntry() {
    setNotice(null);

    if (entryText.trim().length < 10) {
      setNotice({
        type: "error",
        message: "Please write at least 10 characters for a meaningful journal entry.",
      });
      return;
    }

    setSavingJournal(true);

    try {
      await createJournalEntry(entryText);

      setEntryText("");

      setNotice({
        type: "success",
        message: "Journal entry saved successfully.",
      });

      await fetchRecentJournals();
      await fetchMonthlyJournalData(selectedYear, selectedMonth);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to save journal entry.",
      });
    } finally {
      setSavingJournal(false);
    }
  }

  function requestDeleteJournal(journal: JournalEntry) {
    setNotice(null);
    setJournalToDelete(journal);
  }

  function cancelDeleteJournal() {
    if (deletingJournal) return;
    setJournalToDelete(null);
  }

  async function confirmDeleteJournal() {
    if (!journalToDelete) return;

    setNotice(null);
    setDeletingJournal(true);

    try {
      await deleteJournalApi(journalToDelete.id);

      setNotice({
        type: "success",
        message: "Journal entry deleted successfully.",
      });

      setJournalToDelete(null);

      await fetchRecentJournals();
      await fetchMonthlyJournalData(selectedYear, selectedMonth);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to delete journal entry.",
      });
    } finally {
      setDeletingJournal(false);
    }
  }

  function handleYearChange(value: string) {
    const year = Number(value);
    setSelectedYear(year);
    fetchMonthlyJournalData(year, selectedMonth);
  }

  function handleMonthChange(value: string) {
    const month = Number(value);
    setSelectedMonth(month);
    fetchMonthlyJournalData(selectedYear, month);
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
      await fetchMonthlyJournalData(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );
    }

    loadPage();
  }, []);

  const years = [
    currentDate.getFullYear(),
    currentDate.getFullYear() - 1,
    currentDate.getFullYear() - 2,
  ];

  const months = [
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

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Daily Journal</h1>
          <p className="mt-2 text-slate-400">
            Write reflections, track mood, and browse entries by month and week.
          </p>
        </div>

        {notice && <Notice type={notice.type} message={notice.message} />}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Write Journal</h2>
            <p className="mt-1 text-sm text-slate-400">
              Write naturally. LifeOS will save it and generate mood, tags, and summary.
            </p>
          </div>

          <textarea
            value={entryText}
            onChange={(event) => setEntryText(event.target.value)}
            placeholder="Example: Today was tiring, but I felt proud because I made progress on my project..."
            className="min-h-40 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {entryText.length} characters
            </p>

            <button
              onClick={saveJournalEntry}
              disabled={savingJournal}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {savingJournal ? "Saving..." : "Save Journal"}
            </button>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Recent Journals</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your latest 5 journal entries.
              </p>
            </div>

            <button
              onClick={fetchRecentJournals}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {loadingRecent ? (
            <p className="text-slate-400">Loading recent journals...</p>
          ) : recentJournals.length === 0 ? (
            <p className="text-slate-400">No recent journals found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {recentJournals.slice(0, 5).map((journal) => (
                <JournalCard
                  key={journal.id}
                  journal={journal}
                  onDelete={requestDeleteJournal}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Browse by Month</h2>
              <p className="mt-1 text-sm text-slate-400">
                Select year and month, then expand each week.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={selectedYear}
                onChange={(event) => handleYearChange(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingMonthly ? (
            <p className="text-slate-400">Loading monthly journals...</p>
          ) : (
            <div className="space-y-3">
              {weekGroups.map((week) => {
                const isOpen = expandedWeek === week.label;

                return (
                  <div
                    key={week.label}
                    className="rounded-xl border border-slate-700 bg-slate-800"
                  >
                    <button
                      onClick={() =>
                        setExpandedWeek(isOpen ? null : week.label)
                      }
                      className="flex w-full items-center justify-between px-4 py-4 text-left"
                    >
                      <div>
                        <p className="font-semibold">{week.label}</p>
                        <p className="text-sm text-slate-400">
                          {week.entries.length} entries
                        </p>
                      </div>

                      <span className="text-slate-400">
                        {isOpen ? "Hide" : "Show"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-700 p-4">
                        {week.entries.length === 0 ? (
                          <p className="text-sm text-slate-400">
                            No journal entries for this week.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {week.entries.map((journal) => (
                              <JournalCard
                                key={journal.id}
                                journal={journal}
                                onDelete={requestDeleteJournal}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {journalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <p className="text-sm font-medium text-red-300">
              Delete Journal Entry
            </p>

            <h2 className="mt-2 text-2xl font-bold">Are you sure?</h2>

            <p className="mt-3 text-sm text-slate-400">
              This will permanently delete this journal entry. This action cannot be undone.
            </p>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="font-semibold">
                {journalToDelete.summary || "Journal Entry"}
              </p>

              <p className="mt-2 line-clamp-3 text-sm text-slate-400">
                {journalToDelete.entry_text}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDeleteJournal}
                disabled={deletingJournal}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteJournal}
                disabled={deletingJournal}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {deletingJournal ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function JournalCard({
  journal,
  onDelete,
}: {
  journal: JournalEntry;
  onDelete: (journal: JournalEntry) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs capitalize text-blue-300">
            {journal.mood || "neutral"}
          </span>

          <span className="text-xs text-slate-500">
            {journal.entry_date
              ? new Date(journal.entry_date).toLocaleDateString()
              : new Date(journal.created_at).toLocaleDateString()}
          </span>
        </div>

        <button
          onClick={() => onDelete(journal)}
          className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>

      <p className="font-semibold">
        {journal.summary || "Journal entry saved."}
      </p>

      <p className="mt-2 line-clamp-4 text-sm text-slate-400">
        {journal.entry_text}
      </p>

      {journal.tags && journal.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {journal.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}