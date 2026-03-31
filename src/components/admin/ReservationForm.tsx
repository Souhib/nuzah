import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type Column,
  type TableSchema,
  UnauthorizedError,
  calculateMontant,
  createRecord,
  getSchema,
} from "@/lib/nocodb";

interface ReservationFormProps {
  token: string;
  onUnauthorized: () => void;
  onCreated: () => void;
}

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getSelectOptions(columns: Column[], title: string): string[] {
  const col = columns.find((c) => normalize(c.title) === normalize(title));
  if (!col?.colOptions?.options) return [];
  return col.colOptions.options.map((o) => o.title);
}

function getColumnTitle(columns: Column[], searchTitle: string): string {
  const col = columns.find(
    (c) => normalize(c.title) === normalize(searchTitle),
  );
  return col?.title ?? searchTitle;
}

export function ReservationForm({
  token,
  onUnauthorized,
  onCreated,
}: ReservationFormProps) {
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [client, setClient] = useState("");
  const [telephone, setTelephone] = useState("");
  const [date, setDate] = useState("");
  const [creneau, setCreneau] = useState("");
  const [nbPersonnes, setNbPersonnes] = useState(1);
  const [formule, setFormule] = useState("");
  const [montant, setMontant] = useState(0);
  const [montantOverride, setMontantOverride] = useState(false);
  const [acompteRecu, setAcompteRecu] = useState(false);
  const [statut, setStatut] = useState("");
  const [notes, setNotes] = useState("");

  const columns = schema?.columns ?? [];
  const creneauOptions = useMemo(() => getSelectOptions(columns, "Creneau"), [columns]);
  const formuleOptions = useMemo(() => getSelectOptions(columns, "Formule"), [columns]);
  const statutOptions = useMemo(() => getSelectOptions(columns, "Statut"), [columns]);

  useEffect(() => {
    getSchema(token)
      .then((s) => {
        setSchema(s);
        const crOpts = getSelectOptions(s.columns, "Creneau");
        const fOpts = getSelectOptions(s.columns, "Formule");
        const sOpts = getSelectOptions(s.columns, "Statut");
        if (crOpts[0] && !creneau) setCreneau(crOpts[0]);
        if (fOpts[0] && !formule) setFormule(fOpts[0]);
        if (sOpts[0] && !statut) setStatut(sOpts[0]);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          onUnauthorized();
        } else {
          setError("Impossible de charger le schema");
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const recalculate = useCallback(() => {
    if (creneau) {
      setMontant(calculateMontant(creneau, nbPersonnes, formule));
      setMontantOverride(false);
    }
  }, [creneau, nbPersonnes, formule]);

  useEffect(() => {
    if (!montantOverride && creneau) {
      setMontant(calculateMontant(creneau, nbPersonnes, formule));
    }
  }, [creneau, nbPersonnes, formule, montantOverride]);

  const breakdown = useMemo(() => {
    if (!creneau) return null;
    const c = creneau.toLowerCase();
    const n = nbPersonnes;
    let base = 0;

    if (c.includes("journ")) {
      if (n <= 20) base = n * 40;
      else if (n <= 30) base = n * 35;
      else if (n <= 40) base = n * 32;
      else base = n * 28;
    } else if (c.includes("nuit")) {
      base = n <= 6 ? 180 : n <= 10 ? 210 : 240;
    } else if (c.includes("soir")) {
      base = n <= 6 ? 150 : n <= 10 ? 175 : 200;
    } else if (c.includes("matin") || c.includes("apr")) {
      base = n <= 6 ? 120 : n <= 10 ? 140 : 160;
    }

    let mealUnit = 0;
    const f = formule.toLowerCase();
    if (!c.includes("journ")) {
      if (f.includes("menu complet")) mealUnit = 15;
      else if (f.includes("plat seul")) mealUnit = 10;
    }

    const meal = mealUnit * n;
    return { base, mealUnit, meal };
  }, [creneau, nbPersonnes, formule]);

  function resetForm() {
    setClient("");
    setTelephone("");
    setDate("");
    setCreneau(creneauOptions[0] ?? "");
    setNbPersonnes(1);
    setFormule(formuleOptions[0] ?? "");
    setMontant(0);
    setMontantOverride(false);
    setAcompteRecu(false);
    setStatut(statutOptions[0] ?? "");
    setNotes("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    // Map créneau to start/end hours
    const creneauHours: Record<string, [string, string]> = {
      "10": ["10:00", "14:00"],
      "14": ["14:00", "18:00"],
      "18": ["18:00", "22:00"],
      "22": ["22:00", "02:00"],
    };

    let startDateTime = date;
    let endDateTime = date;

    const c = creneau.toLowerCase();
    if (c.includes("journ")) {
      startDateTime = `${date} 10:00`;
      endDateTime = `${date} 22:00`;
    } else {
      const hourKey = Object.keys(creneauHours).find((k) => creneau.includes(k));
      if (hourKey) {
        const [startH, endH] = creneauHours[hourKey];
        startDateTime = `${date} ${startH}`;
        // Handle night slot crossing midnight
        if (endH === "02:00") {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          const nd = nextDay.toISOString().split("T")[0];
          endDateTime = `${nd} ${endH}`;
        } else {
          endDateTime = `${date} ${endH}`;
        }
      }
    }

    const record: Record<string, unknown> = {
      [getColumnTitle(columns, "Client")]: client,
      [getColumnTitle(columns, "Telephone")]: telephone,
      [getColumnTitle(columns, "Date")]: startDateTime,
      [getColumnTitle(columns, "Fin")]: endDateTime,
      [getColumnTitle(columns, "Creneau")]: creneau,
      [getColumnTitle(columns, "Nb personnes")]: nbPersonnes,
      [getColumnTitle(columns, "Formule")]: formule,
      [getColumnTitle(columns, "Montant")]: montant,
      [getColumnTitle(columns, "Acompte recu")]: acompteRecu,
      [getColumnTitle(columns, "Statut")]: statut,
      [getColumnTitle(columns, "Notes")]: notes || undefined,
    };

    try {
      await createRecord(token, record);
      setSuccess(true);
      resetForm();
      onCreated();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      } else {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la creation",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
        {success && (
          <div className="p-4 rounded-lg bg-green-900/50 border border-green-700 text-green-300 flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Reservation creee avec succes
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-gray-400 text-sm mb-1 block">Client *</span>
            <input
              type="text"
              required
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
            />
          </label>

          <label className="block">
            <span className="text-gray-400 text-sm mb-1 block">Telephone *</span>
            <input
              type="tel"
              required
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-gray-400 text-sm mb-1 block">Date *</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
            />
          </label>

          <label className="block">
            <span className="text-gray-400 text-sm mb-1 block">Creneau *</span>
            <select
              required
              value={creneau}
              onChange={(e) => setCreneau(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
            >
              {creneauOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-gray-400 text-sm mb-1 block">Nb personnes *</span>
            <input
              type="number"
              required
              min={1}
              max={60}
              value={nbPersonnes}
              onChange={(e) => setNbPersonnes(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
            />
          </label>

          <label className="block">
            <span className="text-gray-400 text-sm mb-1 block">Formule</span>
            <select
              value={formule}
              onChange={(e) => setFormule(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
            >
              {formuleOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-gray-400 text-sm">Montant</span>
            {montantOverride && (
              <button
                type="button"
                onClick={recalculate}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                Recalculer
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">EUR</span>
            <input
              type="number"
              value={montant}
              onChange={(e) => {
                setMontant(Number(e.target.value));
                setMontantOverride(true);
              }}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg pl-14 pr-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
            />
          </div>
          {breakdown && (
            <p className="text-gray-500 text-xs mt-1">
              Base: {breakdown.base}EUR
              {breakdown.mealUnit > 0 &&
                ` + Repas: ${nbPersonnes} x ${breakdown.mealUnit}EUR = ${breakdown.meal}EUR`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="acompte"
            checked={acompteRecu}
            onChange={(e) => setAcompteRecu(e.target.checked)}
            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-cyan-600 focus:ring-cyan-500/20"
          />
          <label htmlFor="acompte" className="text-gray-300 text-sm">
            Acompte recu
          </label>
        </div>

        <label className="block">
          <span className="text-gray-400 text-sm mb-1 block">Statut</span>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
          >
            {statutOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-gray-400 text-sm mb-1 block">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none resize-y"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg py-3 transition-colors",
            submitting && "opacity-60 cursor-not-allowed",
          )}
        >
          {submitting ? "Enregistrement..." : "Enregistrer la reservation"}
        </button>
      </form>

      <aside className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 h-fit">
        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
          Aide-memoire tarifs
        </h3>

        <div className="space-y-4 text-sm text-gray-300">
          <div>
            <p className="text-gray-400 font-medium mb-2">Creneaux (4h)</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left pb-1" />
                  <th className="text-right pb-1">6 pers</th>
                  <th className="text-right pb-1">7-10</th>
                  <th className="text-right pb-1">11-15</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                <tr>
                  <td className="py-1">Matin / Aprem</td>
                  <td className="text-right">120</td>
                  <td className="text-right">140</td>
                  <td className="text-right">160</td>
                </tr>
                <tr>
                  <td className="py-1">Soiree</td>
                  <td className="text-right">150</td>
                  <td className="text-right">175</td>
                  <td className="text-right">200</td>
                </tr>
                <tr>
                  <td className="py-1">Nuit</td>
                  <td className="text-right">180</td>
                  <td className="text-right">210</td>
                  <td className="text-right">240</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-gray-400 font-medium mb-2">Journee complete</p>
            <div className="text-xs space-y-0.5">
              <p>15-20 pers : 40 EUR/pers</p>
              <p>21-30 pers : 35 EUR/pers</p>
              <p>31-40 pers : 32 EUR/pers</p>
              <p>41-50 pers : 28 EUR/pers</p>
            </div>
          </div>

          <div>
            <p className="text-gray-400 font-medium mb-2">Options repas</p>
            <div className="text-xs space-y-0.5">
              <p>+ Plat seul : 10 EUR/pers</p>
              <p>+ Menu complet : 15 EUR/pers</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
