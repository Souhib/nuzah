import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type NocoDBRecord,
  UnauthorizedError,
  deleteRecord,
  listRecords,
} from "@/lib/nocodb";
import {
  AlertTriangle,
  CalendarDays,
  CalendarX2,
  CircleCheck,
  Clock,
  Euro,
  Loader2,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ReservationListProps {
  token: string;
  onUnauthorized: () => void;
  refreshKey: number;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-700/50 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

function StatutBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const isConfirme = lower.includes("confirm");
  const isAnnule = lower.includes("annul");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        isConfirme && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        isAnnule && "bg-red-500/10 text-red-400 border-red-500/20",
        !isConfirme && !isAnnule && "bg-amber-500/10 text-amber-400 border-amber-500/20",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isConfirme && "bg-emerald-400",
          isAnnule && "bg-red-400",
          !isConfirme && !isAnnule && "bg-amber-400",
        )}
      />
      {value}
    </span>
  );
}

function formatDate(raw: string): string {
  try {
    return new Date(raw).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

const DISPLAY_COLUMNS = [
  "Client",
  "Date",
  "Creneau",
  "Nb personnes",
  "Formule",
  "Montant",
  "Statut",
] as const;

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findField(record: NocoDBRecord, search: string): unknown {
  const norm = normalize(search);
  const key = Object.keys(record).find((k) => normalize(k) === norm);
  return key ? record[key] : undefined;
}

interface StatsBarProps {
  records: NocoDBRecord[];
}

function StatsBar({ records }: StatsBarProps) {
  const total = records.length;
  const ca = records.reduce((sum, r) => {
    const val = findField(r, "Montant");
    return sum + (typeof val === "number" ? val : Number(val) || 0);
  }, 0);
  const confirmees = records.filter((r) => {
    const s = findField(r, "Statut");
    return typeof s === "string" && s.toLowerCase().includes("confirm");
  }).length;
  const enAttente = total - confirmees - records.filter((r) => {
    const s = findField(r, "Statut");
    return typeof s === "string" && s.toLowerCase().includes("annul");
  }).length;

  const stats = [
    { label: "Reservations", value: total, icon: CalendarDays, color: "text-[#02BAD6]", bg: "bg-[#02BAD6]/10" },
    { label: "CA total", value: `${ca} EUR`, icon: Euro, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Confirmees", value: confirmees, icon: CircleCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "En attente", value: enAttente, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-gray-900/50 border border-white/[0.08] rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bg)}>
                <Icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
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
}: ReservationListProps) {
  const [records, setRecords] = useState<NocoDBRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<number | null>(null);

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError("");
    listRecords(token)
      .then((res) => setRecords(res.list))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          onUnauthorized();
        } else {
          setError(
            err instanceof Error ? err.message : "Erreur de chargement",
          );
        }
      })
      .finally(() => setLoading(false));
  }, [token, onUnauthorized]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords, refreshKey]);

  async function handleDelete(id: number) {
    setDeleteModalId(null);
    setDeletingId(id);
    try {
      await deleteRecord(token, id);
      setRecords((prev) => prev.filter((r) => r.Id !== id));
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      } else {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression",
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!loading && <StatsBar records={records} />}

      <div className="bg-gray-900/50 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#02BAD6]/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-[#02BAD6]" />
            </div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Toutes les reservations
            </h3>
          </div>
          {!loading && (
            <span className="text-xs text-gray-500">{records.length} resultat{records.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-800/30 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                {DISPLAY_COLUMNS.map((col) => (
                  <th key={col} className="px-4 py-3 whitespace-nowrap font-medium">
                    {col}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={DISPLAY_COLUMNS.length + 1}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center">
                        <CalendarX2 className="w-6 h-6 text-gray-600" />
                      </div>
                      <p className="text-gray-500 text-sm">Aucune reservation</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record, i) => {
                  const id = record.Id as number;
                  return (
                    <tr
                      key={id ?? i}
                      className={cn(
                        "hover:bg-white/[0.02] transition-colors",
                        deletingId === id && "opacity-50",
                      )}
                    >
                      {DISPLAY_COLUMNS.map((col) => {
                        const val = findField(record, col);
                        if (col === "Statut" && typeof val === "string") {
                          return (
                            <td key={col} className="px-4 py-3">
                              <StatutBadge value={val} />
                            </td>
                          );
                        }
                        if (col === "Date" && typeof val === "string") {
                          return (
                            <td key={col} className="px-4 py-3 text-gray-300 whitespace-nowrap">
                              {formatDate(val)}
                            </td>
                          );
                        }
                        if (col === "Montant" && val != null) {
                          return (
                            <td key={col} className="px-4 py-3 text-white font-medium">
                              {String(val)} EUR
                            </td>
                          );
                        }
                        return (
                          <td
                            key={col}
                            className="px-4 py-3 text-gray-300 whitespace-nowrap"
                          >
                            {val != null ? String(val) : "-"}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setDeleteModalId(id)}
                          disabled={deletingId === id}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          {deletingId === id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
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
                  Supprimer cette reservation ?
                </h3>
                <p className="text-gray-400 text-sm">
                  Cette action est irreversible.
                </p>
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
