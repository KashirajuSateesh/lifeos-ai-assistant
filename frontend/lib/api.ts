import { supabase } from "./supabase";
import {
  ChatResponse,
  ExpensesResponse,
  ExpenseCategoryFilter,
  PeriodFilter,
  TasksResponse,
  TaskPriorityFilter,
  TaskRemindersResponse,
  RecentJournalsResponse,
  MonthlyJournalsResponse,
  PlacesResponse,
  PlaceStatusFilter,
  PlaceCategoryFilter,
  NearbyPlacesResponse,
  PlacesWithDistancesResponse,
  PlaceSuggestionsResponse,
  ProfilePayload,
  ProfileResponse,
  UpdateProfileResponse,
} from "./types";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const DEMO_USER_ID = "demo-user";

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("Access token exists:", Boolean(session?.access_token));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

function getBackendUrl() {
  if (!backendUrl) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined");
  }

  return backendUrl;
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(`${getBackendUrl()}/api/chat`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      user_id: DEMO_USER_ID,
      message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Backend chat error:", response.status, errorText);
    throw new Error(`Backend chat request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getExpenses(params?: {
  period?: PeriodFilter;
  category?: ExpenseCategoryFilter;
  startDate?: string;
  endDate?: string;
}): Promise<ExpensesResponse> {
  const queryParams = new URLSearchParams();

  if (params?.period && params.period !== "all") {
    queryParams.set("period", params.period);
  }

  if (params?.category && params.category !== "all") {
    queryParams.set("category", params.category);
  }

  if (params?.startDate) {
    queryParams.set("start_date", params.startDate);
  }

  if (params?.endDate) {
    queryParams.set("end_date", params.endDate);
  }

  const queryString = queryParams.toString();

  const response = await fetch(
    `${getBackendUrl()}/api/expenses/me${queryString ? `?${queryString}` : ""}`,
    {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Get expenses error:", response.status, errorText);
    throw new Error("Failed to fetch expenses");
  }

  return response.json();
}

export async function deleteExpense(expenseId: string) {
  const response = await fetch(`${getBackendUrl()}/api/expenses/${expenseId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete expense");
  }

  return response.json();
}

export async function updateExpense(
  expenseId: string,
  data: {
    amount: number;
    category: string;
    description: string;
    transaction_type: "debit" | "credit";
  }
) {
  const response = await fetch(`${getBackendUrl()}/api/expenses/${expenseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...await getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update expense");
  }

  return response.json();
}

export async function getTasks(
  priority: TaskPriorityFilter = "all"
): Promise<TasksResponse> {
  const queryParams = new URLSearchParams();

  if (priority !== "all") {
    queryParams.set("priority", priority);
  }

  const queryString = queryParams.toString();

  const response = await fetch(
    `${getBackendUrl()}/api/tasks/me${queryString ? `?${queryString}` : ""}`,
    {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Get tasks error:", response.status, errorText);
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

export async function getTaskReminders(): Promise<TaskRemindersResponse> {
  const response = await fetch(`${getBackendUrl()}/api/tasks/reminders/me`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Get task reminders error:", response.status, errorText);
    throw new Error("Failed to fetch task reminders");
  }

  return response.json();
}

export async function updateTask(taskId: string, data: Record<string, unknown>) {
  const response = await fetch(`${getBackendUrl()}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...await getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update task");
  }

  return response.json();
}

export async function deleteTask(taskId: string) {
  const response = await fetch(`${getBackendUrl()}/api/tasks/${taskId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete task");
  }

  return response.json();
}

// Journal Agent related API functions

export async function getRecentJournals(): Promise<RecentJournalsResponse> {
  const response = await fetch(
    `${getBackendUrl()}/api/journals/recent/me`, {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch recent journals");
  }

  return response.json();
}

export async function getMonthlyJournals(
  year: number,
  month: number
): Promise<MonthlyJournalsResponse> {
  const response = await fetch(
    `${getBackendUrl()}/api/journals/me?year=${year}&month=${month}`, {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch monthly journals");
  }

  return response.json();
}

export async function deleteJournal(journalId: string) {
  const response = await fetch(`${getBackendUrl()}/api/journals/${journalId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete journal");
  }

  return response.json();
}

// Places Agent related API functions

export async function getPlaces(params?: {
  status?: PlaceStatusFilter;
  category?: PlaceCategoryFilter;
}): Promise<PlacesResponse> {
  const queryParams = new URLSearchParams();

  if (params?.status && params.status !== "all") {
    queryParams.set("status", params.status);
  }

  if (params?.category && params.category !== "all") {
    queryParams.set("category", params.category);
  }

  const queryString = queryParams.toString();

  const response = await fetch(
    `${getBackendUrl()}/api/places/me${
      queryString ? `?${queryString}` : ""
    }`, {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch places");
  }

  return response.json();
}

export async function updatePlace(placeId: string, data: Record<string, unknown>) {
  const response = await fetch(`${getBackendUrl()}/api/places/${placeId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...await getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update place");
  }

  return response.json();
}

export async function deletePlace(placeId: string) {
  const response = await fetch(`${getBackendUrl()}/api/places/${placeId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete place");
  }

  return response.json();
}

export async function getNearbyPlaces(params: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}): Promise<NearbyPlacesResponse> {
  const queryParams = new URLSearchParams();

  queryParams.set("latitude", String(params.latitude));
  queryParams.set("longitude", String(params.longitude));
  queryParams.set("radius_km", String(params.radiusKm ?? 10));

  const response = await fetch(
    `${getBackendUrl()}/api/places/nearby/me?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch nearby places");
  }

  return response.json();
}

export async function getPlacesWithDistances(params: {
  latitude: number;
  longitude: number;
}): Promise<PlacesWithDistancesResponse> {
  const queryParams = new URLSearchParams();

  queryParams.set("latitude", String(params.latitude));
  queryParams.set("longitude", String(params.longitude));

  const response = await fetch(
    `${getBackendUrl()}/api/places/distances/me?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch places with distances");
  }

  return response.json();
}

export async function getPlaceSuggestions(
  olderThanDays = 7
): Promise<PlaceSuggestionsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set("older_than_days", String(olderThanDays));

  const response = await fetch(
    `${getBackendUrl()}/api/places/suggestions/me?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch place suggestions");
  }

  return response.json();
}

// Profile related API functions
export async function getMyProfile(): Promise<ProfileResponse> {
  const response = await fetch(`${getBackendUrl()}/api/profile/me`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Get profile error:", response.status, errorText);
    throw new Error("Failed to fetch profile");
  }

  return response.json();
}

export async function saveMyProfile(
  data: ProfilePayload
): Promise<UpdateProfileResponse> {
  const response = await fetch(`${getBackendUrl()}/api/profile/me`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Save profile error:", response.status, errorText);
    throw new Error("Failed to save profile");
  }

  return response.json();
}

export async function updateMyProfile(
  data: ProfilePayload
): Promise<UpdateProfileResponse> {
  const response = await fetch(`${getBackendUrl()}/api/profile/me`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Update profile error:", response.status, errorText);
    throw new Error("Failed to update profile");
  }

  return response.json();
}

// Account deletion helper API function
export async function deleteMyAccount() {
  const response = await fetch(`${getBackendUrl()}/api/account/me`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Delete account error:", response.status, errorText);
    throw new Error("Failed to delete account");
  }

  return response.json();
}


export async function createJournalEntry(entryText: string) {
  const response = await fetch(`${getBackendUrl()}/api/journal/me`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      entry_text: entryText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Create journal error:", response.status, errorText);
    throw new Error("Failed to save journal entry.");
  }

  return response.json();
}

export async function resetChatSession(accessToken?: string) {
  const headers: HeadersInit = accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      }
    : await getAuthHeaders();

  const response = await fetch(`${getBackendUrl()}/api/chat/reset`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Reset chat error:", response.status, errorText);
    throw new Error("Failed to reset chat session.");
  }

  return response.json();
}