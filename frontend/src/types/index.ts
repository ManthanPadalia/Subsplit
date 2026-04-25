export type PlanCategory =
  | "STREAMING"
  | "EDUCATION"
  | "GAMING"
  | "PRODUCTIVITY"
  | "MUSIC";

export type SlotStatus = "AVAILABLE" | "OCCUPIED" | "GRACE" | "REVOKED";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export type UserRole = "USER" | "ADMIN";

export type ScoreEventType =
  | "ON_TIME_PAYMENT"
  | "LATE_PAYMENT"
  | "SLOT_REVOKED"
  | "ACCOUNT_LONGEVITY";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Plan {
  id: string;
  name: string;
  category: PlanCategory;
  description: string;
  logo_url: string | null;
  total_slots: number;
  subscription_cost_paise: number;
  subscription_cost_rupees: number;
  platform_fee_paise: number;
  platform_fee_rupees: number;
  slot_cost_paise: number;
  slot_cost_rupees: number;
  user_pays_paise: number;
  user_pays_rupees: number;
  available_slots: number;
  occupied_slots: number;
  uptime_percentage: number;
  is_active: boolean;
  created_at: string;
}

export interface SlotPreview {
  id: string;
  slot_number: number;
  status: SlotStatus;
  user_initials: string | null;
}

export interface PlanDetail extends Plan {
  access_instructions: string | null;
  slots: SlotPreview[];
}

export interface AdminPlan extends Plan {
  utilization_percentage: number;
  monthly_revenue_paise: number;
  monthly_revenue_rupees: number;
  monthly_margin_paise: number;
  monthly_margin_rupees: number;
}

export interface AdminPlanSlotUser {
  id: string;
  name: string;
  email: string;
  subsplit_score: number;
}

export interface AdminPlanSlot {
  id: string;
  slot_number: number;
  status: SlotStatus;
  assigned_at: string | null;
  expires_at: string | null;
  user: AdminPlanSlotUser | null;
}

export interface AdminPlanDetail extends AdminPlan {
  access_instructions: string | null;
  slots: AdminPlanSlot[];
  waitlist_count: number;
}

export interface SlotPlanSummary {
  id: string;
  name: string;
  category: PlanCategory;
  logo_url: string | null;
  user_pays_paise: number;
  user_pays_rupees: number;
  access_instructions: string | null;
}

export interface Slot {
  id: string;
  slot_number: number;
  status: SlotStatus;
  assigned_at: string | null;
  expires_at: string | null;
  plan: SlotPlanSummary;
}

export interface SlotPaymentHistoryItem {
  id: string;
  amount_paise: number;
  amount_rupees: number;
  status: PaymentStatus;
  created_at: string;
}

export interface SlotDetail extends Slot {
  payment_history: SlotPaymentHistoryItem[];
}

export interface PaymentPlanSummary {
  id: string;
  name: string;
  category: PlanCategory;
}

export interface Payment {
  id: string;
  amount_paise: number;
  amount_rupees: number;
  status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  failure_reason: string | null;
  created_at: string;
  plan: PaymentPlanSummary;
}

export interface ActivatedSlotPlanSummary {
  id: string;
  name: string;
  category: PlanCategory;
  access_instructions: string | null;
}

export interface ActivatedSlotSummary {
  id: string;
  slot_number: number;
  status: SlotStatus;
  assigned_at: string | null;
  expires_at: string | null;
  plan: ActivatedSlotPlanSummary;
}

export interface WaitlistPlanSummary {
  id: string;
  name: string;
  category: PlanCategory;
  logo_url: string | null;
  user_pays_paise: number;
  user_pays_rupees: number;
}

export interface WaitlistEntry {
  id: string;
  queue_position: number;
  joined_at: string;
  plan: WaitlistPlanSummary;
}

export interface JoinWaitlistResponse {
  waitlist_entry_id: string;
  plan_id: string;
  plan_name: string;
  queue_position: number;
  joined_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UserWithScore extends User {
  subsplit_score: number;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: "bearer";
}

export interface ScoreEvent {
  id: string;
  event_type: ScoreEventType;
  delta: number;
  description: string | null;
  created_at: string;
}

export interface ScoreBreakdown {
  base: number;
  total_delta: number;
  final_score: number;
}

export interface ScoreSummary {
  subsplit_score: number;
  score_breakdown: ScoreBreakdown;
  events: ScoreEvent[];
}

export interface PlansResponse {
  plans: Plan[];
  total: number;
  skip: number;
  limit: number;
}

export interface MySlotsResponse {
  slots: Slot[];
}

export interface MyPaymentsResponse {
  payments: Payment[];
  total: number;
  skip: number;
  limit: number;
}

export interface MyWaitlistResponse {
  waitlist_entries: WaitlistEntry[];
}

export interface CreateOrderResponse {
  payment_id: string;
  razorpay_order_id: string;
  amount_paise: number;
  amount_rupees: number;
  currency: "INR";
  plan_name: string;
  slot_number: number;
}

export interface VerifyPaymentResponse {
  payment_id: string;
  status: PaymentStatus;
  slot: ActivatedSlotSummary;
}

export interface AdminDashboardMetrics {
  total_monthly_revenue_paise: number;
  total_monthly_revenue_rupees: number;
  platform_fee_earned_paise: number;
  platform_fee_earned_rupees: number;
  total_slots: number;
  occupied_slots: number;
  available_slots: number;
  utilization_percentage: number;
  total_users: number;
  new_users_this_month: number;
  grace_period_slots: number;
  at_risk_users: number;
}

export interface AdminAtRiskSlot {
  slot_id: string;
  slot_number: number;
  status: SlotStatus;
  expires_at: string | null;
  plan_name: string;
  user_name: string | null;
  user_email: string | null;
  subsplit_score: number | null;
}

export interface AdminDashboard {
  metrics: AdminDashboardMetrics;
  plans_summary: AdminPlan[];
  at_risk_slots: AdminAtRiskSlot[];
}

export interface RevokeSlotResponse {
  slot_id: string;
  new_status: SlotStatus;
  waitlist_promoted: boolean;
  promoted_user_id: string | null;
}

export interface AdminPlansResponse {
  plans: AdminPlan[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminUserListItem extends UserWithScore {
  active_slot_count: number;
}

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminUserActiveSlot {
  slot_id: string;
  plan_name: string;
  status: SlotStatus;
  expires_at: string | null;
}

export interface AdminUserPaymentHistoryItem {
  amount_paise: number;
  amount_rupees: number;
  status: PaymentStatus;
  created_at: string;
  plan_name: string;
}

export interface AdminUserDetail extends UserWithScore {
  active_slots: AdminUserActiveSlot[];
  score_events: Omit<ScoreEvent, "id">[];
  payment_history: AdminUserPaymentHistoryItem[];
}

export interface RevenueByCategory {
  category: string;
  revenue_paise: number;
  revenue_rupees: number;
}

export interface SlotUtilizationByCategory {
  category: string;
  utilization_percentage: number;
}

export interface UsersByCategory {
  category: string;
  user_count: number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue_paise: number;
  revenue_rupees: number;
}

export interface ScoreDistributionBucket {
  range: string;
  count: number;
}

export interface ScoreDistribution {
  high: ScoreDistributionBucket;
  medium: ScoreDistributionBucket;
  low: ScoreDistributionBucket;
}

export interface DemandSignal {
  id: string;
  name: string;
  category: PlanCategory;
  request_count: number;
  estimated_margin_paise: number;
  estimated_margin_rupees: number;
}

export interface RecentActivity {
  user_name: string;
  user_initials: string | null;
  subsplit_score: number;
  action: string;
  action_type: string;
  timestamp: string;
}

export interface AnalyticsData {
  revenue_by_category: RevenueByCategory[];
  slot_utilization_by_category: SlotUtilizationByCategory[];
  users_by_category: UsersByCategory[];
  revenue_trend: RevenueTrendPoint[];
  score_distribution: ScoreDistribution;
  demand_signals: DemandSignal[];
  recent_activity: RecentActivity[];
}

export interface LapseResult {
  moved_to_grace: string[];
  revoked: string[];
}

export interface AdminWaitlistUser {
  id: string;
  name: string;
  email: string;
  subsplit_score: number;
}

export interface AdminWaitlistEntry {
  position: number;
  entry_id: string;
  user: AdminWaitlistUser;
  joined_at: string;
  notified: boolean;
}

export interface PlanWaitlistResponse {
  plan_id: string;
  plan_name: string;
  waitlist: AdminWaitlistEntry[];
  total_waiting: number;
}

export interface CreatePlanInput {
  name: string;
  category: PlanCategory;
  description: string;
  logo_url?: string | null;
  total_slots: number;
  subscription_cost_paise: number;
  platform_fee_paise: number;
  access_instructions?: string | null;
  uptime_percentage?: number;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  logo_url?: string | null;
  platform_fee_paise?: number;
  access_instructions?: string | null;
  uptime_percentage?: number;
  is_active?: boolean;
}

export interface AdminPlansFilters {
  is_active?: boolean;
  category?: PlanCategory;
  skip?: number;
  limit?: number;
}

export interface AdminUsersFilters {
  role?: UserRole;
  score_max?: number;
  skip?: number;
  limit?: number;
}
