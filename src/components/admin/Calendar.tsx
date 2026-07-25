import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ApiError,
  CONTACT_CHANNEL_LABELS,
  type ContactChannel,
  formatFoodSummary,
  type Reservation,
  type Slot,
  SLOT_LABELS,
  type Status,
  UnauthorizedError,
  api,
} from "@/lib/api";
import {
  AlertTriangle,
  CalendarDays,
  ChefHat,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Copy,
  Euro,
  HandCoins,
  History,
  Instagram,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Share2,
  ShoppingBag,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface CalendarProps {
  token: string;
  onUnauthorized: () => void;
  refreshKey: number;
  onEdit: (reservation: Reservation) => void;
  onViewCustomer: (customer: { name: string; phone: string }) => void;
}

const SLOT_ICONS: Record<Slot, typeof Sun> = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
  night: Sparkles,
};

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_NAMES_FULL = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
const MONTH_NAMES = [
  "janv.",
  "févr.",
  "mars",
  "avril",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];
const MONTH_NAMES_FULL = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// Slot registry used by the availability sharing algorithm.
// Night is intentionally excluded — the share message no longer offers
// it as a standard slot (per business decision), though custom-hour
// bookings can still surface late-hour windows via the algorithm below.
interface StandardSlot {
  label: string;
  startMin: number;
  endMin: number;
}
const STANDARD_SLOTS: readonly StandardSlot[] = [
  { label: "Matinée", startMin: 10 * 60, endMin: 14 * 60 },
  { label: "Après-midi", startMin: 14 * 60, endMin: 18 * 60 },
  { label: "Soirée", startMin: 18 * 60, endMin: 22 * 60 },
];
// Day window used by the availability computation. Late hours are still
// eligible for custom windows (e.g. 20h30-00h30) even though "Nuit" as a
// standard slot is retired.
const DAY_START_MIN = 10 * 60; // 10h
const DAY_END_MIN = 26 * 60; // 02h next day
const SLOT_LEN_MIN = 4 * 60; // 4h
const CLEANUP_BUFFER_MIN = 30; // 30 min buffer after each booking
// If a residual free window starts at or after 22h AND doesn't match any
// standard slot, treat it as the retired Nuit slot and drop it.
const NIGHT_ZONE_MIN = 22 * 60;

const CHANNEL_ICONS: Record<ContactChannel, typeof Phone> = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  phone: Phone,
  other: MoreHorizontal,
};

const STATUS_COLORS: Record<
  Status,
  { dot: string; pill: string; text: string; strip: string }
> = {
  confirmed: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    text: "text-emerald-400",
    strip: "bg-emerald-400",
  },
  pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    text: "text-amber-400",
    strip: "bg-amber-400",
  },
  cancelled: {
    dot: "bg-red-400/60",
    pill: "bg-red-500/10 border-red-500/20 text-red-400",
    text: "text-red-400",
    strip: "bg-red-400/60",
  },
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7; // Mon=1..Sun=7
  d.setDate(d.getDate() - (day - 1));
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1, 0, 0, 0, 0);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Build the 42-cell (6×7) grid starting Monday of the week containing the 1st of `monthStart`. */
function buildMonthGrid(monthStart: Date): Date[] {
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekHeader(monday: Date): string {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  if (sameMonth) {
    return `${monday.getDate()} – ${sunday.getDate()} ${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]} – ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

function formatMonthHeader(monthStart: Date): string {
  const name = MONTH_NAMES[monthStart.getMonth()]!;
  return `${name.charAt(0).toUpperCase() + name.slice(1)} ${monthStart.getFullYear()}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

/** Compact FR hour: `10h`, `14h30`. Tolerant to empty input. */
function shortHour(iso: string): string {
  const t = formatTime(iso);
  if (!t) return "";
  const [h, m] = t.split(":");
  return m === "00" ? `${h}h` : `${h}h${m}`;
}

/** First whitespace-delimited token — used as a compact display name. */
function firstToken(name: string): string {
  const trimmed = name.trim();
  const first = trimmed.split(/\s+/)[0];
  return first && first.length > 0 ? first : trimmed;
}

interface DayBucket {
  date: Date;
  bySlot: Partial<Record<Slot, Reservation[]>>;
  all: Reservation[];
}

function bucketByDay(monday: Date, reservations: Reservation[]): DayBucket[] {
  const days: DayBucket[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    days.push({ date: d, bySlot: {}, all: [] });
  }
  for (const r of reservations) {
    const start = new Date(r.start_at);
    const dayIndex = days.findIndex((bucket) => isSameDay(bucket.date, start));
    if (dayIndex === -1) continue;
    const bucket = days[dayIndex]!;
    bucket.all.push(r);
    // Takeaway reservations have no slot — they still appear in bucket.all
    // (used by the day listing / stats) but are skipped from the slot map
    // (used by the Aperçu grid and availability computation).
    if (r.slot) {
      if (!bucket.bySlot[r.slot]) bucket.bySlot[r.slot] = [];
      bucket.bySlot[r.slot]!.push(r);
    }
  }
  return days;
}

// --- Availability sharing ---------------------------------------------------

/** Monday-based day index: 0 = Monday, 6 = Sunday. */
function dayIndexMondayBased(d: Date): number {
  const js = d.getDay(); // 0 = Sun, 1..6 = Mon..Sat
  return js === 0 ? 6 : js - 1;
}

function formatDayLong(d: Date): string {
  return `${DAY_NAMES_FULL[dayIndexMondayBased(d)]} ${d.getDate()} ${MONTH_NAMES_FULL[d.getMonth()]}`;
}

function formatWeekRangeLong(monday: Date): string {
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `du ${monday.getDate()} au ${sunday.getDate()} ${MONTH_NAMES_FULL[monday.getMonth()]}`;
  }
  return `du ${monday.getDate()} ${MONTH_NAMES_FULL[monday.getMonth()]} au ${sunday.getDate()} ${MONTH_NAMES_FULL[sunday.getMonth()]}`;
}

/** Minutes since local midnight for a wall-clock time. */
function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** "10h" / "14h30" / "00h30" — clock time from minutes past midnight (may
 * exceed 24h to represent post-midnight late-night slots). */
function formatMinutes(min: number): string {
  const total = min % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

interface AvailWindow {
  startMin: number;
  endMin: number;
}
interface AvailLine {
  label: string | null; // "Matinée", "Après-midi", … or null for custom
  startMin: number;
  endMin: number;
}

/** Convert a day's non-cancelled reservations to sorted [start, end] intervals
 * in minutes-past-midnight of that day. Handles bookings that cross midnight
 * (endMin > 24*60). */
function bookingsToIntervals(bucket: DayBucket): AvailWindow[] {
  return bucket.all
    .filter((r) => r.status !== "cancelled")
    .map((r) => {
      const s = new Date(r.start_at);
      const e = new Date(r.end_at);
      const startMin = minutesOfDay(s);
      let endMin = minutesOfDay(e);
      // End earlier than start → crossed midnight; also handle end date on next day
      if (endMin <= startMin) endMin += 24 * 60;
      return { startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin);
}

/** Compute the contiguous free windows in a day, given its bookings.
 * Each booking is expanded by CLEANUP_BUFFER_MIN afterwards. */
function computeFreeWindows(intervals: AvailWindow[]): AvailWindow[] {
  const free: AvailWindow[] = [];
  let cursor = DAY_START_MIN;
  for (const b of intervals) {
    if (b.startMin > cursor) {
      free.push({ startMin: cursor, endMin: b.startMin });
    }
    cursor = Math.max(cursor, b.endMin + CLEANUP_BUFFER_MIN);
  }
  if (cursor < DAY_END_MIN) {
    free.push({ startMin: cursor, endMin: DAY_END_MIN });
  }
  return free;
}

/** For a single free window, emit displayable lines: standard slots that
 * fit fully into it (with their canonical name) plus, at most, one custom
 * 4h chunk from any remaining time. Late-hour residuals in the retired
 * Nuit zone (starting ≥ 22h without matching a slot) are silently dropped. */
function processFreeWindow(w: AvailWindow): AvailLine[] {
  const items: AvailLine[] = [];
  let cur = w.startMin;
  for (const slot of STANDARD_SLOTS) {
    if (cur <= slot.startMin && w.endMin >= slot.endMin) {
      items.push({ label: slot.label, startMin: slot.startMin, endMin: slot.endMin });
      cur = slot.endMin;
    }
  }
  if (w.endMin - cur >= SLOT_LEN_MIN && cur < NIGHT_ZONE_MIN) {
    items.push({
      label: null,
      startMin: cur,
      endMin: Math.min(w.endMin, cur + SLOT_LEN_MIN),
    });
  }
  return items;
}

/**
 * Build the WhatsApp-friendly availability message for a week. Days strictly
 * before `today` (00:00) are skipped so a mid-week share only lists the days
 * still in play.
 *
 * Availability model:
 * - Day = [10h, 02h next day] — 16h continuous, but the retired "Nuit" fixed
 *   slot is never offered on its own.
 * - Cancelled reservations are ignored (slot returns to free).
 * - Each booking blocks its [start, end] plus CLEANUP_BUFFER_MIN (30 min)
 *   afterwards, so the next available window starts 30 min after checkout.
 * - Free windows ≥ 4h are labelled as standard slots when they fully cover
 *   Matinée / Après-midi / Soirée, otherwise as a raw "20h30-00h30" range.
 */
function buildDispoMessage(monday: Date, days: DayBucket[], today: Date): string {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const upcoming = days.filter((b) => {
    const d = new Date(b.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= todayStart.getTime();
  });
  if (upcoming.length === 0) {
    return `Semaine ${formatWeekRangeLong(monday)} — entièrement passée.`;
  }

  const lines: string[] = [];
  lines.push(`Dispos semaine ${formatWeekRangeLong(monday)} 🏊`);
  lines.push("");

  for (const bucket of upcoming) {
    const intervals = bookingsToIntervals(bucket);
    const free = computeFreeWindows(intervals);
    const displayItems: AvailLine[] = [];
    for (const w of free) displayItems.push(...processFreeWindow(w));

    const dayLabel = formatDayLong(bucket.date);
    if (displayItems.length === 0) {
      lines.push(`*${dayLabel}* — complet`);
    } else {
      lines.push(`*${dayLabel}*`);
      for (const item of displayItems) {
        const startStr = formatMinutes(item.startMin);
        const endStr = formatMinutes(item.endMin);
        if (item.label) {
          lines.push(`✓ ${item.label} (${startStr}-${endStr})`);
        } else {
          lines.push(`✓ ${startStr}-${endStr}`);
        }
      }
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n+$/, "");
}

export function Calendar({
  token,
  onUnauthorized,
  refreshKey,
  onEdit,
  onViewCustomer,
}: CalendarProps) {
  const [viewMode, setViewMode] = useState<"overview" | "week" | "month">("week");
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  // The day the user clicked in month view — the matching week bucket
  // scrolls into view and gets a one-shot glow. Cleared after the
  // animation duration so the effect doesn't re-run on the next render.
  const [flashDate, setFlashDate] = useState<Date | null>(null);
  const flashCellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!flashDate) return;
    const scrollTimer = setTimeout(() => {
      flashCellRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 60);
    const clearTimer = setTimeout(() => setFlashDate(null), 2400);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [flashDate]);

  // Range fetched depends on the active view. `overview` shares the same
  // 7-day window as `week` — both navigate via `monday`.
  const range = useMemo(() => {
    if (viewMode === "month") {
      const grid = buildMonthGrid(month);
      return { from: grid[0]!, to: grid[grid.length - 1]! };
    }
    return { from: monday, to: addDays(monday, 6) };
  }, [viewMode, monday, month]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.reservations
      .list(token, { from: isoDate(range.from), to: isoDate(range.to) })
      .then((res) => setReservations(res.reservations))
      .catch((err) => {
        if (err instanceof UnauthorizedError) onUnauthorized();
        else if (err instanceof ApiError) setError(err.message);
        else setError("Erreur de chargement.");
      })
      .finally(() => setLoading(false));
  }, [token, range.from, range.to, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const days = useMemo(() => bucketByDay(monday, reservations), [monday, reservations]);
  const today = useMemo(() => new Date(), []);
  const isCurrentWeek = useMemo(
    () => isSameDay(monday, startOfWeek(today)),
    [monday, today],
  );
  const isCurrentMonth = useMemo(
    () => isSameMonth(month, startOfMonth(today)),
    [month, today],
  );

  // Stats scope: in week mode the fetched range IS the week, so all rows count.
  // In month mode the range is 42 days (grid) which SPILLS into adjacent months
  // — filter to the displayed month to avoid double-counting neighbouring resas.
  const statsScope = useMemo(() => {
    if (viewMode !== "month") return reservations;
    return reservations.filter((r) => {
      const d = new Date(r.start_at);
      return (
        d.getFullYear() === month.getFullYear() &&
        d.getMonth() === month.getMonth()
      );
    });
  }, [viewMode, month, reservations]);

  const weekStats = useMemo(() => {
    const confirmed = statsScope.filter((r) => r.status === "confirmed");
    const pending = statsScope.filter((r) => r.status === "pending");
    return {
      revenue: confirmed.reduce((s, r) => s + Number(r.total_price), 0),
      tips: confirmed.reduce((s, r) => s + Number(r.tip_amount), 0),
      confirmedCount: confirmed.length,
      pendingCount: pending.length,
    };
  }, [statsScope]);

  // Touch swipe handling — basic, no library.
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    if (endX === null) return;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    setMonday((m) => addDays(m, delta < 0 ? 7 : -7));
  };

  return (
    <div className="space-y-4">
      {/* Header: view toggle + navigation */}
      <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl p-4 sm:p-5">
        {/* View toggle */}
        <div className="mb-3 flex justify-center">
          <div className="inline-flex p-1 rounded-xl bg-gray-800/50 border border-white/[0.06]">
            {(
              [
                { v: "overview", label: "Aperçu" },
                { v: "week", label: "Semaine" },
                { v: "month", label: "Mois" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setViewMode(opt.v)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  viewMode === opt.v
                    ? "bg-[#02BAD6] text-white shadow"
                    : "text-gray-400 hover:text-white",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (viewMode === "month") setMonth((m) => addMonths(m, -1));
              else setMonday((m) => addDays(m, -7));
            }}
            className="w-10 h-10 rounded-xl border border-white/[0.08] text-gray-300 hover:border-[#02BAD6] hover:text-[#02BAD6] transition-colors flex items-center justify-center"
            aria-label={viewMode === "month" ? "Mois précédent" : "Semaine précédente"}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-0.5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>
                {viewMode === "month"
                  ? "Mois"
                  : viewMode === "overview"
                    ? "Aperçu"
                    : "Semaine"}
              </span>
            </div>
            <p className="text-white font-semibold text-sm sm:text-base truncate">
              {viewMode === "month" ? formatMonthHeader(month) : formatWeekHeader(monday)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (viewMode === "month") setMonth((m) => addMonths(m, 1));
              else setMonday((m) => addDays(m, 7));
            }}
            className="w-10 h-10 rounded-xl border border-white/[0.08] text-gray-300 hover:border-[#02BAD6] hover:text-[#02BAD6] transition-colors flex items-center justify-center"
            aria-label={viewMode === "month" ? "Mois suivant" : "Semaine suivante"}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {viewMode === "week" && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#02BAD6]/10 border border-[#02BAD6]/20 text-[#02BAD6] text-xs font-medium hover:bg-[#02BAD6]/15 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Partager les créneaux dispos
            </button>
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={() => setMonday(startOfWeek(today))}
                className="text-xs text-[#02BAD6] hover:text-[#00d4f5] underline"
              >
                Revenir à aujourd'hui
              </button>
            )}
          </div>
        )}
        {viewMode === "overview" && !isCurrentWeek && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setMonday(startOfWeek(today))}
              className="text-xs text-[#02BAD6] hover:text-[#00d4f5] underline"
            >
              Revenir à aujourd'hui
            </button>
          </div>
        )}
        {viewMode === "month" && !isCurrentMonth && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setMonth(startOfMonth(today))}
              className="text-xs text-[#02BAD6] hover:text-[#00d4f5] underline"
            >
              Revenir au mois en cours
            </button>
          </div>
        )}

        {!loading && statsScope.length > 0 && (
          <div
            className={cn(
              "mt-5 pt-5 border-t border-white/[0.06] grid grid-cols-2 gap-3",
              weekStats.tips > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3",
            )}
          >
            <StatTile
              icon={Euro}
              label="CA confirmé"
              value={`${weekStats.revenue.toFixed(0)} €`}
              color="cyan"
              hero
            />
            <StatTile
              icon={CircleCheck}
              label="Confirmées"
              value={String(weekStats.confirmedCount)}
              color="emerald"
            />
            <StatTile
              icon={Clock}
              label="En attente"
              value={String(weekStats.pendingCount)}
              color="amber"
            />
            {weekStats.tips > 0 && (
              <StatTile
                icon={HandCoins}
                label="Pourboires"
                value={`+${weekStats.tips.toFixed(0)} €`}
                color="emerald"
              />
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* --- OVERVIEW view (simple, read-only visualisation) --- */}
      {viewMode === "overview" && (
        <OverviewGrid days={days} today={today} loading={loading} />
      )}

      {/* --- MONTH view --- */}
      {viewMode === "month" && (
        <>
          <MonthGrid
            monthStart={month}
            reservations={reservations}
            today={today}
            loading={loading}
            onDayClick={(date) => {
              setFlashDate(date);
              setViewMode("week");
              setMonday(startOfWeek(date));
            }}
          />
          {!loading && (
            <MonthDayList
              monthStart={month}
              reservations={statsScope}
              onSelect={(r) => setSelected(r)}
              today={today}
            />
          )}
        </>
      )}

      {/* --- WEEK view --- */}
      {viewMode === "week" && (
      <div
        className="space-y-2.5 select-none touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-gray-900/50 border border-white/[0.06] animate-pulse"
              />
            ))
          : days.map((bucket, idx) => {
              const isToday = isSameDay(bucket.date, today);
              const isFlash =
                flashDate !== null && isSameDay(bucket.date, flashDate);
              const hasReservations = bucket.all.length > 0;
              const dayName = DAY_NAMES[idx];
              return (
                <motion.div
                  key={bucket.date.toISOString()}
                  ref={isFlash ? flashCellRef : undefined}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.02 }}
                  className={cn(
                    "rounded-2xl border overflow-hidden",
                    isToday
                      ? "bg-[#02BAD6]/[0.04] border-[#02BAD6]/30"
                      : "bg-gray-900/40 border-white/[0.06]",
                    isFlash && "flash-day-highlight",
                  )}
                >
                  {/* Day header */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div
                      className={cn(
                        "shrink-0 w-12 text-center",
                        isToday ? "text-[#02BAD6]" : "text-gray-300",
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">
                        {dayName}
                      </p>
                      <p className="font-bold text-xl leading-tight">
                        {bucket.date.getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <HourChips reservations={bucket.all} />
                    </div>
                    {hasReservations && (
                      <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                        {bucket.all.length}
                      </span>
                    )}
                  </div>

                  {/* Reservations under this day */}
                  {hasReservations && (
                    <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
                      {bucket.all.map((r) => {
                        const SlotIcon = r.slot ? SLOT_ICONS[r.slot] : ShoppingBag;
                        const colors = STATUS_COLORS[r.status];
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelected(r)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
                          >
                            <SlotIcon
                              className={cn(
                                "w-4 h-4 shrink-0",
                                r.kind === "takeaway"
                                  ? "text-[#02BAD6]"
                                  : "text-gray-500",
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500 font-mono">
                                  {r.kind === "takeaway"
                                    ? `retrait ${formatTime(r.start_at)}`
                                    : `${formatTime(r.start_at)}–${formatTime(r.end_at)}`}
                                </span>
                                <span
                                  className={cn(
                                    "inline-block w-1 h-1 rounded-full",
                                    colors.dot,
                                  )}
                                />
                                <span className="text-sm text-gray-200 truncate">
                                  {r.customer_name}
                                </span>
                                {r.kind === "takeaway" && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-[#02BAD6]/10 border border-[#02BAD6]/20 text-[#02BAD6] text-[10px] font-semibold uppercase tracking-wider">
                                    Emporter
                                  </span>
                                )}
                                {r.contact_channel && (() => {
                                  const CIcon = CHANNEL_ICONS[r.contact_channel];
                                  return (
                                    <CIcon
                                      className="w-3.5 h-3.5 text-gray-500 shrink-0"
                                      aria-label={
                                        CONTACT_CHANNEL_LABELS[r.contact_channel]
                                      }
                                    />
                                  );
                                })()}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {r.kind === "takeaway"
                                  ? "Commande à emporter"
                                  : `${r.adults}A${r.children > 0 ? ` + ${r.children}E` : ""}${r.babies > 0 ? ` + ${r.babies}B` : ""}`}{" "}
                                ·{" "}
                                {Number(r.total_price).toFixed(0)}€
                                {r.food_formula && " · repas"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
      </div>
      )}

      {/* Share availability modal */}
      <AnimatePresence>
        {shareOpen && (
          <ShareAvailabilityModal
            message={buildDispoMessage(monday, days, today)}
            onClose={() => setShareOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <DetailModal
            key={selected.id}
            reservation={selected}
            token={token}
            onClose={() => setSelected(null)}
            onChanged={(updated) => {
              if (updated) {
                setReservations((rs) =>
                  rs.map((r) => (r.id === updated.id ? updated : r)),
                );
                setSelected(updated);
              } else {
                // deleted
                setReservations((rs) => rs.filter((r) => r.id !== selected.id));
                setSelected(null);
              }
            }}
            onEdit={() => {
              const r = selected;
              setSelected(null);
              onEdit(r);
            }}
            onViewCustomer={() => {
              const r = selected;
              setSelected(null);
              onViewCustomer({ name: r.customer_name, phone: r.customer_phone });
            }}
            onUnauthorized={onUnauthorized}
          />
        )}
      </AnimatePresence>

      {loading && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        </div>
      )}
    </div>
  );
}

function DetailModal({
  reservation: r,
  token,
  onClose,
  onChanged,
  onEdit,
  onViewCustomer,
  onUnauthorized,
}: {
  reservation: Reservation;
  token: string;
  onClose: () => void;
  onChanged: (updated: Reservation | null) => void;
  onEdit: () => void;
  onViewCustomer: () => void;
  onUnauthorized: () => void;
}) {
  const colors = STATUS_COLORS[r.status];
  const [updatingStatus, setUpdatingStatus] = useState<Status | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  async function changeStatus(next: Status) {
    if (next === r.status) return;
    setActionError("");
    setUpdatingStatus(next);
    try {
      const updated = await api.reservations.update(token, r.id, { status: next });
      onChanged(updated);
    } catch (err) {
      if (err instanceof UnauthorizedError) onUnauthorized();
      else if (err instanceof ApiError) setActionError(err.message);
      else setActionError("Erreur lors du changement de statut.");
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleDelete() {
    setActionError("");
    setDeleting(true);
    try {
      await api.reservations.delete(token, r.id);
      onChanged(null);
    } catch (err) {
      if (err instanceof UnauthorizedError) onUnauthorized();
      else if (err instanceof ApiError) setActionError(err.message);
      else setActionError("Erreur lors de la suppression.");
      setDeleting(false);
    }
  }

  const statusOptions: { value: Status; label: string; icon: typeof Check }[] = [
    { value: "pending", label: "En attente", icon: Clock },
    { value: "confirmed", label: "Confirmer", icon: Check },
    { value: "cancelled", label: "Annuler", icon: X },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gray-900 border border-white/[0.08] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {r.kind === "takeaway"
                ? `À emporter · retrait ${formatTime(r.start_at)}`
                : r.slot
                  ? `${SLOT_LABELS[r.slot].name} · ${formatTime(r.start_at)}–${formatTime(r.end_at)}`
                  : `${formatTime(r.start_at)}–${formatTime(r.end_at)}`}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-semibold text-white">{r.customer_name}</h3>
              <button
                type="button"
                onClick={onViewCustomer}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#02BAD6]/10 text-[#02BAD6] hover:bg-[#02BAD6]/20 border border-[#02BAD6]/20 transition-colors uppercase tracking-wider"
                title="Voir l'historique de ce client"
              >
                <History className="w-3 h-3" />
                Historique
              </button>
            </div>
            {r.customer_phone && (
              <a
                href={`tel:${r.customer_phone}`}
                className="text-sm text-[#02BAD6] hover:text-[#00d4f5] underline"
              >
                {r.customer_phone}
              </a>
            )}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
              colors.pill,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
            {r.status === "confirmed"
              ? "Confirmée"
              : r.status === "cancelled"
                ? "Annulée"
                : "En attente"}
          </span>
        </div>

        <div className="space-y-2 text-sm text-gray-300">
          <Row label="Personnes" value={`${r.adults} adulte${r.adults !== 1 ? "s" : ""}${r.children > 0 ? ` + ${r.children} enfant${r.children !== 1 ? "s" : ""}` : ""}${r.babies > 0 ? ` + ${r.babies} bébé${r.babies !== 1 ? "s" : ""}` : ""}`} />
          {r.contact_channel && (
            <Row label="Canal" value={CONTACT_CHANNEL_LABELS[r.contact_channel]} />
          )}
          <Row label="Bassin" value={`${Number(r.base_price_pool).toFixed(2)} €`} />
          {r.food_formula && (
            <Row
              label="Repas"
              value={`${formatFoodSummary(r)}${
                r.food_children > 0 ? ` (dont ${r.food_children} enf. -50%)` : ""
              } = ${Number(r.food_price_total).toFixed(2)} €`}
            />
          )}
          {Number(r.extra_amount) > 0 && (
            <Row
              label="Supplément"
              value={`+${Number(r.extra_amount).toFixed(2)} €${r.extra_reason ? ` (${r.extra_reason})` : ""}`}
              valueClass="text-sky-400"
            />
          )}
          {Number(r.discount_amount) > 0 && (
            <Row
              label="Remise"
              value={`−${Number(r.discount_amount).toFixed(2)} €${r.discount_reason ? ` (${r.discount_reason})` : ""}`}
              valueClass="text-amber-400"
            />
          )}
          {Number(r.tip_amount) > 0 && (
            <Row
              label="Pourboire"
              value={`+${Number(r.tip_amount).toFixed(2)} €`}
              valueClass="text-emerald-400"
            />
          )}
          <div className="pt-2 mt-2 border-t border-white/[0.06]">
            <Row
              label="Total"
              value={`${Number(r.total_price).toFixed(2)} €`}
              valueClass="text-[#02BAD6] font-bold text-lg"
            />
          </div>
          {r.food_formula && (
            <Row
              label="Acompte"
              value={r.deposit_paid ? `Reçu (${r.deposit_method ?? "—"})` : "Non reçu"}
              valueClass={r.deposit_paid ? "text-emerald-400" : "text-gray-500"}
            />
          )}
          {r.notes && (
            <div className="pt-2">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{r.notes}</p>
            </div>
          )}
        </div>

        {/* Status segmented control */}
        <div className="mt-6 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Changer le statut
          </p>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-800/40 border border-white/[0.06]">
            {statusOptions.map((opt) => {
              const Icon = opt.icon;
              const active = r.status === opt.value;
              const loading = updatingStatus === opt.value;
              const c = STATUS_COLORS[opt.value];
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={active || updatingStatus !== null}
                  onClick={() => changeStatus(opt.value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                    active
                      ? cn(c.pill, "border")
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04]",
                    !active && updatingStatus !== null && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {actionError && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {actionError}
          </div>
        )}

        {/* Edit + Delete */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-3 rounded-xl bg-[#02BAD6]/10 border border-[#02BAD6]/30 text-[#02BAD6] hover:bg-[#02BAD6]/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Modifier
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-3 rounded-xl border border-white/[0.08] text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full px-4 py-2.5 rounded-xl text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          Fermer
        </button>

        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm rounded-t-3xl sm:rounded-3xl p-6"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Supprimer définitivement ?
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Pour annuler sans supprimer, utilise le bouton "Annuler" du statut.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-gray-300 hover:bg-white/[0.04] transition-colors text-sm font-medium"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={cn("text-sm text-gray-300 text-right", valueClass)}>{value}</span>
    </div>
  );
}

function ShareAvailabilityModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const [text, setText] = useState(message);
  const [copied, setCopied] = useState(false);

  useEffect(() => setText(message), [message]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API refused (permissions, http, older browser).
      // The textarea is editable + selectable so the admin can Ctrl+A / Ctrl+C manually.
    }
  }, [text]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gray-900 border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#02BAD6]/10 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-[#02BAD6]" />
            </div>
            <h3 className="text-white font-semibold text-sm">
              Partager les créneaux dispos
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">
            Modifie le texte si besoin, puis colle-le sur WhatsApp. Le format
            <span className="mx-1 px-1.5 rounded bg-gray-800/60 border border-white/[0.06] font-mono">
              *jour*
            </span>
            met le nom en gras dans WhatsApp.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="w-full bg-gray-800/60 border border-white/[0.08] text-gray-100 rounded-xl px-4 py-3 font-mono text-xs whitespace-pre focus:border-[#02BAD6] focus:ring-2 focus:ring-[#02BAD6]/20 focus:outline-none resize-y tabular-nums"
          />
        </div>
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-gray-300 hover:bg-white/[0.04] transition-colors text-sm"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={copy}
            className={cn(
              "px-4 py-2 rounded-xl text-white font-medium text-sm flex items-center gap-2 transition-colors",
              copied
                ? "bg-emerald-500 hover:bg-emerald-500"
                : "bg-[#02BAD6] hover:bg-[#00d4f5]",
            )}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copié
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier le message
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const STAT_COLORS = {
  cyan: { text: "text-[#02BAD6]", bg: "bg-[#02BAD6]/10" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10" },
} as const;

/**
 * Compact "dot + start hour" chips per reservation, colored by status.
 * Cancelled reservations are hidden. Sorted chronologically.
 * Answers "at a glance, what's booked today and when?" without misleading
 * (like the fixed 4 slot dots did when hours were customised).
 */
function HourChips({ reservations }: { reservations: Reservation[] }) {
  const chips = reservations
    .filter((r) => r.status !== "cancelled")
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  if (chips.length === 0) {
    return <span className="text-xs text-gray-600">—</span>;
  }

  return (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
      {chips.map((r) => {
        const d = new Date(r.start_at);
        const h = String(d.getHours()).padStart(2, "0");
        return (
          <span
            key={r.id}
            className="inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                STATUS_COLORS[r.status].dot,
              )}
            />
            <span className="text-[11px] text-gray-400 tabular-nums leading-none">
              {h}h
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Read-only "planner-style" weekly overview: 4 slot columns × 7 day rows.
 * No clicks, no edits — just a calm bird's-eye view. Free slots show a
 * dashed placeholder, booked slots show the customer's first name, actual
 * hours (useful when custom), guest count, and a chef-hat marker if food
 * was ordered. Cancelled reservations are hidden (treated as free).
 */
function OverviewGrid({
  days,
  today,
  loading,
}: {
  days: DayBucket[];
  today: Date;
  loading: boolean;
}) {
  const columns: {
    slot: Slot;
    label: string;
    hours: string;
    Icon: typeof Sun;
  }[] = [
    { slot: "morning", label: "Matinée", hours: "10 – 14h", Icon: Sun },
    { slot: "afternoon", label: "Après-midi", hours: "14 – 18h", Icon: Sunset },
    { slot: "evening", label: "Soirée", hours: "18 – 22h", Icon: Moon },
    { slot: "night", label: "Nuit", hours: "22 – 02h", Icon: Sparkles },
  ];

  if (loading) {
    return (
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "minmax(48px, auto) repeat(4, minmax(0, 1fr))",
        }}
      >
        <div />
        {columns.map((c) => (
          <div key={c.slot} className="h-12 rounded-lg bg-gray-900/50 animate-pulse" />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <Fragment key={i}>
            <div className="h-16 rounded bg-gray-900/40 animate-pulse" />
            {columns.map((c) => (
              <div
                key={c.slot}
                className="h-16 rounded-lg bg-gray-900/40 animate-pulse"
              />
            ))}
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "minmax(48px, auto) repeat(4, minmax(0, 1fr))",
        }}
      >
        {/* Corner spacer */}
        <div />
        {/* Slot column headers */}
        {columns.map(({ slot, label, hours, Icon }) => (
          <div
            key={slot}
            className="text-center py-1.5 sm:py-2 border-b border-white/[0.05]"
          >
            <Icon className="w-3.5 h-3.5 mx-auto text-gray-500 mb-0.5" />
            <p className="text-[10px] sm:text-xs font-semibold text-gray-300 leading-tight">
              {label}
            </p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 tabular-nums leading-tight">
              {hours}
            </p>
          </div>
        ))}

        {/* Day rows */}
        {days.map((bucket, dayIdx) => {
          const isToday = isSameDay(bucket.date, today);
          const takeawayCount = bucket.all.filter(
            (r) => r.kind === "takeaway" && r.status !== "cancelled",
          ).length;
          return (
            <Fragment key={bucket.date.toISOString()}>
              {/* Row label — day abbrev + date, cyan when today,
                  + takeaway count badge if any */}
              <div className="flex flex-col items-end justify-center pr-1 sm:pr-2">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-medium leading-none",
                    isToday ? "text-[#02BAD6]" : "text-gray-500",
                  )}
                >
                  {DAY_NAMES[dayIdx]}
                </span>
                <span
                  className={cn(
                    "text-lg sm:text-xl font-bold leading-none tabular-nums mt-0.5",
                    isToday ? "text-[#02BAD6]" : "text-gray-200",
                  )}
                >
                  {bucket.date.getDate()}
                </span>
                {takeawayCount > 0 && (
                  <span
                    className="mt-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-[#02BAD6]/10 border border-[#02BAD6]/20 text-[#02BAD6] text-[9px] font-medium tabular-nums leading-none"
                    aria-label={`${takeawayCount} commande${takeawayCount > 1 ? "s" : ""} à emporter`}
                  >
                    <ShoppingBag className="w-2.5 h-2.5" />
                    {takeawayCount}
                  </span>
                )}
              </div>

              {/* Slot cells */}
              {columns.map(({ slot }) => {
                const rs = (bucket.bySlot[slot] ?? [])
                  .filter((r) => r.status !== "cancelled")
                  .sort((a, b) => a.start_at.localeCompare(b.start_at));

                if (rs.length === 0) {
                  return (
                    <div
                      key={slot}
                      className={cn(
                        "rounded-lg border border-dashed min-h-[68px] sm:min-h-[80px]",
                        isToday
                          ? "bg-[#02BAD6]/[0.02] border-[#02BAD6]/10"
                          : "bg-gray-900/20 border-white/[0.05]",
                      )}
                    />
                  );
                }

                const first = rs[0]!;
                const overflow = rs.length - 1;
                const confirmed = first.status === "confirmed";
                return (
                  <div
                    key={slot}
                    className={cn(
                      "rounded-lg border min-h-[68px] sm:min-h-[80px] p-1.5 sm:p-2 flex flex-col justify-center overflow-hidden",
                      confirmed
                        ? "bg-emerald-500/[0.08] border-emerald-500/25"
                        : "bg-amber-500/[0.08] border-amber-500/25",
                    )}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={cn(
                          "text-[11px] sm:text-sm font-semibold truncate",
                          confirmed ? "text-emerald-300" : "text-amber-300",
                        )}
                      >
                        {firstToken(first.customer_name)}
                      </span>
                      {first.contact_channel && (() => {
                        const CIcon = CHANNEL_ICONS[first.contact_channel];
                        return (
                          <CIcon
                            className="w-3 h-3 shrink-0 text-gray-500"
                            aria-label={
                              CONTACT_CHANNEL_LABELS[first.contact_channel]
                            }
                          />
                        );
                      })()}
                      {first.food_formula && (
                        <ChefHat className="w-3 h-3 shrink-0 text-gray-400" />
                      )}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-gray-400 tabular-nums leading-tight mt-0.5">
                      {shortHour(first.start_at)}-{shortHour(first.end_at)}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-gray-400 leading-tight">
                      {first.adults + first.children} pers
                    </div>
                    {overflow > 0 && (
                      <div className="text-[9px] text-gray-500 leading-none mt-0.5">
                        +{overflow} autre{overflow > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 flex-wrap text-[10px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
          Confirmé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50" />
          En attente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-white/20" />
          Libre
        </span>
        <span className="flex items-center gap-1">
          <ChefHat className="w-3 h-3" /> Repas commandé
        </span>
      </div>
    </div>
  );
}

function MonthDayList({
  monthStart,
  reservations,
  onSelect,
  today,
}: {
  monthStart: Date;
  reservations: Reservation[];
  onSelect: (r: Reservation) => void;
  today: Date;
}) {
  // Group by day, keep only days that have at least one non-cancelled resa.
  const byDay = useMemo(() => {
    const m = new Map<string, { date: Date; rows: Reservation[] }>();
    for (const r of reservations) {
      if (r.status === "cancelled") continue;
      const d = new Date(r.start_at);
      if (
        d.getFullYear() !== monthStart.getFullYear() ||
        d.getMonth() !== monthStart.getMonth()
      ) {
        continue;
      }
      const dayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const key = dayDate.toISOString();
      const bucket = m.get(key) ?? { date: dayDate, rows: [] };
      bucket.rows.push(r);
      m.set(key, bucket);
    }
    return Array.from(m.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [reservations, monthStart]);

  if (byDay.length === 0) {
    return (
      <div className="mt-4 text-center text-sm text-gray-500 py-6">
        Aucune réservation ce mois-ci.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-2.5">
      <p className="px-1 text-[11px] uppercase tracking-wider text-gray-500 font-medium">
        Détail des jours réservés
      </p>
      {byDay.map(({ date, rows }) => {
        const isToday = isSameDay(date, today);
        const dayNumIndex = ((date.getDay() || 7) - 1) as
          | 0
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6;
        rows.sort(
          (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        );
        return (
          <div
            key={date.toISOString()}
            className={cn(
              "rounded-2xl border overflow-hidden",
              isToday
                ? "bg-[#02BAD6]/[0.04] border-[#02BAD6]/30"
                : "bg-gray-900/40 border-white/[0.06]",
            )}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div
                className={cn(
                  "shrink-0 w-12 text-center",
                  isToday ? "text-[#02BAD6]" : "text-gray-300",
                )}
              >
                <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">
                  {DAY_NAMES[dayNumIndex]}
                </p>
                <p className="font-bold text-xl leading-tight">{date.getDate()}</p>
              </div>
              <div className="flex-1 min-w-0">
                <HourChips reservations={rows} />
              </div>
              <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                {rows.length}
              </span>
            </div>
            <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
              {rows.map((r) => {
                const SlotIcon = r.slot ? SLOT_ICONS[r.slot] : ShoppingBag;
                const c = STATUS_COLORS[r.status];
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelect(r)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <SlotIcon className="w-4 h-4 text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 font-mono">
                          {formatTime(r.start_at)}–{formatTime(r.end_at)}
                        </span>
                        <span className={cn("inline-block w-1 h-1 rounded-full", c.dot)} />
                        <span className="text-sm text-gray-200 truncate">
                          {r.customer_name}
                        </span>
                        {r.contact_channel && (() => {
                          const CIcon = CHANNEL_ICONS[r.contact_channel];
                          return (
                            <CIcon
                              className="w-3.5 h-3.5 text-gray-500 shrink-0"
                              aria-label={
                                CONTACT_CHANNEL_LABELS[r.contact_channel]
                              }
                            />
                          );
                        })()}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.adults}A{r.children > 0 ? ` + ${r.children}E` : ""}
                        {r.babies > 0 ? ` + ${r.babies}B` : ""} ·{" "}
                        {Number(r.total_price).toFixed(0)}€
                        {r.food_formula && " · repas"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  monthStart,
  reservations,
  today,
  loading,
  onDayClick,
}: {
  monthStart: Date;
  reservations: Reservation[];
  today: Date;
  loading: boolean;
  onDayClick: (date: Date) => void;
}) {
  const grid = useMemo(() => buildMonthGrid(monthStart), [monthStart]);

  // Index reservations by ISO date (local) for O(1) lookup per cell.
  const byDay = useMemo(() => {
    const m = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const d = new Date(r.start_at);
      const key = isoDate(
        new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      );
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    }
    return m;
  }, [reservations]);

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[76px] sm:min-h-[104px] rounded-lg bg-gray-900/50 border border-white/[0.06] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const MAX_VISIBLE = 3;

  return (
    <div>
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {grid.map((date) => {
          const inMonth = isSameMonth(date, monthStart);
          const isToday = isSameDay(date, today);
          const key = isoDate(date);
          const list = (byDay.get(key) ?? [])
            .filter((r) => r.status !== "cancelled")
            .sort((a, b) => a.start_at.localeCompare(b.start_at));
          const visible = list.slice(0, MAX_VISIBLE);
          const overflow = list.length - visible.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(date)}
              className={cn(
                "min-h-[76px] sm:min-h-[104px] rounded-lg border p-1 sm:p-1.5 flex flex-col transition-colors text-left overflow-hidden",
                inMonth
                  ? "bg-gray-900/40 border-white/[0.06] hover:border-[#02BAD6]/40"
                  : "bg-gray-900/20 border-white/[0.03] text-gray-600",
                isToday && "bg-[#02BAD6]/[0.06] border-[#02BAD6]/40",
              )}
            >
              <span
                className={cn(
                  "text-[11px] sm:text-xs font-semibold tabular-nums leading-none mb-1",
                  isToday
                    ? "text-[#02BAD6]"
                    : inMonth
                      ? "text-gray-200"
                      : "text-gray-600",
                )}
              >
                {date.getDate()}
              </span>

              {list.length > 0 && (
                <div className="flex-1 flex flex-col gap-0.5 min-w-0 w-full">
                  {visible.map((r) => {
                    const c = STATUS_COLORS[r.status];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-1 min-w-0 leading-tight text-[9px] sm:text-[10px]"
                      >
                        <span
                          className={cn("w-0.5 h-2.5 rounded-sm shrink-0", c.strip)}
                        />
                        <span className="text-gray-400 tabular-nums shrink-0">
                          {shortHour(r.start_at)}
                        </span>
                        <span className={cn("truncate", c.text)}>
                          {firstToken(r.customer_name)}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-[9px] text-gray-500 leading-none mt-auto pl-1.5">
                      +{overflow}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
  hero = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: keyof typeof STAT_COLORS;
  /** Full-width on mobile, bigger value font — for the headline metric (CA). */
  hero?: boolean;
}) {
  const c = STAT_COLORS[color];
  return (
    <div
      className={cn(
        "px-4 py-3.5 rounded-xl bg-gray-800/40 border border-white/[0.04]",
        hero && "col-span-2 sm:col-span-1",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            c.bg,
          )}
        >
          <Icon className={cn("w-4 h-4", c.text)} />
        </div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 leading-none truncate font-medium">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "font-bold leading-none tabular-nums",
          hero ? "text-3xl" : "text-2xl",
          c.text,
        )}
      >
        {value}
      </p>
    </div>
  );
}
