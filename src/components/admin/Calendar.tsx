import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ApiError,
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
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Copy,
  Euro,
  HandCoins,
  History,
  Loader2,
  Pencil,
  Share2,
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

const ALL_SLOTS: Slot[] = ["morning", "afternoon", "evening", "night"];
const SLOT_HOUR_LABELS: Record<Slot, string> = {
  morning: "Matinée (10h-14h)",
  afternoon: "Après-midi (14h-18h)",
  evening: "Soirée (18h-22h)",
  night: "Nuit (22h-02h)",
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
    if (!bucket.bySlot[r.slot]) bucket.bySlot[r.slot] = [];
    bucket.bySlot[r.slot]!.push(r);
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

/**
 * Build the WhatsApp-friendly availability message for a week. Days strictly
 * before `today` (00:00) are skipped so a mid-week share only lists the days
 * still in play. Slots with a `pending`/`confirmed` reservation count as
 * booked; `cancelled` rows are ignored (slot goes back to free).
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

  let allComplet = true;
  for (const bucket of upcoming) {
    const busySlots = new Set<Slot>();
    for (const slot of ALL_SLOTS) {
      const rs = bucket.bySlot[slot] ?? [];
      if (rs.some((r) => r.status !== "cancelled")) busySlots.add(slot);
    }
    const freeSlots = ALL_SLOTS.filter((s) => !busySlots.has(s));
    const dayLabel = formatDayLong(bucket.date);
    if (freeSlots.length === 0) {
      lines.push(`*${dayLabel}* — complet`);
    } else {
      allComplet = false;
      lines.push(`*${dayLabel}*`);
      for (const s of freeSlots) lines.push(`✓ ${SLOT_HOUR_LABELS[s]}`);
    }
    lines.push("");
  }

  lines.push(
    allComplet
      ? "Semaine complète pour l'instant — dis-moi si tu veux être sur liste d'attente 🌸"
      : "Fais-moi signe pour bloquer un créneau 🌸",
  );
  return lines.join("\n");
}

export function Calendar({
  token,
  onUnauthorized,
  refreshKey,
  onEdit,
  onViewCustomer,
}: CalendarProps) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Range fetched depends on the active view.
  const range = useMemo(() => {
    if (viewMode === "week") {
      return { from: monday, to: addDays(monday, 6) };
    }
    const grid = buildMonthGrid(month);
    return { from: grid[0]!, to: grid[grid.length - 1]! };
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
    if (viewMode === "week") return reservations;
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
            {(["week", "month"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  viewMode === m
                    ? "bg-[#02BAD6] text-white shadow"
                    : "text-gray-400 hover:text-white",
                )}
              >
                {m === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (viewMode === "week") setMonday((m) => addDays(m, -7));
              else setMonth((m) => addMonths(m, -1));
            }}
            className="w-10 h-10 rounded-xl border border-white/[0.08] text-gray-300 hover:border-[#02BAD6] hover:text-[#02BAD6] transition-colors flex items-center justify-center"
            aria-label={viewMode === "week" ? "Semaine précédente" : "Mois précédent"}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-0.5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{viewMode === "week" ? "Semaine" : "Mois"}</span>
            </div>
            <p className="text-white font-semibold text-sm sm:text-base truncate">
              {viewMode === "week" ? formatWeekHeader(monday) : formatMonthHeader(month)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (viewMode === "week") setMonday((m) => addDays(m, 7));
              else setMonth((m) => addMonths(m, 1));
            }}
            className="w-10 h-10 rounded-xl border border-white/[0.08] text-gray-300 hover:border-[#02BAD6] hover:text-[#02BAD6] transition-colors flex items-center justify-center"
            aria-label={viewMode === "week" ? "Semaine suivante" : "Mois suivant"}
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

      {/* --- MONTH view --- */}
      {viewMode === "month" && (
        <>
          <MonthGrid
            monthStart={month}
            reservations={reservations}
            today={today}
            loading={loading}
            onDayClick={(date) => {
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
              const hasReservations = bucket.all.length > 0;
              const dayName = DAY_NAMES[idx];
              return (
                <motion.div
                  key={bucket.date.toISOString()}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.02 }}
                  className={cn(
                    "rounded-2xl border overflow-hidden",
                    isToday
                      ? "bg-[#02BAD6]/[0.04] border-[#02BAD6]/30"
                      : "bg-gray-900/40 border-white/[0.06]",
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
                        const SlotIcon = SLOT_ICONS[r.slot];
                        const colors = STATUS_COLORS[r.status];
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelected(r)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
                          >
                            <SlotIcon className="w-4 h-4 text-gray-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500 font-mono">
                                  {formatTime(r.start_at)}–{formatTime(r.end_at)}
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
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {r.adults}A
                                {r.children > 0 ? ` + ${r.children}E` : ""}
                                {r.babies > 0 ? ` + ${r.babies}B` : ""} ·{" "}
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
              {SLOT_LABELS[r.slot].name} · {formatTime(r.start_at)}–{formatTime(r.end_at)}
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
                const SlotIcon = SLOT_ICONS[r.slot];
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
