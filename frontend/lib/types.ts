export type ExtractedData = {
  id?: string;
  user_id?: string;

  // Expense fields
  amount?: number | null;
  category?: string;
  description?: string;
  transaction_type?: string;

  // Task fields
  title?: string;
  status?: string;
  priority?: string;
  due_date?: string | null;
  reminder_at?: string | null;

  // Common fields
  created_at?: string;
};

export type ChatResponse = {
  status: string;
  user_id: string;
  message_received: string;
  intent?: string | null;
  selected_agent?: string | null;
  extracted_data?: ExtractedData | null;
  response: string;
};

export type ExpenseItem = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description?: string | null;
  transaction_type: string;
  created_at: string;
};

export type ExpensesResponse = {
  status: string;
  user_id: string;
  count: number;
  total_debit: number;
  total_credit: number;
  net_balance: number;
  period?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  expenses: ExpenseItem[];
};

export type TaskItem = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  reminder_at?: string | null;
  created_at: string;
};

export type TasksResponse = {
  status: string;
  user_id: string;
  count: number;
  pending_count: number;
  completed_count: number;
  tasks: TaskItem[];
};

export type TaskRemindersResponse = {
  status: string;
  user_id: string;
  due_today_count: number;
  upcoming_count: number;
  overdue_count: number;
  follow_up_count: number;
  due_today: TaskItem[];
  upcoming: TaskItem[];
  overdue: TaskItem[];
  follow_up: TaskItem[];
};

export type PeriodFilter = "all" | "today" | "this_week" | "this_month" | "this_year";

export type ExpenseCategoryFilter =
  | "all"
  | "food"
  | "groceries"
  | "transport"
  | "shopping"
  | "rent"
  | "utilities"
  | "health"
  | "entertainment"
  | "income"
  | "other";

export type TaskPriorityFilter = "all" | "low" | "medium" | "high";