import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ApiError,
  type FoodFormula,
  type Reservation,
  SLOT_LABELS,
  type Slot,
  UnauthorizedError,
  api,
} from "@/lib/api";
import {
  ArrowRight,
  CalendarDays,
  ChefHat,
  Euro,
  HandCoins,
  Loader2,
  Phone,
  TrendingUp,
  User,
} from "lucide-react";
import { motion } from "motion/react";

export interface CustomerKey {
  name: string;
  phone: string;
}

interface CustomerDetailProps {
  customer: CustomerKey;
  token: string;
  onClose: () => void;
  onUnauthorized: () => void;
  onOpenReservation: (r: Reservation) => void;
}

const STATUS_COLORS = {
  confirmed: { dot: "bg-emerald-400", text: "text-emerald-400" },
  pending: { dot: "bg-amber-400", text: "text-amber-400" },
  cancelled: { dot: "bg-red-400/60", text: "text-red-400" },
} as const;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function mostFrequent<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

export function CustomerDetail({
  customer,
  token,
  onClose,
  onUnauthorized,
  onOpenReservation,
}: CustomerDetailProps) {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const filters = customer.phone
      ? { customer_phone: customer.phone }
      : { customer_name: customer.name };
    api.reservations
      .list(token, filters)
      .then((res) => {
        // Sort newest first
        const sorted = [...res.reservations].sort(
          (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
        );
        setRows(sorted);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) onUnauthorized();
        else if (err instanceof ApiError) setError(err.message);
        else setError("Erreur de chargement.");
      })
      .finally(() => setLoading(false));
  }, [token, customer.phone, customer.name, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const confirmedOrPending = rows.filter((r) => r.status !== "cancelled");
    const confirmed = rows.filter((r) => r.status === "confirmed");
    const revenue = confirmed.reduce((s, r) => s + Number(r.total_price), 0);
    const tips = confirmed.reduce((s, r) => s + Number(r.tip_amount), 0);
    const favSlot = mostFrequent(confirmedOrPending.map((r) => r.slot as Slot));
    const withFood = confirmedOrPending.filter((r) => r.food_formula);
    const favFood = mostFrequent(
      withFood.map((r) => r.food_formula as FoodFormula),
    );
    const first = rows.length > 0 ? rows[rows.length - 1]! : null;
    const last = rows.length > 0 ? rows[0]! : null;
    return {
      count: rows.length,
      confirmedCount: confirmed.length,
      revenue,
      tips,
      avg: confirmed.length > 0 ? revenue / confirmed.length : 0,
      favSlot,
      favFood,
      firstDate: first ? new Date(first.start_at) : null,
      lastDate: last ? new Date(last.start_at) : null,
    };
  }, [rows]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gray-950/95 backdrop-blur-sm overflow-y-auto"
    >
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/[0.08]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <User className="w-4 h-4 text-[#02BAD6]" />
            <span className="font-medium text-sm">Historique client</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            Fermer
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Client identity */}
        <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl p-5">
          <h2 className="text-2xl font-bold text-white mb-1">{customer.name}</h2>
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1.5 text-[#02BAD6] hover:text-[#00d4f5] text-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              {customer.phone}
            </a>
          ) : (
            <p className="text-xs text-gray-500 italic">Pas de téléphone</p>
          )}
          {stats.firstDate && stats.lastDate && (
            <p className="text-xs text-gray-500 mt-2">
              Première résa {formatDate(stats.firstDate.toISOString())} · Dernière{" "}
              {formatDate(stats.lastDate.toISOString())}
            </p>
          )}
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile
                icon={Euro}
                label="CA total"
                value={`${stats.revenue.toFixed(0)} €`}
                color="cyan"
                hero
              />
              <StatTile
                icon={CalendarDays}
                label="Résa"
                value={String(stats.count)}
                color="emerald"
              />
              <StatTile
                icon={TrendingUp}
                label="Moyenne"
                value={
                  stats.avg > 0 ? `${stats.avg.toFixed(0)} €` : "—"
                }
                color="emerald"
              />
              {stats.tips > 0 && (
                <StatTile
                  icon={HandCoins}
                  label="Pourboires"
                  value={`+${stats.tips.toFixed(0)} €`}
                  color="emerald"
                />
              )}
            </div>

            {(stats.favSlot || stats.favFood) && (
              <div className="bg-gray-900/40 border border-white/[0.06] rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {stats.favSlot && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      Créneau favori
                    </span>
                    <span className="text-gray-200 font-medium">
                      {SLOT_LABELS[stats.favSlot].name}
                    </span>
                  </div>
                )}
                {stats.favFood && (
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      Formule favorite
                    </span>
                    <span className="text-gray-200 font-medium">
                      {stats.favFood === "platters_14"
                        ? "Plateaux"
                        : "Menu traditionnel"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Reservation list */}
            <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Historique — {rows.length} résa{rows.length > 1 ? "s" : ""}
                </h3>
              </div>
              {rows.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-500 text-sm">
                  Aucune réservation.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {rows.map((r) => {
                    const c = STATUS_COLORS[r.status];
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onOpenReservation(r)}
                        className="w-full px-5 py-3.5 hover:bg-white/[0.02] transition-colors flex items-center gap-3 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                            <span className="text-sm text-gray-200 font-medium">
                              {formatDate(r.start_at)}
                            </span>
                            <span className="text-xs text-gray-500">
                              · {SLOT_LABELS[r.slot as Slot].name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {r.adults}A
                            {r.children > 0 ? ` + ${r.children}E` : ""}
                            {r.babies > 0 ? ` + ${r.babies}B` : ""} ·{" "}
                            {Number(r.total_price).toFixed(0)}€
                            {r.food_formula && " · repas"}
                            {r.status === "cancelled" && " · annulée"}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

const STAT_COLORS = {
  cyan: { text: "text-[#02BAD6]", bg: "bg-[#02BAD6]/10" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
} as const;

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
