import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { type NocoDBRecord, UnauthorizedError, listRecords } from "@/lib/nocodb";

interface ReservationListProps {
  token: string;
  onUnauthorized: () => void;
  refreshKey: number;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-700 rounded w-3/4" />
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
        "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
        isConfirme && "bg-green-900/60 text-green-300",
        isAnnule && "bg-red-900/60 text-red-300",
        !isConfirme && !isAnnule && "bg-gray-700 text-gray-300",
      )}
    >
      {value}
    </span>
  );
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

export function ReservationList({
  token,
  onUnauthorized,
  refreshKey,
}: ReservationListProps) {
  const [records, setRecords] = useState<NocoDBRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [token, onUnauthorized, refreshKey]);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wider">
          <tr>
            {DISPLAY_COLUMNS.map((col) => (
              <th key={col} className="px-4 py-3 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : records.length === 0 ? (
            <tr>
              <td
                colSpan={DISPLAY_COLUMNS.length}
                className="px-4 py-12 text-center text-gray-500"
              >
                Aucune reservation
              </td>
            </tr>
          ) : (
            records.map((record, i) => (
              <tr
                key={(record.Id as string | number) ?? i}
                className="bg-gray-900 hover:bg-gray-800/50 transition-colors"
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
                  if (col === "Montant" && val != null) {
                    return (
                      <td key={col} className="px-4 py-3 text-white">
                        {String(val)} EUR
                      </td>
                    );
                  }
                  return (
                    <td key={col} className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {val != null ? String(val) : "-"}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
