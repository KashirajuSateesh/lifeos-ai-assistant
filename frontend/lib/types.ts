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

    // Journal fields
  entry_text?: string;
  mood?: string | null;
  tags?: string[] | null;
  summary?: string | null;
  entry_date?: string;

    // Place fields
  place_name?: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source_url?: string | null;
  image_url?: string | null;
  image_source?: string | null;
  photo_credit?: string | null;
  environment_tags?: string[] | null;
  location_known?: boolean;
  visited?: boolean;

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

// Task Agent related types

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

// Journal Agent related types

export type JournalItem = {
  id: string;
  user_id: string;
  entry_text: string;
  mood?: string | null;
  tags?: string[] | null;
  summary?: string | null;
  entry_date: string;
  created_at: string;
};

export type RecentJournalsResponse = {
  status: string;
  user_id: string;
  count: number;
  journals: JournalItem[];
};

export type MonthlyJournalsResponse = {
  status: string;
  user_id: string;
  year: number;
  month: number;
  count: number;
  journals: JournalItem[];
};

// places agent related types

export type PlaceItem = {
  id: string;
  user_id: string;
  place_name: string;
  description?: string | null;
  category?: string | null;
  environment_tags?: string[] | null;
  status: "want_to_visit" | "favorite";
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source_url?: string | null;
  image_url?: string | null;
  image_source?: string | null;
  photo_credit?: string | null;
  location_known: boolean;
  visited: boolean;
  visited_at?: string | null;
  reminder_enabled: boolean;
  last_suggested_at?: string | null;
  notes?: string | null;
  created_at: string;
  distance_km?: number | null;
  distance_status?: string | null;
};

export type PlacesResponse = {
  status: string;
  user_id: string;
  count: number;
  places: PlaceItem[];
};

export type PlaceStatusFilter = "all" | "want_to_visit" | "favorite";

export type PlaceCategoryFilter =
  | "all"
  | "ocean"
  | "mountain"
  | "desert"
  | "adventure"
  | "restaurant"
  | "movie"
  | "park"
  | "city"
  | "shopping"
  | "travel"
  | "general";

export type NearbyPlacesResponse = {
  status: string;
  user_id: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  count: number;
  places: (PlaceItem & {
    distance_km?: number;
  })[];
};

export type PlacesWithDistancesResponse = {
  status: string;
  user_id: string;
  latitude: number;
  longitude: number;
  count: number;
  places: PlaceItem[];
};

export type PlaceSuggestionsResponse = {
  status: string;
  user_id: string;
  count: number;
  places: PlaceItem[];
};

// Profile related types

export type Profile = {
  id: string;
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  birthdate?: string | null;
  profile_photo_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileResponse = {
  status: string;
  profile: Profile | null;
  message: string;
};

export type UpdateProfileResponse = {
  status: string;
  profile: Profile;
  message: string;
};

export type ProfilePayload = {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  birthdate?: string;
  profile_photo_url?: string;
};