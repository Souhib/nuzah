/**
 * Single API client for the Noozha admin panel.
 * Replaces the prior NocoDB integration (`nocodb.ts` was removed).
 *
 * Base URL comes from `VITE_API_URL` at build time. Defaults to
 * https://api.noozha.fr so the production frontend works even when the
 * variable is missing.
 */

const API_BASE = (
  import.meta.env.VITE_API_URL ?? "https://api.noozha.fr"
).replace(/\/$/, "");

// --- Types (mirror the backend Pydantic schemas) ---------------------------
export type Slot = "morning" | "afternoon" | "evening" | "night";
export type Status = "pending" | "confirmed" | "cancelled";
export type ReservationKind = "pool" | "takeaway";
export type FoodFormula = "platters_14" | "platters_30" | "menu_19";
export type DepositMethod = "wero" | "revolut" | "paypal" | "cash" | "other";
export type ContactChannel = "whatsapp" | "instagram" | "phone" | "other";
export type Tier = "small" | "medium" | "large";

export interface AdminUser {
  id: string;
  email: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AdminUser;
}

export interface Reservation {
  id: string;
  kind: ReservationKind;
  slot: Slot | null;
  start_at: string;
  end_at: string;
  customer_name: string;
  customer_phone: string;
  contact_channel: ContactChannel | null;
  adults: number;
  children: number;
  babies: number;
  base_price_pool: number;
  food_formula: FoodFormula | null;
  food_persons: number | null;
  food_children: number;
  food_platters: number;
  food_price_total: number;
  discount_amount: number;
  discount_reason: string | null;
  extra_amount: number;
  extra_reason: string | null;
  tip_amount: number;
  total_price: number;
  deposit_paid: boolean;
  deposit_method: DepositMethod | null;
  status: Status;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceBreakdown {
  tier: Tier;
  adult_unit_price: number;
  child_unit_price: number;
  pool_total: number;
  food_total: number;
  extra: number;
  discount: number;
  tip: number;
  grand_total: number;
}

export interface PeriodStats {
  revenue: number;
  count: number;
}

export interface SummaryResponse {
  week: PeriodStats;
  month: PeriodStats;
  year: PeriodStats;
  upcoming: Reservation[];
}

export interface ReservationCreate {
  kind?: ReservationKind;
  slot?: Slot | null;
  date: string; // YYYY-MM-DD
  start_at?: string | null;
  end_at?: string | null;
  customer_name: string;
  customer_phone: string;
  contact_channel?: ContactChannel | null;
  adults: number;
  children: number;
  babies?: number;
  food_formula?: FoodFormula | null;
  food_persons?: number | null;
  food_children?: number;
  food_platters?: number;
  discount_amount?: number;
  discount_reason?: string | null;
  extra_amount?: number;
  extra_reason?: string | null;
  tip_amount?: number;
  deposit_paid?: boolean;
  deposit_method?: DepositMethod | null;
  status?: Status;
  notes?: string | null;
}

export type ReservationUpdate = Partial<ReservationCreate> & { clear_food?: boolean };

export interface EstimateRequest {
  slot: Slot;
  adults: number;
  children: number;
  food_formula?: FoodFormula | null;
  food_persons?: number | null;
  food_children?: number;
  food_platters?: number;
  discount_amount?: number;
  extra_amount?: number;
  tip_amount?: number;
}

// --- Error classes ---------------------------------------------------------
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ApiError extends Error {
  status: number;
  errorKey?: string;
  errorParams?: Record<string, string | number | undefined> | null;

  constructor(
    message: string,
    status: number,
    errorKey?: string,
    errorParams?: Record<string, string | number | undefined> | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorKey = errorKey;
    this.errorParams = errorParams;
  }
}

// --- Internal helpers ------------------------------------------------------
type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  token?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  const qs = options.query
    ? "?" +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(options.query)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : "";

  const res = await fetch(`${API_BASE}${path}${qs}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    throw new UnauthorizedError();
  }

  if (res.status === 204) return undefined as T;

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new ApiError(
      (payload.message as string) || `API error ${res.status}`,
      res.status,
      payload.error_key as string | undefined,
      (payload.error_params as Record<string, string | number | undefined>) ??
        null,
    );
  }

  return payload as T;
}

// --- Public API ------------------------------------------------------------
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<TokenResponse>("POST", "/api/v1/auth/login", {
        body: { email, password },
      }),
  },
  me: (token: string) => request<AdminUser>("GET", "/api/v1/me", { token }),
  reservations: {
    list: (
      token: string,
      filters: {
        from?: string;
        to?: string;
        status?: Status;
        customer_phone?: string;
        customer_name?: string;
      } = {},
    ) =>
      request<{ reservations: Reservation[] }>("GET", "/api/v1/reservations", {
        token,
        query: filters,
      }),
    get: (token: string, id: string) =>
      request<Reservation>("GET", `/api/v1/reservations/${id}`, { token }),
    create: (token: string, data: ReservationCreate) =>
      request<Reservation>("POST", "/api/v1/reservations", {
        token,
        body: data,
      }),
    update: (token: string, id: string, data: ReservationUpdate) =>
      request<Reservation>("PATCH", `/api/v1/reservations/${id}`, {
        token,
        body: data,
      }),
    delete: (token: string, id: string) =>
      request<void>("DELETE", `/api/v1/reservations/${id}`, { token }),
    estimate: (token: string, data: EstimateRequest) =>
      request<PriceBreakdown>("POST", "/api/v1/reservations/estimate", {
        token,
        body: data,
      }),
  },
  stats: {
    summary: (token: string) =>
      request<SummaryResponse>("GET", "/api/v1/stats/summary", { token }),
    period: (token: string, from?: string, to?: string) =>
      request<{
        revenue: number;
        count: number;
        adults: number;
        children: number;
      }>("GET", "/api/v1/stats", { token, query: { from, to } }),
  },
};

// --- UI helpers ------------------------------------------------------------
export const SLOT_LABELS: Record<Slot, { name: string; time: string }> = {
  morning: { name: "Matinée", time: "10h – 14h" },
  afternoon: { name: "Après-midi", time: "14h – 18h" },
  evening: { name: "Soirée", time: "18h – 22h" },
  night: { name: "Nuit", time: "22h – 02h" },
};

export const STATUS_LABELS: Record<Status, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
};

export const FOOD_LABELS: Record<
  FoodFormula,
  { name: string; short: string; unit: number; per: "person" | "platter"; legacy?: boolean }
> = {
  platters_14: {
    name: "Plateaux à partager (ancien tarif)",
    short: "Plateaux",
    unit: 14,
    per: "person",
    legacy: true,
  },
  platters_30: {
    name: "Plateaux à partager",
    short: "Plateaux",
    unit: 30,
    per: "platter",
  },
  menu_19: {
    name: "Menu traditionnel",
    short: "Menu",
    unit: 19,
    per: "person",
  },
};

/** Compact one-line food summary used in lists, tooltips, etc. */
export function formatFoodSummary(
  r: Pick<Reservation, "food_formula" | "food_persons" | "food_platters">,
): string | null {
  if (!r.food_formula) return null;
  const label = FOOD_LABELS[r.food_formula];
  if (label.per === "platter") {
    const n = r.food_platters ?? 0;
    return `${label.short} × ${n} plateau${n !== 1 ? "x" : ""}`;
  }
  const suffix = label.legacy ? " (ancien)" : "";
  return `${label.short} × ${r.food_persons ?? 0} pers${suffix}`;
}

export const DEPOSIT_LABELS: Record<DepositMethod, string> = {
  wero: "Wero",
  revolut: "Revolut",
  paypal: "PayPal",
  cash: "Espèces",
  other: "Autre",
};

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  phone: "Téléphone",
  other: "Autre",
};
