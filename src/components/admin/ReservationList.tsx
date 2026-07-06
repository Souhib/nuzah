import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ApiError,
  formatFoodSummary,
  type Reservation,
  STATUS_LABELS,
  type Status,
  UnauthorizedError,
  api,
} from "@/lib/api";
import {
  AlertTriangle,
  CalendarDays,
  CalendarX2,
  CircleCheck,
  Clock,
  Euro,
  History,
  Loader2,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ReservationListProps {
  token: string;
  onUnauthorized: () => void;
  refreshKey: number;
  onEdit: (reservation: Reservation) => void;
  onViewCustomer: (customer: { name: string; phone: string }) => void;
}

const SLOT_SHORT: Record<Reservation["slot"], string> = {
  morning: "Matinée",
  afternoon: "Aprem",
  evening: "Soirée",
  night: "Nuit",
};

function StatusBadge({ value }: { value: Status }) {
  const isConfirmed = value === "confirmed";
  const isCancelled = value === "cancelled";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
        isConfirmed && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        isCancelled && "bg-red-500/10 text-red-400 border-red-500/20",
        !isConfirmed && !isCancelled && "bg-amber-500/10 text-amber-400 border-amber-500/20",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isConfirmed && "bg-emerald-400",
          isCancelled && "bg-red-400",
          !isConfirmed && !isCancelled && "bg-amber-400",
        )}
      />
      {STATUS_LABELS[value]}
    </span>
  );
}

function formatStartAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-700/50 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

interface StatsBarProps {
  rows: Reservation[];
}

function StatsBar({ rows }: StatsBarProps) {
  const stats = useMemo(() => {
    const total = rows.length;
    const confirmed = rows.filter((r) => r.status === "confirmed");
    const pending = rows.filter((r) => r.status === "pending");
    const revenue = confirmed.reduce((sum, r) => sum + Number(r.total_price), 0);
    return { total, revenue, confirmed: confirmed.length, pending: pending.length };
  }, [rows]);

  const tiles = [
    {
      label: "Réservations",
      value: stats.total,
      icon: CalendarDays,
      color: "text-[#02BAD6]",
      bg: "bg-[#02BAD6]/10",
    },
    {
      label: "CA (confirmées)",
      value: `${stats.revenue.toFixed(2)} €`,
      icon: Euro,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Confirmées",
      value: stats.confirmed,
      icon: CircleCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "En attente",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.label}
            className="bg-gray-900/50 border border-white/[0.08] rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", t.bg)}>
                <Icon className={cn("w-4 h-4", t.color)} />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{t.value}</p>
          </div>
        );
      })}
    </div>
  );
}

export function ReservationList({
  token,
  onUnauthorized,
  refreshKey,
  onEdit,
  onViewCustomer,
}: ReservationListProps) {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "">("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.reservations
      .list(token, { status: statusFilter || undefined })
      .then((res) => setRows(res.reservations))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          onUnauthorized();
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Erreur de chargement.");
        }
      })
      .finally(() => setLoading(false));
  }, [token, statusFilter, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleDelete(id: string) {
    setDeleteModalId(null);
    setDeletingId(id);
    try {
      await api.reservations.delete(token, id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erreur lors de la suppression.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  const cols = [
    "Client",
    "Téléphone",
    "Date & heure",
    "Créneau",
    "Pers.",
    "Repas",
    "Total",
    "Statut",
  ];

  return (
    <div className="space-y-6">
      {!loading && <StatsBar rows={rows} />}

      <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#02BAD6]/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-[#02BAD6]" />
            </div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Toutes les réservations
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | "")}
              className="bg-gray-800/50 border border-white/[0.08] text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#02BAD6]"
            >
              <option value="">Tous statuts</option>
              {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {!loading && (
              <span className="text-xs text-gray-500">
                {rows.length} résultat{rows.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-800/30 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-4 py-3 whitespace-nowrap font-medium">
                    {c}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <>
                  <SkeletonRow cols={cols.length} />
                  <SkeletonRow cols={cols.length} />
                  <SkeletonRow cols={cols.length} />
                </>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center">
                        <CalendarX2 className="w-6 h-6 text-gray-600" />
                      </div>
                      <p className="text-gray-500 text-sm">Aucune réservation</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onEdit(r)}
                    className={cn(
                      "hover:bg-white/[0.02] transition-colors cursor-pointer",
                      deletingId === r.id && "opacity-50",
                    )}
                  >
                    <td className="px-4 py-3 text-gray-200 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{r.customer_name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewCustomer({
                              name: r.customer_name,
                              phone: r.customer_phone,
                            });
                          }}
                          className="p-1 rounded text-gray-500 hover:text-[#02BAD6] hover:bg-[#02BAD6]/10 transition-colors"
                          title="Voir historique de ce client"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {r.customer_phone}
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {formatStartAt(r.start_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {SLOT_SHORT[r.slot]}
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {r.adults}A{r.children > 0 ? ` + ${r.children}E` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {formatFoodSummary(r) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                      {Number(r.total_price).toFixed(2)} €
                      {Number(r.extra_amount) > 0 && (
                        <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[10px] font-semibold tabular-nums">
                          +{Number(r.extra_amount).toFixed(0)}
                        </span>
                      )}
                      {Number(r.discount_amount) > 0 && (
                        <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-semibold tabular-nums">
                          −{Number(r.discount_amount).toFixed(0)}
                        </span>
                      )}
                      {Number(r.tip_amount) > 0 && (
                        <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold tabular-nums">
                          +{Number(r.tip_amount).toFixed(0)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalId(r.id);
                        }}
                        disabled={deletingId === r.id}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Supprimer"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {deleteModalId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteModalId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Supprimer cette réservation ?
                </h3>
                <p className="text-gray-400 text-sm">Action irréversible.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-gray-300 hover:bg-white/[0.04] transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteModalId)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-colors text-sm font-medium"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
