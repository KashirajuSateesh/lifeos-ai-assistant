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
} from "./types";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const DEMO_USER_ID = "demo-user";

function getBackendUrl() {
  if (!backendUrl) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined");
  }

  return backendUrl;
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(`${getBackendUrl()}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: DEMO_USER_ID,
      message,
    }),
  });

  if (!response.ok) {
    throw new Error("Backend chat request failed");
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
    `${getBackendUrl()}/api/expenses/${DEMO_USER_ID}${queryString ? `?${queryString}` : ""}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch expenses");
  }

  return response.json();
}

export async function deleteExpense(expenseId: string) {
  const response = await fetch(`${getBackendUrl()}/api/expenses/${expenseId}`, {
    method: "DELETE",
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
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update expense");
  }

  return response.json();
}

export async function getTasks(priority: TaskPriorityFilter = "all"): Promise<TasksResponse> {
  const queryParams = new URLSearchParams();

  if (priority !== "all") {
    queryParams.set("priority", priority);
  }

  const queryString = queryParams.toString();

  const response = await fetch(
    `${getBackendUrl()}/api/tasks/${DEMO_USER_ID}${queryString ? `?${queryString}` : ""}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

export async function getTaskReminders(): Promise<TaskRemindersResponse> {
  const response = await fetch(`${getBackendUrl()}/api/tasks/reminders/${DEMO_USER_ID}`);

  if (!response.ok) {
    throw new Error("Failed to fetch task reminders");
  }

  return response.json();
}

export async function updateTask(taskId: string, data: Record<string, unknown>) {
  const response = await fetch(`${getBackendUrl()}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
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
  });

  if (!response.ok) {
    throw new Error("Failed to delete task");
  }

  return response.json();
}

// Journal Agent related API functions

export async function getRecentJournals(): Promise<RecentJournalsResponse> {
  const response = await fetch(
    `${getBackendUrl()}/api/journals/recent/${DEMO_USER_ID}`
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
    `${getBackendUrl()}/api/journals/${DEMO_USER_ID}?year=${year}&month=${month}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch monthly journals");
  }

  return response.json();
}

export async function deleteJournal(journalId: string) {
  const response = await fetch(`${getBackendUrl()}/api/journals/${journalId}`, {
    method: "DELETE",
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
    `${getBackendUrl()}/api/places/${DEMO_USER_ID}${
      queryString ? `?${queryString}` : ""
    }`
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
  });

  if (!response.ok) {
    throw new Error("Failed to delete place");
  }

  return response.json();
}